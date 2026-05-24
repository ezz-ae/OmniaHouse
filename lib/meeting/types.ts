/**
 * Meeting types — mirror the SQL:
 *   meetings  (20260531)
 *
 * Plus the agent-output shape from MEETING_INTELLIGENCE_PROMPT.
 */

export type Meeting = {
  id: string;
  org_id: string;
  creator_id: string | null;
  title: string;
  transcript: string | null;
  summary: string | null;
  metadata: {
    duration_min?: number;
    attendees?: string[];
    strategic_advice?: string;
    decisions?: string[];
    [k: string]: any;
  };
  created_at: string;
};

// ─── MEETING_INTELLIGENCE_PROMPT output ────────────────────────────────────

export type MeetingAnalysisTask = {
  title: string;
  description: string;
  assignee_type: string;         // matches a skill or role
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export type MeetingAnalysisResult = {
  ceo_summary: string;
  decisions: string[];
  tasks: MeetingAnalysisTask[];
  strategic_advice: string;
};
