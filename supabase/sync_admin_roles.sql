-- ============================================================
-- Run this ONCE to sync app_metadata.role for all existing
-- admin users so the middleware can read it from the JWT.
-- ============================================================
-- This calls the internal Supabase auth admin API via SQL.
-- It updates auth.users.raw_app_meta_data for every user
-- whose public.users.role = 'admin'.

do $$
declare
  r record;
begin
  for r in
    select id from public.users where role = 'admin'
  loop
    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    where id = r.id;
  end loop;
end
$$;
