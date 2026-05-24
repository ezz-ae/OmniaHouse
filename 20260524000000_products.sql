CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  sku TEXT,
  normalized_sku TEXT,
  title TEXT NOT NULL,
  master_title TEXT,
  price_aed DECIMAL(12,2),
  stock_qty INTEGER,
  category_path TEXT,
  image_url TEXT,
  source TEXT, -- 'shopify', 'woocommerce', 'manual'
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  seo_title TEXT,
  seo_description TEXT,
  seo_status TEXT DEFAULT 'pending', -- 'pending', 'optimized', 'indexed'
  google_shopping_status TEXT DEFAULT 'pending',
  ai_audit_notes JSONB DEFAULT '{}'::jsonb -- Stores product page weakness flags
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products in their org"
  ON products FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));