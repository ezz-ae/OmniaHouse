-- Create brand_intelligence table for marketing and strategic insights
CREATE TABLE brand_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'google_keyword', 'meta_segment', 'google_ads_perf', 'drive_ref', 'sentiment'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE brand_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view intelligence in their org"
  ON brand_intelligence FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

-- Trigger to automatically populate org_id from user_roles
CREATE TRIGGER tr_set_brand_intelligence_org_id
  BEFORE INSERT ON brand_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_submission_org_id();

-- Note: We reuse public.set_order_submission_org_id() as it is 
-- a generic trigger function that populates org_id based on user_id
-- previously defined in the 20260525 migration.