import type { Agent, AgentMessage, AgentTask, AgentMemory, AgentNote, AgentFile } from './types';

/**
 * Mock data for the Omnia AI room.
 *
 * One Omnia AI assistant. One personal assistant per team member.
 * The signed-in user is Mahmoud; the rest of the team are six people.
 * Realistic enough that the room feels alive without a real backend.
 */

export const AGENTS: Agent[] = [
  {
    id: 'agent_omnia',
    kind: 'omnia',
    name: 'Omnia AI',
    short_name: 'Omnia AI',
    avatar_color: '#10b981',
    online: true,
    status: 'reading across the rooms',
    skills: ['Reads every room', 'Routes work to the right person', 'Remembers what was decided'],
    languages: ['English', 'Arabic'],
    performance_score: 1.0,
    level: 99,
    xp: 0,
    help_given_count: 142,
    help_received_count: 0,
  },
  {
    id: 'agent_mahmoud',
    kind: 'member',
    name: 'Mahmoud · personal assistant',
    short_name: 'Mahmoud',
    for_user_id: 'u_mahmoud',
    avatar_color: '#C68A4E',
    online: true,
    status: 'signed in · House of Omnia',
    skills: ['Direction', 'Decisions', 'Brand voice'],
    languages: ['English', 'Arabic'],
    performance_score: 0.98,
    level: 15,
    xp: 1480,
    help_given_count: 36,
    help_received_count: 6,
  },
  {
    id: 'agent_ez',
    kind: 'member',
    name: 'Ez · personal assistant',
    short_name: 'Ez',
    for_user_id: 'u_ez',
    for_user_role: 'admin',
    avatar_color: '#D4A574',
    online: true,
    status: 'across the rooms',
    skills: ['Operations', 'Setup', 'Vendor coordination'],
    languages: ['English', 'Arabic'],
    performance_score: 0.93,
    level: 11,
    xp: 1020,
    help_given_count: 24,
    help_received_count: 18,
  },
  {
    id: 'agent_abdelrahman',
    kind: 'member',
    name: "Abdelrahman's Agent",
    short_name: 'Abdelrahman',
    for_user_id: 'u_abdelrahman',
    for_user_role: 'whatsapp_manager',
    avatar_color: '#7AA7D9',
    online: true,
    status: 'WhatsApp Desk · 9 closed today',
    skills: ['WhatsApp sales', 'customer recovery', 'Arabic', 'bridal flow', 'objection handling'],
    languages: ['Arabic', 'English'],
    performance_score: 0.92,
    level: 8,
    xp: 720,
    help_given_count: 41,
    help_received_count: 12,
  },
  {
    id: 'agent_arslan',
    kind: 'member',
    name: "Arslan's Agent",
    short_name: 'Arslan',
    for_user_id: 'u_arslan',
    for_user_role: 'whatsapp_agent',
    avatar_color: '#7CB87C',
    online: true,
    status: 'awaiting Noura A.',
    skills: ['WhatsApp sales', 'payment verification', 'COD ops'],
    languages: ['Arabic', 'English', 'Urdu'],
    performance_score: 0.86,
    level: 6,
    xp: 540,
    help_given_count: 18,
    help_received_count: 22,
  },
  {
    id: 'agent_abdallah',
    kind: 'member',
    name: "Abdallah's Agent",
    short_name: 'Abdallah',
    for_user_id: 'u_abdallah',
    for_user_role: 'whatsapp_agent',
    avatar_color: '#D9A75B',
    online: false,
    status: 'away · returns 16:00',
    skills: ['WhatsApp sales', 'product knowledge', 'KSA market'],
    languages: ['Arabic', 'English'],
    performance_score: 0.81,
    level: 5,
    xp: 410,
    help_given_count: 9,
    help_received_count: 15,
  },
  {
    id: 'agent_ahmed',
    kind: 'member',
    name: "Ahmed's Agent",
    short_name: 'Ahmed',
    for_user_id: 'u_ahmed',
    for_user_role: 'marketing',
    avatar_color: '#9E7BD9',
    online: false,
    status: 'offline',
    skills: ['content', 'Meta ads', 'SEO', 'campaign planning', 'Veo prompts'],
    languages: ['English', 'Arabic'],
    performance_score: 0.88,
    level: 7,
    xp: 640,
    help_given_count: 16,
    help_received_count: 8,
  },
  {
    id: 'agent_mohamed',
    kind: 'member',
    name: "Mohamed's Agent",
    short_name: 'Mohamed',
    for_user_id: 'u_mohamed',
    for_user_role: 'whatsapp_agent',
    avatar_color: '#5FB4A2',
    online: true,
    status: 'onboarding · WhatsApp Desk shadowing',
    skills: ['WhatsApp sales', 'customer service', 'Arabic'],
    languages: ['Arabic', 'English'],
    performance_score: 0.74,
    level: 3,
    xp: 180,
    help_given_count: 3,
    help_received_count: 9,
  },
];

