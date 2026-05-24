-- Create backyard_milestones table for targets and paid events
CREATE TABLE backyard_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Omnia/Owner
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Target Person (if individual)
  target_role_id UUID REFERENCES roles(id) ON DELETE SET NULL, -- Target Team (if role-based)
  title TEXT NOT NULL,
  description TEXT,
  reward_aed DECIMAL(12,2) DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE backyard_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can see relevant milestones"
  ON backyard_milestones FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()) AND (
      is_private = false OR 
      owner_id = auth.uid() OR 
      creator_id = auth.uid() OR
      target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

-- Trigger for org_id population
CREATE TRIGGER tr_set_backyard_milestones_org_id
  BEFORE INSERT ON backyard_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_submission_org_id();