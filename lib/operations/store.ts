import { promises as fs } from 'fs';
import path from 'path';
import { getCatalogue } from '@/lib/inventory/mock';
import type { Product, Store as InventoryStore } from '@/lib/inventory/types';
import type { Conversation, Extraction, Language, Store as SalesStore } from '@/lib/whatsapp/types';

// ─── Existing types (unchanged) ───────────────────────────────────────────

export type SyncTarget = 'shopify' | 'woocommerce';
export type ProductSyncState = 'synced' | 'pending' | 'failed';
export type CouponType = 'percentage' | 'fixed';
export type OrderStatus = 'draft' | 'payment_pending' | 'paid' | 'fulfilled' | 'refunded' | 'cancelled';

export type ManagedProduct = Product & {
  created_at: string;
  updated_at: string;
  platform_ids: { shopify?: string; woocommerce?: string };
  sync_status: Record<SyncTarget, ProductSyncState>;
  sync_errors: Partial<Record<SyncTarget, string>>;
};

export type UnifiedCustomer = {
  id: string;
  name: string;
  phone: string;
  whatsapp_number: string;
  email: string | null;
  country: string;
  language: Language;
  source: 'whatsapp' | 'shopify' | 'woocommerce' | 'manual';
  platform_ids: { shopify?: string; woocommerce?: string; whatsapp?: string };
  tags: string[];
  ltv_aed: number;
  orders_count: number;
  last_order_at: string | null;
  marketing_consent: boolean;
  finance_flags: string[];
  vip: boolean;
  city: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderLine = {
  sku: string;
  title: string;
  qty: number;
  price_aed: number;
};

export type OrderSubmission = {
  id: string;
  customer_id: string;
  customer_phone: string;
  source: 'whatsapp' | 'inventory' | 'manual';
  target_store: SyncTarget;
  lines: OrderLine[];
  total_aed: number;
  status: OrderStatus;
  payment_method: string;
  payment_status: 'unverified' | 'confirmed' | 'rejected' | 'refunded';
  shipping: Record<string, string | null>;
  platform_ids: { shopify_draft?: string; woocommerce_order?: string };
  notes: string[];
  flags: string[]; // ring_no_size, cod_high_value, manager_needed, discount_over_threshold, payment_proof_pending
  assignee: string | null;
  due: string | null;
  created_at: string;
  updated_at: string;
};

export type DiscountCoupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  applies_to: 'all' | 'sku' | 'category' | 'limited_edition';
  applies_value: string;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  targets: SyncTarget[];
  sync_status: Record<SyncTarget, ProductSyncState>;
  created_at: string;
  updated_at: string;
};

export type SyncJob = {
  id: string;
  kind: 'product' | 'catalogue' | 'coupon' | 'customer' | 'order';
  target: SyncTarget | 'all';
  status: 'completed' | 'failed';
  summary: string;
  created_at: string;
  details?: Record<string, unknown>;
};

export type RetargetingRecord = {
  id: string;
  customer_id: string;
  channel: 'meta' | 'google' | 'whatsapp' | 'email';
  audience: string;
  reason: string;
  created_at: string;
};

// ─── New operating-room entities ──────────────────────────────────────────

export type TeamRole = 'owner' | 'admin' | 'whatsapp_manager' | 'whatsapp_agent' | 'marketing' | 'strategy' | 'finance' | 'shipping' | 'inventory';
export type Presence = 'online' | 'away' | 'offline';

export type TeamMember = {
  id: string;
  name: string;
  role: TeamRole;
  status: Presence;
  active_now: string | null;
  load: number;          // active items
  closed_today: number;
  skills: string[];      // arabic, english, finance, bridal, shipping
  permissions: string[]; // room-level permission keys
  xp_total: number;
  avatar_color: string;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  entity_kind: 'order' | 'customer' | 'shipping' | 'access_request' | 'help_request' | 'meeting' | 'signal' | 'brief' | 'sheet' | 'wallet';
  entity_id: string;
  team_member_id: string;
  assigned_by: string;
  reason: string | null;
  created_at: string;
};

