-- ============================================================
-- Fuelist — Supabase Schema
-- Run this in your Supabase SQL editor (Settings > SQL editor)
-- ============================================================

-- -------------------------------------------------------
-- 1. Users table (mirrors auth.users)
-- -------------------------------------------------------
create table if not exists public.users (
  id        uuid primary key references auth.users (id) on delete cascade,
  name      text not null,
  email     text not null unique,
  role      text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

-- Users can read their own profile
create policy "users: read own" on public.users
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "users: update own" on public.users
  for update using (auth.uid() = id);

-- Allow inserts during signup (service role / edge function also fine)
create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);

-- Admins can read all users
create policy "users: admin read all" on public.users
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- -------------------------------------------------------
-- 2. Menu items table
-- -------------------------------------------------------
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text not null check (category in ('fruit', 'breakfast', 'power')),
  price        numeric(8, 2) not null default 0,
  calories     integer not null default 0,
  protein      numeric(5, 1) not null default 0,
  carbs        numeric(5, 1) not null default 0,
  fats         numeric(5, 1) not null default 0,
  ingredients  text[] not null default '{}',
  image_url    text not null default '',
  is_available boolean not null default true,
  created_at   timestamptz default now()
);

alter table public.menu_items enable row level security;

-- Anyone can read available menu items
create policy "menu: public read" on public.menu_items
  for select using (true);

-- Only admins can insert / update / delete
create policy "menu: admin insert" on public.menu_items
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "menu: admin update" on public.menu_items
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "menu: admin delete" on public.menu_items
  for delete using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- -------------------------------------------------------
-- 3. Seed data — realistic menu items
-- -------------------------------------------------------
insert into public.menu_items
  (name, category, price, calories, protein, carbs, fats, ingredients, image_url, is_available)
values

-- Fruit Bowls
(
  'Delight Fruit Bowl',
  'fruit', 199, 280, 4.5, 58, 3.2,
  array['Mango', 'Banana', 'Strawberry', 'Blueberry', 'Honey', 'Granola'],
  'https://images.unsplash.com/photo-1546548970-71785318a17b?w=600&q=80',
  true
),
(
  'Paradise Bowl',
  'fruit', 229, 320, 5.0, 65, 4.0,
  array['Dragon Fruit', 'Mango', 'Pineapple', 'Coconut Flakes', 'Chia Seeds', 'Honey'],
  'https://images.unsplash.com/photo-1490323914169-4b83f8548e6c?w=600&q=80',
  true
),
(
  'Detox Bowl',
  'fruit', 219, 260, 4.0, 52, 3.5,
  array['Watermelon', 'Cucumber', 'Mint', 'Lime Juice', 'Kiwi', 'Chia Seeds'],
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80',
  true
),
(
  'Tropical Bliss',
  'fruit', 239, 310, 4.8, 62, 4.5,
  array['Papaya', 'Pineapple', 'Mango', 'Passion Fruit', 'Coconut Milk', 'Granola'],
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  true
),

-- Breakfast Bowls
(
  'Oats Overnight Bowl',
  'breakfast', 179, 420, 14.0, 68, 8.5,
  array['Rolled Oats', 'Almond Milk', 'Chia Seeds', 'Banana', 'Peanut Butter', 'Honey'],
  'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80',
  true
),
(
  'Paneer Poha Bowl',
  'breakfast', 189, 380, 18.0, 55, 9.0,
  array['Flattened Rice', 'Paneer', 'Onion', 'Peas', 'Curry Leaves', 'Mustard Seeds', 'Lemon'],
  'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80',
  true
),
(
  'Acai Sunrise Bowl',
  'breakfast', 249, 390, 9.0, 72, 7.0,
  array['Acai Puree', 'Banana', 'Granola', 'Coconut Flakes', 'Almond Butter', 'Hemp Seeds'],
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  true
),
(
  'Greek Yogurt Crunch',
  'breakfast', 199, 350, 20.0, 45, 6.0,
  array['Greek Yogurt', 'Mixed Berries', 'Granola', 'Almonds', 'Honey', 'Flax Seeds'],
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
  true
),

-- Power Bowls
(
  'Gym Burrito Bowl',
  'power', 299, 620, 42.0, 65, 14.0,
  array['Brown Rice', 'Grilled Chicken', 'Black Beans', 'Avocado', 'Salsa', 'Greek Yogurt', 'Corn'],
  'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80',
  true
),
(
  'Quinoa Power Bowl',
  'power', 279, 540, 28.0, 58, 16.0,
  array['Quinoa', 'Roasted Chickpeas', 'Spinach', 'Cherry Tomatoes', 'Avocado', 'Tahini', 'Lemon'],
  'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80',
  true
),
(
  'Muscle Builder Bowl',
  'power', 319, 680, 50.0, 62, 18.0,
  array['Sweet Potato', 'Grilled Paneer', 'Lentils', 'Kale', 'Pumpkin Seeds', 'Turmeric Dressing'],
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  true
),
(
  'Warrior Bowl',
  'power', 289, 580, 35.0, 60, 15.0,
  array['Brown Rice', 'Edamame', 'Tofu', 'Shredded Carrot', 'Cucumber', 'Sesame', 'Miso Dressing'],
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80',
  false
);