export function getAgents(): Agent[] {
  return AGENTS;
}

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

// ─── Tasks routed between assistants ───────────────────────────────────────

const TASKS: AgentTask[] = [
  {
    id: 't1',
    title: 'Investigate ruby bangle price drift (-13.6%)',
    description: 'omniastores.ae shows AED 950, omniastores.com shows AED 1,100. Decide which is correct, update the other.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_abdelrahman',
    priority: 'high',
    status: 'in_progress',
    ai_reasoning: 'Abdelrahman has the highest WhatsApp Manager performance score (0.92) and direct visibility into customer price feedback.',
    deadline: 'today 18:00',
    reminder_count: 0,
    created_at: '2026-05-24 09:12',
    updated_at: '2026-05-24 14:21',
  },
  {
    id: 't2',
    title: 'Follow up Noura A. on bank transfer',
    description: 'Payment screenshot received. Verify and confirm.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_arslan',
    priority: 'medium',
    status: 'in_progress',
    ai_reasoning: 'Arslan already in the conversation. Assignment continuity preferred.',
    deadline: 'today 17:00',
    reminder_count: 0,
    created_at: '2026-05-24 13:48',
    updated_at: '2026-05-24 14:11',
  },
  {
    id: 't3',
    title: 'Resupply Moonstone Pendant (.ae)',
    description: 'Only 3 left, sold 24 in 7d.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_ez',
    priority: 'high',
    status: 'pending',
    ai_reasoning: 'Restock is a capex decision. Routing for review.',
    deadline: 'this week',
    reminder_count: 0,
    created_at: '2026-05-24 09:30',
    updated_at: '2026-05-24 09:30',
  },
  {
    id: 't4',
    title: 'Prepare Eid Cashback Campaign — content',
    description: 'Lookalike segments + Reels + email sequence. 2 weeks ahead of Eid.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_ahmed',
    priority: 'high',
    status: 'pending',
    ai_reasoning: 'Marketing role + skills include "campaign planning" + "Veo prompts". Direct fit.',
    deadline: '2026-05-30',
    reminder_count: 1,
    created_at: '2026-05-22 11:00',
    updated_at: '2026-05-23 09:00',
  },
  {
    id: 't5',
    title: 'Decide on Tamara BNPL onboarding',
    description: 'Tamara: 15% + 30d. Tabby: 12% + 14d. Pick or wait.',
    creator_agent_id: 'agent_ez',
    assignee_agent_id: 'agent_ez',
    priority: 'medium',
    status: 'pending',
    ai_reasoning: 'Self-assigned strategy decision.',
    deadline: 'this week',
    reminder_count: 0,
    created_at: '2026-05-20 16:00',
    updated_at: '2026-05-20 16:00',
  },
  {
    id: 't6',
    title: 'Review LE Celestial photography',
    description: 'Final shots before launch on .ae.',
    creator_agent_id: 'agent_ez',
    assignee_agent_id: 'agent_ahmed',
    priority: 'medium',
    status: 'in_progress',
    ai_reasoning: 'Marketing role + photo direction.',
    deadline: 'Fri',
    reminder_count: 0,
    created_at: '2026-05-21 14:00',
    updated_at: '2026-05-22 10:00',
  },
  {
    id: 't7',
    title: 'Refund decision: order #1280',
    description: 'Customer claims item not received. Shopify shows delivered.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_abdelrahman',
    priority: 'high',
    status: 'pending',
    ai_reasoning: 'WhatsApp Manager handles customer-facing refund decisions ≤ AED 2,000.',
    deadline: 'today',
    reminder_count: 0,
    created_at: '2026-05-24 11:15',
    updated_at: '2026-05-24 11:15',
  },
  {
    id: 't8',
    title: 'KSA Riyadh wedding piece — Mariam K.',
    description: 'Bridal set, deadline Thursday. Push to Shopify .ae.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_abdallah',
    priority: 'critical',
    status: 'stalled',
    ai_reasoning: 'Abdallah has the KSA market skill + Arabic primary. Went offline before accepting — stalled.',
    deadline: 'Thursday',
    reminder_count: 2,
    created_at: '2026-05-24 10:20',
    updated_at: '2026-05-24 14:00',
  },
  {
    id: 't9',
    title: 'Shadow 5 WhatsApp chats today',
    description: 'Onboarding milestone. Observe Abdelrahman, no replies yet.',
    creator_agent_id: 'agent_omnia',
    assignee_agent_id: 'agent_mohamed',
    priority: 'medium',
    status: 'in_progress',
    ai_reasoning: 'Onboarding plan — 5 days of observation before live customer handling.',
    deadline: 'today',
    reminder_count: 0,
    created_at: '2026-05-24 08:30',
    updated_at: '2026-05-24 12:00',
  },
];

