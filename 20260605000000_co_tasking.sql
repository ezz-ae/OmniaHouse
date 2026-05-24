-- 1. Co-Tasking Table (Help Requests)
CREATE TABLE co_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Collaboration Analysis Fields for Profiles
ALTER TABLE team_profiles 
ADD COLUMN help_given_count INTEGER DEFAULT 0,
ADD COLUMN help_received_count INTEGER DEFAULT 0,
ADD COLUMN collaboration_score DECIMAL(3,2) DEFAULT 1.0;

-- 3. Enable RLS
ALTER TABLE co_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their co-tasks"
  ON co_tasks FOR ALL
  USING (
    org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()) AND
    (requester_id = auth.uid() OR helper_id = auth.uid())
  );

-- 4. Trigger for org_id population
CREATE TRIGGER tr_set_co_tasks_org_id
  BEFORE INSERT ON co_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_submission_org_id();

-- 5. Trigger to update collaboration stats on completion
CREATE OR REPLACE FUNCTION public.update_collaboration_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE team_profiles SET help_given_count = help_given_count + 1 WHERE user_id = NEW.helper_id;
    UPDATE team_profiles SET help_received_count = help_received_count + 1 WHERE user_id = NEW.requester_id;
    -- Grant 50 Bonus XP to the Support Hero
    UPDATE team_profiles SET experience_points = experience_points + 50 WHERE user_id = NEW.helper_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_update_collaboration_stats
  AFTER UPDATE ON co_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_collaboration_stats();