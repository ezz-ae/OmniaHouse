/**
 * RBAC types — mirror the SQL:
 *   organizations    (20260523)
 *   roles            (20260523)
 *   permissions      (20260523)
 *   user_roles       (20260523, extended 20260614)
 *   rooms            (20260523, extended by each room migration)
 *   room_permissions (20260523)
 *   activity_logs    (20260523)
 *
 * Every other table on the platform has an org_id and an RLS policy that
 * filters on user_roles.user_id = auth.uid(). These are the primitives
 * those policies depend on.
 */

// ─── organizations ─────────────────────────────────────────────────────────

export type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, any>;
  created_at: string;
};

// ─── roles + permissions ───────────────────────────────────────────────────

export type RoleName =
  | 'Owner'
  | 'Admin'
  | 'WhatsApp Manager'
  | 'WhatsApp Agent'
  | 'Shipping'
  | 'Marketing'
  | 'Finance'
  | 'Inventory'
  | 'Strategy';

export type Role = {
  id: string;
  name: RoleName;
  description: string | null;
};

export type Permission = {
  id: string;
  slug: string;                  // e.g., 'view_inventory', 'create_order'
  description: string | null;
};

export type UserRole = {
  user_id: string;
  role_id: string;
  org_id: string;
  // From session_security (20260614)
  last_sign_in_ip: string | null;
  is_locked: boolean;
  lock_reason: string | null;
};

// ─── rooms + room_permissions ──────────────────────────────────────────────

export type RoomRecord = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

export type RoomAccessLevel = 'view' | 'edit' | 'admin';

export type RoomPermission = {
  role_id: string;
  room_id: string;
  access_level: RoomAccessLevel;
};

// ─── activity_logs ─────────────────────────────────────────────────────────

export type ActivityLog = {
  id: string;
  user_id: string;
  org_id: string;
  action: string;                // 'extracted_chat', 'pushed_draft', 'approved_access'
  room_slug: string | null;
  metadata: Record<string, any>;
  created_at: string;
};
