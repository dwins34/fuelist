-- ============================================================
-- Fuelist — Analytics & Refunds Migration
-- Run after growth_features.sql
-- ============================================================

-- ── 1. Refunds table ─────────────────────────────────────────────────────────
create table if not exists public.refunds (
  id                  uuid         primary key default gen_random_uuid(),
  order_id            uuid         references public.orders(id) on delete set null,
  subscription_id     uuid         references public.subscriptions(id) on delete set null,
  razorpay_refund_id  text         unique,
  razorpay_payment_id text,
  amount              numeric(10,2) not null,
  status              text         not null default 'pending'
                        check (status in ('pending', 'processed', 'failed')),
  reason              text,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),
  constraint refunds_one_source check (
    (order_id is not null)::int + (subscription_id is not null)::int = 1
  )
);

alter table public.refunds enable row level security;

create policy "refunds: admin all" on public.refunds
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "refunds: user read own" on public.refunds
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = refunds.order_id and o.user_id = auth.uid()
    )
  );

-- ── 2. Idempotency key for Razorpay webhooks (prevents duplicate processing) ─
create table if not exists public.webhook_events (
  id             text         primary key,  -- razorpay event id
  event_type     text         not null,
  processed_at   timestamptz  not null default now()
);

alter table public.webhook_events enable row level security;

create policy "webhook_events: admin read" on public.webhook_events
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Service role only inserts (webhook handler uses service role key)
create policy "webhook_events: service insert" on public.webhook_events
  for insert with check (true);

-- ── 3. Performance indexes ────────────────────────────────────────────────────
create index if not exists orders_created_at_idx        on public.orders(created_at desc);
create index if not exists orders_payment_status_idx    on public.orders(payment_status);
create index if not exists orders_user_id_idx           on public.orders(user_id);
create index if not exists subscriptions_created_at_idx on public.subscriptions(created_at desc);
create index if not exists subscriptions_status_idx     on public.subscriptions(status);
create index if not exists refunds_order_id_idx         on public.refunds(order_id);
create index if not exists refunds_created_at_idx       on public.refunds(created_at desc);

-- ── 4. Analytics helper: daily revenue view ──────────────────────────────────
create or replace view public.admin_daily_revenue as
  select
    date_trunc('day', created_at at time zone 'Asia/Kolkata') as day,
    'normal'::text                                             as order_type,
    count(*)                                                   as order_count,
    coalesce(sum(total_amount), 0)                             as revenue
  from public.orders
  where payment_status in ('paid', 'free')
  group by 1, 2

  union all

  select
    date_trunc('day', created_at at time zone 'Asia/Kolkata') as day,
    'subscription'::text                                       as order_type,
    count(*)                                                   as order_count,
    coalesce(sum(total_price), 0)                              as revenue
  from public.subscriptions
  where payment_status = 'paid'
  group by 1, 2;

-- ── 5. Add 'refunded' to orders status check if not already ──────────────────
do $$
declare
  cname text;
begin
  -- Drop every existing CHECK constraint that mentions 'status' on orders
  for cname in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint if exists %I', cname);
  end loop;

  -- Re-add with 'refunded' included (only if status column exists)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'orders'
      and column_name  = 'status'
  ) then
    execute $sql$
      alter table public.orders
        add constraint orders_status_check
        check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'refunded'))
    $sql$;
  end if;
end
$$;
