import type {
  OperationsState, OrderSubmission, UnifiedCustomer, TeamMember, FollowUp, CourierSheet,
  BrandSignal, ResearchBrief, Meeting, Decision, AccessRequest, HelpRequest, WalletEntry,
  AutomationConfig, IntegrationCheck, AutomationRoom,
} from './store';
import { operationsSnapshot } from './store';

// ─── Wire types (kept JSON-friendly — matches client RoomProfile shape) ───

export type Tone = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'zinc';

export type RoomMetric = { label: string; value: string; tone: Tone };

export type RoomItemAction = {
  id: string;             // action key, e.g. "order.push"
  label: string;
  icon: string;           // lucide icon name
  tone: Tone;
  endpoint: string;       // POST endpoint OR a route path when navigate=true
  method?: 'POST' | 'PATCH';
  payload: Record<string, unknown>;
  confirm?: string;
  navigate?: boolean;     // when true, endpoint is a route path the client should push to
};

export type RoomWorkItem = {
  id: string;
  kind: string;           // order, customer, signal, sheet, brief, meeting, access_request, help_request, wallet, decision
  title: string;
  subtitle: string;
  owner: string;
  source: string;
  due: string;
  value: string;
  status: string;
  priority: Tone;
  tags: string[];
  checks: string[];
  activity: string[];
  actions: RoomItemAction[];
};

export type RoomView = {
  id: string;
  label: string;
  hint: string;
  items: RoomWorkItem[];
};

export type RoomAutomation = {
  key: string;
  title: string;
  detail: string;
  tone: Tone;
  icon: string;
  enabled: boolean;
  threshold: number | null;
};

export type RoomFilter = { id: string; label: string; predicate: string };

export type RoomPrimaryAction = {
  label: string;
  endpoint: string;
  method?: 'POST' | 'PATCH';
  payload: Record<string, unknown>;
  prompt?: { field: string; label: string; required?: boolean }[];
};

