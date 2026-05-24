export type Event = {
  id: string;
  title: string;
  date: string;
  type: 'campaign' | 'meeting' | 'launch' | 'holiday';
  with?: string[];
  status: 'upcoming' | 'today' | 'past';
  tone?: 'gold' | 'info' | 'good' | 'warn';
};

export function getEvents(): Event[] {
  return [
    { id: 'e1', title: 'Eid Cashback Campaign · launch', date: '2026-05-30', type: 'campaign', status: 'upcoming', tone: 'gold' },
    { id: 'e2', title: 'Photoshoot · LE Celestial', date: '2026-05-28', type: 'launch', status: 'upcoming' },
    { id: 'e3', title: 'Sync with Abdelrahman · WhatsApp Desk Q3 plan', date: '2026-05-24', type: 'meeting', with: ['Abdelrahman'], status: 'today', tone: 'info' },
    { id: 'e4', title: 'Tamara onboarding call', date: '2026-05-26', type: 'meeting', with: ['Tamara CS'], status: 'upcoming' },
    { id: 'e5', title: 'Mother\'s Day Campaign · wrap', date: '2026-05-20', type: 'campaign', status: 'past' },
  ];
}

export type Milestone = {
  id: string;
  title: string;
  at: string;
  category: 'revenue' | 'product' | 'team' | 'system';
  detail: string;
};

export function getMilestones(): Milestone[] {
  return [
    { id: 'm1', title: 'AED 3M month closed', at: '2026-04-30', category: 'revenue', detail: 'First time crossing AED 3M in a single month. WhatsApp 35% / Shopify 38% / WooCommerce 27%.' },
    { id: 'm2', title: 'OmniaHouse Phase 1', at: '2026-05-24', category: 'system', detail: 'Repo scaffolded. Three-builder loop in place.' },
    { id: 'm3', title: '5,000 customers (cross-store)', at: '2026-04-12', category: 'team', detail: 'Hit 5K unique customer profiles after dedup.' },
    { id: 'm4', title: 'LE Celestial · designed', at: '2026-03-08', category: 'product', detail: 'Final design approved. Limited run of 50.' },
  ];
}
