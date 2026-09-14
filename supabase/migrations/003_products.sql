-- 003_products.sql
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text unique,
  barcode text unique,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  buying_price numeric(14,2) not null default 0 check (buying_price >= 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  discount_type text not null default 'NONE' check (discount_type in ('NONE','AMOUNT','PERCENT')),
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  final_price numeric(14,2) generated always as (
    case
      when discount_type = 'AMOUNT' then greatest(selling_price - discount_value, 0)
      when discount_type = 'PERCENT' then greatest(selling_price - (selling_price * discount_value / 100), 0)
      else selling_price
    end
  ) stored,
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_stock integer not null default 5 check (minimum_stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', name));
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(active);
