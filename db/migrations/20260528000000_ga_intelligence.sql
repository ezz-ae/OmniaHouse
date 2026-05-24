-- 1. GA Behavioral Events (Receiver for Storefront interactions)
CREATE TABLE ga_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- If logged in
  event_name TEXT NOT NULL, -- 'add_to_cart', 'click_button', 'payment_attempt'
  page_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store button labels, cart values, CCV fail counts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Intelligence Decisions
-- Stores the AI's conclusions about specific users/sessions
CREATE TABLE user_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT,
  decision_type TEXT NOT NULL, -- 'fraud_flag', 'cart_recovery', 'window_shopper'
  risk_score INTEGER DEFAULT 0, -- 1 to 100
  reasoning TEXT,
  actionable_insight TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ga_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_intelligence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Management can see behavioral intel"
  ON user_intelligence FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

-- Trigger for org_id (Reusing existing trigger function)
CREATE TRIGGER tr_set_ga_events_org_id
  BEFORE INSERT ON ga_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_submission_org_id();