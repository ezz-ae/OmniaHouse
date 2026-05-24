-- 1. Notes Table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Creator
  title TEXT NOT NULL,
  content JSONB DEFAULT '{"type": "doc", "content": []}'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Note Sharing Table
CREATE TABLE note_shares (
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Shared with
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own or shared notes"
  ON notes FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()) AND
    (user_id = auth.uid() OR id IN (SELECT note_id FROM note_shares WHERE user_id = auth.uid()))
  );

-- 4. Triggers for org_id
CREATE TRIGGER tr_set_notes_org_id BEFORE INSERT ON notes FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();
CREATE TRIGGER tr_set_note_shares_org_id BEFORE INSERT ON note_shares FOR EACH ROW EXECUTE FUNCTION public.set_order_submission_org_id();

-- Add Notebook Room to Seed
INSERT INTO rooms (name, slug, icon, sort_order) 
VALUES ('Notebook', 'notebook', 'FileText', 12)
ON CONFLICT (slug) DO NOTHING;