-- 1. Meetings Table to store leadership sessions
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  transcript TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- duration, strategic_advice, decisions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see meetings in their org" ON meetings FOR SELECT USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

-- Trigger for org_id (Reusing your existing organizational trigger)
CREATE TRIGGER tr_set_meetings_org_id BEFORE INSERT ON meetings FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();