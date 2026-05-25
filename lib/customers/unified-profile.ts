import type {
  OperationsState, UnifiedCustomer, OrderSubmission, WalletEntry, FollowUp, RetargetingRecord,
  BrandSignal, HelpRequest, ConversationPresence,
} from '@/lib/operations/store';
import type { Conversation, CustomerCard, GhostBrowse } from '@/lib/whatsapp/types';

// ─── Wire types ───────────────────────────────────────────────────────────

export type ChannelKey = 'whatsapp' | 'shopify' | 'woocommerce' | 'instagram' | 'meta_ads' | 'website' | 'email' | 'manual';

export type Channel = {
  channel: ChannelKey;
  platform_id: string | null;
  first_seen_at: string | null;
  last_activity_at: string | null;
  interactions: number;
  note: string;
};

export type ProfileOrder = {
  id: string;
  target_store: 'shopify' | 'woocommerce';
  status: string;
  payment_status: string;
  payment_method: string;
  total_aed: number;
  lines: number;
  flags: string[];
  created_at: string;
  assignee: string | null;
};

export type WalletSummary = {
  available_aed: number;
  pending_aed: number;
  held_aed: number;
  redeemed_aed: number;
  total_aed: number;
  le_only: boolean;
  last_entry_at: string | null;
  entries: { id: string; type: string; amount_aed: number; reason: string; status: string; created_at: string; order_id: string | null }[];
};

export type TimelineEvent = {
  at: string;
  channel: ChannelKey | 'house' | 'system';
  action: string;
  detail: string;
  ref_kind?: string;
  ref_id?: string;
};

export type ConversationSummary = {
  id: string;
  phone: string;
  status: string;
  language: string;
  last_at: string;
  unread: number;
  message_count: number;
  outgoing_count: number;
  claimed_by: string | null;
  happiness: number;
  urgency: string;
  unresolved: boolean;
};

export type TopSku = {
  sku: string;
  title: string;
  qty: number;
  revenue_aed: number;
  last_at: string;
};

export type Warning = {
  type: string;
  severity: 'info' | 'warn' | 'bad';
  note: string;
};

export type Consent = {
  marketing: boolean;
  whatsapp_promotional: boolean;
  last_change: string | null;
  source: 'system' | 'agent' | 'customer';
};

export type ProfileMetrics = {
  ltv_aed: number;
  orders_count: number;
  paid_orders: number;
  refund_count: number;
  aov_aed: number;
  cod_count: number;
  bnpl_count: number;
  card_count: number;
  bank_transfer_count: number;
  first_seen_at: string | null;
  last_touch_at: string | null;
  days_since_last_order: number | null;
  days_since_last_contact: number | null;
  happiness_avg: number | null;
  upsell_orders: number;
  objection_count: number;
  ghost_sessions: number;
  message_count: number;
  agent_outgoing_count: number;
  top_skus: TopSku[];
};

export type UnifiedProfile = {
  generated_at: string;
  customer: UnifiedCustomer;
  identity: {
    phone: string;
    whatsapp: string | null;
    email: string | null;
    shopify_id: string | null;
    woocommerce_id: string | null;
    instagram_handle: string | null;
    aliases: string[];
  };
  channels: Channel[];
  orders: ProfileOrder[];
  wallet: WalletSummary;
  followups: FollowUp[];
  retargeting: RetargetingRecord[];
  signals: BrandSignal[];
  help_requests: HelpRequest[];
  ghost: GhostBrowse | null;
  conversations: ConversationSummary[];
  timeline: TimelineEvent[];
  metrics: ProfileMetrics;
  warnings: Warning[];
  consent: Consent;
  segments: string[];
  notes: { at: string; author: string; body: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function cleanPhone(phone: string) {
  return phone ? phone.replace(/[^\d+]/g, '').replace(/^00/, '+') : '';
}

function daysBetween(iso: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / 86_400_000));
}

function pickLatest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}

function pickEarliest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() < new Date(b).getTime() ? a : b;
}

