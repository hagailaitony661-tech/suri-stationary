-- 012_rls.sql
-- Helper: get current user's role/profile id/status without recursive RLS issues.
create or replace function public.current_profile()
returns table(profile_id uuid, role text, status text) as $$
  select id, role, status from public.profiles where auth_user_id = auth.uid();
$$ language sql stable security definer;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE'
  );
$$ language sql stable security definer;

create or replace function public.is_active_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and status = 'ACTIVE'
  );
$$ language sql stable security definer;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.services enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.daily_targets enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.price_history enable row level security;

-- PROFILES: user can read own; admin can read/manage all
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth_user_id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_admin());

-- CATEGORIES: active staff read, admin write
create policy "categories_select" on public.categories
  for select using (public.is_active_staff());
create policy "categories_write_admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- PRODUCTS: active staff read active products; admin full access (incl inactive)
create policy "products_select_staff" on public.products
  for select using (public.is_active_staff() and (active = true or public.is_admin()));
create policy "products_insert_admin" on public.products
  for insert with check (public.is_admin());
create policy "products_update_admin" on public.products
  for update using (public.is_admin());
create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- SERVICES: same pattern as products
create policy "services_select_staff" on public.services
  for select using (public.is_active_staff() and (active = true or public.is_admin()));
create policy "services_insert_admin" on public.services
  for insert with check (public.is_admin());
create policy "services_update_admin" on public.services
  for update using (public.is_admin());
create policy "services_delete_admin" on public.services
  for delete using (public.is_admin());

-- SALES: staff read own, admin read all; sales are created only via RPC (security definer),
-- direct inserts blocked for staff (no insert policy for staff role).
create policy "sales_select_own_or_admin" on public.sales
  for select using (
    public.is_active_staff() and (
      public.is_admin() or staff_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );
create policy "sales_update_admin" on public.sales
  for update using (public.is_admin());

-- SALE_ITEMS: readable if parent sale is readable
create policy "sale_items_select" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
      and (public.is_admin() or s.staff_id = (select id from public.profiles where auth_user_id = auth.uid()))
    )
  );

-- STOCK_MOVEMENTS: staff can read, only admin (or the sale RPC) writes
create policy "stock_movements_select" on public.stock_movements
  for select using (public.is_active_staff());
create policy "stock_movements_insert_admin" on public.stock_movements
  for insert with check (public.is_admin());

-- DAILY_TARGETS: staff read, admin write
create policy "daily_targets_select" on public.daily_targets
  for select using (public.is_active_staff());
create policy "daily_targets_write_admin" on public.daily_targets
  for all using (public.is_admin()) with check (public.is_admin());

-- SETTINGS: staff read, admin write
create policy "settings_select" on public.settings
  for select using (public.is_active_staff());
create policy "settings_write_admin" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- AUDIT_LOGS: admin only
create policy "audit_logs_admin_only" on public.audit_logs
  for select using (public.is_admin());
create policy "audit_logs_insert" on public.audit_logs
  for insert with check (public.is_active_staff());

-- PRICE_HISTORY: admin only
create policy "price_history_admin_only" on public.price_history
  for select using (public.is_admin());
