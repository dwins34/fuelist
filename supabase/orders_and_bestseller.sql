-- ============================================================
-- Fuelist — Orders & Bestseller migration
-- Run in Supabase SQL editor after schema.sql
-- ============================================================

-- -------------------------------------------------------
-- 1. Add is_bestseller column to menu_items
-- -------------------------------------------------------
alter table public.menu_items
  add column if not exists is_bestseller boolean not null default false;

-- -------------------------------------------------------
-- 2. Orders table
-- -------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users (id) on delete set null,
  items            jsonb not null default '[]',
  total_price      numeric(10, 2) not null default 0,
  status           text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  whatsapp_message text not null default '',
  created_at       timestamptz default now()
);

alter table public.orders enable row level security;

-- Logged-in users can insert their own orders
create policy "orders: user insert" on public.orders
  for insert with check (
    auth.uid() = user_id or user_id is null
  );

-- Users can read their own orders
create policy "orders: user read own" on public.orders
  for select using (auth.uid() = user_id);

-- Admins can read all orders
create policy "orders: admin read all" on public.orders
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Admins can update order status
create policy "orders: admin update" on public.orders
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );
