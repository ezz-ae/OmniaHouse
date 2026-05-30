-- CRM customers · slice 2 of the ownership run
--
-- Until now "customer" was implicit: a phone number scattered across
-- order_submissions, ai_extractions, customer_wallets and crm_identity_links.
-- For real CRM work we need a first-class row per customer that the
-- WhatsApp Desk's "Save customer profile" button writes to, that the
-- /customers/[id] page reads from, and that the Shopify/Woo enrichment
-- merges onto.
--
-- Phone is the business key (per org). Platform ids live alongside so we
-- can deep-link to Shopify or Woo admin without a second lookup.

CREATE TABLE customers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identity
  phone                    TEXT NOT NULL,
  whatsapp_number          TEXT,
  email                    TEXT,
  shopify_customer_id      TEXT,
  woocommerce_customer_id  TEXT,
  whatsapp_wa_id           TEXT,
  instagram_handle         TEXT,

  -- Profile
  name                     TEXT,
  country                  TEXT,            -- AE / SA / KW / BH / QA / OM / OTHER
  language                 TEXT NOT NULL DEFAULT 'en',
  city                     TEXT,
  source                   TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp | shopify | woocommerce | manual | sync
  customer_type            TEXT NOT NULL DEFAULT 'new',      -- new | returning | vip

  -- Flags + tags
  vip                      BOOLEAN NOT NULL DEFAULT false,
  marketing_consent        BOOLEAN NOT NULL DEFAULT true,
  whatsapp_promo_consent   BOOLEAN NOT NULL DEFAULT true,
  tags                     TEXT[]  NOT NULL DEFAULT '{}',
  finance_flags            TEXT[]  NOT NULL DEFAULT '{}',

  -- Cached aggregates (kept in sync by triggers + jobs; never the truth)
  ltv_aed                  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  orders_count             INT  NOT NULL DEFAULT 0,
  last_order_at            TIMESTAMPTZ,
  first_seen_at            TIMESTAMPTZ DEFAULT NOW(),
  last_touch_at            TIMESTAMPTZ,

  -- Audit
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID,
  updated_by               UUID,

  -- Phone is unique per org
  UNIQUE (org_id, phone)
);

CREATE INDEX customers_org_name_idx
  ON customers (org_id, name);
CREATE INDEX customers_org_email_idx
  ON customers (org_id, email)
  WHERE email IS NOT NULL;
CREATE INDEX customers_org_shopify_idx
  ON customers (org_id, shopify_customer_id)
  WHERE shopify_customer_id IS NOT NULL;
CREATE INDEX customers_org_woo_idx
  ON customers (org_id, woocommerce_customer_id)
  WHERE woocommerce_customer_id IS NOT NULL;
CREATE INDEX customers_org_vip_idx
  ON customers (org_id) WHERE vip = true;
CREATE INDEX customers_org_last_order_idx
  ON customers (org_id, last_order_at DESC);

-- Generic touched-updated_at trigger
CREATE OR REPLACE FUNCTION public.set_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION public.set_customers_updated_at();

-- Enable RLS so policies (separate spec) can attach. The webhook + the
-- WhatsApp Desk's save flow use the service-role key which bypasses RLS;
-- browser reads will land via /api/customers/* once policies exist.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