export type FollowUp = {
  id: string;
  customer_id: string;
  reason: string;       // ring-size missing, gift delivery follow-up, bridal objection, retargeting
  channel: 'whatsapp' | 'instagram' | 'email' | 'call';
  status: 'open' | 'in_progress' | 'done' | 'snoozed';
  due: string;
  assignee: string | null;
  notes: string[];
  source_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletEntryType = 'accrual' | 'spending' | 'hold' | 'adjustment';
export type WalletEntry = {
  id: string;
  customer_id: string;
  type: WalletEntryType;
  amount_aed: number;
  reason: string;
  order_id: string | null;
  status: 'available' | 'pending' | 'held' | 'redeemed';
  limited_edition_only: boolean;
  expires_at: string | null;
  created_at: string;
};

export type CourierSheetStatus = 'draft' | 'dispatched' | 'fulfilled' | 'exception';
export type CourierSheet = {
  id: string;
  order_id: string;
  courier: 'aramex' | 'fetchr' | 'self_drive' | 'smsa';
  status: CourierSheetStatus;
  pickup_window: string;
  city: string | null;
  area: string | null;
  building: string | null;
  flat_or_villa: string | null;
  awb: string | null;
  pod_url: string | null;
  exception: string | null;
  created_at: string;
  updated_at: string;
};

export type SignalKind = 'meta_comment' | 'meta_burst' | 'ghost_browse' | 'objection' | 'demand_spike' | 'content_idea' | 'reel_save';
export type BrandSignal = {
  id: string;
  kind: SignalKind;
  source: 'meta' | 'instagram' | 'tiktok' | 'whatsapp' | 'website' | 'shopify' | 'woocommerce';
  product_sku: string | null;
  customer_id: string | null;
  summary: string;
  volume: number;
  tone: 'positive' | 'neutral' | 'negative';
  status: 'open' | 'watching' | 'actioned' | 'resolved';
  recommended_action: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchBriefKind = 'gemini_research' | 'owner_brief' | 'risk_digest' | 'demand_report' | 'access_brief';
export type ResearchBrief = {
  id: string;
  kind: ResearchBriefKind;
  title: string;
  question: string;
  sources: { kind: 'whatsapp' | 'inventory' | 'orders' | 'drive' | 'reports' | 'finance' | 'customers'; ref: string }[];
  audience: 'owner' | 'finance' | 'marketing' | 'sales' | 'shipping' | 'house';
  status: 'requested' | 'drafting' | 'ready' | 'delivered';
  body: string | null;
  evidence_locked: boolean;
  created_at: string;
  updated_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  at: string;
  attendees: string[];
  source: 'ops' | 'growth' | 'finance' | 'policy' | 'onboarding';
  transcript_url: string | null;
  recording_url: string | null;
  summary: string;
  created_at: string;
};

export type Decision = {
  id: string;
  meeting_id: string;
  title: string;
  owner: string;
  due: string | null;
  status: 'approved' | 'pending' | 'blocked';
  rationale: string;
  follow_up_ids: string[];
  created_at: string;
};

export type AccessRequest = {
  id: string;
  requester_name: string;
  requester_id: string | null;
  requested_role: TeamRole | string;
  scope: string[];           // e.g. ['whatsapp_desk', 'customer_card', 'reply_optimize']
  sensitive_scope: string[]; // e.g. ['finance.payment_proof', 'customers.private']
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  decided_by: string | null;
  decided_at: string | null;
  rationale: string | null;
  created_at: string;
  expires_at: string | null;
};

export type HelpRequest = {
  id: string;
  posted_by: string;
  room: string;
  title: string;
  detail: string;
  skill_needed: string[];
  status: 'open' | 'claimed' | 'blocked' | 'resolved';
  claimed_by: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  block_reason: string | null;
  linked_entity: { kind: string; id: string } | null;
  created_at: string;
  updated_at: string;
};

export type XpEntry = {
  id: string;
  team_member_id: string;
  reason: string;
  amount: number;
  source: 'co_tasking' | 'learning' | 'milestone' | 'shipping' | 'sales' | 'manual';
  created_at: string;
};

export type Perk = {
  id: string;
  team_member_id: string;
  title: string;
  detail: string;
  status: 'ready' | 'redeemed' | 'expired';
  unlocked_at: string;
};

export type LearningModule = {
  id: string;
  title: string;
  audience: TeamRole[];
  assigned_to: string[];
  due: string;
  status: 'open' | 'in_progress' | 'completed';
};

export type IntegrationCheck = {
  id: string;
  service: 'shopify' | 'woocommerce' | 'whatsapp_cloud' | 'tamara' | 'tabby' | 'supabase' | 'meta_ads' | 'google_shopping' | 'drive';
  status: 'connected' | 'degraded' | 'disconnected';
  last_checked_at: string;
  detail: string;
  fix_action: string | null;
};

// ─── WhatsApp Desk presence and outgoing logs ─────────────────────────────

export type WhatsAppOutgoing = {
  id: string;
  at: string;             // ISO timestamp
  body: string;
  language: 'en' | 'ar' | 'mixed';
  sent_by_id: string;     // team_member_id
  sent_by_name: string;   // display name
  delivered: boolean;
  read: boolean;
  payment_link: boolean;
  shortcut_id: string | null;
  reply_to_message_id: string | null;
};

export type WhatsAppTranscription = {
  message_id: string;
  filename: string;
  language: 'en' | 'ar' | 'mixed';
  transcript: string;
  summary: string;
  duration_sec: number | null;
  intent: string | null;
  created_at: string;
};

export type ConversationPresence = {
  conversation_id: string;
  claimed_by_id: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  released_at: string | null;
  watchers: { id: string; name: string; at: string }[];
  outgoing: WhatsAppOutgoing[];
  transcriptions: WhatsAppTranscription[];
  customer_happiness_overrides: number | null;
  unresolved: boolean;
  last_agent_reply_at: string | null;
  last_customer_message_at: string | null;
  first_response_seconds: number | null;
  upsell_count: number;
};

// ─── Notes (header system, not a room) ────────────────────────────────────

export type NoteAudienceKind = 'individual' | 'role' | 'all';
export type NoteKind = 'human' | 'ai_to_role' | 'ai_personal' | 'system';
export type NotePriority = 'low' | 'normal' | 'high';

export type Note = {
  id: string;
  from_id: string;            // team_member_id, 'omnia_ai', or 'system'
  from_name: string;
  to_member_ids: string[];    // explicit recipients; empty when targeting a role or "all"
  to_role: TeamRole | null;   // when audience='role' this is the role
  audience: NoteAudienceKind;
  audience_label: string;     // human-readable recipient label
  body: string;
  kind: NoteKind;
  priority: NotePriority;
  tags: string[];
  created_at: string;
  read_by: string[];
  acknowledged_by: string[];
  reply_to: string | null;
  source: string;             // 'manual' | 'orchestrator' | 'metric_threshold' | 'integration'
};

export type AutomationRoom = 'orders' | 'shipping' | 'customers' | 'finance' | 'reports' | 'cashback' | 'brand' | 'gemini' | 'meeting' | 'backyard' | 'cotasking' | 'management' | 'access' | 'team' | 'inventory' | 'whatsapp';
export type AutomationConfig = {
  key: string;
  room: AutomationRoom;
  title: string;
  detail: string;
  enabled: boolean;
  threshold: number | null;
  guard_roles: string[]; // who can flip
  updated_at: string;
  updated_by: string | null;
};

export type ActivityEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  rationale: string;
  visibility: 'owner' | 'finance' | 'managers' | 'house';
};

export type OperationsState = {
  products: ManagedProduct[];
  customers: UnifiedCustomer[];
  orders: OrderSubmission[];
  coupons: DiscountCoupon[];
  sync_jobs: SyncJob[];
  retargeting: RetargetingRecord[];
  team: TeamMember[];
  assignments: Assignment[];
  followups: FollowUp[];
  wallet_entries: WalletEntry[];
  sheets: CourierSheet[];
  signals: BrandSignal[];
  briefs: ResearchBrief[];
  meetings: Meeting[];
  decisions: Decision[];
  access_requests: AccessRequest[];
  help_requests: HelpRequest[];
  xp: XpEntry[];
  perks: Perk[];
  learning: LearningModule[];
  integrations: IntegrationCheck[];
  automations: Record<string, AutomationConfig>;
  whatsapp_presence: Record<string, ConversationPresence>;
  notes: Note[];
  audit: AuditEntry[];
  activity: ActivityEntry[];
};

// Vercel's serverless filesystem is read-only outside /tmp. On Vercel we
// persist to /tmp so each warm invocation reuses state; on cold starts (and
// locally) we fall back to .data/. Either way we always have an in-memory
// cache so a failed disk write never breaks an API call.
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const STORE_FILE = IS_SERVERLESS
  ? path.join('/tmp', 'omniahouse-operations-store.json')
  : path.join(process.cwd(), '.data', 'operations-store.json');

let memoryState: OperationsState | null = null;

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function cleanPhone(phone: string) { return phone.replace(/[^\d+]/g, '').replace(/^00/, '+'); }
function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ─── Seed data (real Omnia context) ────────────────────────────────────────

function seedProducts(): ManagedProduct[] {
  const stamped = now();
  return getCatalogue().map((p) => ({
    ...p,
    source: p.source ?? 'mock',
    created_at: stamped,
    updated_at: stamped,
    platform_ids: {
      shopify: p.on_shopify ? p.master_sku : undefined,
      woocommerce: p.on_woocommerce ? p.master_sku : undefined,
    },
    sync_status: {
      shopify: p.on_shopify ? 'synced' : 'pending',
      woocommerce: p.on_woocommerce ? 'synced' : 'pending',
    },
    sync_errors: {},
  }));
}

function seedTeam(): TeamMember[] {
  const t = now();
  const make = (i: number, name: string, role: TeamRole, status: Presence, active: string | null, load: number, closed: number, skills: string[], perms: string[], color: string, xp = 0): TeamMember => ({
    id: `tm_${i}`, name, role, status, active_now: active, load, closed_today: closed, skills, permissions: perms, xp_total: xp, avatar_color: color, created_at: t, updated_at: t,
  });
  return [
    make(0, 'Mahmoud', 'owner', 'online', 'House of Omnia', 5, 3, ['policy', 'arabic', 'english', 'owner_decisions'], ['*'], '#C68A4E', 1200),
    make(1, 'Ez', 'admin', 'online', 'across the rooms', 4, 6, ['policy', 'english', 'arabic', 'audit'], ['*'], '#D4A574', 980),
    make(2, 'Abdelrahman', 'whatsapp_manager', 'online', 'WhatsApp Desk', 9, 9, ['arabic', 'english', 'sales', 'objection'], ['whatsapp_desk', 'orders', 'customers', 'shipping'], '#7AA7D9', 740),
    make(3, 'Arslan', 'whatsapp_agent', 'online', 'awaiting Noura A.', 6, 6, ['arabic', 'english', 'bridal'], ['whatsapp_desk', 'customer_card'], '#7CB87C', 420),
    make(4, 'Abdallah', 'whatsapp_agent', 'away', null, 0, 4, ['arabic', 'sales'], ['whatsapp_desk', 'customer_card'], '#D9A75B', 260),
    make(5, 'Ahmed', 'marketing', 'offline', null, 0, 0, ['content', 'brand', 'arabic'], ['brand_intelligence', 'reports', 'inventory_seo'], '#9E7BD9', 180),
    make(6, 'Mohamed', 'whatsapp_agent', 'online', 'shadowing', 1, 0, ['english', 'shipping_support'], ['whatsapp_desk'], '#5FB4A2', 60),
  ];
}

function seedCustomers(): UnifiedCustomer[] {
  const t = now();
  return [
    {
      id: 'cust_aisha', name: 'Aisha M.', phone: '+971501234884', whatsapp_number: '+971501234884', email: null,
      country: 'AE', language: 'mixed', source: 'whatsapp',
      platform_ids: { shopify: 'shopify_aisha', woocommerce: 'woo_aisha', whatsapp: 'w1' },
      tags: ['repeat', 'gift', 'wallet'], ltv_aed: 14400, orders_count: 3,
      last_order_at: '2026-04-12T10:00:00.000Z', marketing_consent: true, finance_flags: [],
      vip: false, city: 'Dubai', created_at: t, updated_at: t,
    },
    {
      id: 'cust_noura', name: 'Noura A.', phone: '+971555478217', whatsapp_number: '+971555478217', email: null,
      country: 'AE', language: 'ar', source: 'whatsapp',
      platform_ids: { whatsapp: 'w2' },
      tags: ['bridal', 'objection'], ltv_aed: 0, orders_count: 0,
      last_order_at: null, marketing_consent: true, finance_flags: ['payment_proof_pending'],
      vip: false, city: 'Abu Dhabi', created_at: t, updated_at: t,
    },
    {
      id: 'cust_mariam', name: 'Mariam K.', phone: '+966507733091', whatsapp_number: '+966507733091', email: null,
      country: 'SA', language: 'ar', source: 'whatsapp',
      platform_ids: { whatsapp: 'w3', shopify: 'shopify_mariam' },
      tags: ['ksa', 'ghost'], ltv_aed: 11800, orders_count: 2,
      last_order_at: '2026-03-30T10:00:00.000Z', marketing_consent: true, finance_flags: [],
      vip: false, city: 'Riyadh', created_at: t, updated_at: t,
    },
    {
      id: 'cust_laila', name: 'Laila H.', phone: '+971502211009', whatsapp_number: '+971502211009', email: 'laila@example.ae',
      country: 'AE', language: 'en', source: 'shopify',
      platform_ids: { shopify: 'shopify_laila' },
      tags: ['vip', 'limited_edition'], ltv_aed: 18200, orders_count: 4,
      last_order_at: '2026-04-22T10:00:00.000Z', marketing_consent: true, finance_flags: [],
      vip: true, city: 'Dubai', created_at: t, updated_at: t,
    },
    {
      id: 'cust_sara', name: 'Sara K.', phone: '+971554120907', whatsapp_number: '+971554120907', email: null,
      country: 'AE', language: 'en', source: 'whatsapp',
      platform_ids: { whatsapp: 'w5' },
      tags: ['new', 'ring_size_missing'], ltv_aed: 0, orders_count: 0,
      last_order_at: null, marketing_consent: true, finance_flags: [],
      vip: false, city: 'Sharjah', created_at: t, updated_at: t,
    },
  ];
}

function seedOrders(): OrderSubmission[] {
  const t = now();
  const mk = (over: Partial<OrderSubmission>): OrderSubmission => ({
    id: over.id || id('ord'), customer_id: over.customer_id!, customer_phone: over.customer_phone!,
    source: over.source || 'whatsapp', target_store: over.target_store || 'shopify',
    lines: over.lines || [], total_aed: over.total_aed ?? 0,
    status: over.status || 'draft', payment_method: over.payment_method || 'unknown',
    payment_status: over.payment_status || 'unverified',
    shipping: over.shipping || {}, platform_ids: over.platform_ids || {},
    notes: over.notes || [], flags: over.flags || [],
    assignee: over.assignee ?? null, due: over.due ?? null,
    created_at: over.created_at || t, updated_at: t,
  });
  return [
    mk({
      id: 'ord_aisha_crescent', customer_id: 'cust_aisha', customer_phone: '+971501234884',
      lines: [{ sku: 'CR-925-07', title: 'Crescent Ring · 925 Silver', qty: 2, price_aed: 1300 }],
      total_aed: 2600, status: 'payment_pending', payment_method: 'cod', payment_status: 'unverified',
      shipping: { city: 'Dubai', area: 'Al Wasl', building: 'Villa 42', flat_or_villa: 'Villa', delivery_window: 'Today 17:00' },
      target_store: 'shopify', notes: ['Confirmed two rings; gift wrap requested.'],
      flags: ['ready_for_push'], assignee: 'tm_0', due: '2026-05-25T18:00:00.000Z',
    }),
    mk({
      id: 'ord_noura_bridal', customer_id: 'cust_noura', customer_phone: '+971555478217',
      lines: [{ sku: 'BR-SET-02', title: 'Bridal Stack · Gold', qty: 1, price_aed: 8900 }],
      total_aed: 8900, status: 'draft', payment_method: 'bank_transfer', payment_status: 'unverified',
      shipping: { city: 'Abu Dhabi', area: null, building: null, flat_or_villa: null, delivery_window: 'Tomorrow' },
      target_store: 'shopify', notes: ['Bridal customer; ring size still missing.'],
      flags: ['ring_no_size', 'manager_watch'], assignee: 'tm_3', due: '2026-05-25T20:00:00.000Z',
    }),
    mk({
      id: 'ord_khalid_gift', customer_id: 'cust_aisha', customer_phone: '+971501234884',
      lines: [{ sku: 'MS-RG-01', title: 'Moonstone Pendant', qty: 1, price_aed: 1450 }],
      total_aed: 1450, status: 'draft', payment_method: 'card', payment_status: 'unverified',
      shipping: { city: 'Dubai', area: 'Mirdif', building: null, flat_or_villa: null, delivery_window: 'Tomorrow' },
      target_store: 'woocommerce', notes: ['Gift order; awaiting address line 2.'],
      flags: ['address_incomplete'], assignee: 'tm_2', due: '2026-05-26T12:00:00.000Z',
    }),
    mk({
      id: 'ord_laila_le', customer_id: 'cust_laila', customer_phone: '+971502211009',
      lines: [{ sku: 'LE-CEL-50', title: 'LE Celestial Ring', qty: 1, price_aed: 12400 }],
      total_aed: 12400, status: 'payment_pending', payment_method: 'tamara', payment_status: 'unverified',
      shipping: { city: 'Dubai', area: 'Downtown', building: 'Boulevard Tower', flat_or_villa: '1602', delivery_window: 'Today 19:00' },
      target_store: 'shopify', notes: ['Customer asked for 15% discount; over threshold.'],
      flags: ['discount_over_threshold', 'manager_needed'], assignee: 'tm_0', due: '2026-05-25T19:00:00.000Z',
    }),
    mk({
      id: 'ord_mariam_hoops', customer_id: 'cust_mariam', customer_phone: '+966507733091',
      lines: [{ sku: 'EA-HP-04', title: 'Hoop Earrings · Gold', qty: 1, price_aed: 1900 }],
      total_aed: 1900, status: 'paid', payment_method: 'tabby', payment_status: 'confirmed',
      shipping: { city: 'Riyadh', area: 'Olaya', building: 'Kingdom Tower', flat_or_villa: '802', delivery_window: 'Today 19:00' },
      target_store: 'shopify', notes: ['Tabby paid; ready for courier sheet.'],
      flags: ['ready_to_ship'], assignee: 'tm_2', due: '2026-05-25T19:00:00.000Z',
    }),
    mk({
      id: 'ord_sara_daily', customer_id: 'cust_sara', customer_phone: '+971554120907',
      lines: [{ sku: 'RG-DLY-09', title: 'Daily Ring · Silver', qty: 1, price_aed: 980 }],
      total_aed: 980, status: 'draft', payment_method: 'cod', payment_status: 'unverified',
      shipping: { city: 'Sharjah', area: 'Al Majaz', building: null, flat_or_villa: null, delivery_window: 'Today' },
      target_store: 'shopify', notes: ['Awaiting customer ring size.'],
      flags: ['ring_no_size'], assignee: 'tm_3', due: '2026-05-25T18:00:00.000Z',
    }),
    mk({
      id: 'ord_aisha_proof', customer_id: 'cust_noura', customer_phone: '+971555478217',
      lines: [{ sku: 'BG-925-03', title: 'Sun Bangle · Silver', qty: 1, price_aed: 3200 }],
      total_aed: 3200, status: 'payment_pending', payment_method: 'bank_transfer', payment_status: 'unverified',
      shipping: { city: 'Abu Dhabi', area: 'Khalidiya', building: null, flat_or_villa: null, delivery_window: 'Today' },
      target_store: 'shopify', notes: ['Bank transfer proof attached; pending finance.'],
      flags: ['payment_proof_pending', 'finance_hold'], assignee: 'tm_0', due: '2026-05-25T17:00:00.000Z',
    }),
  ];
}

function seedSignals(): BrandSignal[] {
  const t = now();
  const mk = (over: Partial<BrandSignal>): BrandSignal => ({
    id: over.id || id('sig'), kind: over.kind!, source: over.source!,
    product_sku: over.product_sku ?? null, customer_id: over.customer_id ?? null,
    summary: over.summary!, volume: over.volume ?? 1, tone: over.tone || 'neutral',
    status: over.status || 'open', recommended_action: over.recommended_action ?? null,
    created_at: over.created_at || t, updated_at: t,
  });
  return [
    mk({ id: 'sig_bridal_burst', kind: 'meta_burst', source: 'meta', product_sku: 'BR-SET-02',
      summary: 'Two repeat negative comments on bridal stack reel: shipping speed concern.',
      volume: 2, tone: 'negative', status: 'open', recommended_action: 'Reply with same-day promise + Tamara financing line.' }),
    mk({ id: 'sig_celestial_saves', kind: 'reel_save', source: 'instagram', product_sku: 'LE-CEL-50',
      summary: 'LE Celestial reel 8.2% save rate but 1.1% click-through — strong save, weak CTA.',
      volume: 412, tone: 'positive', status: 'watching', recommended_action: 'Add waitlist link to bio + retarget savers in 48h.' }),
    mk({ id: 'sig_ksa_gift_angle', kind: 'demand_spike', source: 'meta', product_sku: null,
      summary: 'Arabic gifting copy beating product-first copy by +18% CTR in KSA.',
      volume: 6, tone: 'positive', status: 'open', recommended_action: 'Scale gift-angle Arabic creative budget by 30%.' }),
    mk({ id: 'sig_bridal_ghost', kind: 'ghost_browse', source: 'website', product_sku: 'BR-SET-02', customer_id: 'cust_laila',
      summary: 'VIP segment views bridal stacks 11 times without checkout.',
      volume: 11, tone: 'neutral', status: 'open', recommended_action: 'Send WhatsApp soft-touch with stylist consultation.' }),
    mk({ id: 'sig_delivery_objection', kind: 'objection', source: 'whatsapp', product_sku: null,
      summary: '6 high-ticket chats this week cluster around delivery timing concerns.',
      volume: 6, tone: 'negative', status: 'open', recommended_action: 'Add courier ETA shortcut to WhatsApp templates.' }),
    mk({ id: 'sig_push_today', kind: 'content_idea', source: 'instagram', product_sku: 'CR-925-07',
      summary: 'Crescent Rings have demand pressure and matched stock — ready for owner-led story.',
      volume: 2, tone: 'positive', status: 'open', recommended_action: 'Schedule story by 17:00 with stock badge.' }),
  ];
}

function seedFollowUps(): FollowUp[] {
  const t = now();
  return [
    { id: 'fu_aisha_delivery', customer_id: 'cust_aisha', reason: 'Gift order confirmed; follow up after delivery to confirm wrap quality.',
      channel: 'whatsapp', status: 'open', due: '2026-05-26T12:00:00.000Z', assignee: 'tm_3',
      notes: ['Wrap requested; she will likely repurchase for Eid.'], source_order_id: 'ord_aisha_crescent', created_at: t, updated_at: t },
    { id: 'fu_noura_bridal', customer_id: 'cust_noura', reason: 'Bridal stack inquiry without purchase; cold-go warm reply needed.',
      channel: 'whatsapp', status: 'open', due: '2026-05-25T20:00:00.000Z', assignee: 'tm_3',
      notes: ['Arabic bridal objection; size still missing.'], source_order_id: null, created_at: t, updated_at: t },
    { id: 'fu_sara_size', customer_id: 'cust_sara', reason: 'Ring size missing — draft cannot move.',
      channel: 'whatsapp', status: 'in_progress', due: '2026-05-25T18:00:00.000Z', assignee: 'tm_3',
      notes: ['Sent /ring-size shortcut at 11:42.'], source_order_id: 'ord_sara_daily', created_at: t, updated_at: t },
    { id: 'fu_mariam_ksa', customer_id: 'cust_mariam', reason: 'KSA repeat customer with ghost browse; retarget moment.',
      channel: 'whatsapp', status: 'open', due: '2026-05-26T10:00:00.000Z', assignee: 'tm_2',
      notes: ['Strong KSA gift angle resonates with her tags.'], source_order_id: null, created_at: t, updated_at: t },
  ];
}

function seedWalletEntries(): WalletEntry[] {
  const t = now();
  return [
    { id: 'wal_aisha_credit', customer_id: 'cust_aisha', type: 'accrual', amount_aed: 260, reason: 'Earned from delivered gift order',
      order_id: 'ord_aisha_crescent', status: 'available', limited_edition_only: true, expires_at: '2026-08-25T00:00:00.000Z', created_at: t },
    { id: 'wal_laila_vip', customer_id: 'cust_laila', type: 'accrual', amount_aed: 1120, reason: 'VIP cumulative credit',
      order_id: null, status: 'available', limited_edition_only: true, expires_at: null, created_at: t },
    { id: 'wal_sara_pending', customer_id: 'cust_sara', type: 'accrual', amount_aed: 98, reason: 'Pending until delivery confirmation',
      order_id: 'ord_sara_daily', status: 'pending', limited_edition_only: true, expires_at: '2026-08-25T00:00:00.000Z', created_at: t },
    { id: 'wal_noura_hold', customer_id: 'cust_noura', type: 'hold', amount_aed: 140, reason: 'Refund-linked hold',
      order_id: 'ord_aisha_proof', status: 'held', limited_edition_only: true, expires_at: null, created_at: t },
  ];
}

function seedMeetings(): { meetings: Meeting[]; decisions: Decision[] } {
  const t = now();
  const meetings: Meeting[] = [
    { id: 'meet_ops_2026_05_24', title: 'Operations sync · WhatsApp approval gate', at: '2026-05-24T10:00:00.000Z',
      attendees: ['Mahmoud', 'Ez', 'Abdelrahman'], source: 'ops', transcript_url: 'drive://meetings/2026-05-24-ops.txt',
      recording_url: null, summary: 'Approval gate locked; no auto-push of WhatsApp drafts.', created_at: t },
    { id: 'meet_policy_finance', title: 'Finance visibility policy', at: '2026-05-22T14:00:00.000Z',
      attendees: ['Mahmoud', 'Ez'], source: 'policy', transcript_url: 'drive://meetings/finance-policy.txt',
      recording_url: null, summary: 'Finance figures stay owner/finance only in AI answers.', created_at: t },
    { id: 'meet_growth_eid', title: 'Eid cashback launch plan', at: '2026-05-23T09:00:00.000Z',
      attendees: ['Ez', 'Ahmed', 'Abdelrahman'], source: 'growth', transcript_url: null,
      recording_url: 'drive://meetings/eid-launch.mp3', summary: 'LE drop two weeks earlier; Arabic copy first.', created_at: t },
  ];
  const decisions: Decision[] = [
    { id: 'dec_approval_gate', meeting_id: 'meet_ops_2026_05_24', title: 'Approval gate for WhatsApp drafts',
      owner: 'Mahmoud', due: '2026-05-25T00:00:00.000Z', status: 'approved',
      rationale: 'Prevent draft push without human approval; protects customer trust and finance.',
      follow_up_ids: [], created_at: t },
    { id: 'dec_parity_cadence', meeting_id: 'meet_ops_2026_05_24', title: 'Inventory parity report daily',
      owner: 'Ez', due: '2026-05-26T00:00:00.000Z', status: 'pending',
      rationale: 'Catch price drift before customers do.',
      follow_up_ids: [], created_at: t },
    { id: 'dec_finance_scope', meeting_id: 'meet_policy_finance', title: 'Finance scope in AI answers',
      owner: 'Mahmoud', due: null, status: 'approved',
      rationale: 'Finance data stays finance/owner only.',
      follow_up_ids: [], created_at: t },
    { id: 'dec_eid_arabic_first', meeting_id: 'meet_growth_eid', title: 'Eid push: Arabic copy first',
      owner: 'Ahmed', due: '2026-05-26T00:00:00.000Z', status: 'pending',
      rationale: 'KSA/UAE gift-angle Arabic outperformed product-first by +18%.',
      follow_up_ids: [], created_at: t },
  ];
  return { meetings, decisions };
}

function seedAccessRequests(): AccessRequest[] {
  const t = now();
  return [
    { id: 'ar_mohamed_agent', requester_name: 'Mohamed', requester_id: 'tm_6', requested_role: 'whatsapp_agent',
      scope: ['whatsapp_desk', 'customer_card', 'reply_optimize'], sensitive_scope: [],
      reason: 'New hire — onboarding today.', status: 'pending', decided_by: null, decided_at: null, rationale: null,
      created_at: t, expires_at: null },
    { id: 'ar_hassan_finance', requester_name: 'Hassan Al-Marri', requester_id: null, requested_role: 'finance',
      scope: ['finance', 'orders'], sensitive_scope: ['finance.payment_proof', 'finance.settlement'],
      reason: 'Needs to reconcile draft orders cross-store.', status: 'pending', decided_by: null, decided_at: null, rationale: null,
      created_at: t, expires_at: null },
    { id: 'ar_marketing_export', requester_name: 'Ahmed', requester_id: 'tm_5', requested_role: 'marketing',
      scope: ['reports'], sensitive_scope: ['reports.export'],
      reason: 'Wants aggregate demand export without customer-private fields.', status: 'pending',
      decided_by: null, decided_at: null, rationale: null, created_at: t, expires_at: null },
    { id: 'ar_shipping_approved', requester_name: 'Mohamed', requester_id: 'tm_6', requested_role: 'shipping',
      scope: ['shipping.exceptions'], sensitive_scope: [], reason: 'Take handoffs on missing-field follow-ups.',
      status: 'approved', decided_by: 'Mahmoud', decided_at: '2026-05-23T12:00:00.000Z',
      rationale: 'Helps clear courier sheet exceptions.', created_at: '2026-05-23T11:30:00.000Z', expires_at: null },
  ];
}

function seedHelpRequests(): HelpRequest[] {
  const t = now();
  return [
    { id: 'help_arabic_bridal', posted_by: 'tm_3', room: 'Co-Tasking', title: 'Arabic bridal reply check',
      detail: 'Customer asking about ring sizing for a bridal stack — need second opinion on the Arabic phrasing.',
      skill_needed: ['arabic', 'bridal'], status: 'open', claimed_by: null, claimed_at: null, resolved_at: null,
      block_reason: null, linked_entity: { kind: 'order', id: 'ord_noura_bridal' }, created_at: t, updated_at: t },
    { id: 'help_payment_review', posted_by: 'tm_0', room: 'Co-Tasking', title: 'Second look on payment proof',
      detail: 'Bank transfer screenshot vs order amount — finance wants a second pair of eyes.',
      skill_needed: ['finance'], status: 'open', claimed_by: null, claimed_at: null, resolved_at: null,
      block_reason: null, linked_entity: { kind: 'order', id: 'ord_aisha_proof' }, created_at: t, updated_at: t },
    { id: 'help_courier_cleanup', posted_by: 'tm_2', room: 'Co-Tasking', title: 'Courier sheet area missing',
      detail: 'Khalid gift sheet missing area; need agent to ping customer.',
      skill_needed: ['shipping'], status: 'claimed', claimed_by: 'tm_6', claimed_at: t, resolved_at: null,
      block_reason: null, linked_entity: { kind: 'order', id: 'ord_khalid_gift' }, created_at: t, updated_at: t },
    { id: 'help_vip_summary', posted_by: 'tm_0', room: 'Co-Tasking', title: 'VIP call prep summary',
      detail: 'Need a 5-line summary on Laila H. before owner places a call.',
      skill_needed: ['ai', 'customer_summary'], status: 'claimed', claimed_by: 'omnia_ai', claimed_at: t, resolved_at: null,
      block_reason: null, linked_entity: { kind: 'customer', id: 'cust_laila' }, created_at: t, updated_at: t },
    { id: 'help_finance_access', posted_by: 'tm_3', room: 'Co-Tasking', title: 'Finance data access',
      detail: 'Need to see payment proof for a chat — currently blocked.',
      skill_needed: ['finance'], status: 'blocked', claimed_by: null, claimed_at: null, resolved_at: null,
      block_reason: 'Agent role lacks finance.payment_proof scope.', linked_entity: { kind: 'order', id: 'ord_aisha_proof' }, created_at: t, updated_at: t },
  ];
}

function seedIntegrationChecks(): IntegrationCheck[] {
  const t = now();
  const has = {
    shopify: Boolean((process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_TOKEN) && process.env.SHOPIFY_STORE_DOMAIN),
    woo: Boolean(process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET && process.env.WOOCOMMERCE_URL),
    wa: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    drive: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID),
  };
  const mk = (service: IntegrationCheck['service'], status: IntegrationCheck['status'], detail: string, fix: string | null): IntegrationCheck => ({
    id: `int_${service}`, service, status, last_checked_at: t, detail, fix_action: fix,
  });
  return [
    mk('shopify', has.shopify ? 'connected' : 'degraded', has.shopify ? 'Admin API token + store domain configured.' : 'No SHOPIFY_ADMIN_ACCESS_TOKEN; draft path running locally only.', has.shopify ? null : 'Add SHOPIFY_ADMIN_ACCESS_TOKEN and SHOPIFY_STORE_DOMAIN in Vercel.'),
    mk('woocommerce', has.woo ? 'connected' : 'degraded', has.woo ? 'WooCommerce REST keys configured.' : 'WC REST keys missing; pushes record locally.', has.woo ? null : 'Add WOOCOMMERCE_CONSUMER_KEY/SECRET + URL.'),
    mk('whatsapp_cloud', has.wa ? 'connected' : 'disconnected', has.wa ? 'WhatsApp Cloud API tokens present.' : 'No WHATSAPP_ACCESS_TOKEN; messages do not leave the desk.', has.wa ? null : 'Add WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID.'),
    mk('tamara', 'degraded', 'Tamara onboarding pending; BNPL path returns local link.', 'Complete Tamara onboarding call.'),
    mk('tabby', 'connected', 'Tabby checkout link path configured.', null),
    mk('supabase', has.supabase ? 'connected' : 'disconnected', has.supabase ? 'Supabase URL + service role key present.' : 'Database not connected; using local JSON store.', has.supabase ? null : 'Create Supabase project and add env vars.'),
    mk('meta_ads', 'connected', 'Meta Ads access OK; Sentinel polling comments.', null),
    mk('google_shopping', 'degraded', 'Some products marked rejected by Google Shopping.', 'Re-submit rejected products from Inventory.'),
    mk('drive', has.drive ? 'connected' : 'degraded', has.drive ? 'Drive client connected for source sets.' : 'Drive client not configured; Gemini source sets local only.', has.drive ? null : 'Add Google Drive client credentials.'),
  ];
}

