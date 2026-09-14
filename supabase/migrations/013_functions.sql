-- 013_functions.sql

-- Sequence-backed transaction number generator: SUR-YYYYMMDD-####
create sequence if not exists public.sale_seq;

create or replace function public.generate_transaction_number()
returns text as $$
  select 'SUR-' || to_char(now() at time zone 'Africa/Dar_es_Salaam', 'YYYYMMDD') || '-' ||
    lpad(nextval('public.sale_seq')::text, 4, '0');
$$ language sql;

-- =====================================================================
-- ATOMIC SALE PROCESSING
-- p_items: jsonb array like:
-- [{"product_id":"uuid" OR "service_id":"uuid","quantity":2,"discount":0}]
-- =====================================================================
create or replace function public.process_sale(
  p_items jsonb,
  p_payment_method text,
  p_idempotency_key text,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns public.sales
language plpgsql
security definer
as $$
declare
  v_profile_id uuid;
  v_sale public.sales;
  v_item jsonb;
  v_product public.products%rowtype;
  v_service public.services%rowtype;
  v_qty integer;
  v_item_discount numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_total_discount numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_profit numeric(14,2) := 0;
  v_line_subtotal numeric(14,2);
  v_line_profit numeric(14,2);
  v_txn_number text;
begin
  -- Idempotency: if this key was already processed, return the existing sale
  select * into v_sale from public.sales where idempotency_key = p_idempotency_key;
  if found then
    return v_sale;
  end if;

  select id into v_profile_id from public.profiles
    where auth_user_id = auth.uid() and status = 'ACTIVE';
  if v_profile_id is null then
    raise exception 'HAUJARUHUSIWA: mtumiaji hafanyi kazi au hajaingia';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Hakuna bidhaa kwenye mauzo';
  end if;

  v_txn_number := public.generate_transaction_number();

  -- Create sale shell first (totals updated after loop)
  insert into public.sales (
    transaction_number, idempotency_key, staff_id, customer_name, customer_phone,
    subtotal, discount, total, payment_method, total_profit, status
  ) values (
    v_txn_number, p_idempotency_key, v_profile_id, p_customer_name, p_customer_phone,
    0, 0, 0, p_payment_method, 0, 'COMPLETED'
  ) returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Idadi ya bidhaa si sahihi';
    end if;
    v_item_discount := coalesce((v_item->>'discount')::numeric, 0);

    if v_item ? 'product_id' and (v_item->>'product_id') is not null then
      select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
      if not found or v_product.active = false then
        raise exception 'Bidhaa haipatikani';
      end if;
      if v_product.current_stock < v_qty then
        raise exception 'STOCK HAITOSHI: % - iliyopo %, inayohitajika %', v_product.name, v_product.current_stock, v_qty;
      end if;

      v_line_subtotal := (v_product.final_price * v_qty) - v_item_discount;
      v_line_profit := ((v_product.selling_price - v_item_discount / greatest(v_qty,1)) - v_product.buying_price) * v_qty;

      insert into public.sale_items (
        sale_id, product_id, item_name_snapshot, sku_snapshot, quantity,
        buying_price_snapshot, selling_price_snapshot, discount, subtotal, profit
      ) values (
        v_sale.id, v_product.id, v_product.name, v_product.sku, v_qty,
        v_product.buying_price, v_product.final_price, v_item_discount, v_line_subtotal, v_line_profit
      );

      update public.products set current_stock = current_stock - v_qty, updated_at = now()
        where id = v_product.id;

      insert into public.stock_movements (
        product_id, previous_stock, quantity_change, new_stock, movement_type, reason, reference, user_id
      ) values (
        v_product.id, v_product.current_stock, -v_qty, v_product.current_stock - v_qty,
        'SALE', 'Mauzo', v_txn_number, v_profile_id
      );

    elsif v_item ? 'service_id' and (v_item->>'service_id') is not null then
      select * into v_service from public.services where id = (v_item->>'service_id')::uuid;
      if not found or v_service.active = false then
        raise exception 'Huduma haipatikani';
      end if;

      v_line_subtotal := (v_service.final_price * v_qty) - v_item_discount;
      v_line_profit := ((v_service.selling_price - v_item_discount / greatest(v_qty,1)) - v_service.buying_cost) * v_qty;

      insert into public.sale_items (
        sale_id, service_id, item_name_snapshot, quantity,
        buying_price_snapshot, selling_price_snapshot, discount, subtotal, profit
      ) values (
        v_sale.id, v_service.id, v_service.name, v_qty,
        v_service.buying_cost, v_service.final_price, v_item_discount, v_line_subtotal, v_line_profit
      );
    else
      raise exception 'Kipengele cha mauzo si sahihi';
    end if;

    v_subtotal := v_subtotal + v_line_subtotal + v_item_discount;
    v_total_discount := v_total_discount + v_item_discount;
    v_total := v_total + v_line_subtotal;
    v_profit := v_profit + v_line_profit;
  end loop;

  update public.sales set
    subtotal = v_subtotal, discount = v_total_discount, total = v_total, total_profit = v_profit
    where id = v_sale.id
    returning * into v_sale;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, description)
    values (v_profile_id, 'SALE_COMPLETED', 'sales', v_sale.id::text, 'Mauzo yamekamilika: ' || v_txn_number);

  return v_sale;
