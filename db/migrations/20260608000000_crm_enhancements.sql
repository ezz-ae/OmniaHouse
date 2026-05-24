-- 1. Extend Order Submissions for CRM Grouping
ALTER TABLE order_submissions 
ADD COLUMN labels TEXT[] DEFAULT '{}',
ADD COLUMN is_archived BOOLEAN DEFAULT false,
ADD COLUMN assigned_agent_id UUID REFERENCES auth.users(id);

-- 2. CRM Ghost Analysis: Linking Sessions to Identity
-- This table links a known Customer ID to multiple GA Session IDs
CREATE TABLE crm_identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL, -- The anchor identity (normalized)
  session_id TEXT NOT NULL,      -- The ghost identity from cookies/GA
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_phone, session_id)
);

-- 3. CRM Shortcuts Table
CREATE TABLE crm_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL, -- e.g., "/welcome"
  content TEXT NOT NULL,      -- The expanded text
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE crm_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see org shortcuts" ON crm_shortcuts FOR SELECT USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Users can see org identity links" ON crm_identity_links FOR SELECT USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER tr_set_crm_identity_links_org_id BEFORE INSERT ON crm_identity_links FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();
CREATE TRIGGER tr_set_crm_shortcuts_org_id BEFORE INSERT ON crm_shortcuts FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();