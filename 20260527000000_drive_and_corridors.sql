-- Add Inventory Role if missing
INSERT INTO roles (name) VALUES ('Inventory') ON CONFLICT (name) DO NOTHING;

-- 1. The Safe: Drive Files with Metadata-driven Visibility
CREATE TABLE drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  drive_id TEXT NOT NULL, -- External Google Drive ID
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  visibility TEXT NOT NULL DEFAULT 'all', -- 'all', 'role', 'private'
  target_role_id UUID REFERENCES roles(id), -- Null if visibility is 'all'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. The Corridor: Inter-room Workflow Logic
CREATE TABLE room_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_room_slug TEXT NOT NULL,
  target_room_slug TEXT NOT NULL,
  trigger_action TEXT NOT NULL, -- e.g., 'file_uploaded'
  payload JSONB DEFAULT '{}'::jsonb, -- Context needed by the target room
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_workflows ENABLE ROW LEVEL SECURITY;

-- RLS for the Safe: respects 'visibility' and 'target_role_id'
CREATE POLICY "Safe Visibility Policy"
  ON drive_files FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()) AND
    (
      visibility = 'all' OR
      user_id = auth.uid() OR
      (visibility = 'role' AND target_role_id IN (SELECT role_id FROM user_roles WHERE user_id = auth.uid()))
    )
  );

-- RLS for Corridors: Users can see workflows in their org
CREATE POLICY "Corridor Visibility"
  ON room_workflows FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Inventory/Admin can process extraction"
  ON room_workflows FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Admin', 'Inventory', 'Owner'))
    )
  )
  WITH CHECK (status IN ('processed', 'failed'));

-- Seed the Drive Room
INSERT INTO rooms (name, slug, icon, sort_order) 
VALUES ('Drive Room (The Safe)', 'drive-room', 'HardDrive', 10)
ON CONFLICT (slug) DO NOTHING;

-- Grant access to all roles for the Drive Room initially
INSERT INTO room_permissions (role_id, room_id)
SELECT r.id, rm.id FROM roles r, rooms rm WHERE rm.slug = 'drive-room';