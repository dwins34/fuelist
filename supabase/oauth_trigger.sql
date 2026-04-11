-- ============================================================
-- Fuelist — OAuth / Auth trigger
-- Run this ONCE in Supabase SQL editor after schema.sql
-- ============================================================
-- This function fires every time a new user signs up — whether
-- via email/password OR any OAuth provider (Google, GitHub…).
-- It creates the matching row in public.users automatically,
-- so the app never has to do it manually.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',   -- Google
      new.raw_user_meta_data->>'name',         -- GitHub
      split_part(coalesce(new.email, ''), '@', 1)  -- fallback: email prefix
    ),
    coalesce(new.email, ''),
    'user'
  )
  on conflict (id) do nothing;  -- don't overwrite existing rows (preserves role)
  return new;
end;
$$;

-- Drop first so re-running this file is safe
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
