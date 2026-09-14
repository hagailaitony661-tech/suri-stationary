-- 004_services.sql
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  description text,
  buying_cost numeric(14,2) not null default 0 check (buying_cost >= 0),
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
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_name on public.services using gin (to_tsvector('simple', name));
create index if not exists idx_services_active on public.services(active);
