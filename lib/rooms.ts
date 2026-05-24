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
  type LucideIcon,
} from 'lucide-react';

export type RoomGroup = 'home' | 'desk' | 'commerce' | 'intelligence' | 'people' | 'admin';

export type Room = {
  slug: string;
  name: string;
  group: RoomGroup;
  icon: LucideIcon;
  description: string;
  /** Roles that can see this room. Empty array = everyone. */
  roles?: string[];
  /** Optional status that appears as a small badge / dot in the sidebar */
  badge?: { count?: number; tone?: 'good' | 'warn' | 'bad' | 'info' | 'gold' };
};

/**
 * The canonical room list. Source of truth for sidebar order, command palette,
 * and (eventually) the `rooms` table seed. When Supabase is wired, this gets
 * mirrored into the DB at boot.
 */
export const ROOMS: Room[] = [
  {
    slug: 'house',
    name: 'House',
    group: 'home',
    icon: Home,
    description: 'Pulse — what is happening right now across both stores.',
  },
  {
    slug: 'whatsapp-desk',
    name: 'WhatsApp Desk',
    group: 'desk',
    icon: MessageSquare,
    description: 'Extract orders from chat, route customers, send drafts.',
    badge: { count: 7, tone: 'warn' },
  },
  {
    slug: 'inventory',
    name: 'Inventory',
    group: 'commerce',
    icon: Package,
    description: 'Unified catalogue, parity drift, stock alerts.',
    badge: { count: 3, tone: 'bad' },
  },
  {
    slug: 'orders',
    name: 'Orders',
    group: 'commerce',
    icon: ShoppingBag,
    description: 'Draft orders across Shopify, WooCommerce, and WhatsApp.',
  },
  {
    slug: 'customers',
    name: 'Customers',
    group: 'people',
    icon: Users,
    description: 'Unified profiles, wallets, and lifetime value.',
  },
  {
    slug: 'brand-intelligence',
    name: 'Brand Intelligence',
    group: 'intelligence',
    icon: Sparkles,
    description: 'GA snapshot, Meta signal, ghost heatmap, agentic network.',
  },
  {
    slug: 'backyard',
    name: 'Backyard',
    group: 'people',
    icon: TreePine,
    description: 'Events, milestones, meeting intelligence.',
  },
  {
    slug: 'co-tasking',
    name: 'Co-Tasking',
    group: 'people',
    icon: CheckSquare,
    description: 'Team tasks and notes — everything we owe each other.',
  },
  {
    slug: 'cashback',
    name: 'Cashback',
    group: 'commerce',
    icon: Wallet,
    description: 'Wallets, limited editions, customer public access.',
  },
  {
    slug: 'management',
    name: 'Management',
    group: 'admin',
    icon: Building2,
    description: 'Integrations health, draft orders, CRM sync.',
    roles: ['owner', 'admin'],
  },
  {
    slug: 'access-requests',
    name: 'Access Requests',
    group: 'admin',
    icon: KeyRound,
    description: 'Pending team approvals.',
    roles: ['owner', 'admin'],
    badge: { count: 2, tone: 'gold' },
  },
  {
    slug: 'settings',
    name: 'Settings',
    group: 'admin',
    icon: Settings,
    description: 'Your profile and preferences.',
  },
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