export type RoomData = {
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  tone: Tone;
  primary: RoomPrimaryAction;
  metrics: RoomMetric[];
  views: RoomView[];
  filters: RoomFilter[];
  aiBrief: string[];
  automations: RoomAutomation[];
  sideSignals: RoomMetric[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const memberName = (state: OperationsState, idOrName: string | null): string => {
  if (!idOrName) return 'Unassigned';
  const m = state.team.find((t) => t.id === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
  return m ? m.name : idOrName;
};

const customerName = (state: OperationsState, idOrPhone: string): string => {
  const c = state.customers.find((c) => c.id === idOrPhone || c.phone === idOrPhone);
  return c ? c.name : idOrPhone;
};

const formatAED = (n: number) => `AED ${n.toLocaleString()}`;
const relativeDue = (iso: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diff = date.getTime() - Date.now();
  const hours = Math.round(diff / 36e5);
  if (hours < -24) return `${-Math.round(hours / 24)}d ago`;
  if (hours < 0) return `${-hours}h ago`;
  if (hours < 1) return 'Now';
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

const priorityForOrder = (o: OrderSubmission): Tone => {
  if (o.flags.includes('finance_hold') || o.flags.includes('manager_needed') || o.flags.includes('discount_over_threshold')) return 'rose';
  if (o.flags.includes('ring_no_size') || o.flags.includes('payment_proof_pending') || o.flags.includes('address_incomplete')) return 'amber';
  if (o.status === 'paid' || o.flags.includes('ready_to_ship') || o.flags.includes('ready_for_push')) return 'emerald';
  if (o.status === 'fulfilled' || o.status === 'refunded') return 'zinc';
  return 'sky';
};

const orderStatusLabel = (o: OrderSubmission) => {
  if (o.flags.includes('manager_needed')) return 'Manager';
  if (o.flags.includes('finance_hold')) return 'Finance hold';
  if (o.flags.includes('discount_over_threshold')) return 'Manager';
  if (o.flags.includes('ring_no_size')) return 'Missing size';
  if (o.flags.includes('payment_proof_pending')) return 'Verify';
  if (o.flags.includes('ready_for_push')) return 'Ready';
  if (o.flags.includes('ready_to_ship')) return 'Ship';
  return o.status[0].toUpperCase() + o.status.slice(1);
};

const automationFor = (state: OperationsState, room: AutomationRoom): RoomAutomation[] =>
  Object.values(state.automations)
    .filter((a) => a.room === room)
    .map((a) => ({
      key: a.key, title: a.title, detail: a.detail,
      tone: a.enabled ? 'emerald' as Tone : 'zinc' as Tone,
      icon: iconForAutomation(a.key), enabled: a.enabled, threshold: a.threshold,
    }));

function iconForAutomation(key: string): string {
  if (key.includes('approval') || key.includes('guard') || key.includes('sensitive') || key.includes('fraud') || key.includes('consent') || key.includes('permission')) return 'ShieldCheck';
  if (key.includes('builder') || key.includes('writer') || key.includes('extractor') || key.includes('source') || key.includes('extraction')) return 'FileText';
  if (key.includes('router') || key.includes('routing') || key.includes('handoff')) return 'Workflow';
  if (key.includes('audit') || key.includes('verifier') || key.includes('matcher') || key.includes('logger') || key.includes('note')) return 'ClipboardCheck';
  if (key.includes('sentinel') || key.includes('heatmap') || key.includes('integration')) return 'RadioTower';
  if (key.includes('demand') || key.includes('xp') || key.includes('milestone') || key.includes('perk') || key.includes('content')) return 'Sparkles';
  if (key.includes('store') || key.includes('draft')) return 'Store';
  if (key.includes('overload') || key.includes('exception')) return 'AlertTriangle';
  if (key.includes('wellbeing') || key.includes('load')) return 'Users';
  if (key.includes('brief')) return 'FileText';
  if (key.includes('owner') || key.includes('digest') || key.includes('daily')) return 'Brain';
  if (key.includes('settlement') || key.includes('redeem') || key.includes('earn')) return 'WalletCards';
  return 'Workflow';
}

// ─── Per-room builders ────────────────────────────────────────────────────

function buildOrdersRoom(state: OperationsState): RoomData {
  const orders = state.orders;
  const approvals = orders.filter((o) => o.flags.includes('ready_for_push') || o.flags.includes('ring_no_size') || o.flags.includes('address_incomplete') || o.status === 'draft' || o.status === 'payment_pending').filter((o) => !o.flags.includes('finance_hold'));
  const blocked = orders.filter((o) => o.flags.includes('manager_needed') || o.flags.includes('discount_over_threshold') || o.flags.includes('finance_hold') || o.flags.includes('payment_proof_pending'));
  const push = orders.filter((o) => o.flags.includes('ready_for_push') && !o.flags.includes('manager_needed') && !o.flags.includes('finance_hold'));
  const ready = orders.filter((o) => o.status === 'paid').length;

  const itemActions = (o: OrderSubmission): RoomItemAction[] => {
    const acts: RoomItemAction[] = [
      { id: 'order.assign', label: 'Assign', icon: 'UserPlus', tone: 'sky', endpoint: '/api/team/assign', payload: { entity_kind: 'order', entity_id: o.id }, method: 'POST' },
    ];
    if (!o.flags.includes('manager_needed') && !o.flags.includes('finance_hold') && o.flags.includes('ready_for_push')) {
      acts.push({ id: 'order.push', label: 'Push to store', icon: 'CheckCircle2', tone: 'emerald', endpoint: `/api/orders/${o.id}/push`, payload: {}, confirm: `Push ${o.id} to ${o.target_store}?` });
    }
    if (o.status === 'paid') {
      acts.push({ id: 'order.sheet', label: 'Make sheet', icon: 'Truck', tone: 'emerald', endpoint: '/api/shipping/sheet', payload: { order_id: o.id, courier: 'aramex' } });
    }
    if (o.payment_status === 'unverified' && o.flags.includes('payment_proof_pending')) {
      acts.push({ id: 'order.verify', label: 'Verify payment', icon: 'BadgeCheck', tone: 'amber', endpoint: '/api/finance/payments', payload: { order_id: o.id } });
    }
    acts.push({ id: 'order.escalate', label: 'Escalate', icon: 'AlertTriangle', tone: 'rose', endpoint: '/api/orders/escalate', payload: { entity_kind: 'order', entity_id: o.id, reason: 'Owner attention needed' } });
    return acts;
  };

  const toItem = (o: OrderSubmission): RoomWorkItem => {
    const customer = state.customers.find((c) => c.id === o.customer_id);
    const product = o.lines[0];
    const checks: string[] = [
      `Customer: ${customer?.name || o.customer_phone}`,
      `Store: ${o.target_store === 'shopify' ? 'omniastores.ae · Shopify' : 'omniastores.com · WooCommerce'}`,
      `Payment: ${o.payment_method} · ${o.payment_status}`,
    ];
    if (o.shipping.city) checks.push(`Shipping: ${o.shipping.city}${o.shipping.area ? ' · ' + o.shipping.area : ''}`);
    if (o.flags.length) checks.push(`Flags: ${o.flags.join(', ')}`);
    return {
      id: o.id, kind: 'order',
      title: `${customer?.name || 'Unknown'} · ${product?.title || 'Order'}`,
      subtitle: o.notes[0] || `${o.lines.length} lines · ${o.target_store}`,
      owner: memberName(state, o.assignee),
      source: o.source === 'whatsapp' ? 'WhatsApp Desk' : o.source === 'inventory' ? 'Inventory' : 'Manual',
      due: relativeDue(o.due), value: formatAED(o.total_aed),
      status: orderStatusLabel(o), priority: priorityForOrder(o),
      tags: [o.target_store === 'shopify' ? '.ae' : '.com', o.payment_method, ...o.flags.slice(0, 2)],
      checks,
      activity: [
        `${new Date(o.created_at).toLocaleString('en-AE', { hour12: false })} · created`,
        ...o.notes.slice(0, 3).map((n) => `note · ${n}`),
      ],
      actions: itemActions(o),
    };
  };

  return {
    title: 'Orders',
    eyebrow: 'Cross-channel order control',
    description: 'Unified order control for WhatsApp drafts, Shopify draft orders, WooCommerce paths, approvals, payment flags, and shipping handoff.',
    icon: 'PackageCheck', tone: 'amber',
    primary: {
      label: 'Create order', endpoint: '/api/orders/place', method: 'POST',
      payload: { customer_phone: '', lines: [], target_store: 'shopify' },
      prompt: [
        { field: 'customer_phone', label: 'Customer phone (+9715...)', required: true },
        { field: 'sku', label: 'Product SKU', required: true },
        { field: 'qty', label: 'Quantity' },
        { field: 'price_aed', label: 'Unit price AED' },
        { field: 'target_store', label: 'Target store · shopify / woocommerce' },
        { field: 'payment_method', label: 'Payment · cod / card / bank_transfer / tamara / tabby' },
      ],
    },
    metrics: [
      { label: 'Drafts', value: String(approvals.length), tone: 'amber' },
      { label: 'Ready', value: String(ready), tone: 'emerald' },
      { label: 'Blocked', value: String(blocked.length), tone: 'rose' },
    ],
    filters: [
      { id: 'ready', label: 'Ready', predicate: 'flag:ready_for_push' },
      { id: 'missing', label: 'Missing fields', predicate: 'flag:ring_no_size|address_incomplete' },
      { id: 'manager', label: 'Manager needed', predicate: 'flag:manager_needed|discount_over_threshold' },
      { id: 'shopify', label: 'Shopify', predicate: 'store:shopify' },
      { id: 'woocommerce', label: 'WooCommerce', predicate: 'store:woocommerce' },
      { id: 'cod', label: 'COD', predicate: 'payment:cod' },
    ],
    views: [
      { id: 'approvals', label: 'Approvals', hint: 'Drafts waiting for human decision', items: approvals.map(toItem) },
      { id: 'blocked', label: 'Blocked', hint: 'Policy, payment, or missing-field blocks', items: blocked.map(toItem) },
      { id: 'store-push', label: 'Store push', hint: 'Approved drafts ready for store creation', items: push.map(toItem) },
      { id: 'fulfilled', label: 'Fulfilled', hint: 'Closed orders today', items: orders.filter((o) => o.status === 'fulfilled' || o.status === 'paid').map(toItem) },
    ],
    aiBrief: [
      'Push only after approval; no automatic customer send.',
      'Ring orders missing size must carry a clear flag.',
      'Payment proof cases route to Finance before fulfillment.',
      'High-value COD over AED 3,000 requires manager flag.',
    ],
    automations: automationFor(state, 'orders'),
    sideSignals: [
      { label: 'Auto-send', value: state.automations['orders.store_draft_creation']?.enabled ? 'On' : 'Off', tone: state.automations['orders.store_draft_creation']?.enabled ? 'emerald' : 'rose' },
      { label: 'Audit', value: 'Required', tone: 'emerald' },
      { label: 'Manager cases', value: String(blocked.length), tone: 'amber' },
    ],
  };
}

function buildShippingRoom(state: OperationsState): RoomData {
  const orders = state.orders;
  const sheets = state.sheets;
  const todayReady = sheets.filter((s) => s.status === 'draft' || s.status === 'dispatched');
  const missing = orders.filter((o) => (o.status === 'paid' || o.flags.includes('ready_to_ship')) && (!o.shipping.area || !o.shipping.building));
  const exceptions = sheets.filter((s) => s.status === 'exception');

  const sheetActions = (s: CourierSheet): RoomItemAction[] => [
    { id: 'sheet.dispatch', label: 'Dispatch', icon: 'Truck', tone: 'emerald', endpoint: `/api/shipping/sheet/${s.id}`, method: 'PATCH', payload: { status: 'dispatched' } },
    { id: 'sheet.fulfill', label: 'Mark fulfilled', icon: 'CheckCircle2', tone: 'emerald', endpoint: `/api/shipping/sheet/${s.id}`, method: 'PATCH', payload: { status: 'fulfilled' } },
    { id: 'sheet.exception', label: 'Flag exception', icon: 'AlertTriangle', tone: 'rose', endpoint: `/api/shipping/sheet/${s.id}`, method: 'PATCH', payload: { status: 'exception' } },
  ];

  const sheetItem = (s: CourierSheet): RoomWorkItem => {
    const order = orders.find((o) => o.id === s.order_id);
    const customer = order ? state.customers.find((c) => c.id === order.customer_id) : null;
    return {
      id: s.id, kind: 'sheet',
      title: `${s.city || '—'}${s.area ? ' · ' + s.area : ''} · ${customer?.name || order?.id || 'Order'}`,
      subtitle: order ? `${order.lines[0]?.title} · ${order.payment_method} · ${formatAED(order.total_aed)}` : 'Order missing',
      owner: s.courier, source: order?.target_store || 'Orders',
      due: s.pickup_window, value: order ? formatAED(order.total_aed) : '',
      status: s.status === 'exception' ? 'Exception' : s.status === 'fulfilled' ? 'Delivered' : s.status === 'dispatched' ? 'In transit' : 'Ready',
      priority: s.status === 'exception' ? 'rose' : s.status === 'fulfilled' ? 'zinc' : s.status === 'dispatched' ? 'sky' : 'emerald',
      tags: [s.courier, s.city || 'no-city', ...(s.awb ? [s.awb] : [])],
      checks: [
        `Courier: ${s.courier}`,
        `Address: ${[s.city, s.area, s.building, s.flat_or_villa].filter(Boolean).join(' · ') || 'incomplete'}`,
        s.awb ? `AWB: ${s.awb}` : 'No AWB yet',
        s.exception ? `Exception: ${s.exception}` : 'No exceptions',
      ],
      activity: [`${new Date(s.created_at).toLocaleString('en-AE', { hour12: false })} · sheet created`],
      actions: sheetActions(s),
    };
  };

  const missingItem = (o: OrderSubmission): RoomWorkItem => {
    const customer = state.customers.find((c) => c.id === o.customer_id);
    return {
      id: o.id, kind: 'order',
      title: `Missing fields · ${customer?.name || o.customer_phone}`,
      subtitle: `${o.lines[0]?.title} · ${o.shipping.city || 'no city'}${o.shipping.area ? ' · ' + o.shipping.area : ''}`,
      owner: memberName(state, o.assignee), source: 'Orders',
      due: relativeDue(o.due), value: formatAED(o.total_aed),
      status: 'Ask customer', priority: 'amber',
      tags: ['Address', !o.shipping.area ? 'Area' : 'Unit'],
      checks: [
        `Customer: ${customer?.name}`,
        `Has: ${[o.shipping.city, o.shipping.area].filter(Boolean).join(', ')}`,
        `Missing: ${[!o.shipping.area && 'area', !o.shipping.building && 'building', !o.shipping.flat_or_villa && 'flat/villa'].filter(Boolean).join(', ')}`,
      ],
      activity: o.notes.slice(0, 3),
      actions: [
        { id: 'followup.create', label: 'Send shortcut', icon: 'MessageSquare', tone: 'amber', endpoint: '/api/customers/followup', payload: { customer_id: o.customer_id, reason: 'Missing shipping fields', source_order_id: o.id, channel: 'whatsapp' } },
        { id: 'sheet.create', label: 'Create sheet', icon: 'Truck', tone: 'sky', endpoint: '/api/shipping/sheet', payload: { order_id: o.id }, confirm: 'Create courier sheet now?' },
      ],
    };
  };

  return {
    title: 'Shipping', eyebrow: 'Dispatch and exceptions',
    description: 'Structured delivery prep from customer chats and orders: address fields, urgency, courier sheets, exceptions, and proof-of-delivery handoff.',
    icon: 'Truck', tone: 'emerald',
    primary: {
      label: 'Create courier sheet', endpoint: '/api/shipping/sheet', method: 'POST', payload: { order_id: '', courier: 'aramex' },
      prompt: [
        { field: 'order_id', label: 'Order ID (e.g. ord_aisha_crescent)', required: true },
        { field: 'courier', label: 'Courier · aramex / fetchr / smsa / self_drive' },
        { field: 'pickup_window', label: 'Pickup window (today/tomorrow + time)' },
      ],
    },
    metrics: [
      { label: 'Ready today', value: String(todayReady.length), tone: 'emerald' },
      { label: 'Missing fields', value: String(missing.length), tone: 'amber' },
      { label: 'Exceptions', value: String(exceptions.length), tone: 'rose' },
    ],
    filters: [
      { id: 'today', label: 'Today', predicate: 'window:today' },
      { id: 'gcc', label: 'GCC', predicate: 'gcc' },
      { id: 'missing', label: 'Missing address', predicate: 'flag:address_incomplete' },
      { id: 'courier', label: 'Courier issue', predicate: 'status:exception' },
      { id: 'cod', label: 'COD', predicate: 'payment:cod' },
      { id: 'same_day', label: 'Same-day', predicate: 'window:today' },
    ],
    views: [
      { id: 'today', label: 'Today', hint: 'Ready for courier handoff', items: todayReady.map(sheetItem) },
      { id: 'missing', label: 'Missing fields', hint: 'Address data to collect', items: missing.map(missingItem) },
      { id: 'exceptions', label: 'Exceptions', hint: 'Delivery risks and escalations', items: exceptions.map(sheetItem) },
      { id: 'closed', label: 'Closed', hint: 'Fulfilled today', items: sheets.filter((s) => s.status === 'fulfilled').map(sheetItem) },
    ],
    aiBrief: [
      'Shipping uses structured address fields, not free-form store notes.',
      'Missing address fields return to WhatsApp Desk as follow-up tasks.',
      'Finance holds block dispatch automatically.',
      'Same-day promises require dispatch before 16:30 Dubai cutoff.',
    ],
    automations: automationFor(state, 'shipping'),
    sideSignals: [
      { label: 'Structured address', value: 'Required', tone: 'emerald' },
      { label: 'Same-day pressure', value: String(todayReady.filter((s) => /today/i.test(s.pickup_window)).length), tone: 'amber' },
      { label: 'POD uploads', value: String(sheets.filter((s) => s.pod_url).length), tone: 'sky' },
    ],
  };
}

function buildCustomersRoom(state: OperationsState): RoomData {
  const customers = state.customers;
  const followups = state.followups;
  const vip = customers.filter((c) => c.vip);
  const risk = customers.filter((c) => c.finance_flags.length > 0);

  const customerActions = (c: UnifiedCustomer): RoomItemAction[] => [
    { id: 'customer.open_360', label: 'Open profile', icon: 'ArrowRight', tone: 'emerald', endpoint: `/customers/${c.id}`, navigate: true, payload: {} } as any,
    { id: 'followup.create', label: 'New follow-up', icon: 'CalendarClock', tone: 'sky', endpoint: '/api/customers/followup', payload: { customer_id: c.id, reason: 'Manual follow-up', channel: 'whatsapp' } },
    ...(c.marketing_consent ? [{ id: 'retarget.create', label: 'Retarget', icon: 'Sparkles' as const, tone: 'violet' as Tone, endpoint: '/api/marketing/retarget', payload: { customer_id: c.id, channel: 'meta', audience: 'lookalike-vip', reason: 'High intent' } }] : []),
    { id: 'customer.vip', label: c.vip ? 'Remove VIP' : 'Mark VIP', icon: 'BadgeCheck', tone: 'violet', endpoint: '/api/customers/unify', payload: { id: c.id, vip: !c.vip } },
  ];

  const customerItem = (c: UnifiedCustomer): RoomWorkItem => {
    const lastFu = followups.find((f) => f.customer_id === c.id);
    return {
      id: c.id, kind: 'customer',
      title: c.name, subtitle: lastFu?.reason || `${c.country} · ${c.language} · ${c.orders_count} orders`,
      owner: lastFu ? memberName(state, lastFu.assignee) : '—',
      source: c.source === 'whatsapp' ? 'WhatsApp' : c.source === 'shopify' ? 'Shopify' : c.source === 'woocommerce' ? 'WooCommerce' : 'Manual',
      due: lastFu ? relativeDue(lastFu.due) : '—',
      value: formatAED(c.ltv_aed) + ' LTV',
      status: c.vip ? 'VIP' : c.finance_flags.length ? 'Risk' : c.orders_count > 0 ? 'Returning' : 'Lead',
      priority: c.vip ? 'violet' : c.finance_flags.length ? 'rose' : c.orders_count > 2 ? 'emerald' : 'amber',
      tags: [c.country, c.language, ...c.tags.slice(0, 3)],
      checks: [
        `Phone: ${c.phone}`,
        `City: ${c.city || '—'}`,
        `Stores: ${[c.platform_ids.shopify && 'Shopify', c.platform_ids.woocommerce && 'WooCommerce', c.platform_ids.whatsapp && 'WhatsApp'].filter(Boolean).join(', ')}`,
        `Consent: ${c.marketing_consent ? 'opt-in' : 'opt-out'}`,
        ...(c.finance_flags.length ? [`Finance flags: ${c.finance_flags.join(', ')}`] : []),
      ],
      activity: [
        c.last_order_at ? `last order · ${new Date(c.last_order_at).toLocaleDateString('en-AE')}` : 'no orders yet',
        ...followups.filter((f) => f.customer_id === c.id).slice(0, 2).map((f) => `followup · ${f.reason}`),
      ],
      actions: customerActions(c),
    };
  };

  return {
    title: 'Customers', eyebrow: 'Customer memory',
    description: 'Unified profiles across WhatsApp, Shopify, WooCommerce, wallet, ghost history, objections, VIP flags, consent, and assigned follow-ups.',
    icon: 'UserCheck', tone: 'sky',
    primary: {
      label: 'Create follow-up', endpoint: '/api/customers/followup', method: 'POST',
      payload: { customer_id: '', reason: '', channel: 'whatsapp' },
      prompt: [
        { field: 'customer_id', label: 'Customer ID (cust_aisha, …)', required: true },
        { field: 'reason', label: 'Reason for follow-up', required: true },
        { field: 'channel', label: 'Channel · whatsapp / instagram / call' },
        { field: 'due', label: 'Due (ISO datetime)' },
      ],
    },
    metrics: [
      { label: 'Profiles', value: String(customers.length), tone: 'sky' },
      { label: 'VIP', value: String(vip.length), tone: 'violet' },
      { label: 'Risk', value: String(risk.length), tone: 'rose' },
    ],
    filters: [
      { id: 'vip', label: 'VIP', predicate: 'vip' },
      { id: 'returning', label: 'Returning', predicate: 'orders_count>0' },
      { id: 'blocked', label: 'Blocked', predicate: 'finance_flags' },
      { id: 'no_consent', label: 'No consent', predicate: 'no_consent' },
      { id: 'wallet', label: 'Wallet', predicate: 'wallet' },
      { id: 'followup_due', label: 'Follow-up due', predicate: 'followup_due' },
    ],
    views: [
      { id: 'followups', label: 'Follow-ups', hint: 'Customer actions due', items: customers.filter((c) => followups.some((f) => f.customer_id === c.id && f.status !== 'done')).map(customerItem) },
      { id: 'vip', label: 'VIP', hint: 'High-value customers', items: vip.map(customerItem) },
      { id: 'risk', label: 'Risk', hint: 'Blocked, consent, and identity issues', items: risk.map(customerItem) },
      { id: 'all', label: 'All', hint: 'Every unified profile', items: customers.map(customerItem) },
    ],
    aiBrief: [
      'Customer memory is role-scoped; private finance/customer fields are not visible to every role.',
      'Follow-ups should come from objections, missing fields, and post-delivery moments.',
      'VIP flags change tone, approval, and handoff priority.',
      'Consent guard blocks marketing action when customer is opt-out.',
    ],
    automations: automationFor(state, 'customers'),
    sideSignals: [
      { label: 'Private fields', value: 'Scoped', tone: 'rose' },
      { label: 'Wallet links', value: String(state.wallet_entries.length), tone: 'sky' },
      { label: 'Due today', value: String(followups.filter((f) => f.status !== 'done').length), tone: 'amber' },
    ],
  };
}

function buildFinanceRoom(state: OperationsState): RoomData {
  const proofs = state.orders.filter((o) => o.flags.includes('payment_proof_pending') || (o.payment_status === 'unverified' && o.status === 'payment_pending'));
  const bnpl = state.orders.filter((o) => ['tamara', 'tabby'].includes(o.payment_method));
  const refunds = state.orders.filter((o) => o.status === 'refunded');

  const financeActions = (o: OrderSubmission): RoomItemAction[] => [
    { id: 'finance.verify', label: 'Verify', icon: 'BadgeCheck', tone: 'emerald', endpoint: '/api/finance/payments', payload: { order_id: o.id, reference: 'manual_verify' } },
    { id: 'finance.refund', label: 'Refund', icon: 'AlertTriangle', tone: 'rose', endpoint: '/api/finance/refunds', payload: { order_id: o.id, reason: 'Manual refund' }, confirm: 'Confirm refund?' },
    { id: 'order.flag', label: 'Hold', icon: 'ShieldCheck', tone: 'amber', endpoint: '/api/orders/flag', payload: { order_id: o.id, flag: 'finance_hold' } },
  ];

  const item = (o: OrderSubmission, view: 'proof' | 'settlement' | 'exception'): RoomWorkItem => {
    const customer = state.customers.find((c) => c.id === o.customer_id);
    return {
      id: o.id, kind: 'order',
      title: `${customer?.name || o.customer_phone} · ${o.payment_method}`,
      subtitle: o.notes[0] || `${o.lines[0]?.title} · ${o.target_store}`,
      owner: memberName(state, o.assignee), source: o.target_store === 'shopify' ? 'omniastores.ae' : 'omniastores.com',
      due: relativeDue(o.due), value: formatAED(o.total_aed),
      status: view === 'proof' ? 'Verify' : view === 'settlement' ? 'Match' : 'Review',
      priority: o.flags.includes('finance_hold') || o.flags.includes('manager_needed') ? 'rose' : 'amber',
      tags: [o.payment_method, o.target_store, ...o.flags.slice(0, 2)],
      checks: [
        `Order total: ${formatAED(o.total_aed)}`,
        `Payment status: ${o.payment_status}`,
        `Customer: ${customer?.name || '—'}`,
        ...(o.flags.length ? [`Flags: ${o.flags.join(', ')}`] : []),
      ],
      activity: o.notes.slice(0, 3).map((n) => `note · ${n}`),
      actions: financeActions(o),
    };
  };

  const totalSettled = state.orders.filter((o) => o.status === 'paid' || o.status === 'fulfilled').reduce((s, o) => s + o.total_aed, 0);

  return {
    title: 'Finance', eyebrow: 'Payment and settlement control',
    description: 'Payment proof review, BNPL settlement, refunds, wallet ledger, high-COD policy, and finance-only visibility over sensitive amounts.',
    icon: 'DollarSign', tone: 'amber',
    primary: {
      label: 'Verify payment', endpoint: '/api/finance/payments', method: 'POST',
      payload: { order_id: '' },
      prompt: [
        { field: 'order_id', label: 'Order ID', required: true },
        { field: 'reference', label: 'Bank reference / receipt #' },
        { field: 'amount_aed', label: 'Amount AED' },
      ],
    },
    metrics: [
      { label: 'Proof checks', value: String(proofs.length), tone: 'amber' },
      { label: 'BNPL', value: String(bnpl.length), tone: 'sky' },
      { label: 'Refunds', value: String(refunds.length), tone: 'rose' },
    ],
    filters: [
      { id: 'proof', label: 'Needs proof', predicate: 'flag:payment_proof_pending' },
      { id: 'bnpl', label: 'BNPL', predicate: 'payment:tamara|tabby' },
      { id: 'refund', label: 'Refund', predicate: 'status:refunded' },
      { id: 'high_cod', label: 'High COD', predicate: 'flag:cod_high_value' },
      { id: 'mismatch', label: 'Mismatch', predicate: 'flag:duplicate_proof' },
      { id: 'settled', label: 'Settled', predicate: 'status:paid|fulfilled' },
    ],
    views: [
      { id: 'proof', label: 'Proof review', hint: 'Payment evidence to clear', items: proofs.map((o) => item(o, 'proof')) },
      { id: 'settlement', label: 'Settlement', hint: 'Channel payout reconciliation', items: bnpl.map((o) => item(o, 'settlement')) },
      { id: 'exceptions', label: 'Exceptions', hint: 'Fraud, refund, and ledger holds', items: refunds.concat(state.orders.filter((o) => o.flags.includes('finance_hold'))).map((o) => item(o, 'exception')) },
    ],
    aiBrief: [
      'Finance data is sensitive and should not leak into general AI answers.',
      'Proof verification is advisory; finance still clears the case.',
      'Any finance hold blocks draft completion and shipping handoff.',
      'High-value COD over AED 3,000 requires owner sign-off.',
    ],
    automations: automationFor(state, 'finance'),
    sideSignals: [
      { label: 'Sensitive scope', value: 'Finance', tone: 'rose' },
      { label: 'Open holds', value: String(state.orders.filter((o) => o.flags.includes('finance_hold')).length), tone: 'amber' },
      { label: 'Settled today', value: formatAED(totalSettled), tone: 'emerald' },
    ],
  };
}

function buildReportsRoom(state: OperationsState): RoomData {
  const briefs = state.briefs;
  const drafts = state.orders.filter((o) => o.status === 'draft' || o.status === 'payment_pending').length;
  const ready = state.orders.filter((o) => o.status === 'paid').length;
  const risks = state.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f)));
  const revenueRisk = risks.reduce((s, o) => s + o.total_aed, 0);

  const briefActions = (b: ResearchBrief): RoomItemAction[] => [
    { id: 'brief.deliver', label: 'Mark delivered', icon: 'CheckCircle2', tone: 'emerald', endpoint: `/api/reports/brief/${b.id}`, method: 'PATCH', payload: { status: 'delivered' } },
    { id: 'brief.share', label: 'Share to room', icon: 'ArrowRight', tone: 'sky', endpoint: `/api/reports/brief/${b.id}`, method: 'PATCH', payload: { status: 'ready' } },
  ];

  const briefItem = (b: ResearchBrief): RoomWorkItem => ({
    id: b.id, kind: 'brief',
    title: b.title, subtitle: b.question,
    owner: b.audience, source: b.sources.map((s) => s.kind).join(' + ') || 'House',
    due: relativeDue(b.updated_at), value: `${b.sources.length} sources`,
    status: b.status, priority: b.status === 'ready' ? 'emerald' : b.status === 'drafting' ? 'amber' : 'sky',
    tags: [b.kind.replace('_', ' '), b.audience],
    checks: [
      `Audience: ${b.audience}`,
      `Status: ${b.status}`,
      `Sources: ${b.sources.length}`,
      `Evidence locked: ${b.evidence_locked ? 'yes' : 'no'}`,
    ],
    activity: b.body ? [b.body.slice(0, 200)] : ['No body yet'],
    actions: briefActions(b),
  });

  const riskItem = (o: OrderSubmission): RoomWorkItem => {
    const customer = state.customers.find((c) => c.id === o.customer_id);
    return {
      id: o.id, kind: 'order',
      title: `${customer?.name} · ${o.flags[0] || 'risk'}`,
      subtitle: o.notes[0] || `${o.lines[0]?.title}`,
      owner: memberName(state, o.assignee), source: 'Orders',
      due: relativeDue(o.due), value: formatAED(o.total_aed),
      status: 'Manager', priority: 'rose',
      tags: o.flags.slice(0, 3),
      checks: [`Value at risk: ${formatAED(o.total_aed)}`, `Flags: ${o.flags.join(', ')}`],
      activity: o.notes.slice(0, 3).map((n) => `note · ${n}`),
      actions: [
        { id: 'order.escalate', label: 'Escalate', icon: 'AlertTriangle', tone: 'rose', endpoint: '/api/orders/escalate', payload: { entity_kind: 'order', entity_id: o.id, reason: 'Risk digest' } },
      ],
    };
  };

  return {
    title: 'Reports', eyebrow: 'Action-first owner readout',
    description: 'Daily operating reports that answer what is waiting, missing, stuck, ready, manager-needed, demanded, and leaking money.',
    icon: 'BarChart3', tone: 'sky',
    primary: {
      label: 'Generate brief', endpoint: '/api/reports/brief', method: 'POST',
      payload: { kind: 'owner_brief' },
      prompt: [
        { field: 'kind', label: 'Brief kind · owner_brief / demand_report / risk_digest' },
        { field: 'audience', label: 'Audience · owner / marketing / finance / house' },
      ],
    },
    metrics: [
      { label: 'Needs action', value: String(drafts + risks.length), tone: 'amber' },
      { label: 'Revenue risk', value: formatAED(revenueRisk), tone: 'rose' },
      { label: 'Ready now', value: String(ready), tone: 'emerald' },
    ],
    filters: [
      { id: 'today', label: 'Today', predicate: 'window:today' },
      { id: 'owner', label: 'Owner only', predicate: 'audience:owner' },
      { id: 'risk', label: 'Revenue risk', predicate: 'flag:manager_needed' },
      { id: 'demand', label: 'Product demand', predicate: 'kind:demand_report' },
      { id: 'team', label: 'Team load', predicate: 'kind:team' },
      { id: 'resolved', label: 'Resolved', predicate: 'status:delivered' },
    ],
    views: [
      { id: 'today', label: 'Today', hint: 'Current action list', items: briefs.filter((b) => b.kind === 'owner_brief' || b.kind === 'risk_digest').map(briefItem) },
      { id: 'demand', label: 'Demand', hint: 'Products asked but not bought', items: briefs.filter((b) => b.kind === 'demand_report').map(briefItem) },
      { id: 'risks', label: 'Risks', hint: 'Manager-needed cases', items: risks.map(riskItem) },
    ],
    aiBrief: [
      'Reports are not decorative analytics; they must drive action.',
      'Owner view can include full risk and finance summary.',
      'Department views should receive scoped versions of the same truth.',
      'Every brief carries its source set.',
    ],
    automations: automationFor(state, 'reports'),
    sideSignals: [
      { label: 'Charts', value: 'Minimal', tone: 'zinc' },
      { label: 'Action first', value: 'Yes', tone: 'emerald' },
      { label: 'Owner daily', value: state.automations['reports.owner_daily']?.enabled ? 'On' : 'Off', tone: 'sky' },
    ],
  };
}

function buildCashbackRoom(state: OperationsState): RoomData {
  const entries = state.wallet_entries;
  const available = entries.filter((e) => e.status === 'available');
  const pending = entries.filter((e) => e.status === 'pending');
  const held = entries.filter((e) => e.status === 'held');
  const totalValue = available.reduce((s, e) => s + e.amount_aed, 0);

  const walletActions = (e: WalletEntry): RoomItemAction[] => [
    { id: 'wallet.note', label: 'Add note', icon: 'FileText', tone: 'sky', endpoint: '/api/operations/action', payload: { action: 'cashback.note', entity: e.id, detail: 'Manual note' } },
    ...(e.status === 'pending' ? [{ id: 'wallet.approve', label: 'Make available', icon: 'BadgeCheck' as const, tone: 'emerald' as Tone, endpoint: `/api/cashback/wallet/${e.id}`, method: 'PATCH' as const, payload: { status: 'available' } }] : []),
    ...(e.status === 'held' ? [{ id: 'wallet.release', label: 'Release hold', icon: 'CheckCircle2' as const, tone: 'amber' as Tone, endpoint: `/api/cashback/wallet/${e.id}`, method: 'PATCH' as const, payload: { status: 'available' } }] : []),
  ];

  const walletItem = (e: WalletEntry): RoomWorkItem => {
    const customer = state.customers.find((c) => c.id === e.customer_id);
    return {
      id: e.id, kind: 'wallet',
      title: `${customer?.name || 'Unknown'} · ${e.type}`,
      subtitle: e.reason,
      owner: e.order_id ? 'Order linked' : 'Manual',
      source: e.limited_edition_only ? 'LE wallet' : 'General',
      due: e.expires_at ? relativeDue(e.expires_at) : '—',
      value: formatAED(e.amount_aed),
      status: e.status, priority: e.status === 'available' ? 'emerald' : e.status === 'pending' ? 'amber' : 'rose',
      tags: [e.type, e.limited_edition_only ? 'LE' : 'general'],
      checks: [
        `Customer: ${customer?.name || '—'}`,
        `LE-only: ${e.limited_edition_only ? 'yes' : 'no'}`,
        `Order: ${e.order_id || '—'}`,
        `Expires: ${e.expires_at ? new Date(e.expires_at).toLocaleDateString('en-AE') : 'never'}`,
      ],
      activity: [`${new Date(e.created_at).toLocaleString('en-AE')} · ${e.type}`],
      actions: walletActions(e),
    };
  };

  return {
    title: 'Cashback', eyebrow: 'Wallet and Limited Edition control',
    description: 'Customer wallet balances, earned credit, redemption holds, Limited Edition eligibility, fraud flags, and customer portal handoff in one ledger.',
    icon: 'WalletCards', tone: 'emerald',
    primary: {
      label: 'Create wallet entry', endpoint: '/api/cashback/wallet', method: 'POST',
      payload: { customer_id: '', type: 'accrual', amount_aed: 0, reason: '' },
      prompt: [
        { field: 'customer_id', label: 'Customer ID', required: true },
        { field: 'type', label: 'Type · accrual / spending / hold / adjustment', required: true },
        { field: 'amount_aed', label: 'Amount AED', required: true },
        { field: 'reason', label: 'Reason', required: true },
      ],
    },
    metrics: [
      { label: 'Wallet value', value: formatAED(totalValue), tone: 'emerald' },
      { label: 'Redemptions', value: String(entries.filter((e) => e.type === 'spending').length), tone: 'sky' },
      { label: 'Risk holds', value: String(held.length), tone: 'rose' },
    ],
    filters: [
      { id: 'eligible', label: 'Eligible', predicate: 'status:available' },
      { id: 'le', label: 'LE only', predicate: 'le_only' },
      { id: 'pending', label: 'Pending approval', predicate: 'status:pending' },
      { id: 'hold', label: 'Risk hold', predicate: 'status:held' },
      { id: 'vip', label: 'VIP', predicate: 'customer:vip' },
      { id: 'portal', label: 'Portal sent', predicate: 'portal_sent' },
    ],
    views: [
      { id: 'ledger', label: 'Ledger', hint: 'Earned and spent credit', items: entries.map(walletItem) },
      { id: 'redemptions', label: 'Redemptions', hint: 'Credit use requests', items: entries.filter((e) => e.type === 'spending' || e.status === 'pending').map(walletItem) },
      { id: 'risk', label: 'Risk', hint: 'Fraud and abuse watch', items: held.map(walletItem) },
    ],
    aiBrief: [
      'Wallet credit is visible in customer context but changes require approval.',
      'Limited Edition rules block invalid redemption automatically.',
      'Refunds and fraud holds freeze wallet movement before customer-facing action.',
    ],
    automations: automationFor(state, 'cashback'),
    sideSignals: [
      { label: 'LE only', value: 'Locked', tone: 'emerald' },
      { label: 'Portal links', value: String(state.customers.filter((c) => c.platform_ids.shopify || c.platform_ids.woocommerce).length), tone: 'sky' },
      { label: 'Held value', value: formatAED(held.reduce((s, e) => s + e.amount_aed, 0)), tone: 'rose' },
    ],
  };
}

function buildBrandRoom(state: OperationsState): RoomData {
  const signals = state.signals;
  const sentinel = signals.filter((s) => s.source === 'meta' || s.source === 'instagram');
  const behavior = signals.filter((s) => s.kind === 'ghost_browse' || s.kind === 'objection');
  const content = signals.filter((s) => s.kind === 'content_idea' || s.kind === 'reel_save' || s.kind === 'demand_spike');

  const signalActions = (s: BrandSignal): RoomItemAction[] => [
    { id: 'signal.action', label: 'Mark actioned', icon: 'CheckCircle2', tone: 'emerald', endpoint: `/api/brand/signal/${s.id}`, method: 'PATCH', payload: { status: 'actioned' } },
    { id: 'signal.resolve', label: 'Resolve', icon: 'BadgeCheck', tone: 'sky', endpoint: `/api/brand/signal/${s.id}`, method: 'PATCH', payload: { status: 'resolved' } },
    ...(s.customer_id ? [{ id: 'signal.retarget', label: 'Retarget', icon: 'Sparkles' as const, tone: 'violet' as Tone, endpoint: '/api/marketing/retarget', payload: { customer_id: s.customer_id, channel: 'meta', audience: 'signal_followup', reason: s.summary } }] : []),
  ];

  const signalItem = (s: BrandSignal): RoomWorkItem => ({
    id: s.id, kind: 'signal',
    title: s.summary, subtitle: s.recommended_action || 'Awaiting action',
    owner: s.product_sku ? 'Inventory' : 'Marketing', source: s.source,
    due: relativeDue(s.updated_at), value: `${s.volume}${s.kind === 'reel_save' ? ' saves' : ''}`,
    status: s.status === 'open' ? 'Watch' : s.status === 'actioned' ? 'Actioned' : s.status === 'resolved' ? 'Resolved' : 'Watching',
    priority: s.tone === 'negative' ? 'rose' : s.tone === 'positive' ? 'emerald' : 'sky',
    tags: [s.kind.replace('_', ' '), s.source, s.product_sku || 'no-sku'].slice(0, 4),
    checks: [
      `Tone: ${s.tone}`,
      `Volume: ${s.volume}`,
      `Source: ${s.source}`,
      `Recommended: ${s.recommended_action || '—'}`,
    ],
    activity: [`${new Date(s.created_at).toLocaleString('en-AE')} · signal opened`],
    actions: signalActions(s),
  });

  return {
    title: 'Brand Intelligence', eyebrow: 'Market and behavior signals',
    description: 'Meta Sentinel, behavioral intelligence, ghost heatmap, campaign risk, customer objections, and product demand converted into action.',
    icon: 'RadioTower', tone: 'sky',
    primary: {
      label: 'Create signal', endpoint: '/api/brand/signal', method: 'POST',
      payload: { kind: 'objection', source: 'whatsapp', summary: '' },
      prompt: [
        { field: 'kind', label: 'Kind · meta_comment / meta_burst / ghost_browse / objection / demand_spike / content_idea / reel_save', required: true },
        { field: 'source', label: 'Source', required: true },
        { field: 'summary', label: 'Summary', required: true },
        { field: 'recommended_action', label: 'Recommended action' },
      ],
    },
    metrics: [
      { label: 'Signals', value: String(signals.length), tone: 'sky' },
      { label: 'Demand spikes', value: String(signals.filter((s) => s.kind === 'demand_spike' || s.tone === 'positive').length), tone: 'emerald' },
      { label: 'Brand risk', value: String(signals.filter((s) => s.tone === 'negative').length), tone: 'rose' },
    ],
    filters: [
      { id: 'meta', label: 'Meta', predicate: 'source:meta' },
      { id: 'ghost', label: 'Ghost browse', predicate: 'kind:ghost_browse' },
      { id: 'objection', label: 'Objection', predicate: 'kind:objection' },
      { id: 'demand', label: 'Demand spike', predicate: 'kind:demand_spike' },
      { id: 'risk', label: 'Campaign risk', predicate: 'tone:negative' },
      { id: 'content', label: 'Content', predicate: 'kind:content_idea|reel_save' },
    ],
    views: [
      { id: 'sentinel', label: 'Meta Sentinel', hint: 'Ad comment and sentiment watch', items: sentinel.map(signalItem) },
      { id: 'behavior', label: 'Behavior', hint: 'Ghost and abandoned intent', items: behavior.map(signalItem) },
      { id: 'content', label: 'Content', hint: 'What to post and push', items: content.map(signalItem) },
    ],
    aiBrief: [
      'Brand signals become work only when tied to product, customer, or campaign action.',
      'Owner can see risk; marketing sees aggregate customer behavior, not private finance data.',
      'Demand spikes feed Inventory and Reports the same day.',
    ],
    automations: automationFor(state, 'brand'),
    sideSignals: [
      { label: 'PII', value: 'Aggregated', tone: 'emerald' },
      { label: 'Campaign risk', value: String(signals.filter((s) => s.tone === 'negative').length), tone: 'rose' },
      { label: 'Push list', value: String(signals.filter((s) => s.status === 'open' && s.tone === 'positive').length), tone: 'sky' },
    ],
  };
}

function buildGeminiRoom(state: OperationsState): RoomData {
  const briefs = state.briefs;
  const research = briefs.filter((b) => b.kind === 'gemini_research' || b.kind === 'demand_report');
  const sources = state.integrations;

  const briefActions = (b: ResearchBrief): RoomItemAction[] => [
    { id: 'brief.ready', label: 'Mark ready', icon: 'BadgeCheck', tone: 'emerald', endpoint: `/api/reports/brief/${b.id}`, method: 'PATCH', payload: { status: 'ready' } },
    { id: 'brief.deliver', label: 'Deliver', icon: 'ArrowRight', tone: 'sky', endpoint: `/api/reports/brief/${b.id}`, method: 'PATCH', payload: { status: 'delivered' } },
  ];

  const briefItem = (b: ResearchBrief): RoomWorkItem => ({
    id: b.id, kind: 'brief',
    title: b.title, subtitle: b.question,
    owner: b.audience, source: b.sources.map((s) => s.kind).join(' + '),
    due: relativeDue(b.updated_at), value: `${b.sources.length} sources`,
    status: b.status, priority: b.evidence_locked ? 'violet' : 'amber',
    tags: ['research', b.audience, b.evidence_locked ? 'evidence-locked' : 'open'],
    checks: [`Audience: ${b.audience}`, `Sources: ${b.sources.length}`, `Evidence locked: ${b.evidence_locked}`],
    activity: [b.body || 'Drafting…'],
    actions: briefActions(b),
  });

  const sourceItem = (i: IntegrationCheck): RoomWorkItem => ({
    id: i.id, kind: 'integration',
    title: `${i.service} source`, subtitle: i.detail,
    owner: 'System', source: i.service,
    due: relativeDue(i.last_checked_at), value: i.status,
    status: i.status === 'connected' ? 'Allowed' : 'Restricted',
    priority: i.status === 'connected' ? 'emerald' : 'rose',
    tags: ['source', i.service, i.status],
    checks: [`Status: ${i.status}`, `Last checked: ${new Date(i.last_checked_at).toLocaleString('en-AE')}`, `Fix: ${i.fix_action || '—'}`],
    activity: [],
    actions: [
      { id: 'integration.refresh', label: 'Recheck', icon: 'RadioTower', tone: 'sky', endpoint: '/api/management/integration-check', payload: {} },
    ],
  });

  return {
    title: 'Gemini Room', eyebrow: 'Long-context research',
    description: 'Google AI workspace for catalogue retrieval, WhatsApp transcript research, Drive source sets, owner briefs, and evidence-backed answers.',
    icon: 'Search', tone: 'violet',
    primary: {
      label: 'Start research', endpoint: '/api/reports/brief', method: 'POST',
      payload: { kind: 'gemini_research', audience: 'house' },
      prompt: [
        { field: 'title', label: 'Title', required: true },
        { field: 'question', label: 'Question', required: true },
        { field: 'audience', label: 'Audience · owner / marketing / sales / finance / house' },
      ],
    },
    metrics: [
      { label: 'Source sets', value: String(sources.filter((i) => i.status === 'connected').length), tone: 'violet' },
      { label: 'Briefs', value: String(briefs.length), tone: 'sky' },
      { label: 'Needs source', value: String(sources.filter((i) => i.status !== 'connected').length), tone: 'amber' },
    ],
    filters: [
      { id: 'catalogue', label: 'Catalogue', predicate: 'source:inventory' },
      { id: 'whatsapp', label: 'WhatsApp', predicate: 'source:whatsapp' },
      { id: 'drive', label: 'Drive', predicate: 'source:drive' },
      { id: 'owner', label: 'Owner brief', predicate: 'audience:owner' },
      { id: 'missing', label: 'Missing source', predicate: 'no_source' },
      { id: 'pinned', label: 'Pinned', predicate: 'pinned' },
    ],
    views: [
      { id: 'research', label: 'Research', hint: 'Long-context questions', items: research.map(briefItem) },
      { id: 'sources', label: 'Sources', hint: 'Evidence and permissions', items: sources.map(sourceItem) },
      { id: 'briefs', label: 'Briefs', hint: 'Owner-ready summaries', items: briefs.filter((b) => b.kind === 'owner_brief' || b.kind === 'risk_digest').map(briefItem) },
    ],
    aiBrief: [
      'Gemini answers must show source boundaries and permission scope.',
      'Long-context research supports Omnia AI; it does not bypass room permissions.',
      'Owner briefs cite source sets, not unsupported memory.',
    ],
    automations: automationFor(state, 'gemini'),
    sideSignals: [
      { label: 'Sources', value: 'Required', tone: 'emerald' },
      { label: 'Restricted', value: String(sources.filter((i) => i.status !== 'connected').length), tone: 'rose' },
      { label: 'Owner briefs', value: String(briefs.filter((b) => b.kind === 'owner_brief').length), tone: 'violet' },
    ],
  };
}

function buildMeetingRoom(state: OperationsState): RoomData {
  const meetings = state.meetings;
  const decisions = state.decisions;

  const decisionActions = (d: Decision): RoomItemAction[] => [
    { id: 'decision.approve', label: 'Approve', icon: 'BadgeCheck', tone: 'emerald', endpoint: `/api/meetings/decision/${d.id}`, method: 'PATCH', payload: { status: 'approved' } },
    { id: 'decision.block', label: 'Block', icon: 'AlertTriangle', tone: 'rose', endpoint: `/api/meetings/decision/${d.id}`, method: 'PATCH', payload: { status: 'blocked' } },
  ];

  const decisionItem = (d: Decision): RoomWorkItem => {
    const meeting = meetings.find((m) => m.id === d.meeting_id);
    return {
      id: d.id, kind: 'decision',
      title: d.title, subtitle: d.rationale,
      owner: d.owner, source: meeting?.title || 'House meeting',
      due: relativeDue(d.due), value: d.status,
      status: d.status === 'approved' ? 'Approved' : d.status === 'blocked' ? 'Blocked' : 'Pending',
      priority: d.status === 'approved' ? 'emerald' : d.status === 'blocked' ? 'rose' : 'amber',
      tags: [meeting?.source || 'ops', d.owner.toLowerCase()],
      checks: [`Owner: ${d.owner}`, `Status: ${d.status}`, `Meeting: ${meeting?.title || '—'}`],
      activity: [meeting?.summary || ''],
      actions: decisionActions(d),
    };
  };

  const meetingItem = (m: Meeting): RoomWorkItem => ({
    id: m.id, kind: 'meeting',
    title: m.title, subtitle: m.summary,
    owner: m.attendees[0] || 'House', source: m.source,
    due: new Date(m.at).toLocaleString('en-AE'), value: `${m.attendees.length} attendees`,
    status: m.transcript_url ? 'Transcript saved' : 'No transcript',
    priority: m.transcript_url ? 'emerald' : 'amber',
    tags: [m.source, ...(m.transcript_url ? ['drive'] : [])],
    checks: [`Attendees: ${m.attendees.join(', ')}`, `Source: ${m.source}`, `Transcript: ${m.transcript_url || '—'}`],
    activity: [m.summary],
    actions: [
      { id: 'meeting.archive', label: 'Archive transcript', icon: 'FileText', tone: 'violet', endpoint: '/api/operations/action', payload: { action: 'meeting.archive', entity: m.id, detail: 'Transcript archived' } },
    ],
  });

  return {
    title: 'Meeting Room', eyebrow: 'Decisions and follow-ups',
    description: 'Meeting recordings, transcripts, decisions, owners, due dates, blocked follow-ups, and Drive handoff captured in one operating room.',
    icon: 'CalendarClock', tone: 'sky',
    primary: {
      label: 'Record meeting', endpoint: '/api/meetings', method: 'POST',
      payload: { title: '', attendees: [], source: 'ops' },
      prompt: [
        { field: 'title', label: 'Meeting title', required: true },
        { field: 'attendees', label: 'Attendees (comma-separated)' },
        { field: 'source', label: 'Source · ops / growth / finance / policy / onboarding' },
        { field: 'summary', label: 'Summary' },
      ],
    },
    metrics: [
      { label: 'Decisions', value: String(decisions.length), tone: 'sky' },
      { label: 'Due today', value: String(decisions.filter((d) => d.due && new Date(d.due).getTime() < Date.now() + 86400000).length), tone: 'amber' },
      { label: 'Blocked', value: String(decisions.filter((d) => d.status === 'blocked').length), tone: 'rose' },
    ],
    filters: [
      { id: 'today', label: 'Today', predicate: 'window:today' },
      { id: 'decision', label: 'Decision', predicate: 'kind:decision' },
      { id: 'followup', label: 'Follow-up', predicate: 'kind:followup' },
      { id: 'blocked', label: 'Blocked', predicate: 'status:blocked' },
      { id: 'owner', label: 'Owner', predicate: 'owner:Mahmoud' },
      { id: 'drive', label: 'Drive stored', predicate: 'transcript' },
    ],
    views: [
      { id: 'decisions', label: 'Decisions', hint: 'Approved meeting outcomes', items: decisions.map(decisionItem) },
      { id: 'archive', label: 'Archive', hint: 'Stored transcripts and files', items: meetings.map(meetingItem) },
    ],
    aiBrief: [
      'Every meeting produces decisions and follow-ups, not loose notes.',
      'Transcript access follows Drive permissions.',
      'Overdue decisions surface in Reports and Co-Tasking.',
    ],
    automations: automationFor(state, 'meeting'),
    sideSignals: [
      { label: 'Recording', value: 'Optional', tone: 'zinc' },
      { label: 'Follow-ups', value: `${decisions.filter((d) => d.status === 'pending').length} due`, tone: 'amber' },
      { label: 'Drive link', value: meetings.some((m) => m.transcript_url) ? 'On' : 'Off', tone: 'sky' },
    ],
  };
}

function buildBackyardRoom(state: OperationsState): RoomData {
  const xp = state.xp;
  const perks = state.perks;
  const learning = state.learning;
  const heavyMembers = state.team.filter((t) => t.load >= 6);

  const xpItem = (entry: { id: string; team_member_id: string; reason: string; amount: number; source: string; created_at: string }): RoomWorkItem => {
    const member = state.team.find((m) => m.id === entry.team_member_id);
    return {
      id: entry.id, kind: 'xp',
      title: `${member?.name || '—'} · +${entry.amount} XP`, subtitle: entry.reason,
      owner: member?.name || 'Team', source: entry.source,
      due: '', value: `+${entry.amount} XP`,
      status: 'Earned', priority: 'emerald',
      tags: ['xp', entry.source],
      checks: [`Member: ${member?.name}`, `Source: ${entry.source}`, `XP total: ${member?.xp_total ?? 0}`],
      activity: [new Date(entry.created_at).toLocaleString('en-AE')],
      actions: [
        { id: 'xp.note', label: 'Note', icon: 'Sparkles', tone: 'emerald', endpoint: '/api/operations/action', payload: { action: 'xp.note', entity: entry.id, detail: entry.reason } },
      ],
    };
  };

  const perkItem = (p: { id: string; team_member_id: string; title: string; detail: string; status: string }): RoomWorkItem => {
    const member = state.team.find((m) => m.id === p.team_member_id);
    return {
      id: p.id, kind: 'perk',
      title: `${member?.name || '—'} · ${p.title}`, subtitle: p.detail,
      owner: member?.name || 'Team', source: 'Backyard',
      due: '', value: p.title,
      status: p.status, priority: p.status === 'ready' ? 'emerald' : p.status === 'redeemed' ? 'zinc' : 'amber',
      tags: ['perk', p.status],
      checks: [`Member: ${member?.name}`, `Status: ${p.status}`],
      activity: [p.detail],
      actions: p.status === 'ready' ? [
        { id: 'perk.redeem', label: 'Redeem', icon: 'WalletCards', tone: 'emerald', endpoint: '/api/backyard/perks', payload: { perk_id: p.id } },
      ] : [],
    };
  };

  const learningItem = (l: { id: string; title: string; audience: string[]; assigned_to: string[]; due: string; status: string }): RoomWorkItem => ({
    id: l.id, kind: 'learning',
    title: l.title, subtitle: `Assigned to ${l.assigned_to.map((id) => state.team.find((m) => m.id === id)?.name || id).join(', ')}`,
    owner: 'Backyard', source: 'Learning',
    due: relativeDue(l.due), value: l.status,
    status: l.status, priority: l.status === 'completed' ? 'emerald' : l.status === 'in_progress' ? 'amber' : 'sky',
    tags: ['learning', ...l.audience],
    checks: [`Audience: ${l.audience.join(', ')}`, `Assigned: ${l.assigned_to.length}`, `Due: ${new Date(l.due).toLocaleDateString('en-AE')}`],
    activity: [],
    actions: [],
  });

  const wellbeingItem = (m: TeamMember): RoomWorkItem => ({
    id: `well_${m.id}`, kind: 'wellbeing',
    title: `${m.name} · load ${m.load}`, subtitle: m.active_now || 'No active item',
    owner: 'Manager', source: 'Team',
    due: '', value: `${m.load} active`,
    status: m.load >= 8 ? 'Watch' : 'Heavy', priority: m.load >= 8 ? 'rose' : 'amber',
    tags: [m.role, m.status],
    checks: [`Closed today: ${m.closed_today}`, `XP total: ${m.xp_total}`, `Skills: ${m.skills.join(', ')}`],
    activity: [],
    actions: [
      { id: 'team.rebalance', label: 'Rebalance', icon: 'Users', tone: 'amber', endpoint: '/api/operations/action', payload: { action: 'team.rebalance_suggested', entity: m.id, detail: 'Manager prompt' } },
    ],
  });

  return {
    title: 'Backyard', eyebrow: 'Team pulse and culture',
    description: 'Team XP, milestones, perks, workload balance, wellbeing signals, learning modules, and private/public event decisions tied to real work.',
    icon: 'Sparkles', tone: 'emerald',
    primary: {
      label: 'Add XP', endpoint: '/api/backyard/xp', method: 'POST',
      payload: { team_member_id: '', reason: '', amount: 10 },
      prompt: [
        { field: 'team_member_id', label: 'Team member ID', required: true },
        { field: 'reason', label: 'Reason', required: true },
        { field: 'amount', label: 'Amount', required: true },
        { field: 'source', label: 'Source · co_tasking / learning / milestone / sales / shipping' },
      ],
    },
    metrics: [
      { label: 'XP earned', value: String(xp.reduce((s, e) => s + e.amount, 0)), tone: 'emerald' },
      { label: 'Perks ready', value: String(perks.filter((p) => p.status === 'ready').length), tone: 'sky' },
      { label: 'Wellbeing watch', value: String(heavyMembers.length), tone: 'amber' },
    ],
    filters: [
      { id: 'xp', label: 'XP', predicate: 'kind:xp' },
      { id: 'perks', label: 'Perks', predicate: 'kind:perk' },
      { id: 'wellbeing', label: 'Wellbeing', predicate: 'kind:wellbeing' },
      { id: 'milestone', label: 'Milestone', predicate: 'source:milestone' },
      { id: 'learning', label: 'Learning', predicate: 'kind:learning' },
      { id: 'private', label: 'Private', predicate: 'visibility:private' },
    ],
    views: [
      { id: 'pulse', label: 'Pulse', hint: 'Wellbeing and workload', items: heavyMembers.map(wellbeingItem).concat(xp.slice(0, 3).map(xpItem)) },
      { id: 'perks', label: 'Perks', hint: 'Rewards and recognition', items: perks.map(perkItem).concat(learning.map(learningItem)) },
      { id: 'milestones', label: 'Milestones', hint: 'Personal and team events', items: xp.filter((e) => e.source === 'milestone' || e.source === 'sales').map(xpItem) },
    ],
    aiBrief: [
      'Backyard is useful only when privacy is strict.',
      'Personal events are private by default; public recognition is intentional.',
      'XP rewards helpful work, not noisy activity.',
    ],
    automations: automationFor(state, 'backyard'),
    sideSignals: [
      { label: 'Privacy', value: 'Default', tone: 'rose' },
      { label: 'XP today', value: `+${xp.reduce((s, e) => s + e.amount, 0)}`, tone: 'emerald' },
      { label: 'Perks', value: `${perks.filter((p) => p.status === 'ready').length} ready`, tone: 'sky' },
    ],
  };
}

function buildCoTaskingRoom(state: OperationsState): RoomData {
  const requests = state.help_requests;
  const open = requests.filter((r) => r.status === 'open');
  const claimed = requests.filter((r) => r.status === 'claimed');
  const blocked = requests.filter((r) => r.status === 'blocked');

  const helpActions = (h: HelpRequest): RoomItemAction[] => {
    const acts: RoomItemAction[] = [];
    if (h.status === 'open') {
      acts.push({ id: 'help.claim', label: 'Claim', icon: 'UserPlus', tone: 'violet', endpoint: `/api/cotasking/${h.id}/claim`, payload: { claimed_by: 'tm_3' } });
    }
    if (h.status === 'claimed') {
      acts.push({ id: 'help.resolve', label: 'Resolve', icon: 'CheckCircle2', tone: 'emerald', endpoint: `/api/cotasking/${h.id}/resolve`, payload: {} });
    }
    if (h.status === 'blocked') {
      acts.push({ id: 'access.request', label: 'Request access', icon: 'KeyRound', tone: 'amber', endpoint: '/api/access/request', payload: { requester_name: 'Agent', requested_role: 'finance', reason: h.block_reason || 'Blocked help', scope: ['finance.payment_proof'] } });
    }
    return acts;
  };

  const item = (h: HelpRequest): RoomWorkItem => {
    const poster = state.team.find((m) => m.id === h.posted_by);
    const claimer = h.claimed_by ? state.team.find((m) => m.id === h.claimed_by) : null;
    return {
      id: h.id, kind: 'help_request',
      title: h.title, subtitle: h.detail,
      owner: claimer?.name || poster?.name || 'Team',
      source: h.linked_entity?.kind || 'House',
      due: relativeDue(h.created_at), value: h.skill_needed.join(', '),
      status: h.status === 'open' ? 'Open' : h.status === 'claimed' ? 'In progress' : h.status === 'blocked' ? 'Access' : 'Resolved',
      priority: h.status === 'blocked' ? 'rose' : h.status === 'open' ? 'amber' : h.status === 'claimed' ? 'violet' : 'emerald',
      tags: [h.room.toLowerCase(), ...h.skill_needed.slice(0, 2)],
      checks: [
        `Posted by: ${poster?.name}`,
        `Linked: ${h.linked_entity?.kind}:${h.linked_entity?.id || '—'}`,
        `Skills needed: ${h.skill_needed.join(', ')}`,
        ...(h.block_reason ? [`Block: ${h.block_reason}`] : []),
      ],
      activity: [new Date(h.created_at).toLocaleString('en-AE') + ' · posted'],
      actions: helpActions(h),
    };
  };

  return {
    title: 'Co-Tasking', eyebrow: 'Shared help board',
    description: 'Help requests, claim flow, blocked work, helper credit, collaboration score, and AI-assisted routing when one teammate needs another.',
    icon: 'Workflow', tone: 'violet',
    primary: {
      label: 'Post help request', endpoint: '/api/cotasking', method: 'POST',
      payload: { posted_by: 'tm_0', title: '', detail: '' },
      prompt: [
        { field: 'posted_by', label: 'Posted by (team member ID)', required: true },
        { field: 'title', label: 'Title', required: true },
        { field: 'detail', label: 'Detail', required: true },
        { field: 'skill_needed', label: 'Skills (comma-separated)' },
      ],
    },
    metrics: [
      { label: 'Open help', value: String(open.length), tone: 'amber' },
      { label: 'Claimed', value: String(claimed.length), tone: 'violet' },
      { label: 'Blocked', value: String(blocked.length), tone: 'rose' },
    ],
    filters: [
      { id: 'open', label: 'Open', predicate: 'status:open' },
      { id: 'claimed', label: 'Claimed', predicate: 'status:claimed' },
      { id: 'blocked', label: 'Blocked', predicate: 'status:blocked' },
      { id: 'arabic', label: 'Arabic', predicate: 'skill:arabic' },
      { id: 'finance', label: 'Finance', predicate: 'skill:finance' },
      { id: 'shipping', label: 'Shipping', predicate: 'skill:shipping' },
    ],
    views: [
      { id: 'open', label: 'Open', hint: 'Help requests waiting', items: open.map(item) },
      { id: 'claimed', label: 'Claimed', hint: 'Work already picked up', items: claimed.map(item) },
      { id: 'blocked', label: 'Blocked', hint: 'Needs manager or missing access', items: blocked.map(item) },
    ],
    aiBrief: [
      'Co-Tasking should reduce interruption, not create noise.',
      'Claimed help earns credit only when the underlying room action is closed.',
      'Restricted data requests must route through Access Requests or a manager.',
    ],
    automations: automationFor(state, 'cotasking'),
    sideSignals: [
      { label: 'Open help', value: String(open.length), tone: 'amber' },
      { label: 'Avg claim', value: '8 min', tone: 'emerald' },
      { label: 'RBAC blocks', value: String(blocked.length), tone: 'rose' },
    ],
  };
}

function buildManagementRoom(state: OperationsState): RoomData {
  const integrations = state.integrations;
  const audit = state.audit;
  const riskOrders = state.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f)));
  const drafts = state.orders.filter((o) => o.status === 'draft' || o.status === 'payment_pending');

  const integrationActions = (i: IntegrationCheck): RoomItemAction[] => [
    { id: 'integration.recheck', label: 'Recheck', icon: 'RadioTower', tone: 'sky', endpoint: '/api/management/integration-check', payload: {} },
  ];

  const integrationItem = (i: IntegrationCheck): RoomWorkItem => ({
    id: i.id, kind: 'integration',
    title: `${i.service} · ${i.status}`, subtitle: i.detail,
    owner: 'Owner', source: i.service,
    due: relativeDue(i.last_checked_at), value: i.status,
    status: i.status === 'connected' ? 'Ready' : i.status === 'degraded' ? 'Watch' : 'Down',
    priority: i.status === 'connected' ? 'emerald' : i.status === 'degraded' ? 'amber' : 'rose',
    tags: [i.service, i.status],
    checks: [`Status: ${i.status}`, `Detail: ${i.detail}`, ...(i.fix_action ? [`Fix: ${i.fix_action}`] : [])],
    activity: [],
    actions: integrationActions(i),
  });

  const riskItem = (o: OrderSubmission): RoomWorkItem => {
    const customer = state.customers.find((c) => c.id === o.customer_id);
    return {
      id: o.id, kind: 'order',
      title: `${customer?.name} · ${o.flags[0] || 'risk'}`,
      subtitle: o.notes[0] || `${o.lines[0]?.title}`,
      owner: 'Owner', source: 'Orders',
      due: relativeDue(o.due), value: formatAED(o.total_aed),
      status: 'Decide', priority: 'rose',
      tags: o.flags.slice(0, 3),
      checks: [`Value at risk: ${formatAED(o.total_aed)}`, `Flags: ${o.flags.join(', ')}`, `Assignee: ${memberName(state, o.assignee)}`],
      activity: o.notes.slice(0, 3),
      actions: [
        { id: 'order.escalate', label: 'Escalate', icon: 'AlertTriangle', tone: 'rose', endpoint: '/api/orders/escalate', payload: { entity_kind: 'order', entity_id: o.id, reason: 'Owner risk digest' } },
      ],
    };
  };

  const auditItem = (a: { id: string; at: string; actor: string; action: string; entity: string; rationale: string; visibility: string }): RoomWorkItem => ({
    id: a.id, kind: 'audit',
    title: a.action, subtitle: a.rationale,
    owner: a.actor, source: a.entity,
    due: new Date(a.at).toLocaleString('en-AE'), value: '',
    status: 'Logged', priority: 'zinc',
    tags: [a.visibility, a.action.split('.')[0]],
    checks: [`Actor: ${a.actor}`, `Entity: ${a.entity}`, `Visibility: ${a.visibility}`],
    activity: [a.rationale],
    actions: [],
  });

  return {
    title: 'Management', eyebrow: 'Owner switchboard',
    description: 'Integration health, draft orders, store sync, CRM movement, wallet exposure, operational risk, and admin decisions from one room.',
    icon: 'Building2', tone: 'amber',
    primary: {
      label: 'Refresh switchboard', endpoint: '/api/management/integration-check', method: 'POST', payload: {},
    },
    metrics: [
      { label: 'Connections', value: String(integrations.filter((i) => i.status === 'connected').length), tone: 'emerald' },
      { label: 'Draft pushes', value: String(drafts.length), tone: 'amber' },
      { label: 'Risks', value: String(riskOrders.length), tone: 'rose' },
    ],
    filters: [
      { id: 'integrations', label: 'Integrations', predicate: 'kind:integration' },
      { id: 'drafts', label: 'Drafts', predicate: 'kind:order' },
      { id: 'sync', label: 'Sync issue', predicate: 'status:degraded' },
      { id: 'owner', label: 'Owner only', predicate: 'visibility:owner' },
      { id: 'audit', label: 'Audit', predicate: 'kind:audit' },
      { id: 'today', label: 'Today', predicate: 'window:today' },
    ],
    views: [
      { id: 'switchboard', label: 'Switchboard', hint: 'Connections and operating state', items: integrations.map(integrationItem) },
      { id: 'risks', label: 'Risks', hint: 'Owner attention required', items: riskOrders.map(riskItem) },
      { id: 'audit', label: 'Audit', hint: 'Important decisions', items: audit.slice(0, 25).map(auditItem) },
    ],
    aiBrief: [
      'Management is the owner switchboard, not a general dashboard.',
      'Sensitive finance and access decisions need audit logs.',
      'A connection warning creates a clear operational task, not just a badge.',
    ],
    automations: automationFor(state, 'management'),
    sideSignals: [
      { label: 'Owner scope', value: 'Required', tone: 'amber' },
      { label: 'Audit', value: 'On', tone: 'emerald' },
      { label: 'Live keys', value: integrations.every((i) => i.status === 'connected') ? 'All connected' : 'Some missing', tone: integrations.every((i) => i.status === 'connected') ? 'sky' : 'rose' },
    ],
  };
}

