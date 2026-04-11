-- ============================================================
-- Fuelist — Persistent cart table
-- Run in Supabase SQL editor
-- ============================================================

create table if not exists public.carts (
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_id    uuid not null references public.menu_items (id) on delete cascade,
  quantity   integer not null default 1 check (quantity > 0),
  updated_at timestamptz default now(),
  primary key (user_id, item_id)
);

alter table public.carts enable row level security;

-- Users can only access their own cart
create policy "carts: select own" on public.carts
  for select using (auth.uid() = user_id);

create policy "carts: insert own" on public.carts
  for insert with check (auth.uid() = user_id);

create policy "carts: update own" on public.carts
  for update using (auth.uid() = user_id);

create policy "carts: delete own" on public.carts
  for delete using (auth.uid() = user_id);
