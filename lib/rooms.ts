import {
  Home,
  MessageSquare,
  Package,
  ShoppingBag,
  Users,
  Sparkles,
  TreePine,
  CheckSquare,
  Wallet,
  Settings,
  KeyRound,
  Building2,
  BarChart3,
  DollarSign,
  Truck,
  Bot,
  HardDrive,
  Mic,
  Users2,
  Map,
  type LucideIcon,
} from 'lucide-react';

export type RoomGroup = 'home' | 'desk' | 'commerce' | 'intelligence' | 'people' | 'admin';

export type Room = {
  slug: string;
  name: string;
  group: RoomGroup;
  icon: LucideIcon;
  description: string;
  roles?: string[];
  badge?: { count?: number; tone?: 'good' | 'warn' | 'bad' | 'info' | 'gold' };
};

/**
 * Canonical room list. Matches the SQL seed in
 * 20260523000000_init_rbac.sql + additional rooms from later migrations.
 * Source of truth for the Go menu, command palette, lobby, and (eventually)
 * the `rooms` table seed.
 */
export const ROOMS: Room[] = [
  // Home
  { slug: 'house', name: 'House', group: 'home', icon: Home,
    description: 'Lobby — the entry point.' },
  { slug: 'milestone', name: 'Milestone', group: 'home', icon: Map,
    description: 'What the House is, what it does, the plan.' },

  // Desk
  { slug: 'whatsapp-desk', name: 'WhatsApp Desk', group: 'desk', icon: MessageSquare,
    description: 'The room +971 56 547 8227 lives in.', badge: { count: 7, tone: 'warn' } },

  // Commerce
  { slug: 'inventory', name: 'Inventory', group: 'commerce', icon: Package,
    description: 'Catalogue, parity, SEO, strategy.', badge: { count: 3, tone: 'bad' } },
  { slug: 'orders', name: 'Orders', group: 'commerce', icon: ShoppingBag,
    description: 'Cross-channel orders queue.' },
  { slug: 'shipping', name: 'Shipping', group: 'commerce', icon: Truck,
    description: 'Dispatch board, courier sheets, proof of delivery.' },
  { slug: 'cashback', name: 'Cashback', group: 'commerce', icon: Wallet,
    description: 'Wallets, limited editions, customer portal.' },
  { slug: 'finance', name: 'Finance', group: 'commerce', icon: DollarSign,
    description: 'Settlements, reconciliation, BNPL.' },

  // Intelligence
  { slug: 'brand-intelligence', name: 'Brand Intelligence', group: 'intelligence', icon: Sparkles,
    description: 'GA, Meta signal, ghost heatmap, sentiment.' },
  { slug: 'reports', name: 'Reports', group: 'intelligence', icon: BarChart3,
    description: 'Daily, weekly, monthly summaries.' },
  { slug: 'omnia-ai', name: 'Omnia AI', group: 'intelligence', icon: Bot,
    description: 'Talk to Omnia AI and to each person\'s assistant.' },
  { slug: 'gemini-room', name: 'Gemini Room', group: 'intelligence', icon: Bot,
    description: 'Google AI workspace.' },
  { slug: 'meeting-room', name: 'Meeting Room', group: 'intelligence', icon: Mic,
    description: 'Meeting transcripts, decisions, follow-ups.' },
  { slug: 'drive-room', name: 'Drive Room', group: 'intelligence', icon: HardDrive,
    description: 'The Safe — files with visibility, Corridors to rooms.' },

  // People
  { slug: 'customers', name: 'Customers', group: 'people', icon: Users,
    description: 'Unified profiles, wallets, lifetime value.' },
  { slug: 'team', name: 'Team', group: 'people', icon: Users2,
    description: 'Skills, performance, XP, collaboration.' },
  { slug: 'backyard', name: 'Backyard', group: 'people', icon: TreePine,
    description: 'Events, milestones, perks, wellbeing.' },
  { slug: 'co-tasking', name: 'Co-Tasking', group: 'people', icon: CheckSquare,
    description: 'Help requests and collaboration score.' },

  // Admin
  { slug: 'management', name: 'Management', group: 'admin', icon: Building2,
    description: 'Integrations health, draft orders, CRM sync.',
    roles: ['owner', 'admin'] },
  { slug: 'access-requests', name: 'Access Requests', group: 'admin', icon: KeyRound,
    description: 'Pending team approvals.',
    roles: ['owner', 'admin'], badge: { count: 2, tone: 'gold' } },
  { slug: 'settings', name: 'Settings', group: 'admin', icon: Settings,
    description: 'Your profile and preferences.' },
];

export const ROOM_GROUPS: { id: RoomGroup; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'desk', label: 'Desk' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'people', label: 'People' },
  { id: 'admin', label: 'Admin' },
];

export function getRoomsForRole(role: string | null) {
  if (!role) return [];
  const r = role.toLowerCase();
  return ROOMS.filter((room) => !room.roles || room.roles.includes(r));
}

export function findRoom(slug: string) {
  return ROOMS.find((r) => r.slug === slug);
}
