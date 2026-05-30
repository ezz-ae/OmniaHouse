-- Orders · slice 2.5 schema alignment
--
-- Brings order_submissions level with the Prisma model + this slice's needs.
-- Every column is added with IF NOT EXISTS so re-running is safe; the FK
-- to customers(id) closes the loop between WhatsApp Extract save and the
-- Orders queue so the Customer 360 page can list a customer's real orders.

ALTER TABLE order_submissions
  ADD COLUMN IF NOT EXISTS customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intent        TEXT,
  ADD COLUMN IF NOT EXISTS language      TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS source        TEXT,
  ADD COLUMN IF NOT EXISTS target_store  TEXT,
  ADD COLUMN IF NOT EXISTS country       TEXT,
  ADD COLUMN IF NOT EXISTS total_aed     NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS flags         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS shopify_draft_id     TEXT,
  ADD COLUMN IF NOT EXISTS woocommerce_order_id TEXT,
  ADD COLUMN IF NOT EXISTS notes         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS due_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS order_submissions_org_status_idx
  ON order_submissions (org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_submissions_customer_id_idx
  ON order_submissions (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_submissions_org_phone_idx
  ON order_submissions (org_id, phone);
CREATE INDEX IF NOT EXISTS order_submissions_flags_gin_idx
  ON order_submissions USING GIN (flags);

-- Auto-bump updated_at on row updates.
CREATE OR REPLACE FUNCTION public.set_order_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_order_submissions_updated_at ON order_submissions;
CREATE TRIGGER tr_order_submissions_updated_at
  BEFORE UPDATE ON order_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_order_submissions_updated_at();
