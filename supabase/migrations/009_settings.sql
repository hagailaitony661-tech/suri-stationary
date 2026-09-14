-- 009_settings.sql
create table if not exists public.settings (
  id int primary key default 1,
  business_name text not null default 'SURI STATIONARY',
  currency text not null default 'TZS',
  default_daily_target numeric(14,2) not null default 250000,
  receipt_footer text default 'Powered by Hagai Chrisanty Laitony - HITECH TECHNOLOGY',
  low_stock_default integer not null default 5,
  timezone text not null default 'Africa/Dar_es_Salaam',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.settings (id) values (1) on conflict (id) do nothing;