export function getTasksForAgent(agentId: string): AgentTask[] {
  return TASKS.filter((t) => t.assignee_agent_id === agentId || t.creator_agent_id === agentId);
}

export function getAllTasks(): AgentTask[] {
  return TASKS;
}

export function getStalledTasks(): AgentTask[] {
  return TASKS.filter((t) => t.status === 'stalled' || (t.reminder_count > 0 && t.status === 'pending'));
}

// ─── Memory (ai_memory) ────────────────────────────────────────────────────

const MEMORIES: AgentMemory[] = [
  { id: 'm1', agent_id: 'agent_omnia', memory_key: 'eid_2026_strategy', content: 'Eid 2026 campaign launches 2026-05-30. Prep 2 weeks ahead (last year was late by 11 days for LE Celestial). Ahmed leads content, Abdelrahman seeds WhatsApp.', importance_score: 9, pinned: true, created_at: '2026-05-22 11:30' },
  { id: 'm2', agent_id: 'agent_omnia', memory_key: 'bnpl_decision', content: 'Tamara takes 15% + 30 days. Tabby 12% + 14 days. Decision still open — does BNPL fit a luxury brand?', importance_score: 7, pinned: true, created_at: '2026-05-20 16:05' },
  { id: 'm3', agent_id: 'agent_omnia', memory_key: 'cod_sharjah_failures', content: 'COD failures clustered in Sharjah last week. 3 of 4 refused at door. Watch closely.', importance_score: 6, pinned: false, created_at: '2026-05-19 15:00' },
  { id: 'm4', agent_id: 'agent_omnia', memory_key: 'ruby_bangle_drift', content: 'Ruby Bangle has persistent -13.6% drift between stores. Manual decision needed — likely a deliberate KSA price difference that was never documented.', importance_score: 8, pinned: true, created_at: '2026-05-24 09:12' },
  { id: 'm5', agent_id: 'agent_abdelrahman', memory_key: 'aisha_m_pattern', content: 'Aisha M. always asks for ring sizing photos before confirming. Add to her customer profile so any agent who picks up sends those proactively.', importance_score: 5, pinned: true, created_at: '2026-05-21 16:00' },
  { id: 'm6', agent_id: 'agent_ahmed', memory_key: 'reels_thursday_night', content: 'High-stock bridal rings post best on Thursday nights (Meta data, 3 months running).', importance_score: 6, pinned: true, created_at: '2026-05-15 22:00' },
  { id: 'm7', agent_id: 'agent_ez', memory_key: 'house_phase_1', content: 'House of Omnia Phase 1 = repo scaffold + three-builder loop in place (Claude designs, Codex executes, deploy).', importance_score: 8, pinned: true, created_at: '2026-05-24 04:00' },
];

export function getMemoryForAgent(agentId: string): AgentMemory[] {
  return MEMORIES.filter((m) => m.agent_id === agentId).sort((a, b) => b.importance_score - a.importance_score);
}

// ─── Notes between agents (notes_system) ───────────────────────────────────

const NOTES: AgentNote[] = [
  { id: 'n1', from_agent_id: 'agent_abdelrahman', to_agent_id: 'agent_arslan', body: 'Noura A. usually pays bank transfer within 20 min. If no proof by 14:45, ping her.', category: 'customer', at: '2026-05-24 14:00', read: true },
  { id: 'n2', from_agent_id: 'agent_arslan', to_agent_id: 'agent_ez', body: 'Sharjah COD failures up again this week (3/4 refused at door). Suggest pre-payment requirement for Sharjah over AED 1,500.', category: 'ops', at: '2026-05-24 13:30', read: false },
  { id: 'n3', from_agent_id: 'agent_omnia', to_agent_id: 'agent_ez', body: 'Stalled task t8 (Mariam K. wedding · KSA) — Abdallah went offline. Reassign to Abdelrahman?', category: 'ops', at: '2026-05-24 14:00', read: false },
  { id: 'n4', from_agent_id: 'agent_ahmed', to_agent_id: 'agent_omnia', body: 'Eid creative draft ready — needs review before paid spend. Pinned in Drive.', category: 'strategy', at: '2026-05-23 17:20', read: true },
  { id: 'n5', from_agent_id: 'agent_omnia', to_agent_id: 'agent_abdelrahman', body: 'Refund #1280 — historical data suggests genuine "not received" given the courier\'s POD photo is missing. Recommend approval at AED 1,300.', category: 'customer', at: '2026-05-24 11:18', read: false },
  { id: 'n6', from_agent_id: 'agent_ez', to_agent_id: 'agent_ahmed', body: 'Tone for Eid magazine should match LE 24 — restrained, no exclamation marks.', category: 'strategy', at: '2026-05-22 11:45', read: true },
];

