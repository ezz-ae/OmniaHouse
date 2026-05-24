-- 1. Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RBAC Tables
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'Owner', 'Admin', 'WhatsApp Agent', etc.
  description TEXT
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- 'view_inventory', 'create_order', etc.
  description TEXT
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id, org_id)
);

-- 3. Room Management
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE room_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'view', -- 'view', 'edit', 'admin'
  PRIMARY KEY (role_id, room_id)
);

-- 4. Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  room_slug TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Data
INSERT INTO roles (name) VALUES ('Owner'), ('Admin'), ('WhatsApp Manager'), ('WhatsApp Agent'), ('Shipping'), ('Marketing'), ('Finance');

INSERT INTO rooms (name, slug, icon, sort_order) VALUES 
('House Home', 'house', 'Home', 0),
('WhatsApp Order Room', 'whatsapp-order-room', 'MessageSquare', 1),
('Inventory Room', 'inventory', 'Package', 2),
('Reports Room', 'reports', 'BarChart', 3),
('Finance Room', 'finance', 'DollarSign', 4),
('Shipping Room', 'shipping', 'Truck', 5),
('Team Room', 'team', 'Users', 6),
('Omnia AI', 'omnia-ai', 'Sparkles', 7),
('Gemini Room', 'gemini-room', 'Google', 8),
('Settings', 'settings', 'Settings', 9),
('Meeting Room', 'meeting-room', 'Mic', 10);

-- Grant all rooms to Owner and Admin roles
INSERT INTO room_permissions (role_id, room_id, access_level)
SELECT r.id, rm.id, 'admin' 
FROM roles r, rooms rm 
WHERE r.name IN ('Owner', 'Admin');

-- Grant specific rooms to WhatsApp Agent
INSERT INTO room_permissions (role_id, room_id)
SELECT r.id, rm.id FROM roles r, rooms rm 
WHERE r.name = 'WhatsApp Agent' AND rm.slug IN ('house', 'whatsapp-order-room', 'inventory');

-- Grant specific rooms to Marketing and Finance
INSERT INTO room_permissions (role_id, room_id)
SELECT r.id, rm.id FROM roles r, rooms rm 
WHERE (r.name = 'Marketing' AND rm.slug IN ('house', 'whatsapp-order-room', 'reports', 'omnia-ai', 'gemini-room'))
   OR (r.name = 'Finance' AND rm.slug IN ('house', 'whatsapp-order-room', 'finance', 'reports'));

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can see their own organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can see their roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Activity log insertion"
  ON activity_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());