-- 007_stock_movements.sql
create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id),
  previous_stock integer not null,
  quantity_change integer not null,
  new_stock integer not null,
  movement_type text not null check (movement_type in ('SALE','RESTOCK','ADJUSTMENT','RETURN','DAMAGE','CORRECTION')),
  reason text,
  reference text,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at);