function seedAutomations(): Record<string, AutomationConfig> {
  const t = now();
  const mk = (key: string, room: AutomationRoom, title: string, detail: string, enabled: boolean, threshold: number | null = null, guards: string[] = ['owner', 'admin']): AutomationConfig => ({
    key, room, title, detail, enabled, threshold, guard_roles: guards, updated_at: t, updated_by: null,
  });
  const list = [
    mk('orders.extraction_to_submission', 'orders', 'AI extraction to order submission', 'Create internal order draft, shipping prep, follow-up, and manager summary from WhatsApp extraction.', true),
    mk('orders.approval_gate', 'orders', 'Approval gate', 'Stop draft push when discount, COD, payment proof, or missing fields require review.', true),
    mk('orders.store_draft_creation', 'orders', 'Store draft creation', 'Create Shopify or WooCommerce draft only after the agent confirms the final state.', true),
    mk('shipping.sheet_builder', 'shipping', 'Courier sheet builder', 'Generate dispatch-ready rows from complete shipping preparation records.', true),
    mk('shipping.missing_field_loop', 'shipping', 'Missing-field loop', 'Send address gaps back to the assigned WhatsApp agent.', true),
    mk('shipping.exception_escalation', 'shipping', 'Exception escalation', 'Surface courier delays and finance holds to management.', true),
    mk('customers.profile_merger', 'customers', 'Profile merger', 'Match WhatsApp phone, store customer, wallet, and ghost identity into one card.', true),
    mk('customers.followup_queue', 'customers', 'Follow-up queue', 'Create tasks from objections, abandoned asks, and missing order fields.', true),
    mk('customers.consent_guard', 'customers', 'Consent guard', 'Block marketing action when customer opt-out is present.', true),
    mk('finance.proof_verifier', 'finance', 'Payment proof verifier', 'Check amount, date, currency, bank template, and suspicious metadata.', true, 32),
    mk('finance.settlement_matcher', 'finance', 'Settlement matcher', 'Match Shopify, WooCommerce, Tamara, Tabby, and wallet ledger events.', true),
    mk('finance.fraud_hold', 'finance', 'Fraud hold', 'Freeze fulfillment when proof, identity, or duplicate reference risk appears.', true, 60),
    mk('reports.owner_daily', 'reports', 'Daily owner brief', 'Summarize action queues, risks, revenue, product demand, and team load.', true),
    mk('reports.risk_digest', 'reports', 'Risk digest', 'Collect manager-needed cases from Orders, Finance, Shipping, and Brand.', true),
    mk('reports.demand_report', 'reports', 'Demand report', 'Cross WhatsApp asks, inventory stock, and products asked but not bought.', true),
    mk('cashback.delivery_earn', 'cashback', 'Earn credit from delivered orders', 'Create pending and available wallet entries from approved order events.', true),
    mk('cashback.le_guard', 'cashback', 'Limited Edition guard', 'Allow redemption only against eligible products and explain the reason when blocked.', true),
    mk('cashback.portal_risk', 'cashback', 'Portal risk check', 'Flag suspicious portal use, refund conflicts, and duplicate identity patterns.', true),
    mk('brand.sentinel_triage', 'brand', 'Meta Sentinel triage', 'Group repeated comment patterns, detect attack bursts, and route response drafts.', true),
    mk('brand.ghost_heatmap', 'brand', 'Ghost heatmap', 'Connect anonymous browsing intent to customer memory when identity is known.', true),
    mk('brand.demand_to_content', 'brand', 'Demand-to-content handoff', 'Turn product demand into SEO, video, WhatsApp templates, and campaign tasks.', true),
    mk('gemini.source_set_builder', 'gemini', 'Source set builder', 'Collect allowed files, transcripts, catalogue rows, and report snippets.', true),
    mk('gemini.permission_filter', 'gemini', 'Permission filter', 'Remove restricted finance or customer-private data before generating an answer.', true),
    mk('gemini.brief_writer', 'gemini', 'Brief writer', 'Turn sourced research into owner, marketing, or operations summaries.', true),
    mk('meeting.decision_extractor', 'meeting', 'Decision extractor', 'Turn transcript segments into decisions with owner, due date, and room link.', true),
    mk('meeting.followup_router', 'meeting', 'Follow-up router', 'Create assigned work in Co-Tasking, Omnia AI, or the relevant room.', true),
    mk('meeting.transcript_archive', 'meeting', 'Transcript archive', 'Store recording and transcript in Drive Room with visibility tags.', true),
    mk('backyard.xp_ledger', 'backyard', 'XP ledger', 'Award collaboration, learning, and milestone XP from completed work.', true),
    mk('backyard.wellbeing_guard', 'backyard', 'Wellbeing guard', 'Detect overtime and pressure patterns without exposing private notes.', true),
    mk('backyard.perk_shelf', 'backyard', 'Perk shelf', 'Unlock perks when verified actions reach the rule threshold.', true, 5),
    mk('cotasking.smart_routing', 'cotasking', 'Smart routing', 'Suggest helpers by skill, availability, room permission, and current load.', true),
    mk('cotasking.helper_credit', 'cotasking', 'Helper credit', 'Award collaboration XP after the assisted room item is resolved.', true),
    mk('cotasking.block_escalation', 'cotasking', 'Block escalation', 'Escalate access, finance, or manager-only blocks without leaking restricted data.', true),
    mk('management.integration_sweep', 'management', 'Integration health sweep', 'Check WhatsApp, Shopify, WooCommerce, BNPL, database, and inventory sync status.', true),
    mk('management.risk_digest', 'management', 'Owner risk digest', 'Collect discount, finance, access, and shipping exceptions into one decision queue.', true),
    mk('management.audit_logger', 'management', 'Audit logger', 'Record approvals, denials, draft pushes, access decisions, and override reasons.', true),
    mk('access.permission_diff', 'access', 'Permission diff', 'Show exactly what the requested access adds before the owner decides.', true),
    mk('access.sensitive_warning', 'access', 'Sensitive scope warning', 'Flag finance, private customer, export, integration, and audit permissions.', true),
    mk('access.audit_note', 'access', 'Audit note', 'Write who decided, what changed, and why.', true),
    mk('team.load_balancer', 'team', 'Load balancer', 'Suggest who can take a task based on room access, skill, and active queue.', true),
    mk('team.skill_router', 'team', 'Skill router', 'Route Arabic, finance, shipping, and VIP tasks to qualified people.', true),
    mk('team.overload_warning', 'team', 'Overload warning', 'Flag late work and blocked queues before they become customer risk.', true, 7),
  ];
  const map: Record<string, AutomationConfig> = {};
  for (const item of list) map[item.key] = item;
  return map;
}

