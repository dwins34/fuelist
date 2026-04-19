-- ============================================================
-- Fuelist — Kitchen Display System (KDS) Migration
-- Run after analytics.sql
-- ============================================================

-- ── 1. Staff table ────────────────────────────────────────────────────────────
create table if not exists public.staff (
  id                  uuid         primary key default gen_random_uuid(),
  name                text         not null,
  role                text         not null default 'kitchen'
                        check (role in ('kitchen', 'delivery', 'manager')),
  is_active           boolean      not null default true,
  active_orders_count int          not null default 0,
  created_at          timestamptz  not null default now()
);

alter table public.staff enable row level security;

create policy "staff: admin all" on public.staff
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','kitchen'))
  );

-- ── 2. Add KDS columns to orders ─────────────────────────────────────────────
alter table public.orders
  add column if not exists estimated_prep_time  int          default 0,
  add column if not exists priority_score       float        default 0,
  add column if not exists assigned_staff_id    uuid         references public.staff(id) on delete set null,
  add column if not exists assigned_at          timestamptz,
  add column if not exists order_status         text         default 'new'
    check (order_status in ('new','preparing','ready','out_for_delivery','delivered','cancelled','refunded')),
  add column if not exists updated_at           timestamptz  default now();

-- ── 3. Update trigger: keep updated_at fresh ─────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ── 4. Prep time calculation function ────────────────────────────────────────
-- complexity: 'simple'=1x, 'medium'=1.5x, 'complex'=2x
-- base = 5 min per item; +2 min per active order in kitchen (load factor)
create or replace function public.calculate_prep_time(
  p_items         jsonb,
  p_active_orders int default 0
) returns int language plpgsql as $$
declare
  v_base_minutes  int  := 0;
  v_load_penalty  int;
  v_item          jsonb;
  v_qty           int;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::int, 1);
    v_base_minutes := v_base_minutes + (5 * v_qty);
  end loop;

  -- Kitchen load: +1 min per 2 active orders
  v_load_penalty := (p_active_orders / 2);
  return greatest(5, v_base_minutes + v_load_penalty);
end;
$$;

-- ── 5. Priority score function ────────────────────────────────────────────────
-- Higher score = higher priority
-- Score = wait_minutes + (delay_penalty if overdue) + (item_count bonus)
create or replace function public.calculate_priority_score(
  p_created_at        timestamptz,
  p_estimated_prep    int,
  p_item_count        int default 1
) returns float language plpgsql as $$
declare
  v_wait_minutes  float;
  v_delay_penalty float := 0;
begin
  v_wait_minutes := extract(epoch from (now() - p_created_at)) / 60;

  -- Extra penalty if overdue
  if v_wait_minutes > p_estimated_prep then
    v_delay_penalty := (v_wait_minutes - p_estimated_prep) * 2;
  end if;

  return round((v_wait_minutes + v_delay_penalty + (p_item_count * 0.5))::numeric, 2);
end;
$$;

-- ── 6. Auto-recalculate priority on order update ──────────────────────────────
create or replace function public.refresh_priority_score()
returns trigger language plpgsql as $$
declare
  v_item_count int;
begin
  v_item_count := coalesce(jsonb_array_length(new.items), 1);
  new.priority_score := public.calculate_priority_score(
    new.created_at,
    coalesce(new.estimated_prep_time, 10),
    v_item_count
  );
  return new;
end;
$$;

drop trigger if exists orders_priority_refresh on public.orders;
create trigger orders_priority_refresh
  before update on public.orders
  for each row execute function public.refresh_priority_score();

-- ── 7. Staff active_orders_count sync ────────────────────────────────────────
create or replace function public.sync_staff_order_count()
returns trigger language plpgsql as $$
begin
  -- Decrement old staff count if reassigned or completed
  if (old.assigned_staff_id is not null) and
     (old.assigned_staff_id is distinct from new.assigned_staff_id or
      new.order_status in ('delivered','cancelled','refunded'))
  then
    update public.staff
    set active_orders_count = greatest(0, active_orders_count - 1)
    where id = old.assigned_staff_id;
  end if;

  -- Increment new staff count on assignment
  if new.assigned_staff_id is not null and
     new.assigned_staff_id is distinct from old.assigned_staff_id and
     new.order_status not in ('delivered','cancelled','refunded')
  then
    update public.staff
    set active_orders_count = active_orders_count + 1
    where id = new.assigned_staff_id;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_staff_count_sync on public.orders;
create trigger orders_staff_count_sync
  after update on public.orders
  for each row execute function public.sync_staff_order_count();

-- ── 8. Indexes ────────────────────────────────────────────────────────────────
create index if not exists orders_order_status_idx      on public.orders(order_status);
create index if not exists orders_priority_score_idx    on public.orders(priority_score desc);
create index if not exists orders_assigned_staff_idx    on public.orders(assigned_staff_id);
create index if not exists staff_is_active_idx          on public.staff(is_active);
