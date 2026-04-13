-- -------------------------------------------------------
-- Phone OTP Verification System
-- -------------------------------------------------------

-- 1. Add verification flag to users
alter table public.users
  add column if not exists is_phone_verified boolean not null default false;

-- 2. Create OTP storage table
create table if not exists public.phone_otps (
  id          uuid         primary key default gen_random_uuid(),
  phone       text         not null,
  code        text         not null,
  expires_at  timestamptz  not null,
  verified    boolean      not null default false,
  created_at  timestamptz  not null default now()
);

-- Index for fast lookup by phone
create index if not exists idx_phone_otps_phone on public.phone_otps(phone);

-- RLS: Only service role should manage OTPs usually, 
-- but we can allow authenticated users to read their own if needed.
-- For now, let's keep it strictly server-side managed via API routes using service role or defined keys.
alter table public.phone_otps enable row level security;
