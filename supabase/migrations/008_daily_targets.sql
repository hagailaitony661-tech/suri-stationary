-- 008_daily_targets.sql
create table if not exists public.daily_targets (
  id uuid primary key default uuid_generate_v4(),
  target_date date not null unique,
  target_amount numeric(14,2) not null default 250000,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
