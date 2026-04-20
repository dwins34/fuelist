-- ═══════════════════════════════════════════════════════════════════════════
-- Fuelist — Subscription ↔ Kitchen sync
-- Run each block separately in Supabase SQL Editor if one fails
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BLOCK 1: Add missing columns to delivery_log ─────────────────────────────
-- (subscription_id and order_id already exist per LiveOrder type)
-- Only add if truly missing:

ALTER TABLE delivery_log
  ADD COLUMN IF NOT EXISTS assigned_staff_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_at       timestamptz;

-- ── BLOCK 2: Add refund_amount to subscriptions if missing ───────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10,2);

-- ── BLOCK 3: refunds table ───────────────────────────────────────────────────
-- Drop first to avoid stale schema from a previous partial run
DROP TABLE IF EXISTS refunds CASCADE;

CREATE TABLE refunds (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id    uuid        REFERENCES subscriptions(id) ON DELETE SET NULL,
  order_id           uuid        REFERENCES orders(id)        ON DELETE SET NULL,
  user_id            uuid        NOT NULL,
  amount             numeric(10,2) NOT NULL CHECK (amount >= 0),
  status             text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','processing','completed','failed')),
  razorpay_refund_id text,
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refunds_subscription_id_idx ON refunds(subscription_id);
CREATE INDEX refunds_user_id_idx         ON refunds(user_id);

-- ── BLOCK 4: Trigger — cancel delivery_log when subscription cancelled ────────
CREATE OR REPLACE FUNCTION cancel_future_delivery_logs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  today_str text;
BEGIN
  today_str := to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');

  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE delivery_log
    SET    status = 'cancelled'
    WHERE  subscription_id = NEW.id
      AND  delivery_date   >= today_str
      AND  status NOT IN ('delivered', 'cancelled');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_delivery_logs ON subscriptions;
CREATE TRIGGER trg_cancel_delivery_logs
  AFTER UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION cancel_future_delivery_logs();

-- ── BLOCK 5: Trigger — insert refund record when subscription cancelled ────────
-- Uses sub-select to get user_id from subscriptions safely
CREATE OR REPLACE FUNCTION record_subscription_refund()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_amount  numeric;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    -- Read directly from NEW row
    v_user_id := NEW.user_id;
    v_amount  := COALESCE(NEW.refund_amount, 0);

    IF v_user_id IS NOT NULL AND v_amount > 0 THEN
      INSERT INTO refunds (subscription_id, user_id, amount, status, reason)
      VALUES (NEW.id, v_user_id, v_amount, 'pending', 'Subscription cancelled by user')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_refund ON subscriptions;
CREATE TRIGGER trg_record_refund
  AFTER UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION record_subscription_refund();

-- ── BLOCK 6: Enable Realtime on delivery_log ─────────────────────────────────
-- If this line fails, enable it from:
-- Dashboard → Database → Replication → Tables → Add delivery_log
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_log;

-- ── BLOCK 7: RLS for refunds ─────────────────────────────────────────────────
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refunds_user_select ON refunds;
CREATE POLICY refunds_user_select ON refunds
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS refunds_admin_all ON refunds;
CREATE POLICY refunds_admin_all ON refunds
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'kitchen')
  );