function seedAssignments(): Assignment[] {
  const t = now();
  return [
    { id: 'asn_aisha', entity_kind: 'order', entity_id: 'ord_aisha_crescent', team_member_id: 'tm_0', assigned_by: 'tm_2', reason: 'Owner approves drafts', created_at: t },
    { id: 'asn_noura', entity_kind: 'order', entity_id: 'ord_noura_bridal', team_member_id: 'tm_3', assigned_by: 'tm_2', reason: 'Arabic bridal handler', created_at: t },
    { id: 'asn_laila', entity_kind: 'order', entity_id: 'ord_laila_le', team_member_id: 'tm_0', assigned_by: 'tm_2', reason: 'High-value discount decision', created_at: t },
    { id: 'asn_proof', entity_kind: 'order', entity_id: 'ord_aisha_proof', team_member_id: 'tm_0', assigned_by: 'tm_2', reason: 'Finance hold owner-level', created_at: t },
  ];
}

function seedXp(): XpEntry[] {
  const t = now();
  return [
    { id: 'xp_arslan_help', team_member_id: 'tm_3', reason: 'Helped Arabic chats x3', amount: 60, source: 'co_tasking', created_at: t },
    { id: 'xp_mohamed_shadow', team_member_id: 'tm_6', reason: 'Completed shadowing module', amount: 40, source: 'learning', created_at: t },
    { id: 'xp_abdelrahman_close', team_member_id: 'tm_2', reason: 'Closed 9 conversations today', amount: 90, source: 'sales', created_at: t },
    { id: 'xp_ez_audit', team_member_id: 'tm_1', reason: 'Resolved 3 audit cases', amount: 30, source: 'milestone', created_at: t },
  ];
}

function seedPerks(): Perk[] {
  const t = now();
  return [
    { id: 'perk_mohamed_coffee', team_member_id: 'tm_6', title: 'Coffee perk', detail: 'Unlocked after shipping assist streak.', status: 'ready', unlocked_at: t },
    { id: 'perk_arslan_lunch', team_member_id: 'tm_3', title: 'Team lunch credit', detail: 'For Arabic chat coverage milestone.', status: 'ready', unlocked_at: t },
  ];
}

function seedLearning(): LearningModule[] {
  return [
    { id: 'lm_payment_proof', title: 'Payment proof verification basics', audience: ['whatsapp_agent', 'whatsapp_manager'], assigned_to: ['tm_3', 'tm_6'], due: '2026-05-30T00:00:00.000Z', status: 'in_progress' },
    { id: 'lm_arabic_objection', title: 'Arabic objection handling', audience: ['whatsapp_agent'], assigned_to: ['tm_4'], due: '2026-06-01T00:00:00.000Z', status: 'open' },
  ];
}

function seedSheets(): CourierSheet[] {
  const t = now();
  return [
    { id: 'sh_aisha', order_id: 'ord_aisha_crescent', courier: 'aramex', status: 'draft', pickup_window: 'Today 17:00',
      city: 'Dubai', area: 'Al Wasl', building: 'Villa 42', flat_or_villa: 'Villa', awb: null, pod_url: null, exception: null, created_at: t, updated_at: t },
    { id: 'sh_mariam', order_id: 'ord_mariam_hoops', courier: 'aramex', status: 'dispatched', pickup_window: 'Today 19:00',
      city: 'Riyadh', area: 'Olaya', building: 'Kingdom Tower', flat_or_villa: '802', awb: 'AR99287122', pod_url: null, exception: null, created_at: t, updated_at: t },
    { id: 'sh_khalid', order_id: 'ord_khalid_gift', courier: 'fetchr', status: 'exception', pickup_window: 'Tomorrow',
      city: 'Dubai', area: 'Mirdif', building: null, flat_or_villa: null, awb: null, pod_url: null,
      exception: 'Area/area only — building missing.', created_at: t, updated_at: t },
  ];
}

function seedBriefs(): ResearchBrief[] {
  const t = now();
  return [
    { id: 'brief_owner_daily', kind: 'owner_brief', title: 'Owner daily brief',
      question: 'What needs owner attention today across rooms?',
      sources: [{ kind: 'orders', ref: 'today' }, { kind: 'finance', ref: 'proof' }, { kind: 'inventory', ref: 'parity' }],
      audience: 'owner', status: 'drafting', body: null, evidence_locked: true, created_at: t, updated_at: t },
    { id: 'brief_bridal_demand', kind: 'demand_report', title: 'Bridal demand source set',
      question: 'Where is bridal demand strongest right now?',
      sources: [{ kind: 'whatsapp', ref: 'bridal' }, { kind: 'inventory', ref: 'BR-SET-02' }],
      audience: 'marketing', status: 'ready',
      body: '11 ghost browse sessions on bridal stacks + 6 high-ticket WhatsApp objections clustering on delivery timing.',
      evidence_locked: true, created_at: t, updated_at: t },
    { id: 'brief_ksa_launch', kind: 'gemini_research', title: 'KSA launch readout',
      question: 'Which Arabic objections and product angles work in KSA?',
      sources: [{ kind: 'whatsapp', ref: 'ksa' }, { kind: 'reports', ref: 'demand' }],
      audience: 'house', status: 'requested', body: null, evidence_locked: true, created_at: t, updated_at: t },
  ];
}

function initialState(): OperationsState {
  const stamped = now();
  const { meetings, decisions } = seedMeetings();
  return {
    products: seedProducts(),
    customers: seedCustomers(),
    orders: seedOrders(),
    coupons: [
      { id: 'coupon_le10', code: 'LE10', type: 'percentage', value: 10, applies_to: 'limited_edition', applies_value: 'limited_edition',
        starts_at: stamped, ends_at: null, active: true, targets: ['shopify', 'woocommerce'],
        sync_status: { shopify: 'synced', woocommerce: 'synced' }, created_at: stamped, updated_at: stamped },
      { id: 'coupon_eid', code: 'EID26', type: 'percentage', value: 15, applies_to: 'all', applies_value: '',
        starts_at: stamped, ends_at: '2026-06-15T00:00:00.000Z', active: false, targets: ['shopify', 'woocommerce'],
        sync_status: { shopify: 'pending', woocommerce: 'pending' }, created_at: stamped, updated_at: stamped },
    ],
    sync_jobs: [],
    retargeting: [],
    team: seedTeam(),
    assignments: seedAssignments(),
    followups: seedFollowUps(),
    wallet_entries: seedWalletEntries(),
    sheets: seedSheets(),
    signals: seedSignals(),
    briefs: seedBriefs(),
    meetings,
    decisions,
    access_requests: seedAccessRequests(),
    help_requests: seedHelpRequests(),
    xp: seedXp(),
    perks: seedPerks(),
    learning: seedLearning(),
    integrations: seedIntegrationChecks(),
    automations: seedAutomations(),
    whatsapp_presence: seedWhatsappPresence(),
    notes: seedNotes(),
    audit: [],
    activity: [],
  };
}

function seedNotes(): Note[] {
  const t = (offsetMin: number) => new Date(Date.now() - offsetMin * 60 * 1000).toISOString();
  return [
    {
      id: 'note_seed_1', from_id: 'omnia_ai', from_name: 'Omnia AI',
      to_member_ids: [], to_role: 'owner', audience: 'role', audience_label: 'Owner',
      body: 'Two high-value orders pending discount approval over the 10% threshold. Aisha M. crescent rings (AED 2,600) and Laila H. LE Celestial (AED 12,400). Both have clean payment proofs.',
      kind: 'ai_to_role', priority: 'high', tags: ['orders', 'discount'],
      created_at: t(3), read_by: [], acknowledged_by: [], reply_to: null, source: 'orchestrator',
    },
    {
      id: 'note_seed_2', from_id: 'omnia_ai', from_name: 'Omnia AI',
      to_member_ids: [], to_role: 'whatsapp_manager', audience: 'role', audience_label: 'WhatsApp managers',
      body: 'Arslan is sitting at 6 active chats and one bridal voice note from Noura A. is unread for 14 minutes. Worth a hand-off to Abdallah or a manager check-in.',
      kind: 'ai_to_role', priority: 'normal', tags: ['team_load', 'whatsapp'],
      created_at: t(8), read_by: [], acknowledged_by: [], reply_to: null, source: 'orchestrator',
    },
    {
      id: 'note_seed_3', from_id: 'omnia_ai', from_name: 'Omnia AI',
      to_member_ids: [], to_role: 'marketing', audience: 'role', audience_label: 'Marketing',
      body: 'KSA gift-angle Arabic creative is beating product-first copy by +18% CTR. Worth scaling the budget on this variant ahead of Eid.',
      kind: 'ai_to_role', priority: 'normal', tags: ['ads', 'ksa'],
      created_at: t(15), read_by: [], acknowledged_by: [], reply_to: null, source: 'orchestrator',
    },
    {
      id: 'note_seed_4', from_id: 'tm_2', from_name: 'Abdelrahman',
      to_member_ids: ['tm_3'], to_role: null, audience: 'individual', audience_label: 'Arslan',
      body: 'Heads up — Aisha M. wants gift wrap on every order from now on. Add it to her profile so we don\'t have to ask each time.',
      kind: 'human', priority: 'low', tags: ['customer'],
      created_at: t(40), read_by: ['tm_3'], acknowledged_by: ['tm_3'], reply_to: null, source: 'manual',
    },
    {
      id: 'note_seed_5', from_id: 'tm_0', from_name: 'Mahmoud',
      to_member_ids: [], to_role: null, audience: 'all', audience_label: 'Everyone',
      body: 'Eid cashback campaign launches 2026-05-30. Marketing has the brief, sales should be ready for the LE Celestial drop two weeks earlier than usual.',
      kind: 'human', priority: 'high', tags: ['announcement', 'eid'],
      created_at: t(60 * 4), read_by: ['tm_1', 'tm_2'], acknowledged_by: ['tm_1'], reply_to: null, source: 'manual',
    },
    {
      id: 'note_seed_6', from_id: 'omnia_ai', from_name: 'Omnia AI',
      to_member_ids: ['tm_5'], to_role: null, audience: 'individual', audience_label: 'Ahmed',
      body: 'You have a LE Celestial photoshoot booked for 2026-05-28. Inventory shows the piece is .ae-only and not yet on Google Shopping — coordinate with Mahmoud before the campaign goes live.',
      kind: 'ai_personal', priority: 'normal', tags: ['photoshoot', 'le'],
      created_at: t(60 * 6), read_by: [], acknowledged_by: [], reply_to: null, source: 'orchestrator',
    },
  ];
}