export function getNotesForAgent(agentId: string): AgentNote[] {
  return NOTES.filter((n) => n.to_agent_id === agentId || n.from_agent_id === agentId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function getInboxForAgent(agentId: string): AgentNote[] {
  return NOTES.filter((n) => n.to_agent_id === agentId).sort((a, b) => b.at.localeCompare(a.at));
}

// ─── Files shared between agents (drive_files) ─────────────────────────────

const FILES: AgentFile[] = [
  { id: 'f1', name: 'Eid 2026 — Creative Brief.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size_bytes: 84_320, shared_by_agent_id: 'agent_ahmed', shared_with_agent_id: 'all', visibility: 'all', drive_id: 'drv_eid_brief', created_at: '2026-05-23 17:15' },
  { id: 'f2', name: 'LE Celestial — Final Shoot.zip', mime_type: 'application/zip', size_bytes: 142_000_000, shared_by_agent_id: 'agent_ahmed', shared_with_agent_id: 'agent_ez', visibility: 'role', drive_id: 'drv_le_shoot', created_at: '2026-05-22 19:00' },
  { id: 'f3', name: 'Tamara vs Tabby — Cost Sheet.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size_bytes: 38_000, shared_by_agent_id: 'agent_ez', shared_with_agent_id: 'all', visibility: 'all', drive_id: 'drv_bnpl_cost', created_at: '2026-05-20 16:30' },
  { id: 'f4', name: 'WhatsApp Scripts — Arabic v3.md', mime_type: 'text/markdown', size_bytes: 12_400, shared_by_agent_id: 'agent_abdelrahman', shared_with_agent_id: 'all', visibility: 'role', drive_id: 'drv_wa_scripts', created_at: '2026-05-18 11:00' },
  { id: 'f5', name: 'KSA Buyers — Q1 Behavior Report.pdf', mime_type: 'application/pdf', size_bytes: 1_240_000, shared_by_agent_id: 'agent_omnia', shared_with_agent_id: 'all', visibility: 'all', drive_id: 'drv_ksa_report', created_at: '2026-05-15 09:00' },
];

export function getFilesForAgent(agentId: string): AgentFile[] {
  return FILES.filter((f) => f.shared_by_agent_id === agentId || f.shared_with_agent_id === agentId || f.shared_with_agent_id === 'all');
}

// ─── Mock chat history per agent ───────────────────────────────────────────

const MESSAGES_BY_AGENT: Record<string, AgentMessage[]> = {
  agent_omnia: [
    { id: 'om1', agent_id: 'agent_omnia', from: 'user', body: 'good morning. status across rooms?', at: '09:01' },
    { id: 'om2', agent_id: 'agent_omnia', from: 'agent', body: 'Good morning. The house: AED 87,420 today (+12.4% vs same time yesterday). 7 unclaimed WhatsApp chats, 3 parity drifts, 8 low-stock SKUs. One thing that needs attention: t8 (Mariam K. — KSA wedding) is stalled — Abdallah went offline before accepting. Reassign to Abdelrahman?', at: '09:01' },
    { id: 'om3', agent_id: 'agent_omnia', from: 'user', body: 'yes reassign to abdelrahman', at: '09:02' },
    { id: 'om4', agent_id: 'agent_omnia', from: 'agent', body: 'Done. t8 → Abdelrahman. Marked accepted. Abdelrahman notified.', at: '09:02', artifact: { kind: 'task_routed', task: { id: 't8', title: 'KSA Riyadh wedding piece — Mariam K.', creator_agent_id: 'agent_omnia', assignee_agent_id: 'agent_abdelrahman', priority: 'critical', status: 'in_progress', ai_reasoning: 'Reassigned from Abdallah (offline). Abdelrahman has WA Manager + Arabic primary + handled similar bridal flows.', reminder_count: 0, created_at: '2026-05-24 10:20', updated_at: '2026-05-24 09:02' } } },
    { id: 'om5', agent_id: 'agent_omnia', from: 'user', body: 'we need to push eid campaign next week. work it out.', at: '11:15' },
    { id: 'om6', agent_id: 'agent_omnia', from: 'agent', body: 'I extracted three tasks and routed them by skill match:\n\n1. **Content creation** → Ahmed (skill match 92%, "campaign planning" + "Veo prompts")\n2. **WhatsApp seeding script** → Abdelrahman (skill match 87%, "Arabic" + "WhatsApp sales")\n3. **Review + sign-off** → strategy (creative direction)\n\nDeadline: 2026-05-30. Saved to memory under `eid_2026_strategy`. The bigger thing: last year LE Celestial was 11 days late — I\'ve set a reminder 7 days before.', at: '11:15', artifact: { kind: 'memory_saved', memory: { id: 'm1', agent_id: 'agent_omnia', memory_key: 'eid_2026_strategy', content: 'Eid 2026 campaign launches 2026-05-30. Prep 2 weeks ahead.', importance_score: 9, pinned: true, created_at: '2026-05-22 11:30' } } },
  ],
  agent_abdelrahman: [
    { id: 'la1', agent_id: 'agent_abdelrahman', from: 'user', body: 'my queue?', at: '09:00' },
    { id: 'la2', agent_id: 'agent_abdelrahman', from: 'agent', body: 'You\'re in 4 active chats. Ready for draft: Mariam K. (KSA, bridal, deadline Thursday — Omnia AI just routed this to you). Awaiting customer: Noura A. (bank transfer screenshot pending). Two new in your inbox: +971•••922 (manager queue, fraud risk) and +971•••401.\n\nNote from Omnia AI: refund #1280 — suggests approve at AED 1,300, courier POD photo is missing.', at: '09:00' },
  ],
  agent_ez: [
    { id: 'mh1', agent_id: 'agent_ez', from: 'user', body: 'what should i decide today?', at: '08:55' },
    { id: 'mh2', agent_id: 'agent_ez', from: 'agent', body: 'Three decisions on your plate:\n\n1. **t3** — Resupply Moonstone Pendant (.ae). Only 3 left, sold 24 in 7d. Capex call.\n2. **t5** — Tamara vs Tabby. The cost sheet shows Tabby cheaper (12% vs 15%) but worse for COD customers.\n3. **t6** — Sign off on LE Celestial photography. Ahmed sent the final cut yesterday.\n\nThe ruby bangle drift (t1) is in Abdelrahman\'s hands.', at: '08:55' },
  ],
  agent_arslan: [],
  agent_abdallah: [],
  agent_ahmed: [],
  agent_mohamed: [],
};

export function getMessagesForAgent(agentId: string): AgentMessage[] {
  return MESSAGES_BY_AGENT[agentId] || [];
}

// ─── Mock reply ────────────────────────────────────────────────────────────

const REPLIES_BY_AGENT: Record<string, string[]> = {
  agent_omnia: [
    'Looking across rooms now. WhatsApp queue, parity drift, low-stock — anything specific you want me to dig into?',
    'I can route that to the right person. Want me to suggest the assignee?',
    'Saved that to memory. I\'ll surface it next time it\'s relevant.',
    'Watching. I\'ll raise it if anything changes.',
  ],
  agent_ez: [
    'On it. I\'ll set a reminder.',
    'Got it. Anything else?',
    'Will hold the line on that one.',
  ],
  agent_abdelrahman: [
    'Queue is manageable. Two need eyes — I\'ll take Mariam K. first.',
    'Drafted. Reviewing before push.',
  ],
  agent_arslan: [
    'On the bank transfer now. Will report when verified.',
    'COD ops looks clean for today.',
  ],
  agent_abdallah: [
    'Back online soon. KSA chats first.',
  ],
  agent_ahmed: [
    'Creative direction noted. Drafting copy.',
    'Will pin in Drive when ready.',
  ],
  agent_mohamed: [
    'Shadowing chats now. Picking up the Arabic phrasing patterns.',
    'Noted — will keep observing before replying live.',
  ],
};

export function mockAgentReply(agent: Agent, _text: string): AgentMessage {
  const pool = REPLIES_BY_AGENT[agent.id] || REPLIES_BY_AGENT.agent_omnia;
  const body = pool[Math.floor(Math.random() * pool.length)];
  const at = new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return { id: `r_${Date.now()}`, agent_id: agent.id, from: 'agent', body, at };
}
