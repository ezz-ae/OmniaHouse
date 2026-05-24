-- 1. Team Neural Profiles (Skills & Performance)
CREATE TABLE team_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}', -- ['SEO', 'Copywriting', 'React', 'Sales']
  languages TEXT[] DEFAULT '{"English", "Arabic"}',
  performance_score DECIMAL(3,2) DEFAULT 1.0, -- AI calculated performance
  availability_status TEXT DEFAULT 'active',
  communication_style TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agentic Task Book (The Silent Watcher)
CREATE TABLE agentic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id), -- User who spoke to AI
  assigned_to UUID REFERENCES auth.users(id), -- AI assigned member
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'stalled'
  deadline TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  ai_reasoning TEXT, -- Why AI chose this person/task
  metadata JSONB DEFAULT '{}'::jsonb, -- Progress check history
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Neural Partnership Memory
CREATE TABLE ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL,
  content TEXT NOT NULL,
  importance_score INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see team profiles" ON team_profiles FOR SELECT USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Management can manage tasks" ON agentic_tasks FOR ALL USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "AI Memory Access" ON ai_memory FOR SELECT USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

-- Triggers for org_id
CREATE TRIGGER tr_set_team_profiles_org_id BEFORE INSERT ON team_profiles FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();
CREATE TRIGGER tr_set_agentic_tasks_org_id BEFORE INSERT ON agentic_tasks FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();
CREATE TRIGGER tr_set_ai_memory_org_id BEFORE INSERT ON ai_memory FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();