function seedWhatsappPresence(): Record<string, ConversationPresence> {
  const t = now();
  const make = (id: string, claimedById: string | null, claimedByName: string | null, last_agent_at: string | null, last_customer_at: string | null, first_response: number | null, unresolved: boolean): ConversationPresence => ({
    conversation_id: id,
    claimed_by_id: claimedById, claimed_by_name: claimedByName,
    claimed_at: claimedById ? t : null,
    claim_expires_at: claimedById ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
    released_at: null, watchers: [], outgoing: [], transcriptions: [],
    customer_happiness_overrides: null,
    unresolved,
    last_agent_reply_at: last_agent_at,
    last_customer_message_at: last_customer_at,
    first_response_seconds: first_response,
    upsell_count: 0,
  });
  return {
    w1: make('w1', 'tm_2', 'Abdelrahman', '2026-05-25T14:31:00.000Z', '2026-05-25T14:32:00.000Z', 180, false),
    w2: make('w2', null, null, null, '2026-05-25T14:30:00.000Z', null, true),
    w3: make('w3', 'tm_3', 'Arslan', '2026-05-25T14:23:00.000Z', '2026-05-25T14:27:00.000Z', 180, true),
    w4: make('w4', 'tm_2', 'Abdelrahman', '2026-05-25T14:15:00.000Z', '2026-05-25T14:21:00.000Z', 300, false),
    w5: make('w5', null, null, null, '2026-05-25T14:18:00.000Z', null, true),
    w6: make('w6', null, null, null, '2026-05-25T14:02:00.000Z', null, true),
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────

async function readState(): Promise<OperationsState> {
  // Memory cache wins on warm invocations and keeps every API call non-throwing.
  if (memoryState) return memoryState;
  try {
    const text = await fs.readFile(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(text) as Partial<OperationsState>;
    memoryState = hydrate(parsed);
    return memoryState;
  } catch {
    memoryState = initialState();
    // Best-effort write — if the FS is read-only, just keep state in memory.
    await writeState(memoryState).catch(() => {});
    return memoryState;
  }
}

function hydrate(parsed: Partial<OperationsState>): OperationsState {
  const seed = initialState();
  return {
    products: parsed.products ?? seed.products,
    customers: parsed.customers ?? seed.customers,
    orders: parsed.orders ?? seed.orders,
    coupons: parsed.coupons ?? seed.coupons,
    sync_jobs: parsed.sync_jobs ?? [],
    retargeting: parsed.retargeting ?? [],
    team: parsed.team ?? seed.team,
    assignments: parsed.assignments ?? seed.assignments,
    followups: parsed.followups ?? seed.followups,
    wallet_entries: parsed.wallet_entries ?? seed.wallet_entries,
    sheets: parsed.sheets ?? seed.sheets,
    signals: parsed.signals ?? seed.signals,
    briefs: parsed.briefs ?? seed.briefs,
    meetings: parsed.meetings ?? seed.meetings,
    decisions: parsed.decisions ?? seed.decisions,
    access_requests: parsed.access_requests ?? seed.access_requests,
    help_requests: parsed.help_requests ?? seed.help_requests,
    xp: parsed.xp ?? seed.xp,
    perks: parsed.perks ?? seed.perks,
    learning: parsed.learning ?? seed.learning,
    integrations: parsed.integrations ?? seed.integrations,
    automations: parsed.automations ?? seed.automations,
    whatsapp_presence: parsed.whatsapp_presence ?? seed.whatsapp_presence,
    notes: parsed.notes ?? seed.notes,
    audit: parsed.audit ?? [],
    activity: parsed.activity ?? [],
  };
}

async function writeState(state: OperationsState) {
  // Update memory cache first so warm requests never see stale state, even
  // if the disk write fails on a read-only FS.
  memoryState = state;
  try {
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err: any) {
    // EROFS / EACCES / etc. — common on serverless. Memory cache is enough
    // to keep the operating layer working for the lifetime of the function.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ops-store] disk write failed, using in-memory state only:', err?.code || err?.message);
    }
  }
}

async function mutate<T>(fn: (state: OperationsState) => T | Promise<T>) {
  const state = await readState();
  const result = await fn(state);
  await writeState(state);
  return result;
}

function log(state: OperationsState, action: string, entity: string, detail: string, actor = 'omniahouse') {
  state.activity.unshift({ id: id('act'), at: now(), actor, action, entity, detail });
  state.activity = state.activity.slice(0, 400);
}

function audit(state: OperationsState, action: string, entity: string, rationale: string, actor: string, visibility: AuditEntry['visibility'] = 'house') {
  state.audit.unshift({ id: id('aud'), at: now(), actor, action, entity, rationale, visibility });
  state.audit = state.audit.slice(0, 500);
}

// ─── Existing exports (compatibility) ─────────────────────────────────────

function toManagedProduct(input: Partial<ManagedProduct> & { master_sku: string; display_title: string }): ManagedProduct {
  const stamped = now();
  const shopifyPrice = numberOrNull(input.shopify_price_aed);
  const wooPrice = numberOrNull(input.woocommerce_price_aed);
  const shopifyQty = numberOrNull(input.shopify_qty);
  const wooQty = numberOrNull(input.woocommerce_qty);
  const onShopify = input.on_shopify ?? (shopifyPrice !== null || shopifyQty !== null);
  const onWoo = input.on_woocommerce ?? (wooPrice !== null || wooQty !== null);
  const delta = shopifyPrice !== null && wooPrice !== null && wooPrice !== 0
    ? Number((((shopifyPrice - wooPrice) / wooPrice) * 100).toFixed(1))
    : null;
  const parity_status = onShopify && onWoo
    ? Math.abs(delta ?? 0) < 1 ? 'both_match' : 'both_price_drift'
    : onShopify ? 'shopify_only' : onWoo ? 'woocommerce_only' : 'unclassified';

  return {
    id: input.id || id('prod'),
    master_sku: input.master_sku.trim(),
    master_title: input.master_title || input.display_title.toLowerCase(),
    display_title: input.display_title.trim(),
    category: input.category || 'Rings',
    material: input.material || '925 silver',
    is_limited_edition: Boolean(input.is_limited_edition),
    image_hint: input.image_hint || 'silver-crescent',
    image_url: input.image_url || null,
    source: 'mock',
    on_shopify: onShopify,
    on_woocommerce: onWoo,
    shopify_price_aed: shopifyPrice,
    woocommerce_price_aed: wooPrice,
    shopify_qty: shopifyQty,
    woocommerce_qty: wooQty,
    shopify_url: input.shopify_url || null,
    woocommerce_url: input.woocommerce_url || null,
    parity_status,
    price_delta_pct: delta,
    last_synced_at: 'local write',
    seo_title: input.seo_title || null,
    seo_description: input.seo_description || null,
    seo_status: input.seo_status || 'pending',
    google_shopping_status: input.google_shopping_status || 'pending',
    ai_audit_notes: input.ai_audit_notes || { weakness_score: 6, missing_details: ['product details'], backlink_keywords: [] },
    metrics: input.metrics || { seen_7d: 0, bought_7d: 0, searched_7d: 0, bounced_7d: 0, high_bounce_alert: false },
    created_at: input.created_at || stamped,
    updated_at: stamped,
    platform_ids: input.platform_ids || {},
    sync_status: input.sync_status || { shopify: onShopify ? 'pending' : 'failed', woocommerce: onWoo ? 'pending' : 'failed' },
    sync_errors: input.sync_errors || {},
  };
}

function findProduct(state: OperationsState, skuOrId: string) {
  return state.products.find((p) => p.id === skuOrId || p.master_sku === skuOrId);
}

export async function listManagedProducts(q = '') {
  const state = await readState();
  const term = q.trim().toLowerCase();
  const products = term
    ? state.products.filter((p) =>
      p.master_sku.toLowerCase().includes(term) ||
      p.display_title.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.material.toLowerCase().includes(term))
    : state.products;
  return { products, sync_jobs: state.sync_jobs.slice(0, 10) };
}

export async function getManagedProduct(skuOrId: string) {
  const state = await readState();
  return findProduct(state, skuOrId) || null;
}

export async function createManagedProduct(input: Partial<ManagedProduct> & { master_sku: string; display_title: string }) {
  return mutate((state) => {
    if (findProduct(state, input.master_sku)) throw new Error(`Product ${input.master_sku} already exists`);
    const product = toManagedProduct(input);
    state.products.unshift(product);
    log(state, 'product.created', product.master_sku, `${product.display_title} created`);
    return product;
  });
}

export async function updateManagedProduct(skuOrId: string, patch: Partial<ManagedProduct>) {
  return mutate((state) => {
    const current = findProduct(state, skuOrId);
    if (!current) throw new Error('Product not found');
    const updated = toManagedProduct({ ...current, ...patch, id: current.id, master_sku: patch.master_sku || current.master_sku, display_title: patch.display_title || current.display_title, created_at: current.created_at });
    const idx = state.products.findIndex((p) => p.id === current.id);
    state.products[idx] = updated;
    log(state, 'product.updated', updated.master_sku, `${updated.display_title} updated`);
    return updated;
  });
}

export async function syncInventory(input: { target?: SyncTarget | 'all'; product_ids?: string[]; kind?: 'catalogue' | 'product' | 'coupon' | 'customer' | 'order' }) {
  const target = input.target || 'all';
  const targets: SyncTarget[] = target === 'all' ? ['shopify', 'woocommerce'] : [target];
  return mutate((state) => {
    const products = input.product_ids?.length
      ? state.products.filter((p) => input.product_ids!.includes(p.id) || input.product_ids!.includes(p.master_sku))
      : state.products;
    const connected = {
      shopify: Boolean((process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_TOKEN) && process.env.SHOPIFY_STORE_DOMAIN),
      woocommerce: Boolean(process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET && process.env.WOOCOMMERCE_URL),
    };
    for (const product of products) {
      for (const t of targets) {
        product.sync_status[t] = 'synced';
        product.sync_errors[t] = connected[t] ? undefined : 'Local sync recorded; provider credentials are not configured.';
      }
      product.last_synced_at = new Date().toLocaleString('en-AE', { hour12: false });
      product.updated_at = now();
    }
    const job: SyncJob = {
      id: id('sync'), kind: input.kind || (input.product_ids?.length ? 'product' : 'catalogue'),
      target, status: 'completed',
      summary: `${products.length} product${products.length === 1 ? '' : 's'} synced to ${target}`,
      created_at: now(), details: { connected, product_ids: products.map((p) => p.master_sku) },
    };
    state.sync_jobs.unshift(job);
    state.sync_jobs = state.sync_jobs.slice(0, 50);
    log(state, 'sync.completed', String(target), job.summary);
    return job;
  });
}

export async function listCoupons() {
  const state = await readState();
  return { coupons: state.coupons };
}

export async function createCoupon(input: Partial<DiscountCoupon> & { code: string; type: CouponType; value: number }) {
  return mutate((state) => {
    const stamped = now();
    const coupon: DiscountCoupon = {
      id: id('coupon'), code: input.code.trim().toUpperCase(), type: input.type, value: Number(input.value),
      applies_to: input.applies_to || 'all', applies_value: input.applies_value || '',
      starts_at: input.starts_at || stamped, ends_at: input.ends_at || null,
      active: input.active ?? true,
      targets: input.targets?.length ? input.targets : ['shopify', 'woocommerce'],
      sync_status: input.sync_status || { shopify: 'pending', woocommerce: 'pending' },
      created_at: stamped, updated_at: stamped,
    };
    for (const target of coupon.targets) coupon.sync_status[target] = 'synced';
    state.coupons.unshift(coupon);
    state.sync_jobs.unshift({ id: id('sync'), kind: 'coupon', target: 'all', status: 'completed', summary: `${coupon.code} coupon synced`, created_at: stamped });
    log(state, 'coupon.created', coupon.code, `${coupon.value}${coupon.type === 'percentage' ? '%' : ' AED'} coupon created`);
    return coupon;
  });
}

export async function updateCoupon(couponId: string, patch: Partial<DiscountCoupon>) {
  return mutate((state) => {
    const coupon = state.coupons.find((c) => c.id === couponId || c.code === couponId.toUpperCase());
    if (!coupon) throw new Error('Coupon not found');
    Object.assign(coupon, patch, { updated_at: now() });
    log(state, 'coupon.updated', coupon.code, `${coupon.code} updated`);
    return coupon;
  });
}

export function inferCustomerFromText(text: string, fallbackPhone: string) {
  const nameMatch = text.match(/\b(?:name is|i am|i'm|انا|اسمي)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[؀-ۿ ]{2,30})/i);
  const cityMatch = text.match(/\b(Dubai|Abu Dhabi|Sharjah|Ajman|Riyadh|Jeddah|Doha|Kuwait|Manama|Muscat)\b/i);
  return {
    name: nameMatch?.[1]?.trim() || `WhatsApp ${cleanPhone(fallbackPhone).slice(-4)}`,
    country: fallbackPhone.startsWith('+966') ? 'SA' : fallbackPhone.startsWith('+971') ? 'AE' : 'OTHER',
    city: cityMatch?.[1] || null,
    language: /[؀-ۿ]/.test(text) ? 'ar' as Language : 'en' as Language,
  };
}

export async function upsertCustomerFromConversation(input: { conversation?: Conversation; phone: string; name?: string; transcript?: string; extraction?: Partial<Extraction> }) {
  return mutate((state) => {
    const phone = cleanPhone(input.phone || input.conversation?.phone || input.extraction?.phone || '');
    const transcript = input.transcript || input.conversation?.messages.map((m) => m.body).join('\n') || '';
    const inferred = inferCustomerFromText(transcript, phone);
    let customer = state.customers.find((c) => cleanPhone(c.phone) === phone || cleanPhone(c.whatsapp_number) === phone);
    const stamped = now();
    if (!customer) {
      customer = {
        id: id('cust'), name: input.name || input.extraction?.customer_name || inferred.name,
        phone, whatsapp_number: phone, email: null,
        country: input.extraction?.country || inferred.country,
        language: input.extraction?.language || inferred.language,
        source: 'whatsapp', platform_ids: { whatsapp: input.conversation?.id },
        tags: [input.extraction?.customer_type || 'new'].filter(Boolean) as string[],
        ltv_aed: 0, orders_count: 0, last_order_at: null, marketing_consent: true, finance_flags: [],
        vip: false, city: inferred.city, created_at: stamped, updated_at: stamped,
      };
      state.customers.unshift(customer);
      log(state, 'customer.created', customer.id, `${customer.name} created from WhatsApp`);
    } else {
      customer.name = input.name || input.extraction?.customer_name || customer.name;
      customer.country = input.extraction?.country || customer.country;
      customer.language = input.extraction?.language || customer.language;
      customer.platform_ids.whatsapp = customer.platform_ids.whatsapp || input.conversation?.id;
      customer.updated_at = stamped;
      log(state, 'customer.unified', customer.id, `${customer.name} unified by phone`);
    }
    return customer;
  });
}

export async function placeOrder(input: {
  conversation?: Conversation; extraction?: Extraction; customer_id?: string; customer_phone: string;
  target_store?: SyncTarget; lines?: OrderLine[]; payment_method?: string;
  shipping?: Record<string, string | null>; notes?: string[];
}) {
  return mutate((state) => {
    const phone = cleanPhone(input.customer_phone);
    let customer = input.customer_id ? state.customers.find((c) => c.id === input.customer_id) : state.customers.find((c) => cleanPhone(c.phone) === phone);
    if (!customer) {
      const inferred = inferCustomerFromText(input.conversation?.messages.map((m) => m.body).join('\n') || '', phone);
      customer = {
        id: id('cust'), name: input.extraction?.customer_name || inferred.name,
        phone, whatsapp_number: phone, email: null,
        country: input.extraction?.country || inferred.country,
        language: input.extraction?.language || inferred.language,
        source: 'whatsapp', platform_ids: { whatsapp: input.conversation?.id },
        tags: ['new'], ltv_aed: 0, orders_count: 0, last_order_at: null,
        marketing_consent: true, finance_flags: [], vip: false, city: inferred.city,
        created_at: now(), updated_at: now(),
      };
      state.customers.unshift(customer);
    }
    const lines = input.lines?.length
      ? input.lines
      : input.extraction?.selected_products.map((p) => ({ sku: p.sku, title: p.title, qty: p.qty, price_aed: p.price_aed || 0 })) || [];
    const total = lines.reduce((sum, line) => sum + line.qty * line.price_aed, 0);
    if (!lines.length) throw new Error('Order needs at least one extracted or selected product before it can be placed.');
    if (total <= 0) throw new Error('Order total must be greater than AED 0 before it can be placed.');
    const target = input.target_store || (input.extraction?.target_store === 'woocommerce' ? 'woocommerce' : 'shopify');
    const flags: string[] = [];
    if (!input.extraction?.ring_size && lines.some((l) => /ring/i.test(l.title))) flags.push('ring_no_size');
    if (input.payment_method === 'cod' && total > 3000) flags.push('cod_high_value');
    const order: OrderSubmission = {
      id: id('order'), customer_id: customer.id, customer_phone: phone, source: 'whatsapp', target_store: target,
      lines, total_aed: total, status: total > 0 ? 'payment_pending' : 'draft',
      payment_method: input.payment_method || input.extraction?.payment_method || 'unknown',
      payment_status: 'unverified',
      shipping: input.shipping || {
        city: input.extraction?.emirate_or_city || null, area: input.extraction?.area || null,
        building: input.extraction?.building || null, flat_or_villa: input.extraction?.flat_or_villa || null,
        delivery_window: input.extraction?.preferred_delivery_window || null,
      },
      platform_ids: target === 'shopify' ? { shopify_draft: `local_draft_${Date.now()}` } : { woocommerce_order: `local_order_${Date.now()}` },
      notes: input.notes || [input.extraction?.manager_summary || 'Created from WhatsApp Desk'].filter(Boolean),
      flags, assignee: null, due: null,
      created_at: now(), updated_at: now(),
    };
    state.orders.unshift(order);
    customer.orders_count += 1;
    customer.ltv_aed += total;
    customer.last_order_at = order.created_at;
    customer.updated_at = order.created_at;
    state.sync_jobs.unshift({ id: id('sync'), kind: 'order', target, status: 'completed', summary: `${order.id} created for ${customer.name}`, created_at: now() });
    log(state, 'order.created', order.id, `${order.lines.length} lines · ${order.total_aed} AED · ${target}`);
    return { order, customer };
  });
}

export async function recordProductShare(input: { product_sku: string; customer_phone: string; channel?: 'whatsapp'; message?: string }) {
  return mutate((state) => {
    const product = findProduct(state, input.product_sku);
    if (!product) throw new Error('Product not found');
    const detail = `${product.display_title} shared to ${cleanPhone(input.customer_phone)}`;
    log(state, 'whatsapp.product_shared', product.master_sku, detail);
    return { product, message: input.message || `${product.display_title}\n${product.shopify_price_aed || product.woocommerce_price_aed || ''}\n${product.shopify_url || product.woocommerce_url || ''}` };
  });
}

export async function confirmPayment(input: { order_id: string; amount_aed?: number; reference?: string; actor?: string }) {
  return mutate((state) => {
    const order = state.orders.find((o) => o.id === input.order_id);
    if (!order) throw new Error('Order not found');
    order.payment_status = 'confirmed';
    order.status = 'paid';
    order.flags = order.flags.filter((f) => f !== 'payment_proof_pending' && f !== 'finance_hold');
    order.updated_at = now();
    order.notes.unshift(`Payment confirmed${input.reference ? ` · ${input.reference}` : ''}`);
    log(state, 'finance.payment_confirmed', order.id, `${input.amount_aed || order.total_aed} AED confirmed`, input.actor || 'finance');
    audit(state, 'finance.payment_confirmed', order.id, `Payment confirmed ${input.amount_aed || order.total_aed} AED`, input.actor || 'finance', 'finance');
    return order;
  });
}

export async function refundOrder(input: { order_id: string; amount_aed?: number; reason: string; actor?: string }) {
  return mutate((state) => {
    const order = state.orders.find((o) => o.id === input.order_id);
    if (!order) throw new Error('Order not found');
    order.payment_status = 'refunded';
    order.status = 'refunded';
    order.updated_at = now();
    order.notes.unshift(`Refund ${input.amount_aed || order.total_aed} AED · ${input.reason}`);
    const customer = state.customers.find((c) => c.id === order.customer_id);
    if (customer) {
      customer.finance_flags.push(`refund:${order.id}`);
      customer.updated_at = now();
    }
    log(state, 'finance.refund_created', order.id, input.reason, input.actor || 'finance');
    audit(state, 'finance.refund_created', order.id, input.reason, input.actor || 'finance', 'finance');
    return order;
  });
}

export async function createRetargeting(input: { customer_id: string; channel: RetargetingRecord['channel']; audience: string; reason: string }) {
  return mutate((state) => {
    const customer = state.customers.find((c) => c.id === input.customer_id);
    if (!customer) throw new Error('Customer not found');
    if (!customer.marketing_consent) throw new Error('Customer has opted out of marketing.');
    const record: RetargetingRecord = { id: id('retarget'), customer_id: customer.id, channel: input.channel, audience: input.audience, reason: input.reason, created_at: now() };
    state.retargeting.unshift(record);
    log(state, 'marketing.retargeting_created', customer.id, `${input.channel}:${input.audience}`);
    return record;
  });
}

export async function recordOperationAction(input: { action: string; entity: string; detail?: string; actor?: string }) {
  return mutate((state) => {
    log(state, input.action, input.entity, input.detail || input.action, input.actor || 'operator');
    return state.activity[0];
  });
}

export async function operationsSnapshot() {
  const state = await readState();
  return { ...state };
}

// ─── New: Orders (status transitions + assignment) ────────────────────────

export async function updateOrderStatus(input: { order_id: string; status: OrderStatus; rationale?: string; actor?: string }) {
  return mutate((state) => {
    const order = state.orders.find((o) => o.id === input.order_id);
    if (!order) throw new Error('Order not found');
    const previous = order.status;
    order.status = input.status;
    order.updated_at = now();
    if (input.rationale) order.notes.unshift(input.rationale);
    log(state, 'order.status_changed', order.id, `${previous} → ${input.status}`, input.actor || 'operator');
    audit(state, 'order.status_changed', order.id, input.rationale || `${previous} → ${input.status}`, input.actor || 'operator', 'managers');
    return order;
  });
}

export async function flagOrder(input: { order_id: string; flag: string; remove?: boolean; actor?: string }) {
  return mutate((state) => {
    const order = state.orders.find((o) => o.id === input.order_id);
    if (!order) throw new Error('Order not found');
    if (input.remove) order.flags = order.flags.filter((f) => f !== input.flag);
    else if (!order.flags.includes(input.flag)) order.flags.push(input.flag);
    order.updated_at = now();
    log(state, 'order.flag', order.id, `${input.remove ? '-' : '+'}${input.flag}`, input.actor || 'operator');
    return order;
  });
}

export async function pushOrderToStore(input: { order_id: string; actor?: string }) {
  return mutate((state) => {
    const order = state.orders.find((o) => o.id === input.order_id);
    if (!order) throw new Error('Order not found');
    if (order.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold', 'payment_proof_pending', 'ring_no_size', 'address_incomplete'].includes(f))) {
      throw new Error(`Cannot push: blocking flags present — ${order.flags.join(', ')}`);
    }
    if (order.target_store === 'shopify') order.platform_ids.shopify_draft = order.platform_ids.shopify_draft || `local_draft_${Date.now()}`;
    else order.platform_ids.woocommerce_order = order.platform_ids.woocommerce_order || `local_order_${Date.now()}`;
    order.notes.unshift(`Pushed to ${order.target_store}`);
    order.updated_at = now();
    state.sync_jobs.unshift({ id: id('sync'), kind: 'order', target: order.target_store, status: 'completed', summary: `${order.id} pushed`, created_at: now() });
    log(state, 'order.pushed', order.id, `Pushed to ${order.target_store}`, input.actor || 'operator');
    audit(state, 'order.pushed', order.id, `Pushed to ${order.target_store}`, input.actor || 'operator', 'managers');
    return order;
  });
}

// ─── New: Assignments ─────────────────────────────────────────────────────

export async function assignEntity(input: { entity_kind: Assignment['entity_kind']; entity_id: string; team_member_id: string; assigned_by?: string; reason?: string }) {
  return mutate((state) => {
    const member = state.team.find((m) => m.id === input.team_member_id);
    if (!member) throw new Error('Team member not found');
    const assn: Assignment = {
      id: id('asn'), entity_kind: input.entity_kind, entity_id: input.entity_id,
      team_member_id: input.team_member_id, assigned_by: input.assigned_by || 'system',
      reason: input.reason || null, created_at: now(),
    };
    state.assignments = state.assignments.filter((a) => !(a.entity_kind === input.entity_kind && a.entity_id === input.entity_id));
    state.assignments.unshift(assn);
    if (input.entity_kind === 'order') {
      const order = state.orders.find((o) => o.id === input.entity_id);
      if (order) { order.assignee = member.id; order.updated_at = now(); }
    }
    member.load += 1;
    member.updated_at = now();
    log(state, 'entity.assigned', `${input.entity_kind}:${input.entity_id}`, `→ ${member.name}`);
    return assn;
  });
}

export async function escalateEntity(input: { entity_kind: string; entity_id: string; reason: string; actor?: string }) {
  return mutate((state) => {
    if (input.entity_kind === 'order') {
      const order = state.orders.find((o) => o.id === input.entity_id);
      if (!order) throw new Error('Order not found');
      if (!order.flags.includes('manager_needed')) order.flags.push('manager_needed');
      order.notes.unshift(`Escalated: ${input.reason}`);
      order.updated_at = now();
    }
    log(state, 'entity.escalated', `${input.entity_kind}:${input.entity_id}`, input.reason, input.actor || 'operator');
    audit(state, 'entity.escalated', `${input.entity_kind}:${input.entity_id}`, input.reason, input.actor || 'operator', 'managers');
    return { ok: true };
  });
}

// ─── New: Follow-ups ──────────────────────────────────────────────────────

export async function createFollowUp(input: { customer_id: string; reason: string; channel?: FollowUp['channel']; due?: string; assignee?: string; source_order_id?: string }) {
  return mutate((state) => {
    const customer = state.customers.find((c) => c.id === input.customer_id);
    if (!customer) throw new Error('Customer not found');
    const fu: FollowUp = {
      id: id('fu'), customer_id: customer.id, reason: input.reason,
      channel: input.channel || 'whatsapp', status: 'open',
      due: input.due || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      assignee: input.assignee || null, notes: [],
      source_order_id: input.source_order_id || null,
      created_at: now(), updated_at: now(),
    };
    state.followups.unshift(fu);
    log(state, 'followup.created', customer.id, input.reason);
    return fu;
  });
}

export async function updateFollowUp(id: string, patch: Partial<FollowUp>) {
  return mutate((state) => {
    const fu = state.followups.find((f) => f.id === id);
    if (!fu) throw new Error('Follow-up not found');
    Object.assign(fu, patch, { updated_at: now() });
    log(state, 'followup.updated', fu.customer_id, `${fu.reason} · ${fu.status}`);
    return fu;
  });
}

// ─── New: Sheets ──────────────────────────────────────────────────────────

export async function createCourierSheet(input: { order_id: string; courier?: CourierSheet['courier']; pickup_window?: string }) {
  return mutate((state) => {
    const order = state.orders.find((o) => o.id === input.order_id);
    if (!order) throw new Error('Order not found');
    if (order.status !== 'paid' && order.status !== 'fulfilled') throw new Error('Sheet needs a paid order.');
    const ship = order.shipping;
    if (!ship.city) throw new Error('Address city is missing.');
    const sheet: CourierSheet = {
      id: id('sh'), order_id: order.id, courier: input.courier || 'aramex', status: 'draft',
      pickup_window: input.pickup_window || (ship.delivery_window as string) || 'Today',
      city: (ship.city as string) || null, area: (ship.area as string) || null,
      building: (ship.building as string) || null, flat_or_villa: (ship.flat_or_villa as string) || null,
      awb: null, pod_url: null, exception: null, created_at: now(), updated_at: now(),
    };
    state.sheets.unshift(sheet);
    log(state, 'shipping.sheet_created', sheet.id, `${order.id} → ${sheet.courier}`);
    return sheet;
  });
}

export async function updateCourierSheet(id: string, patch: Partial<CourierSheet>) {
  return mutate((state) => {
    const sheet = state.sheets.find((s) => s.id === id);
    if (!sheet) throw new Error('Sheet not found');
    Object.assign(sheet, patch, { updated_at: now() });
    if (sheet.status === 'fulfilled') {
      const order = state.orders.find((o) => o.id === sheet.order_id);
      if (order) { order.status = 'fulfilled'; order.updated_at = now(); }
    }
    log(state, 'shipping.sheet_updated', sheet.id, `${sheet.status}`);
    return sheet;
  });
}

// ─── New: Signals ─────────────────────────────────────────────────────────

export async function createSignal(input: Partial<BrandSignal> & { kind: SignalKind; source: BrandSignal['source']; summary: string }) {
  return mutate((state) => {
    const sig: BrandSignal = {
      id: id('sig'), kind: input.kind, source: input.source,
      product_sku: input.product_sku || null, customer_id: input.customer_id || null,
      summary: input.summary, volume: input.volume ?? 1, tone: input.tone || 'neutral',
      status: input.status || 'open', recommended_action: input.recommended_action || null,
      created_at: now(), updated_at: now(),
    };
    state.signals.unshift(sig);
    log(state, 'brand.signal_created', sig.id, sig.summary);
    return sig;
  });
}

export async function updateSignal(id: string, patch: Partial<BrandSignal>) {
  return mutate((state) => {
    const sig = state.signals.find((s) => s.id === id);
    if (!sig) throw new Error('Signal not found');
    Object.assign(sig, patch, { updated_at: now() });
    log(state, 'brand.signal_updated', sig.id, sig.status);
    return sig;
  });
}

// ─── New: Briefs ──────────────────────────────────────────────────────────

export async function createBrief(input: Partial<ResearchBrief> & { kind: ResearchBriefKind; title: string; question: string; audience: ResearchBrief['audience'] }) {
  return mutate((state) => {
    const brief: ResearchBrief = {
      id: id('brief'), kind: input.kind, title: input.title, question: input.question,
      sources: input.sources || [], audience: input.audience,
      status: input.status || 'requested', body: input.body || null,
      evidence_locked: input.evidence_locked ?? true, created_at: now(), updated_at: now(),
    };
    state.briefs.unshift(brief);
    log(state, 'brief.created', brief.id, brief.title);
    return brief;
  });
}

export async function updateBrief(id: string, patch: Partial<ResearchBrief>) {
  return mutate((state) => {
    const brief = state.briefs.find((b) => b.id === id);
    if (!brief) throw new Error('Brief not found');
    Object.assign(brief, patch, { updated_at: now() });
    log(state, 'brief.updated', brief.id, brief.status);
    return brief;
  });
}

export async function generateOwnerBrief() {
  return mutate((state) => {
    const drafts = state.orders.filter((o) => o.status === 'draft' || o.status === 'payment_pending').length;
    const ready = state.orders.filter((o) => o.status === 'paid').length;
    const blocked = state.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f))).length;
    const revenueRisk = state.orders.filter((o) => o.flags.includes('discount_over_threshold') || o.flags.includes('finance_hold')).reduce((s, o) => s + o.total_aed, 0);
    const body = [
      `Drafts pending approval: ${drafts}`,
      `Orders ready for fulfillment: ${ready}`,
      `Blocked / manager-needed: ${blocked}`,
      `Revenue at risk: AED ${revenueRisk.toLocaleString()}`,
      `Top signal: ${state.signals[0]?.summary || 'No active signals'}`,
      `Top access ask: ${state.access_requests.find((a) => a.status === 'pending')?.requester_name || 'None'}`,
    ].join('\n');
    const brief: ResearchBrief = {
      id: id('brief'), kind: 'owner_brief', title: `Owner brief · ${new Date().toLocaleDateString('en-AE')}`,
      question: 'What needs owner attention today?', sources: [
        { kind: 'orders', ref: 'today' }, { kind: 'finance', ref: 'proof' },
        { kind: 'reports', ref: 'risks' }, { kind: 'customers', ref: 'vip' },
      ],
      audience: 'owner', status: 'ready', body, evidence_locked: true,
      created_at: now(), updated_at: now(),
    };
    state.briefs.unshift(brief);
    log(state, 'brief.generated', brief.id, 'owner_brief');
    return brief;
  });
}

// ─── New: Meetings + Decisions ────────────────────────────────────────────

export async function createMeeting(input: Partial<Meeting> & { title: string; attendees: string[]; source: Meeting['source'] }) {
  return mutate((state) => {
    const meeting: Meeting = {
      id: id('meet'), title: input.title, at: input.at || now(),
      attendees: input.attendees, source: input.source,
      transcript_url: input.transcript_url || null, recording_url: input.recording_url || null,
      summary: input.summary || '', created_at: now(),
    };
    state.meetings.unshift(meeting);
    log(state, 'meeting.created', meeting.id, meeting.title);
    return meeting;
  });
}

export async function recordDecision(input: Partial<Decision> & { meeting_id: string; title: string; owner: string; rationale: string }) {
  return mutate((state) => {
    const decision: Decision = {
      id: id('dec'), meeting_id: input.meeting_id, title: input.title, owner: input.owner,
      due: input.due || null, status: input.status || 'pending',
      rationale: input.rationale, follow_up_ids: input.follow_up_ids || [],
      created_at: now(),
    };
    state.decisions.unshift(decision);
    log(state, 'decision.recorded', decision.id, decision.title);
    audit(state, 'decision.recorded', decision.id, decision.rationale, decision.owner, 'managers');
    return decision;
  });
}

// ─── New: Access Requests ─────────────────────────────────────────────────

export async function createAccessRequest(input: Partial<AccessRequest> & { requester_name: string; requested_role: string; reason: string }) {
  return mutate((state) => {
    const req: AccessRequest = {
      id: id('ar'), requester_name: input.requester_name, requester_id: input.requester_id || null,
      requested_role: input.requested_role, scope: input.scope || [], sensitive_scope: input.sensitive_scope || [],
      reason: input.reason, status: 'pending', decided_by: null, decided_at: null, rationale: null,
      created_at: now(), expires_at: input.expires_at || null,
    };
    state.access_requests.unshift(req);
    log(state, 'access.requested', req.id, `${req.requester_name} → ${req.requested_role}`);
    return req;
  });
}

export async function decideAccessRequest(input: { id: string; decision: 'approved' | 'denied'; rationale: string; actor: string }) {
  return mutate((state) => {
    const req = state.access_requests.find((r) => r.id === input.id);
    if (!req) throw new Error('Access request not found');
    req.status = input.decision;
    req.decided_by = input.actor;
    req.decided_at = now();
    req.rationale = input.rationale;
    log(state, `access.${input.decision}`, req.id, input.rationale, input.actor);
    audit(state, `access.${input.decision}`, req.id, input.rationale, input.actor, 'owner');
    return req;
  });
}

// ─── New: Help Requests (Co-Tasking) ──────────────────────────────────────

export async function createHelpRequest(input: Partial<HelpRequest> & { posted_by: string; title: string; detail: string }) {
  return mutate((state) => {
    const hr: HelpRequest = {
      id: id('help'), posted_by: input.posted_by, room: input.room || 'Co-Tasking',
      title: input.title, detail: input.detail, skill_needed: input.skill_needed || [],
      status: 'open', claimed_by: null, claimed_at: null, resolved_at: null,
      block_reason: null, linked_entity: input.linked_entity || null,
      created_at: now(), updated_at: now(),
    };
    state.help_requests.unshift(hr);
    log(state, 'help.posted', hr.id, hr.title);
    return hr;
  });
}

export async function claimHelpRequest(input: { id: string; claimed_by: string }) {
  return mutate((state) => {
    const hr = state.help_requests.find((h) => h.id === input.id);
    if (!hr) throw new Error('Help request not found');
    if (hr.status === 'resolved') throw new Error('Already resolved');
    hr.status = 'claimed';
    hr.claimed_by = input.claimed_by;
    hr.claimed_at = now();
    hr.updated_at = now();
    log(state, 'help.claimed', hr.id, input.claimed_by);
    return hr;
  });
}

export async function resolveHelpRequest(input: { id: string; actor: string }) {
  return mutate((state) => {
    const hr = state.help_requests.find((h) => h.id === input.id);
    if (!hr) throw new Error('Help request not found');
    hr.status = 'resolved';
    hr.resolved_at = now();
    hr.updated_at = now();
    if (hr.claimed_by) {
      const member = state.team.find((m) => m.id === hr.claimed_by);
      if (member) {
        const xp: XpEntry = { id: id('xp'), team_member_id: member.id, reason: `Helped: ${hr.title}`, amount: 20, source: 'co_tasking', created_at: now() };
        state.xp.unshift(xp);
        member.xp_total += 20;
        member.updated_at = now();
      }
    }
    log(state, 'help.resolved', hr.id, hr.title, input.actor);
    return hr;
  });
}

// ─── New: Wallet ──────────────────────────────────────────────────────────

export async function createWalletEntry(input: Partial<WalletEntry> & { customer_id: string; type: WalletEntryType; amount_aed: number; reason: string }) {
  return mutate((state) => {
    const customer = state.customers.find((c) => c.id === input.customer_id);
    if (!customer) throw new Error('Customer not found');
    const entry: WalletEntry = {
      id: id('wal'), customer_id: customer.id, type: input.type, amount_aed: input.amount_aed,
      reason: input.reason, order_id: input.order_id || null, status: input.status || 'available',
      limited_edition_only: input.limited_edition_only ?? true,
      expires_at: input.expires_at || null, created_at: now(),
    };
    state.wallet_entries.unshift(entry);
    log(state, 'wallet.entry_created', entry.id, `${entry.type} ${entry.amount_aed} AED`);
    return entry;
  });
}

// ─── New: Automations ─────────────────────────────────────────────────────

export async function toggleAutomation(input: { key: string; enabled?: boolean; threshold?: number; actor?: string }) {
  return mutate((state) => {
    const auto = state.automations[input.key];
    if (!auto) throw new Error(`Automation ${input.key} not found`);
    if (input.enabled !== undefined) auto.enabled = input.enabled;
    if (input.threshold !== undefined) auto.threshold = input.threshold;
    auto.updated_at = now();
    auto.updated_by = input.actor || null;
    log(state, 'automation.toggled', auto.key, `${auto.enabled ? 'on' : 'off'}${auto.threshold !== null ? ` · t=${auto.threshold}` : ''}`, input.actor || 'operator');
    audit(state, 'automation.toggled', auto.key, `${auto.title} → ${auto.enabled ? 'enabled' : 'disabled'}`, input.actor || 'operator', 'managers');
    return auto;
  });
}

// ─── New: Integrations ────────────────────────────────────────────────────

export async function refreshIntegrations() {
  return mutate((state) => {
    state.integrations = seedIntegrationChecks();
    log(state, 'integrations.refreshed', 'all', `${state.integrations.length} services checked`);
    return state.integrations;
  });
}

// ─── New: XP / Perks ──────────────────────────────────────────────────────

export async function awardXp(input: { team_member_id: string; reason: string; amount: number; source?: XpEntry['source'] }) {
  return mutate((state) => {
    const member = state.team.find((m) => m.id === input.team_member_id);
    if (!member) throw new Error('Team member not found');
    const entry: XpEntry = { id: id('xp'), team_member_id: member.id, reason: input.reason, amount: input.amount, source: input.source || 'manual', created_at: now() };
    state.xp.unshift(entry);
    member.xp_total += input.amount;
    member.updated_at = now();
    log(state, 'xp.awarded', member.id, `${input.reason} +${input.amount}`);
    return entry;
  });
}

// ─── New: WhatsApp presence + outgoing log ────────────────────────────────

const CLAIM_TTL_MS = 15 * 60 * 1000;

function ensurePresence(state: OperationsState, conversation_id: string): ConversationPresence {
  let presence = state.whatsapp_presence[conversation_id];
  if (!presence) {
    presence = {
      conversation_id, claimed_by_id: null, claimed_by_name: null,
      claimed_at: null, claim_expires_at: null, released_at: null,
      watchers: [], outgoing: [], transcriptions: [],
      customer_happiness_overrides: null,
      unresolved: true, last_agent_reply_at: null,
      last_customer_message_at: null, first_response_seconds: null, upsell_count: 0,
    };
    state.whatsapp_presence[conversation_id] = presence;
  }
  // Auto-release if claim expired
  if (presence.claim_expires_at && new Date(presence.claim_expires_at).getTime() < Date.now()) {
    presence.claimed_by_id = null;
    presence.claimed_by_name = null;
    presence.claim_expires_at = null;
    presence.released_at = now();
  }
  return presence;
}

export async function getWhatsappPresence(conversation_id: string) {
  const state = await readState();
  const presence = ensurePresence(state, conversation_id);
  await writeState(state);
  return presence;
}

export async function listWhatsappPresence() {
  const state = await readState();
  // Apply auto-release on read
  for (const id of Object.keys(state.whatsapp_presence)) ensurePresence(state, id);
  await writeState(state);
  return state.whatsapp_presence;
}

export async function claimConversation(input: { conversation_id: string; team_member_id: string; force?: boolean; reason?: string }) {
  return mutate((state) => {
    const member = state.team.find((m) => m.id === input.team_member_id);
    if (!member) throw new Error('Team member not found');
    const presence = ensurePresence(state, input.conversation_id);
    if (presence.claimed_by_id && presence.claimed_by_id !== input.team_member_id && !input.force) {
      throw new Error(`Conversation already claimed by ${presence.claimed_by_name}. Pass force=true to transfer.`);
    }
    const wasClaimedBy = presence.claimed_by_id;
    presence.claimed_by_id = member.id;
    presence.claimed_by_name = member.name;
    presence.claimed_at = now();
    presence.claim_expires_at = new Date(Date.now() + CLAIM_TTL_MS).toISOString();
    presence.released_at = null;
    log(state, 'whatsapp.claimed', input.conversation_id, `${member.name}${input.force && wasClaimedBy ? ` (transferred from ${state.team.find((t) => t.id === wasClaimedBy)?.name || wasClaimedBy})` : ''}${input.reason ? ` · ${input.reason}` : ''}`, member.name);
    if (input.force && wasClaimedBy && wasClaimedBy !== member.id) {
      audit(state, 'whatsapp.transferred', input.conversation_id, `Forced transfer from ${state.team.find((t) => t.id === wasClaimedBy)?.name || wasClaimedBy} to ${member.name}`, member.name, 'managers');
    }
    return presence;
  });
}

export async function releaseConversation(input: { conversation_id: string; team_member_id?: string; reason?: string }) {
  return mutate((state) => {
    const presence = ensurePresence(state, input.conversation_id);
    if (!presence.claimed_by_id) return presence;
    if (input.team_member_id && input.team_member_id !== presence.claimed_by_id) {
      throw new Error(`Only ${presence.claimed_by_name} can release this conversation.`);
    }
    const releasedBy = presence.claimed_by_name;
    presence.claimed_by_id = null;
    presence.claimed_by_name = null;
    presence.claim_expires_at = null;
    presence.released_at = now();
    log(state, 'whatsapp.released', input.conversation_id, `${releasedBy}${input.reason ? ` · ${input.reason}` : ''}`, releasedBy || 'system');
    return presence;
  });
}

export async function watchConversation(input: { conversation_id: string; team_member_id: string }) {
  return mutate((state) => {
    const member = state.team.find((m) => m.id === input.team_member_id);
    if (!member) throw new Error('Team member not found');
    const presence = ensurePresence(state, input.conversation_id);
    presence.watchers = presence.watchers.filter((w) => w.id !== member.id);
    presence.watchers.push({ id: member.id, name: member.name, at: now() });
    return presence;
  });
}

export async function recordWhatsappOutgoing(input: {
  conversation_id: string;
  team_member_id: string;
  body: string;
  language?: 'en' | 'ar' | 'mixed';
  payment_link?: boolean;
  shortcut_id?: string | null;
  reply_to_message_id?: string | null;
  customer_last_message_at?: string | null;
}) {
  return mutate((state) => {
    const member = state.team.find((m) => m.id === input.team_member_id);
    if (!member) throw new Error('Team member not found');
    const presence = ensurePresence(state, input.conversation_id);
    if (presence.claimed_by_id && presence.claimed_by_id !== member.id) {
      throw new Error(`Conversation owned by ${presence.claimed_by_name}. Claim or request transfer before sending.`);
    }
    // Auto-claim on first send
    if (!presence.claimed_by_id) {
      presence.claimed_by_id = member.id;
      presence.claimed_by_name = member.name;
      presence.claimed_at = now();
      presence.claim_expires_at = new Date(Date.now() + CLAIM_TTL_MS).toISOString();
    } else {
      // Refresh TTL
      presence.claim_expires_at = new Date(Date.now() + CLAIM_TTL_MS).toISOString();
    }
    const outgoing: WhatsAppOutgoing = {
      id: id('out'), at: now(), body: input.body,
      language: input.language || (/[؀-ۿ]/.test(input.body) ? 'ar' : 'en'),
      sent_by_id: member.id, sent_by_name: member.name,
      delivered: false, read: false,
      payment_link: Boolean(input.payment_link),
      shortcut_id: input.shortcut_id || null,
      reply_to_message_id: input.reply_to_message_id || null,
    };
    presence.outgoing.push(outgoing);
    presence.last_agent_reply_at = outgoing.at;
    if (input.customer_last_message_at && !presence.first_response_seconds) {
      const elapsed = Math.max(0, Math.round((new Date(outgoing.at).getTime() - new Date(input.customer_last_message_at).getTime()) / 1000));
      presence.first_response_seconds = elapsed;
    }
    log(state, 'whatsapp.sent', input.conversation_id, `${member.name}: ${input.body.slice(0, 80)}${input.body.length > 80 ? '…' : ''}`, member.name);
    member.closed_today = member.closed_today; // touch
    member.updated_at = now();
    return { presence, outgoing };
  });
}

export async function transcribeWhatsappAudio(input: {
  conversation_id: string;
  message_id: string;
  filename: string;
  duration_sec?: number | null;
  language?: 'en' | 'ar' | 'mixed';
  transcript?: string;
  summary?: string;
}) {
  return mutate((state) => {
    const presence = ensurePresence(state, input.conversation_id);
    const placeholder = mockTranscriptFor(input.filename, input.language || 'en');
    const transcription: WhatsAppTranscription = {
      message_id: input.message_id,
      filename: input.filename,
      language: input.language || placeholder.language,
      transcript: input.transcript || placeholder.transcript,
      summary: input.summary || placeholder.summary,
      duration_sec: input.duration_sec ?? placeholder.duration_sec,
      intent: placeholder.intent,
      created_at: now(),
    };
    presence.transcriptions = presence.transcriptions.filter((t) => t.message_id !== input.message_id);
    presence.transcriptions.push(transcription);
    log(state, 'whatsapp.transcribed', input.conversation_id, `${input.filename} · ${transcription.summary.slice(0, 80)}`);
    return transcription;
  });
}

function mockTranscriptFor(filename: string, language: 'en' | 'ar' | 'mixed') {
  const lower = filename.toLowerCase();
  if (lower.includes('arabic') || lower.includes('ar_')) {
    return {
      language: 'ar' as const, duration_sec: 28,
      transcript: 'مرحباً، حابة اطلب الخاتم الذي رأيته على انستجرام، مقاس 7، توصيل دبي. متى ممكن يوصل؟',
      summary: 'Customer wants the ring she saw on Instagram, size 7, delivered to Dubai. Asks ETA.',
      intent: 'order_intent',
    };
  }
  if (lower.includes('size') || lower.includes('measure')) {
    return {
      language: 'en' as const, duration_sec: 14,
      transcript: 'Hi, I have small fingers and I think size 5 fits me best — can you confirm if the crescent ring runs small or true to size?',
      summary: 'Customer asks if Crescent Ring runs small. Prefers size 5.',
      intent: 'size_question',
    };
  }
  if (lower.includes('bank') || lower.includes('payment') || lower.includes('proof')) {
    return {
      language: 'en' as const, duration_sec: 21,
      transcript: 'I just sent the bank transfer, can you confirm you received it? I will need it shipped before the weekend.',
      summary: 'Customer confirms bank transfer sent, asks for fast shipping before weekend.',
      intent: 'payment_followup',
    };
  }
  return {
    language: language === 'mixed' ? 'mixed' as const : language,
    duration_sec: 18,
    transcript: 'Hi, just leaving a voice note about my order — please call me back when you can.',
    summary: 'Generic callback request — needs agent to listen.',
    intent: 'callback_request',
  };
}

export async function updateCustomerProfile(input: { id: string; patch: Partial<UnifiedCustomer> }) {
  return mutate((state) => {
    const customer = state.customers.find((c) => c.id === input.id);
    if (!customer) throw new Error('Customer not found');
    const allowed: (keyof UnifiedCustomer)[] = [
      'name', 'email', 'country', 'language', 'tags', 'ltv_aed', 'orders_count',
      'marketing_consent', 'finance_flags', 'vip', 'city', 'whatsapp_number', 'phone',
    ];
    for (const key of Object.keys(input.patch) as (keyof UnifiedCustomer)[]) {
      if (!allowed.includes(key)) continue;
      (customer as any)[key] = (input.patch as any)[key];
    }
    customer.updated_at = now();
    log(state, 'customer.updated', customer.id, `${customer.name} updated · ${Object.keys(input.patch).filter((k) => allowed.includes(k as any)).join(', ')}`);
    audit(state, 'customer.updated', customer.id, `Fields: ${Object.keys(input.patch).filter((k) => allowed.includes(k as any)).join(', ')}`, 'operator', 'managers');
    return customer;
  });
}

// ─── Notes (header system) ─────────────────────────────────────────────

function noteIsForMember(note: Note, memberId: string, memberRole: TeamRole | null): boolean {
  if (note.audience === 'all') return true;
  if (note.audience === 'individual') return note.to_member_ids.includes(memberId);
  if (note.audience === 'role') return note.to_role === memberRole;
  return false;
}

export async function listNotes(input: { for_member_id?: string; limit?: number } = {}) {
  const state = await readState();
  let notes = state.notes;
  if (input.for_member_id) {
    const member = state.team.find((m) => m.id === input.for_member_id);
    const role = member?.role || null;
    notes = notes.filter((n) => noteIsForMember(n, input.for_member_id!, role) || n.from_id === input.for_member_id);
  }
  return notes.slice(0, input.limit || 100);
}

export async function createNote(input: {
  from_id: string;
  from_name?: string;
  body: string;
  audience: NoteAudienceKind;
  to_member_ids?: string[];
  to_role?: TeamRole | null;
  priority?: NotePriority;
  tags?: string[];
  kind?: NoteKind;
  reply_to?: string | null;
  source?: string;
}) {
  return mutate((state) => {
    const fromMember = state.team.find((m) => m.id === input.from_id);
    const from_name = input.from_name || fromMember?.name || (input.from_id === 'omnia_ai' ? 'Omnia AI' : 'System');
    let audience_label = 'Everyone';
    if (input.audience === 'individual') {
      const names = (input.to_member_ids || []).map((id) => state.team.find((m) => m.id === id)?.name || id);
      audience_label = names.join(', ') || 'No one';
    } else if (input.audience === 'role') {
      audience_label = input.to_role ? input.to_role.replace(/_/g, ' ') : 'All roles';
    }
    const note: Note = {
      id: id('note'),
      from_id: input.from_id, from_name,
      to_member_ids: input.audience === 'individual' ? (input.to_member_ids || []) : [],
      to_role: input.audience === 'role' ? (input.to_role || null) : null,
      audience: input.audience, audience_label,
      body: input.body, kind: input.kind || 'human',
      priority: input.priority || 'normal',
      tags: input.tags || [],
      created_at: now(),
      read_by: [], acknowledged_by: [],
      reply_to: input.reply_to || null,
      source: input.source || 'manual',
    };
    state.notes.unshift(note);
    state.notes = state.notes.slice(0, 500);
    log(state, 'note.created', note.id, `${from_name} → ${audience_label}: ${note.body.slice(0, 60)}`);
    return note;
  });
}

export async function markNoteRead(input: { note_id: string; member_id: string }) {
  return mutate((state) => {
    const note = state.notes.find((n) => n.id === input.note_id);
    if (!note) throw new Error('Note not found');
    if (!note.read_by.includes(input.member_id)) note.read_by.push(input.member_id);
    return note;
  });
}

export async function acknowledgeNote(input: { note_id: string; member_id: string }) {
  return mutate((state) => {
    const note = state.notes.find((n) => n.id === input.note_id);
    if (!note) throw new Error('Note not found');
    if (!note.read_by.includes(input.member_id)) note.read_by.push(input.member_id);
    if (!note.acknowledged_by.includes(input.member_id)) note.acknowledged_by.push(input.member_id);
    log(state, 'note.acknowledged', note.id, input.member_id);
    return note;
  });
}

export async function unreadNoteCount(member_id: string): Promise<number> {
  const state = await readState();
  const member = state.team.find((m) => m.id === member_id);
  const role = member?.role || null;
  return state.notes.filter((n) => noteIsForMember(n, member_id, role) && !n.read_by.includes(member_id)).length;
}

export async function redeemPerk(input: { perk_id: string; actor: string }) {
  return mutate((state) => {
    const perk = state.perks.find((p) => p.id === input.perk_id);
    if (!perk) throw new Error('Perk not found');
    perk.status = 'redeemed';
    log(state, 'perk.redeemed', perk.id, perk.title, input.actor);
    return perk;
  });
}