function toIsoFromConvTime(conv: Conversation, hhmm: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return new Date().toISOString();
  return `${today}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
}

// ─── Resolve customer ─────────────────────────────────────────────────────

export function findCustomer(state: OperationsState, idOrPhone: string): UnifiedCustomer | null {
  if (!idOrPhone) return null;
  const cleaned = cleanPhone(idOrPhone);
  return (
    state.customers.find((c) => c.id === idOrPhone) ||
    state.customers.find((c) => cleanPhone(c.phone) === cleaned) ||
    state.customers.find((c) => cleanPhone(c.whatsapp_number) === cleaned) ||
    state.customers.find((c) => c.email && c.email.toLowerCase() === idOrPhone.toLowerCase()) ||
    null
  );
}

// ─── Aggregator ───────────────────────────────────────────────────────────

export function buildUnifiedProfile(
  state: OperationsState,
  customer: UnifiedCustomer,
  conversations: Conversation[],
  customerCardLookup?: (phone: string, customer_id: string | null) => CustomerCard | null,
): UnifiedProfile {
  const phone = cleanPhone(customer.phone);
  const customerConvs = conversations.filter((c) => cleanPhone(c.phone) === phone || c.customer_id === customer.id);

  // Customer card for ghost / wallet history (from WhatsApp mock)
  const card = customerCardLookup ? customerCardLookup(customer.phone, customer.id) : null;

  // ─── Orders ──────────────────────────────────────────────────────────
  const customerOrders = state.orders.filter((o) => o.customer_id === customer.id || cleanPhone(o.customer_phone) === phone);
  const orders: ProfileOrder[] = customerOrders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((o) => ({
      id: o.id, target_store: o.target_store, status: o.status,
      payment_status: o.payment_status, payment_method: o.payment_method,
      total_aed: o.total_aed, lines: o.lines.length, flags: o.flags,
      created_at: o.created_at,
      assignee: o.assignee ? (state.team.find((t) => t.id === o.assignee)?.name || o.assignee) : null,
    }));

  // ─── Wallet ──────────────────────────────────────────────────────────
  const walletEntries = state.wallet_entries.filter((e) => e.customer_id === customer.id);
  const sumByStatus = (status: WalletEntry['status']) => walletEntries.filter((e) => e.status === status).reduce((s, e) => s + e.amount_aed, 0);
  const wallet: WalletSummary = {
    available_aed: sumByStatus('available'),
    pending_aed: sumByStatus('pending'),
    held_aed: sumByStatus('held'),
    redeemed_aed: sumByStatus('redeemed'),
    total_aed: walletEntries.filter((e) => e.type === 'accrual').reduce((s, e) => s + e.amount_aed, 0),
    le_only: walletEntries.every((e) => e.limited_edition_only),
    last_entry_at: walletEntries[0]?.created_at || null,
    entries: walletEntries.slice(0, 12).map((e) => ({
      id: e.id, type: e.type, amount_aed: e.amount_aed, reason: e.reason,
      status: e.status, created_at: e.created_at, order_id: e.order_id,
    })),
  };

  // ─── Follow-ups, retargeting, signals, help requests ────────────────
  const followups = state.followups.filter((f) => f.customer_id === customer.id);
  const retargeting = state.retargeting.filter((r) => r.customer_id === customer.id);
  const signals = state.signals.filter((s) => s.customer_id === customer.id);
  const helpRequests = state.help_requests.filter((h) => h.linked_entity?.kind === 'customer' && h.linked_entity?.id === customer.id);

  // ─── Conversations ──────────────────────────────────────────────────
  const conversationSummaries: ConversationSummary[] = customerConvs.map((c) => {
    const presence: ConversationPresence | undefined = state.whatsapp_presence[c.id];
    return {
      id: c.id, phone: c.phone, status: c.status, language: c.language,
      last_at: c.last_at, unread: c.unread, message_count: c.messages.length,
      outgoing_count: presence?.outgoing.length || 0,
      claimed_by: presence?.claimed_by_name || null,
      happiness: c.vibes.happiness_level, urgency: c.vibes.urgency,
      unresolved: presence?.unresolved ?? (c.status === 'unclaimed' || c.status === 'awaiting_customer'),
    };
  });

  // ─── Channels ───────────────────────────────────────────────────────
  const channels: Channel[] = [];
  if (customer.platform_ids.whatsapp || customerConvs.length) {
    const last = customerConvs[0];
    channels.push({
      channel: 'whatsapp', platform_id: customer.whatsapp_number || phone,
      first_seen_at: null,
      last_activity_at: last ? toIsoFromConvTime(last, last.last_at) : null,
      interactions: customerConvs.reduce((s, c) => s + c.messages.length, 0),
      note: customerConvs.length ? `${customerConvs.length} chat${customerConvs.length === 1 ? '' : 's'} · last ${last?.last_at}` : '—',
    });
  }
  if (customer.platform_ids.shopify) {
    const shopifyOrders = orders.filter((o) => o.target_store === 'shopify');
    channels.push({
      channel: 'shopify', platform_id: customer.platform_ids.shopify,
      first_seen_at: shopifyOrders[shopifyOrders.length - 1]?.created_at || null,
      last_activity_at: shopifyOrders[0]?.created_at || null,
      interactions: shopifyOrders.length,
      note: `${shopifyOrders.length} order${shopifyOrders.length === 1 ? '' : 's'} on omniastores.ae`,
    });
  }
  if (customer.platform_ids.woocommerce) {
    const wooOrders = orders.filter((o) => o.target_store === 'woocommerce');
    channels.push({
      channel: 'woocommerce', platform_id: customer.platform_ids.woocommerce,
      first_seen_at: wooOrders[wooOrders.length - 1]?.created_at || null,
      last_activity_at: wooOrders[0]?.created_at || null,
      interactions: wooOrders.length,
      note: `${wooOrders.length} order${wooOrders.length === 1 ? '' : 's'} on omniastores.com`,
    });
  }
  if (card?.ghost && card.ghost.sessions > 0) {
    channels.push({
      channel: 'website', platform_id: null,
      first_seen_at: null, last_activity_at: card.ghost.cart_adds_no_checkout[0]?.at || null,
      interactions: card.ghost.sessions,
      note: `${card.ghost.sessions} ghost sessions · ${card.ghost.pages_viewed.length} SKUs viewed`,
    });
  }
  if (signals.some((s) => s.source === 'instagram' || s.source === 'meta')) {
    const igInteractions = signals.filter((s) => s.source === 'instagram' || s.source === 'meta').length;
    channels.push({
      channel: 'instagram', platform_id: null, first_seen_at: null,
      last_activity_at: signals[0]?.updated_at || null,
      interactions: igInteractions,
      note: `${igInteractions} brand signal${igInteractions === 1 ? '' : 's'}`,
    });
  }
  if (customer.email) {
    channels.push({
      channel: 'email', platform_id: customer.email, first_seen_at: null,
      last_activity_at: null, interactions: 0,
      note: 'On file — no campaigns sent yet',
    });
  }
  // Ensure at least one channel is shown
  if (channels.length === 0) {
    channels.push({
      channel: 'manual', platform_id: null, first_seen_at: customer.created_at,
      last_activity_at: customer.updated_at, interactions: 0,
      note: 'Created manually',
    });
  }

  // ─── Top SKUs ────────────────────────────────────────────────────────
  const skuBuckets = new Map<string, { title: string; qty: number; revenue: number; last: string }>();
  for (const order of customerOrders) {
    for (const line of order.lines) {
      const bucket = skuBuckets.get(line.sku) || { title: line.title, qty: 0, revenue: 0, last: order.created_at };
      bucket.qty += line.qty;
      bucket.revenue += line.qty * line.price_aed;
      bucket.last = pickLatest(bucket.last, order.created_at) || bucket.last;
      skuBuckets.set(line.sku, bucket);
    }
  }
  const topSkus: TopSku[] = Array.from(skuBuckets.entries())
    .map(([sku, v]) => ({ sku, title: v.title, qty: v.qty, revenue_aed: v.revenue, last_at: v.last }))
    .sort((a, b) => b.revenue_aed - a.revenue_aed)
    .slice(0, 6);

  // ─── Metrics ─────────────────────────────────────────────────────────
  const paidOrders = customerOrders.filter((o) => o.status === 'paid' || o.status === 'fulfilled');
  const refundCount = customerOrders.filter((o) => o.status === 'refunded').length;
  const cod = customerOrders.filter((o) => o.payment_method === 'cod').length;
  const bnpl = customerOrders.filter((o) => o.payment_method === 'tamara' || o.payment_method === 'tabby').length;
  const card_count = customerOrders.filter((o) => o.payment_method === 'card' || o.payment_method === 'apple_pay').length;
  const bank_count = customerOrders.filter((o) => o.payment_method === 'bank_transfer').length;
  const lastOrderAt = customerOrders[0]?.created_at || customer.last_order_at;
  const happinessAvg = customerConvs.length ? Number((customerConvs.reduce((s, c) => s + c.vibes.happiness_level, 0) / customerConvs.length).toFixed(1)) : null;
  const upsell = customerOrders.filter((o) => o.lines.length > 1).length;
  const objections = signals.filter((s) => s.kind === 'objection').length;
  const ghost_sessions = card?.ghost?.sessions || 0;
  const message_count = customerConvs.reduce((s, c) => s + c.messages.length, 0);
  const outgoing_count = customerConvs.reduce((s, c) => s + (state.whatsapp_presence[c.id]?.outgoing.length || 0), 0);
  let firstSeen: string | null = customer.created_at;
  for (const c of customerConvs) firstSeen = pickEarliest(firstSeen, toIsoFromConvTime(c, c.messages[0]?.at || c.last_at));
  let lastTouch: string | null = pickLatest(customer.updated_at, lastOrderAt);
  for (const c of customerConvs) lastTouch = pickLatest(lastTouch, toIsoFromConvTime(c, c.last_at));

  const metrics: ProfileMetrics = {
    ltv_aed: customer.ltv_aed,
    orders_count: customerOrders.length,
    paid_orders: paidOrders.length,
    refund_count: refundCount,
    aov_aed: paidOrders.length ? Math.round(paidOrders.reduce((s, o) => s + o.total_aed, 0) / paidOrders.length) : 0,
    cod_count: cod, bnpl_count: bnpl, card_count, bank_transfer_count: bank_count,
    first_seen_at: firstSeen,
    last_touch_at: lastTouch,
    days_since_last_order: daysBetween(lastOrderAt),
    days_since_last_contact: daysBetween(lastTouch),
    happiness_avg: happinessAvg,
    upsell_orders: upsell,
    objection_count: objections,
    ghost_sessions,
    message_count,
    agent_outgoing_count: outgoing_count,
    top_skus: topSkus,
  };

  // ─── Warnings ────────────────────────────────────────────────────────
  const warnings: Warning[] = (card?.warnings || []).map((w) => ({ type: w.type, severity: w.severity, note: w.note }));
  for (const flag of customer.finance_flags) warnings.push({ type: 'finance_flag', severity: flag.includes('refund') ? 'bad' : 'warn', note: flag });
  if (refundCount > 1) warnings.push({ type: 'repeat_refund', severity: 'bad', note: `${refundCount} refunds on record` });
  if (signals.some((s) => s.tone === 'negative')) warnings.push({ type: 'negative_signal', severity: 'warn', note: 'Negative brand signal tied to this customer' });

  // ─── Consent ─────────────────────────────────────────────────────────
  const consent: Consent = {
    marketing: customer.marketing_consent,
    whatsapp_promotional: customer.marketing_consent,
    last_change: customer.updated_at,
    source: customer.source === 'whatsapp' ? 'agent' : 'system',
  };

  // ─── Segments ────────────────────────────────────────────────────────
  const segments: string[] = [];
  if (customer.vip) segments.push('VIP');
  if (customer.orders_count >= 3) segments.push('Repeat');
  if (customer.orders_count === 0) segments.push('Lead');
  if (refundCount > 1) segments.push('At risk');
  if (customer.country === 'SA') segments.push('KSA');
  if (customer.country === 'AE') segments.push('UAE');
  if (customer.tags.includes('bridal')) segments.push('Bridal');
  if (customer.tags.includes('gift')) segments.push('Gift');
  if (wallet.available_aed > 0) segments.push('Wallet');
  if (ghost_sessions >= 5) segments.push('Ghost watcher');
  if (signals.some((s) => s.kind === 'objection')) segments.push('Objection');

  // ─── Timeline ────────────────────────────────────────────────────────
  const timeline: TimelineEvent[] = [];
  for (const order of customerOrders) {
    timeline.push({
      at: order.created_at, channel: order.target_store, action: 'order_created',
      detail: `${order.lines.length} lines · ${order.target_store === 'shopify' ? 'omniastores.ae' : 'omniastores.com'} · AED ${order.total_aed.toLocaleString()}`,
      ref_kind: 'order', ref_id: order.id,
    });
    for (const note of order.notes.slice(0, 2)) {
      timeline.push({
        at: order.updated_at, channel: 'house', action: 'order_note',
        detail: note, ref_kind: 'order', ref_id: order.id,
      });
    }
  }
  for (const e of walletEntries) {
    timeline.push({
      at: e.created_at, channel: 'house', action: `wallet_${e.type}`,
      detail: `${e.amount_aed} AED · ${e.reason}`, ref_kind: 'wallet', ref_id: e.id,
    });
  }
  for (const f of followups) {
    timeline.push({
      at: f.created_at, channel: f.channel === 'whatsapp' ? 'whatsapp' : f.channel as ChannelKey,
      action: 'followup_created', detail: f.reason, ref_kind: 'followup', ref_id: f.id,
    });
  }
  for (const r of retargeting) {
    timeline.push({
      at: r.created_at, channel: r.channel === 'whatsapp' ? 'whatsapp' : r.channel === 'meta' ? 'meta_ads' : r.channel as ChannelKey,
      action: 'retargeting_added', detail: `${r.audience} · ${r.reason}`, ref_kind: 'retargeting', ref_id: r.id,
    });
  }
  for (const s of signals) {
    timeline.push({
      at: s.created_at, channel: s.source === 'instagram' ? 'instagram' : s.source === 'meta' ? 'meta_ads' : s.source === 'website' ? 'website' : (s.source as ChannelKey),
      action: `signal_${s.kind}`, detail: s.summary, ref_kind: 'signal', ref_id: s.id,
    });
  }
  for (const c of customerConvs) {
    const presence = state.whatsapp_presence[c.id];
    timeline.push({
      at: toIsoFromConvTime(c, c.last_at), channel: 'whatsapp', action: 'conversation_activity',
      detail: `${c.messages.length} messages · ${c.status}${presence?.claimed_by_name ? ` · owned by ${presence.claimed_by_name}` : ''}`,
      ref_kind: 'conversation', ref_id: c.id,
    });
    for (const out of presence?.outgoing || []) {
      timeline.push({
        at: out.at, channel: 'whatsapp', action: 'outgoing_message',
        detail: `${out.sent_by_name}: ${out.body.slice(0, 80)}${out.body.length > 80 ? '…' : ''}`,
        ref_kind: 'conversation', ref_id: c.id,
      });
    }
    for (const tr of presence?.transcriptions || []) {
      timeline.push({
        at: tr.created_at, channel: 'whatsapp', action: 'voice_transcribed',
        detail: tr.summary, ref_kind: 'conversation', ref_id: c.id,
      });
    }
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // ─── Notes (placeholder) ─────────────────────────────────────────────
  const notes: { at: string; author: string; body: string }[] = [];
  if (customer.tags.includes('gift')) notes.push({ at: customer.updated_at, author: 'Abdelrahman', body: 'Prefers gift wrap on every order.' });
  if (customer.vip) notes.push({ at: customer.updated_at, author: 'Mahmoud', body: 'VIP — direct line for any escalation.' });

  return {
    generated_at: new Date().toISOString(),
    customer,
    identity: {
      phone: customer.phone,
      whatsapp: customer.whatsapp_number || null,
      email: customer.email,
      shopify_id: customer.platform_ids.shopify || null,
      woocommerce_id: customer.platform_ids.woocommerce || null,
      instagram_handle: null,
      aliases: customer.tags.includes('repeat') ? [] : [],
    },
    channels,
    orders,
    wallet,
    followups,
    retargeting,
    signals,
    help_requests: helpRequests,
    ghost: card?.ghost || null,
    conversations: conversationSummaries,
    timeline: timeline.slice(0, 100),
    metrics,
    warnings,
    consent,
    segments,
    notes,
  };
}

// ─── Search ───────────────────────────────────────────────────────────────

export type CustomerSearchHit = {
  customer_id: string;
  name: string;
  phone: string;
  email: string | null;
  country: string;
  language: string;
  orders_count: number;
  ltv_aed: number;
  vip: boolean;
  tags: string[];
  last_order_at: string | null;
  source: string;
  match_score: number;
};

export function searchCustomers(state: OperationsState, query: string, limit = 25): CustomerSearchHit[] {
  const q = query.trim().toLowerCase();
  const cleanedQ = cleanPhone(query);
  const hits = state.customers.map((c): CustomerSearchHit => {
    let score = 0;
    if (q) {
      if (c.name.toLowerCase().includes(q)) score += 3;
      if (c.phone.toLowerCase().includes(q) || cleanPhone(c.phone).includes(cleanedQ)) score += 4;
      if (c.email && c.email.toLowerCase().includes(q)) score += 3;
      if (c.tags.some((t) => t.toLowerCase().includes(q))) score += 1;
      if (c.country.toLowerCase().includes(q) || c.language.toLowerCase().includes(q)) score += 1;
    } else {
      // No query: score by LTV
      score = c.ltv_aed / 1000;
    }
    return {
      customer_id: c.id, name: c.name, phone: c.phone, email: c.email,
      country: c.country, language: c.language,
      orders_count: c.orders_count, ltv_aed: c.ltv_aed,
      vip: c.vip, tags: c.tags, last_order_at: c.last_order_at,
      source: c.source, match_score: score,
    };
  });
  return hits
    .filter((h) => (q ? h.match_score > 0 : true))
    .sort((a, b) => b.match_score - a.match_score || b.ltv_aed - a.ltv_aed)
    .slice(0, limit);
}