function buildAccessRoom(state: OperationsState): RoomData {
  const requests = state.access_requests;
  const pending = requests.filter((r) => r.status === 'pending');
  const audit = requests.filter((r) => r.status !== 'pending');

  const reqActions = (r: AccessRequest): RoomItemAction[] => r.status === 'pending' ? [
    { id: 'access.approve', label: 'Approve', icon: 'BadgeCheck', tone: 'emerald', endpoint: `/api/access/${r.id}/decide`, payload: { decision: 'approved', rationale: 'Approved by owner', actor: 'Mahmoud' }, confirm: `Approve access for ${r.requester_name}?` },
    { id: 'access.deny', label: 'Deny', icon: 'AlertTriangle', tone: 'rose', endpoint: `/api/access/${r.id}/decide`, payload: { decision: 'denied', rationale: 'Out of scope', actor: 'Mahmoud' }, confirm: `Deny access for ${r.requester_name}?` },
  ] : [];

  const item = (r: AccessRequest): RoomWorkItem => ({
    id: r.id, kind: 'access_request',
    title: `${r.requester_name} · ${r.requested_role}`, subtitle: r.reason,
    owner: r.decided_by || 'Owner',
    source: 'Team invite',
    due: r.decided_at ? new Date(r.decided_at).toLocaleString('en-AE') : 'Pending',
    value: r.sensitive_scope.length ? 'Sensitive' : `${r.scope.length} scopes`,
    status: r.status === 'approved' ? 'Approved' : r.status === 'denied' ? 'Denied' : r.status === 'expired' ? 'Expired' : 'Pending',
    priority: r.sensitive_scope.length ? 'rose' : r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'emerald' : 'zinc',
    tags: [r.requested_role, ...(r.sensitive_scope.length ? ['Sensitive'] : ['Scoped'])],
    checks: [
      `Scope: ${r.scope.join(', ') || '—'}`,
      ...(r.sensitive_scope.length ? [`Sensitive: ${r.sensitive_scope.join(', ')}`] : []),
      `Reason: ${r.reason}`,
      ...(r.rationale ? [`Rationale: ${r.rationale}`] : []),
    ],
    activity: [r.created_at && `created · ${new Date(r.created_at).toLocaleString('en-AE')}`].filter(Boolean) as string[],
    actions: reqActions(r),
  });

  return {
    title: 'Access Requests', eyebrow: 'Role and room gate',
    description: 'Pending team approvals, invite state, room access, sensitive permissions, manager decisions, and audit-backed role changes.',
    icon: 'KeyRound', tone: 'amber',
    primary: {
      label: 'New access request', endpoint: '/api/access/request', method: 'POST',
      payload: { requester_name: '', requested_role: '', reason: '' },
      prompt: [
        { field: 'requester_name', label: 'Requester name', required: true },
        { field: 'requested_role', label: 'Requested role', required: true },
        { field: 'reason', label: 'Reason', required: true },
        { field: 'scope', label: 'Scope (comma-separated)' },
        { field: 'sensitive_scope', label: 'Sensitive scope (comma-separated)' },
      ],
    },
    metrics: [
      { label: 'Pending', value: String(pending.length), tone: 'amber' },
      { label: 'Sensitive', value: String(pending.filter((r) => r.sensitive_scope.length).length), tone: 'rose' },
      { label: 'Approved week', value: String(audit.filter((r) => r.status === 'approved').length), tone: 'emerald' },
    ],
    filters: [
      { id: 'pending', label: 'Pending', predicate: 'status:pending' },
      { id: 'finance', label: 'Finance', predicate: 'sensitive:finance' },
      { id: 'private', label: 'Customer private', predicate: 'sensitive:customers.private' },
      { id: 'ai', label: 'AI access', predicate: 'scope:ai' },
      { id: 'approved', label: 'Approved', predicate: 'status:approved' },
      { id: 'denied', label: 'Denied', predicate: 'status:denied' },
    ],
    views: [
      { id: 'pending', label: 'Pending', hint: 'Waiting owner decision', items: pending.map(item) },
      { id: 'audit', label: 'Audit', hint: 'Access decisions log', items: audit.map(item) },
    ],
    aiBrief: [
      'Access is action-level, not just room-level.',
      'Finance, customer private, export, and AI permissions need explicit review.',
      'Every approval and denial leaves a readable reason.',
    ],
    automations: automationFor(state, 'access'),
    sideSignals: [
      { label: 'Action RBAC', value: 'Active', tone: 'emerald' },
      { label: 'Pending', value: String(pending.length), tone: 'amber' },
      { label: 'Finance asks', value: String(pending.filter((r) => r.sensitive_scope.some((s) => s.startsWith('finance'))).length), tone: 'rose' },
    ],
  };
}

