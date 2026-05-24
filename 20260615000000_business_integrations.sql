-- 1. Storefront & Payment Integrations
CREATE TABLE org_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'shopify', 'woocommerce', 'telr', 'stripe', 'tabby', 'tamara'
  api_key TEXT, -- Should be encrypted or reference env var in production
  api_secret TEXT,
  webhook_secret TEXT,
  base_url TEXT,
  status TEXT DEFAULT 'disconnected', -- 'active', 'error', 'disconnected'
  metadata JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider)
);

-- 2. Enable RLS
ALTER TABLE org_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and Admins can manage integrations"
  ON org_integrations FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Owner', 'Admin'))
    )
  );