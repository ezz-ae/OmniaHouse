export type TeamMember = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'whatsapp_manager' | 'whatsapp_agent' | 'marketing' | 'strategy';
  status: 'online' | 'away' | 'offline';
  active_now?: string;
  closed_today?: number;
  avatar_color: string;
};

export function getTeam(): TeamMember[] {
  return [
    { id: 't1', name: 'Ez', role: 'owner', status: 'online', active_now: 'in the lobby', avatar_color: '#D4A574' },
    { id: 't2', name: 'Abdelrahman', role: 'whatsapp_manager', status: 'online', active_now: 'WhatsApp Desk', closed_today: 9, avatar_color: '#7AA7D9' },
    { id: 't3', name: 'Arslan', role: 'whatsapp_agent', status: 'online', active_now: 'awaiting Noura A.', closed_today: 6, avatar_color: '#7CB87C' },
    { id: 't4', name: 'Abdallah', role: 'whatsapp_agent', status: 'away', closed_today: 4, avatar_color: '#D9A75B' },
    { id: 't5', name: 'Ahmed', role: 'marketing', status: 'offline', avatar_color: '#9E7BD9' },
    { id: 't6', name: 'Mohamed', role: 'whatsapp_agent', status: 'online', active_now: 'shadowing', closed_today: 0, avatar_color: '#5FB4A2' },
  ];
}

export type Task = {
  id: string;
  title: string;
  assigned_to: string;
  assigned_by: string;
  due: string;
  priority: 'low' | 'med' | 'high';
  status: 'open' | 'in_progress' | 'done';
  room: string;
};

export function getTasks(): Task[] {
  return [
    { id: 'tk1', title: 'Investigate ruby bangle price drift (-13.6%)', assigned_to: 'Abdelrahman', assigned_by: 'Omnia AI', due: 'today', priority: 'high', status: 'open', room: 'inventory' },
    { id: 'tk2', title: 'Follow up with Noura A. on bank transfer', assigned_to: 'Arslan', assigned_by: 'Abdelrahman', due: 'today', priority: 'med', status: 'in_progress', room: 'whatsapp-desk' },
    { id: 'tk3', title: 'Resupply Moonstone Pendant (.ae)', assigned_to: 'Ez', assigned_by: 'Omnia AI', due: 'this week', priority: 'high', status: 'open', room: 'inventory' },
    { id: 'tk4', title: 'Decide on Tamara BNPL onboarding', assigned_to: 'Ez', assigned_by: 'Omnia AI', due: 'this week', priority: 'med', status: 'open', room: 'management' },
    { id: 'tk5', title: 'Review LE Celestial photography', assigned_to: 'Ahmed', assigned_by: 'Ez', due: 'Fri', priority: 'med', status: 'in_progress', room: 'cashback' },
    { id: 'tk6', title: 'Refund decision: order #1280', assigned_to: 'Abdelrahman', assigned_by: 'Omnia AI', due: 'today', priority: 'high', status: 'open', room: 'orders' },
    { id: 'tk7', title: 'Shadow 5 WhatsApp chats today', assigned_to: 'Mohamed', assigned_by: 'Omnia AI', due: 'today', priority: 'med', status: 'in_progress', room: 'whatsapp-desk' },
  ];
}

export type Note = {
  id: string;
  author: string;
  body: string;
  at: string;
  pinned?: boolean;
  tag?: string;
};

export function getNotes(): Note[] {
  return [
    { id: 'n1', author: 'Ez', body: 'For Eid: prepare cashback campaign 2 weeks early. Last year we were late and the LE necklace sat for 11 days.', at: '2026-05-22', pinned: true, tag: 'campaign' },
    { id: 'n2', author: 'Abdelrahman', body: 'Aisha M. always asks for ring sizing photos. Add to her customer profile.', at: '2026-05-21', tag: 'customer' },
    { id: 'n3', author: 'Ez', body: 'Tamara takes 15% + 30 days. Tabby 12% + 14 days. We need to think if BNPL fits a luxury brand.', at: '2026-05-20', tag: 'decision' },
    { id: 'n4', author: 'Arslan', body: 'COD failures clustered in Sharjah this week. 3 of 4 refused at door.', at: '2026-05-19', tag: 'ops' },
  ];
}

export type AccessRequest = {
  id: string;
  name: string;
  requested_role: string;
  requested_at: string;
  reason: string;
};

export function getAccessRequests(): AccessRequest[] {
  return [
    { id: 'ar1', name: 'Mohamed', requested_role: 'whatsapp_agent', requested_at: '2026-05-23', reason: 'New hire — onboarding today.' },
    { id: 'ar2', name: 'Hassan Al-Marri', requested_role: 'finance', requested_at: '2026-05-22', reason: 'Needs to reconcile draft orders cross-store.' },
  ];
}
