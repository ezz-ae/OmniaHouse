/**
 * The agentic layer.
 *
 * One central Omnia AI orchestrates the digital office (the OMNIA_PARTNERSHIP_PROMPT
 * is its system prompt). Every team member account has its own personal agent —
 * an "AI proxy" that holds their tasks, their memory, their notes, their files.
 *
 * The agents talk to each other through notes and routed tasks. Omnia AI watches
 * across all of them.
 *
 * SQL backing:
 *   team_profiles      → Agent.skills, languages, performance_score, XP, level
 *   agentic_tasks      → AgentTask
 *   ai_memory          → AgentMemory
 *   notes_system       → AgentNote (cross-agent)
 *   drive_files        → AgentFile (cross-agent file sharing)
 *   activity_logs      → audit trail of agent actions
 */

export type AgentKind = 'omnia' | 'member';

export type Agent = {
  id: string;
  kind: AgentKind;
  name: string;                  // "Omnia AI" or "Layla's Agent"
  short_name: string;            // "Omnia" or "Layla"
  for_user_id?: string;          // For member agents: the human this agent represents
  for_user_role?: 'owner' | 'admin' | 'whatsapp_manager' | 'whatsapp_agent' | 'marketing' | 'strategy' | 'finance';
  avatar_color: string;
  online: boolean;
  status?: string;               // "in WhatsApp Desk", "investigating ruby bangle drift"
  skills: string[];
  languages: string[];
  performance_score: number;     // 0-1
  level: number;
  xp: number;
  help_given_count: number;
  help_received_count: number;
};

export type AgentMessage = {
  id: string;
  agent_id: string;              // conversation belongs to this agent
  from: 'user' | 'agent';
  body: string;
  at: string;
  // When the agent's response includes a side-effect (task created, note sent, etc.)
  artifact?:
    | { kind: 'task_routed'; task: AgentTask }
    | { kind: 'memory_saved'; memory: AgentMemory }
    | { kind: 'note_sent'; note: AgentNote }
    | { kind: 'file_shared'; file: AgentFile }
    | { kind: 'stalled_warning'; task_id: string; suggestion: string };
};

export type AgentTask = {
  id: string;
  title: string;
  description?: string;
  creator_agent_id: string;      // typically Omnia
  assignee_agent_id: string;     // a member agent
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'stalled';
  ai_reasoning: string;          // why the AI chose this assignee
  deadline?: string;
  reminder_count: number;
  created_at: string;
  updated_at: string;
};

export type AgentMemory = {
  id: string;
  agent_id: string;              // Omnia's memory or a member agent's
  memory_key: string;
  content: string;
  importance_score: number;      // 1-10
  pinned: boolean;
  created_at: string;
};

export type AgentNote = {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  body: string;
  category: 'customer' | 'ops' | 'strategy' | 'personal' | 'shared';
  at: string;
  read: boolean;
};

export type AgentFile = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  shared_by_agent_id: string;
  shared_with_agent_id: string;   // or 'all' for org-wide
  visibility: 'all' | 'role' | 'private';
  drive_id?: string;              // external Drive ID
  created_at: string;
};
