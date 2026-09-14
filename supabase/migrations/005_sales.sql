-- 005_sales.sql
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  transaction_number text not null unique,
  idempotency_key text not null unique,
  staff_id uuid not null references public.profiles(id),
  customer_name text,
  customer_phone text,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_method text not null default 'CASH' check (payment_method in ('CASH','MOBILE_MONEY','BANK','OTHER')),
  total_profit numeric(14,2) not null default 0,
  status text not null default 'COMPLETED' check (status in ('COMPLETED','CANCELLED','PENDING')),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_created_at on public.sales(created_at);
create index if not exists idx_sales_staff_id on public.sales(staff_id);
create index if not exists idx_sales_status on public.sales(status);
