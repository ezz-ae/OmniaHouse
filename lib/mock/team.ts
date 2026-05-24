export type TeamMember = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'whatsapp_manager' | 'whatsapp_agent' | 'marketing' | 'strategy';
  email: string;
  status: 'online' | 'away' | 'offline';
  active_now?: string;
  closed_today?: number;
  avatar_color: string;
};

export function getTeam(): TeamMember[] {
  return [
    { id: 't1', name: 'Mahmoud Ezz', role: 'owner', email: 'm@ezz.ae', status: 'online', active_now: 'reviewing /house', avatar_color: '#D4A574' },
    { id: 't2', name: 'Layla S.', role: 'whatsapp_manager', email: 'layla@omniastores.ae', status: 'online', active_now: 'WhatsApp Desk', closed_today: 9, avatar_color: '#7AA7D9' },
    { id: 't3', name: 'Omar K.', role: 'whatsapp_agent', email: 'omar@omniastores.ae', status: 'online', active_now: 'awaiting Noura A.', closed_today: 6, avatar_color: '#7CB87C' },
    { id: 't4', name: 'Sara K.', role: 'whatsapp_agent', email: 'sara@omniastores.ae', status: 'away', closed_today: 4, avatar_color: '#D9A75B' },
    { id: 't5', name: 'Ali M.', role: 'marketing', email: 'ali@omniastores.ae', status: 'offline', avatar_color: '#9E7BD9' },
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
    { id: 'tk1', title: 'Investigate ruby bangle price drift (-13.6%)', assigned_to: 'Layla S.', assigned_by: 'Mahmoud', due: 'today', priority: 'high', status: 'open', room: 'inventory' },
    { id: 'tk2', title: 'Follow up with Noura A. on bank transfer', assigned_to: 'Omar K.', assigned_by: 'Layla', due: 'today', priority: 'med', status: 'in_progress', room: 'whatsapp-desk' },
    { id: 'tk3', title: 'Resupply Moonstone Pendant (.ae)', assigned_to: 'Mahmoud', assigned_by: 'System', due: 'this week', priority: 'high', status: 'open', room: 'inventory' },
    { id: 'tk4', title: 'Decide on Tamara BNPL onboarding', assigned_to: 'Mahmoud', assigned_by: 'Mahmoud', due: 'this week', priority: 'med', status: 'open', room: 'management' },
    { id: 'tk5', title: 'Review LE Celestial photography', assigned_to: 'Ali M.', assigned_by: 'Mahmoud', due: 'Fri', priority: 'med', status: 'in_progress', room: 'cashback' },
    { id: 'tk6', title: 'Refund decision: order #1280', assigned_to: 'Layla S.', assigned_by: 'System', due: 'today', priority: 'high', status: 'open', room: 'orders' },
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
    { id: 'n1', author: 'Mahmoud', body: 'For Eid: prepare cashback campaign 2 weeks early. Last year we were late and the LE necklace sat for 11 days.', at: '2026-05-22', pinned: true, tag: 'campaign' },
    { id: 'n2', author: 'Layla', body: 'Aisha M. always asks for ring sizing photos. Add to her customer profile.', at: '2026-05-21', tag: 'customer' },
    { id: 'n3', author: 'Mahmoud', body: 'Tamara takes 15% + 30 days. Tabby 12% + 14 days. We need to think if BNPL fits a luxury brand.', at: '2026-05-20', tag: 'decision' },
    { id: 'n4', author: 'Omar', body: 'COD failures clustered in Sharjah this week. 3 of 4 refused at door.', at: '2026-05-19', tag: 'ops' },
  ];
}

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  requested_role: string;
  requested_at: string;
  reason: string;
};

export function getAccessRequests(): AccessRequest[] {
  return [
    { id: 'ar1', name: 'Sara Khalil', email: 'sara@omniastores.ae', requested_role: 'whatsapp_agent', requested_at: '2026-05-23', reason: 'New hire — Mahmoud onboarded today.' },
    { id: 'ar2', name: 'Hassan Al-Marri', email: 'hassan@omniastores.ae', requested_role: 'finance', requested_at: '2026-05-22', reason: 'Needs to reconcile draft orders cross-store.' },
  ];
}
