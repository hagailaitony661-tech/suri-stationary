-- 006_sale_items.sql
create table if not exists public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  service_id uuid references public.services(id),
  item_name_snapshot text not null,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  buying_price_snapshot numeric(14,2) not null default 0,
  selling_price_snapshot numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  profit numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_item_type check (
    (product_id is not null and service_id is null) or
    (product_id is null and service_id is not null)
  )
);

create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items(product_id);
create index if not exists idx_sale_items_service_id on public.sale_items(service_id);
