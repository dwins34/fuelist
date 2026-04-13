-- ============================================================
-- Fuelist — Multi-Address System Migration
-- ============================================================

-- 1. Create the new user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Other', -- 'Home', 'Work', 'Other'
  house_number text NOT NULL,
  street_address text NOT NULL,
  city text NOT NULL,
  state text,
  pincode text NOT NULL,
  landmark text,
  lat numeric,
  lng numeric,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "addresses: read own" ON public.user_addresses;
CREATE POLICY "addresses: read own" ON public.user_addresses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "addresses: insert own" ON public.user_addresses;
CREATE POLICY "addresses: insert own" ON public.user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "addresses: update own" ON public.user_addresses;
CREATE POLICY "addresses: update own" ON public.user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "addresses: delete own" ON public.user_addresses;
CREATE POLICY "addresses: delete own" ON public.user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- 4. RPC to efficiently set a default address and unset others for the current user
CREATE OR REPLACE FUNCTION public.set_default_address(target_address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id for the target address and verify ownership
  SELECT user_id INTO v_user_id 
  FROM public.user_addresses 
  WHERE id = target_address_id AND user_id = auth.uid();

  IF v_user_id IS NOT NULL THEN
    -- Unset previous defaults
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = v_user_id AND is_default = true;

    -- Set the new default
    UPDATE public.user_addresses
    SET is_default = true
    WHERE id = target_address_id;
  END IF;
END;
$$;

-- 5. Data Migration from users to user_addresses
-- Only migrate if the user has an address_line1 and they don't already have entries in user_addresses
INSERT INTO public.user_addresses (user_id, label, house_number, street_address, city, state, pincode, landmark, is_default)
SELECT 
  id as user_id,
  'Home' as label,
  address_line1 as house_number,
  COALESCE(address_line2, '') as street_address,
  city,
  state,
  pincode,
  landmark,
  true as is_default
FROM public.users
WHERE NULLIF(trim(address_line1), '') IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_addresses ua WHERE ua.user_id = users.id
);
