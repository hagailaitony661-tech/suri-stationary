-- 011_price_history.sql
create table if not exists public.price_history (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id),
  old_buying_price numeric(14,2),
  new_buying_price numeric(14,2),
  old_selling_price numeric(14,2),
  new_selling_price numeric(14,2),
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_price_history_product_id on public.price_history(product_id);
