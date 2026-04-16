-- ============================================================
-- Fuelist — Growth Features Migration
-- Safe to re-run: uses IF NOT EXISTS + DROP POLICY IF EXISTS
-- Run after schema.sql and orders_and_bestseller.sql
-- ============================================================

-- -------------------------------------------------------
-- 1. Extend users table with profile + reward fields
-- -------------------------------------------------------
alter table public.users
  add column if not exists reward_points integer not null default 0,
  add column if not exists phone         text     not null default '',
  add column if not exists address_line1 text     not null default '',
  add column if not exists address_line2 text              default '',
  add column if not exists city          text     not null default '',
  add column if not exists state         text              default '',
  add column if not exists pincode       text     not null default '',
  add column if not exists landmark      text              default '';

-- -------------------------------------------------------
-- 2. Coupons table  (must exist before orders FK)
-- -------------------------------------------------------
create table if not exists public.coupons (
  id                   uuid         primary key default gen_random_uuid(),
  code                 text         not null unique,
  discount_type        text         not null check (discount_type in ('flat', 'percentage')),
  discount_value       numeric(8,2) not null,
  min_order_amount     numeric(8,2) not null default 0,
  max_discount         numeric(8,2),
  expiry_date          timestamptz,
  usage_limit          integer,
  used_count           integer      not null default 0,
  is_active            boolean      not null default true,
  is_first_order_only  boolean      not null default false,
  per_user_limit       integer      not null default 1,
  applicable_user_ids  uuid[],
  created_at           timestamptz  not null default now()
);

alter table public.coupons enable row level security;

drop policy if exists "coupons: public read active" on public.coupons;
create policy "coupons: public read active" on public.coupons
  for select using (is_active = true);

drop policy if exists "coupons: admin all" on public.coupons;
create policy "coupons: admin all" on public.coupons
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- -------------------------------------------------------
-- 3. Extend orders table with coupon + reward columns
-- -------------------------------------------------------
alter table public.orders
  add column if not exists total_amount          numeric(10,2) not null default 0,
  add column if not exists delivery_fee          numeric(8,2)  not null default 0,
  add column if not exists payment_status        text          not null default 'pending',
  add column if not exists payment_id            text,
  add column if not exists razorpay_order_id     text,
  add column if not exists address               jsonb,
  add column if not exists coupon_id             uuid references public.coupons(id),
  add column if not exists discount_amount       numeric(8,2)  not null default 0,
  add column if not exists reward_points_used    integer       not null default 0,
  add column if not exists reward_points_earned  integer       not null default 0;

-- -------------------------------------------------------
-- 4. Coupon usage log
-- -------------------------------------------------------
create table if not exists public.coupon_usage (
  id         uuid        primary key default gen_random_uuid(),
  coupon_id  uuid        not null references public.coupons(id) on delete cascade,
  user_id    uuid        not null references public.users(id)   on delete cascade,
  order_id   uuid,
  used_at    timestamptz not null default now()
);

alter table public.coupon_usage enable row level security;

drop policy if exists "coupon_usage: read own" on public.coupon_usage;
create policy "coupon_usage: read own" on public.coupon_usage
  for select using (auth.uid() = user_id);

-- -------------------------------------------------------
-- 5. User rewards log
-- -------------------------------------------------------
create table if not exists public.user_rewards_log (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  type           text        not null check (type in ('order_earn', 'order_redeem', 'review', 'referral', 'admin')),
  points_change  integer     not null,
  description    text,
  order_id       uuid,
  created_at     timestamptz not null default now()
);

alter table public.user_rewards_log enable row level security;

drop policy if exists "rewards_log: read own" on public.user_rewards_log;
create policy "rewards_log: read own" on public.user_rewards_log
  for select using (auth.uid() = user_id);

-- -------------------------------------------------------
-- 6. Seed: sample first-order coupon
-- -------------------------------------------------------
insert into public.coupons
  (code, discount_type, discount_value, min_order_amount, is_first_order_only, per_user_limit, is_active)
values
  ('WELCOME50', 'flat', 50, 199, true, 1, true)
on conflict (code) do nothing;

-- -------------------------------------------------------
-- 7. Subscriptions table
-- -------------------------------------------------------
create table if not exists public.subscriptions (
  id                 uuid         primary key default gen_random_uuid(),
  user_id            uuid         not null references public.users(id) on delete cascade,
  menu_item_id       uuid         not null references public.menu_items(id),
  delivery_slot      text         not null check (delivery_slot in ('morning', 'afternoon', 'evening')),
  frequency          text         not null default 'daily'
                                    check (frequency in ('daily', 'weekdays', 'weekends')),
  duration_days      integer      not null default 7,
  start_date         date         not null default current_date,
  end_date           date,
  status             text         not null default 'active'
                                    check (status in ('active', 'cancelled', 'pending_payment')),
  payment_status     text         not null default 'pending_payment',
  payment_id         text,
  razorpay_order_id  text,
  refund_amount      numeric(8,2) not null default 0,
  price_per_delivery numeric(8,2) not null,
  total_price        numeric(8,2) not null,
  address            jsonb,
  created_at         timestamptz  not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions: read own"    on public.subscriptions;
drop policy if exists "subscriptions: insert own"  on public.subscriptions;
drop policy if exists "subscriptions: update own"  on public.subscriptions;
drop policy if exists "subscriptions: admin read"  on public.subscriptions;

create policy "subscriptions: read own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subscriptions: insert own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "subscriptions: update own" on public.subscriptions
  for update using (auth.uid() = user_id);

create policy "subscriptions: admin read" on public.subscriptions
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
