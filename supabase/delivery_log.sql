-- Table to track individual deliveries for both one-off orders and recurring subscriptions
CREATE TABLE IF NOT EXISTS public.delivery_log (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid         REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    order_id        uuid         REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id         uuid         NOT NULL REFERENCES public.users(id),
    delivery_date   date         NOT NULL DEFAULT current_date,
    delivery_slot   text         NOT NULL CHECK (delivery_slot IN ('morning', 'afternoon', 'evening')),
    status          text         NOT NULL DEFAULT 'preparing' 
                                 CHECK (status IN ('preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
    items           jsonb        NOT NULL, -- Snapshotted items for this delivery
    total_amount    numeric(8,2) NOT NULL DEFAULT 0,
    address         jsonb,
    updated_at      timestamptz  DEFAULT now(),
    created_at      timestamptz  DEFAULT now()
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_delivery_log_date ON public.delivery_log(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON public.delivery_log(status);

-- Enable RLS
ALTER TABLE public.delivery_log ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Users can read their own delivery logs
CREATE POLICY "Users can read own delivery logs"
ON public.delivery_log FOR SELECT
USING (auth.uid() = user_id);

-- 2. Admins and Kitchen staff can manage all delivery logs
CREATE POLICY "Admins and Kitchen can manage all delivery logs"
ON public.delivery_log FOR ALL
USING (
    exists (
        select 1 from public.users u 
        where u.id = auth.uid() 
        and (u.role = 'admin' or u.role = 'kitchen' or u.role = 'delivery')
    )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_delivery_log_updated_at
    BEFORE UPDATE ON public.delivery_log
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
