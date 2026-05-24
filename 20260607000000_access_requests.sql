-- 1. Access Requests Table
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Requester
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approver_id UUID REFERENCES auth.users(id),
  ai_snapshot JSONB DEFAULT '{}'::jsonb, -- AI recorded state at time of delivery
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own requests"
  ON access_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Management can see all requests"
  ON access_requests FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Owner', 'Admin'))
    )
  );

-- 3. Trigger for org_id
CREATE TRIGGER tr_set_access_requests_org_id 
  BEFORE INSERT ON access_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_order_submission_org_id();

-- Add Access Control Room to Seed
INSERT INTO rooms (name, slug, icon, sort_order) 
VALUES ('Access Control', 'access-control', 'Lock', 13)
ON CONFLICT (slug) DO NOTHING;