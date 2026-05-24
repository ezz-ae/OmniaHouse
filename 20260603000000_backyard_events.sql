-- Create backyard_events table for community milestones
CREATE TABLE backyard_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'marriage', 'birthday', 'graduation', 'work_anniversary', 'life_milestone'
  event_date DATE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'public', 'private'
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE backyard_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can see public events in their org"
  ON backyard_events FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()) AND (status = 'public' OR user_id = auth.uid()));

CREATE POLICY "Users can insert their own events"
  ON backyard_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trigger for org_id population
CREATE TRIGGER tr_set_backyard_events_org_id
  BEFORE INSERT ON backyard_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_submission_org_id();