end;
$$;

grant execute on function public.process_sale to authenticated;

-- =====================================================================
-- CANCEL SALE (admin only) - reverses stock, marks CANCELLED
-- =====================================================================
create or replace function public.cancel_sale(p_sale_id uuid)
returns public.sales
language plpgsql
security definer
as $$
declare
  v_sale public.sales;
  v_profile_id uuid;
  v_item record;
begin
  if not public.is_admin() then
    raise exception 'HUJA RUHUSIWA';
  end if;
  select id into v_profile_id from public.profiles where auth_user_id = auth.uid();

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Sale haipo';
  end if;
  if v_sale.status = 'CANCELLED' then
    return v_sale;
  end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    if v_item.product_id is not null then
      update public.products set current_stock = current_stock + v_item.quantity, updated_at = now()
        where id = v_item.product_id;

      insert into public.stock_movements (
        product_id, previous_stock, quantity_change, new_stock, movement_type, reason, reference, user_id
      )
      select v_item.product_id, current_stock - v_item.quantity, v_item.quantity, current_stock,
             'RETURN', 'Mauzo yameghairiwa', v_sale.transaction_number, v_profile_id
      from public.products where id = v_item.product_id;
    end if;
  end loop;

  update public.sales set status = 'CANCELLED' where id = p_sale_id returning * into v_sale;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, description)
    values (v_profile_id, 'SALE_CANCELLED', 'sales', p_sale_id::text, 'Mauzo yameghairiwa: ' || v_sale.transaction_number);

  return v_sale;
end;
$$;

grant execute on function public.cancel_sale to authenticated;

-- =====================================================================
-- STOCK: restock / adjust (admin only)
-- =====================================================================
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_quantity_change integer,
  p_movement_type text,
  p_reason text default null,
  p_reference text default null
)
returns public.products
language plpgsql
security definer
as $$
declare
  v_profile_id uuid;
  v_product public.products%rowtype;
  v_new_stock integer;
begin
  if not public.is_admin() then
    raise exception 'HUJA RUHUSIWA';
  end if;
  if p_movement_type not in ('RESTOCK','ADJUSTMENT','DAMAGE','CORRECTION') then
    raise exception 'Aina ya movement si sahihi';
  end if;

  select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Bidhaa haipo';
  end if;

  v_new_stock := v_product.current_stock + p_quantity_change;
  if v_new_stock < 0 then
    raise exception 'Stock haiwezi kuwa hasi';
  end if;

  update public.products set current_stock = v_new_stock, updated_at = now() where id = p_product_id
    returning * into v_product;

  insert into public.stock_movements (
    product_id, previous_stock, quantity_change, new_stock, movement_type, reason, reference, user_id
  ) values (
    p_product_id, v_new_stock - p_quantity_change, p_quantity_change, v_new_stock,
    p_movement_type, p_reason, p_reference, v_profile_id
  );

  insert into public.audit_logs (user_id, action, entity_type, entity_id, description)
    values (v_profile_id, 'STOCK_ADJUSTED', 'products', p_product_id::text,
      format('Stock: %s -> %s (%s)', v_new_stock - p_quantity_change, v_new_stock, p_movement_type));

  return v_product;
end;
$$;

grant execute on function public.adjust_stock to authenticated;

-- =====================================================================
-- PRICE HISTORY TRIGGER
-- =====================================================================
create or replace function public.log_price_change()
returns trigger as $$
declare
  v_profile_id uuid;
begin
  if new.buying_price is distinct from old.buying_price
     or new.selling_price is distinct from old.selling_price then
    select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
    insert into public.price_history (
      product_id, old_buying_price, new_buying_price, old_selling_price, new_selling_price, changed_by
    ) values (
      new.id, old.buying_price, new.buying_price, old.selling_price, new.selling_price, v_profile_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_price_history on public.products;
create trigger trg_price_history
  after update on public.products
  for each row execute procedure public.log_price_change();

-- =====================================================================
-- DASHBOARD HELPER: today's sales/profit/target summary (server-side aggregation)
-- =====================================================================
create or replace function public.get_dashboard_summary(p_date date default (now() at time zone 'Africa/Dar_es_Salaam')::date)
returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object(
    'total_sales', coalesce(sum(s.total),0),
    'total_profit', coalesce(sum(s.total_profit),0),
    'transaction_count', count(*),
    'products_sold', coalesce((
      select sum(si.quantity) from public.sale_items si
      join public.sales s2 on s2.id = si.sale_id
      where s2.status = 'COMPLETED'
        and (s2.created_at at time zone 'Africa/Dar_es_Salaam')::date = p_date
    ),0),
    'target', (select target_amount from public.daily_targets where target_date = p_date),
    'default_target', (select default_daily_target from public.settings where id = 1),
    'low_stock_count', (select count(*) from public.products where active and current_stock <= minimum_stock and current_stock > 0),
    'out_of_stock_count', (select count(*) from public.products where active and current_stock = 0)
  )
  from public.sales s
  where s.status = 'COMPLETED'
    and (s.created_at at time zone 'Africa/Dar_es_Salaam')::date = p_date;
$$;

grant execute on function public.get_dashboard_summary to authenticated;
