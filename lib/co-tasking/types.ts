/**
 * Co-Tasking types — mirror the SQL:
 *   co_tasks  (20260605)
 *
 * Collaboration stats live on team_profiles (see lib/backyard/types.ts):
 *   help_given_count, help_received_count, collaboration_score
 */

export type CoTaskStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export type CoTask = {
  id: string;
  org_id: string;
  requester_id: string;
  helper_id: string;
  title: string;
  description: string | null;
  status: CoTaskStatus;
  created_at: string;
  updated_at: string;
};
