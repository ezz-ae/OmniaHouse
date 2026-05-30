-- Inventory · slice 3 schema alignment + sync run log
--
-- Brings products level with the Prisma model + the live-scrape adapter,
-- and adds a live_catalogue_runs table so we can audit when the scrape
-- ran and how many rows it touched.
--
-- Every column is added with IF NOT EXISTS so re-running is safe. The
-- earlier products migration declared a one-row-per-source layout (sku +
-- source + price_aed); the live scrape and the Inventory room expect a
-- unified row per product (on_shopify + on_woocommerce + shopify_price_aed
-- + woocommerce_price_aed). This migration adds the unified columns. The
-- legacy single-source columns stay so any existing data isn't lost; the
-- sync job populates the new unified columns from the live scrape going
-- forward.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS display_title         TEXT,
  ADD COLUMN IF NOT EXISTS material              TEXT,
  ADD COLUMN IF NOT EXISTS category              TEXT,
  ADD COLUMN IF NOT EXISTS on_shopify            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_woocommerce        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shopify_price_aed     NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS woocommerce_price_aed NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS shopify_qty           INT,
  ADD COLUMN IF NOT EXISTS woocommerce_qty       INT,
  ADD COLUMN IF NOT EXISTS shopify_url           TEXT,
  ADD COLUMN IF NOT EXISTS woocommerce_url       TEXT,
  ADD COLUMN IF NOT EXISTS parity_status         TEXT NOT NULL DEFAULT 'unclassified',
  ADD COLUMN IF NOT EXISTS price_delta_pct       NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS last_synced_at        TIMESTAMPTZ DEFAULT NOW();

-- Natural key per org. The live scrape sometimes returns null SKUs (Meta
-- products without a SKU set) — those rows live keyed by title fingerprint
-- in metadata; the partial index ignores them so the unique constraint
-- doesn't fire on the title-key set.
CREATE UNIQUE INDEX IF NOT EXISTS products_org_sku_unique_idx
  ON products (org_id, sku) WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX IF NOT EXISTS products_org_parity_idx
  ON products (org_id, parity_status);
CREATE INDEX IF NOT EXISTS products_org_category_idx
  ON products (org_id, category);
CREATE INDEX IF NOT EXISTS products_org_le_idx
  ON products (org_id, is_limited_edition) WHERE is_limited_edition = true;
CREATE INDEX IF NOT EXISTS products_org_drift_idx
  ON products (org_id, price_delta_pct DESC) WHERE parity_status = 'both_price_drift';

-- Auto-bump updated_at on any update.
CREATE OR REPLACE FUNCTION public.set_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_products_updated_at ON products;
CREATE TRIGGER tr_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_products_updated_at();

-- ─── Live catalogue run log ───────────────────────────────────────────────
-- One row per scrape. Lets the Inventory room show "last sync 3 min ago"
-- and the Hex notebook chart freshness over time.

CREATE TABLE IF NOT EXISTS live_catalogue_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at        TIMESTAMPTZ,
  shopify_rows       INT NOT NULL DEFAULT 0,
  woocommerce_rows   INT NOT NULL DEFAULT 0,
  unified_rows       INT NOT NULL DEFAULT 0,
  inserted_rows      INT NOT NULL DEFAULT 0,
  updated_rows       INT NOT NULL DEFAULT 0,
  drift_rows         INT NOT NULL DEFAULT 0,
  errors             JSONB NOT NULL DEFAULT '[]'::jsonb,
  triggered_by       TEXT,  -- 'manual' | 'cron' | 'inventory_room_refresh'
  status             TEXT NOT NULL DEFAULT 'running'  -- 'running' | 'ok' | 'failed'
);
CREATE INDEX IF NOT EXISTS live_catalogue_runs_org_started_idx
  ON live_catalogue_runs (org_id, started_at DESC);

ALTER TABLE live_catalogue_runs ENABLE ROW LEVEL SECURITY;