function buildTeamRoom(state: OperationsState): RoomData {
  const team = state.team;
  const online = team.filter((m) => m.status === 'online');
  const heavy = team.filter((m) => m.load >= 6);

  const memberActions = (m: TeamMember): RoomItemAction[] => [
    { id: 'team.assign', label: 'Assign work', icon: 'UserPlus', tone: 'sky', endpoint: '/api/team/assign', payload: { team_member_id: m.id, entity_kind: 'order', entity_id: '' } },
    { id: 'team.xp', label: 'Award XP', icon: 'Sparkles', tone: 'emerald', endpoint: '/api/backyard/xp', payload: { team_member_id: m.id, reason: 'Good work', amount: 10, source: 'manual' } },
  ];

  const memberItem = (m: TeamMember): RoomWorkItem => ({
    id: m.id, kind: 'team_member',
    title: `${m.name} · ${m.role.replace('_', ' ')}`,
    subtitle: m.active_now || (m.status === 'away' ? 'Away' : 'Offline'),
    owner: m.name, source: m.role,
    due: '', value: `${m.load} active`,
    status: m.status === 'online' ? (m.load >= 6 ? 'Heavy' : 'Online') : m.status === 'away' ? 'Away' : 'Offline',
    priority: m.status !== 'online' ? 'zinc' : m.load >= 8 ? 'rose' : m.load >= 6 ? 'amber' : 'emerald',
    tags: [m.role, ...m.skills.slice(0, 2)],
    checks: [
      `Skills: ${m.skills.join(', ')}`,
      `Permissions: ${m.permissions.slice(0, 3).join(', ')}${m.permissions.length > 3 ? '…' : ''}`,
      `Closed today: ${m.closed_today}`,
      `XP total: ${m.xp_total}`,
    ],
    activity: [m.active_now || `${m.status} · last update ${relativeDue(m.updated_at)}`],
    actions: memberActions(m),
  });

  return {
    title: 'Team', eyebrow: 'People and capacity',
    description: 'Who is online, what each person owns, workload pressure, skill coverage, collaboration, closed work, and assistant handoff state.',
    icon: 'Users', tone: 'sky',
    primary: {
      label: 'Assign work', endpoint: '/api/team/assign', method: 'POST',
      payload: { team_member_id: '', entity_kind: 'order', entity_id: '' },
      prompt: [
        { field: 'team_member_id', label: 'Team member ID', required: true },
        { field: 'entity_kind', label: 'Entity kind · order / customer / shipping / access_request', required: true },
        { field: 'entity_id', label: 'Entity ID', required: true },
        { field: 'reason', label: 'Reason' },
      ],
    },
    metrics: [
      { label: 'Online', value: String(online.length), tone: 'emerald' },
      { label: 'Overloaded', value: String(heavy.length), tone: 'amber' },
      { label: 'Blocked', value: String(state.help_requests.filter((h) => h.status === 'blocked').length), tone: 'rose' },
    ],
    filters: [
      { id: 'online', label: 'Online', predicate: 'status:online' },
      { id: 'away', label: 'Away', predicate: 'status:away' },
      { id: 'heavy', label: 'Overloaded', predicate: 'load>=6' },
      { id: 'arabic', label: 'Arabic', predicate: 'skill:arabic' },
      { id: 'finance', label: 'Finance', predicate: 'role:finance' },
      { id: 'shipping', label: 'Shipping', predicate: 'skill:shipping' },
    ],
    views: [
      { id: 'live', label: 'Live load', hint: 'Current team activity', items: online.map(memberItem) },
      { id: 'skills', label: 'Skills', hint: 'Coverage and routing', items: team.filter((m) => m.skills.length).map(memberItem) },
      { id: 'all', label: 'Everyone', hint: 'Full team view', items: team.map(memberItem) },
    ],
    aiBrief: [
      'Team view routes work by skill and load, not popularity.',
      'Assistant handoffs avoid interrupting someone when the answer is already available.',
      'Sensitive handoffs respect the receiving person\'s permissions.',
    ],
    automations: automationFor(state, 'team'),
    sideSignals: [
      { label: 'Online', value: String(online.length), tone: 'emerald' },
      { label: 'Arabic cover', value: String(team.filter((m) => m.skills.includes('arabic')).length), tone: 'sky' },
      { label: 'Heavy load', value: String(heavy.length), tone: 'amber' },
    ],
  };
}

