/**
 * Access Control types — mirror the SQL:
 *   access_requests  (20260607)
 *   user_roles (session_security fields)  (20260614)
 *
 * Requests are filed by users, decided by Owner/Admin, and the AI snapshot
 * captures the state of the request at decision time for audit purposes.
 */

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type AccessRequest = {
  id: string;
  org_id: string;
  user_id: string;               // requester
  room_id: string;
  reason: string | null;
  status: AccessRequestStatus;
  approver_id: string | null;
  ai_snapshot: {
    requester_skills?: string[];
    requester_role?: string;
    requested_room_slug?: string;
    requester_performance_score?: number;
    [k: string]: any;
  };
  created_at: string;
  updated_at: string;
};

// UserRole (with session_security additions) is exported from
// lib/types/rbac.ts — single source of truth across the platform.