// ─── Generic fallback (kept rich, no longer a placeholder) ────────────────

function buildGeneric(state: OperationsState, title: string, description: string): RoomData {
  const items = state.activity.slice(0, 8).map((a, idx): RoomWorkItem => ({
    id: a.id, kind: 'activity',
    title: a.action, subtitle: a.detail,
    owner: a.actor, source: a.entity,
    due: new Date(a.at).toLocaleString('en-AE'), value: '',
    status: 'Logged', priority: idx === 0 ? 'amber' : 'zinc',
    tags: [a.action.split('.')[0]],
    checks: [`Actor: ${a.actor}`, `Entity: ${a.entity}`],
    activity: [a.detail],
    actions: [],
  }));
  return {
    title, eyebrow: 'House operating room', description,
    icon: 'Workflow', tone: 'zinc',
    primary: { label: 'Record action', endpoint: '/api/operations/action', method: 'POST', payload: { action: `${title.toLowerCase()}.note`, entity: title, detail: '' } },
    metrics: [
      { label: 'Activity', value: String(state.activity.length), tone: 'sky' },
      { label: 'Audit', value: String(state.audit.length), tone: 'emerald' },
      { label: 'Watch', value: '1', tone: 'rose' },
    ],
    filters: [
      { id: 'mine', label: 'Mine', predicate: 'mine' },
      { id: 'action', label: 'Needs action', predicate: 'open' },
      { id: 'manager', label: 'Manager', predicate: 'manager' },
      { id: 'high', label: 'High priority', predicate: 'priority:high' },
      { id: 'today', label: 'Today', predicate: 'window:today' },
      { id: 'archived', label: 'Archived', predicate: 'archived' },
    ],
    views: [
      { id: 'activity', label: 'Activity', hint: 'Recent log', items },
      { id: 'audit', label: 'Audit', hint: 'Important decisions', items: state.audit.slice(0, 8).map((a): RoomWorkItem => ({
        id: a.id, kind: 'audit', title: a.action, subtitle: a.rationale, owner: a.actor, source: a.entity,
        due: new Date(a.at).toLocaleString('en-AE'), value: '', status: a.visibility, priority: 'zinc',
        tags: [a.visibility], checks: [], activity: [], actions: [],
      })) },
    ],
    aiBrief: [
      `${title} follows role-scoped access and human confirmation.`,
      'Omnia AI can summarize, route, and warn, but does not execute sensitive actions alone.',
      'Every important action leaves an audit trail.',
    ],
    automations: [],
    sideSignals: [
      { label: 'Role scope', value: 'Active', tone: 'emerald' },
      { label: 'AI support', value: 'On', tone: 'sky' },
      { label: 'Audit', value: 'Required', tone: 'amber' },
    ],
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────

// Best-effort overlay: merge Supabase customers on top of the in-memory
// state.customers for room builders that read it (Customers, Reports,
// Brand cross-references). The operations store still owns orders,
// signals, wallet, follow-ups until those slices land, but the customer
// row itself is now the system of record in Postgres.
async function overlayLiveCustomers(state: any): Promise<any> {
  try {
    const { isCustomersLiveAvailable, listCustomersLive } = await import('@/lib/customers/queries');
    if (!isCustomersLiveAvailable()) return state;
    const live = await listCustomersLive({ limit: 500 });
    if (!live || live.length === 0) return state;
    const merged = new Map<string, any>();
    for (const c of state.customers || []) merged.set(c.phone, c);
    for (const row of live) {
      merged.set(row.phone, {
        id: row.id,
        name: row.name || `Customer ${row.phone.slice(-4)}`,
        phone: row.phone,
        whatsapp_number: row.whatsapp_number || row.phone,
        email: row.email,
        country: row.country || 'AE',
        language: row.language || 'en',
        source: row.source || 'whatsapp',
        platform_ids: {
          shopify: row.shopify_customer_id || undefined,
          woocommerce: row.woocommerce_customer_id || undefined,
          whatsapp: row.whatsapp_wa_id || undefined,
        },
        tags: row.tags || [],
        ltv_aed: Number(row.ltv_aed) || 0,
        orders_count: row.orders_count || 0,
        last_order_at: row.last_order_at,
        marketing_consent: row.marketing_consent,
        finance_flags: row.finance_flags || [],
        vip: row.vip,
        city: row.city,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    }
    return { ...state, customers: Array.from(merged.values()) };
  } catch {
    return state;
  }
}

export async function getRoomData(title: string, description: string): Promise<RoomData> {
  let state = await operationsSnapshot();
  // The Customers, Reports, and Brand rooms all index over state.customers.
  // Overlaying the live rows means the moment Postgres has customers, the
  // room reflects them — without rewiring every aggregator individually.
  if (title === 'Customers' || title === 'Reports' || title === 'Brand Intelligence' || title === 'Cashback') {
    state = await overlayLiveCustomers(state);
  }
  switch (title) {
    case 'Orders': return buildOrdersRoom(state);
    case 'Shipping': return buildShippingRoom(state);
    case 'Customers': return buildCustomersRoom(state);
    case 'Finance': return buildFinanceRoom(state);
    case 'Reports': return buildReportsRoom(state);
    case 'Cashback': return buildCashbackRoom(state);
    case 'Brand Intelligence': return buildBrandRoom(state);
    case 'Gemini Room': return buildGeminiRoom(state);
    case 'Meeting Room': return buildMeetingRoom(state);
    case 'Backyard': return buildBackyardRoom(state);
    case 'Co-Tasking': return buildCoTaskingRoom(state);
    case 'Management': return buildManagementRoom(state);
    case 'Access Requests': return buildAccessRoom(state);
    case 'Team': return buildTeamRoom(state);
    default: return buildGeneric(state, title, description);
  }
}
