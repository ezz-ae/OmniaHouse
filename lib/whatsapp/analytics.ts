import type { Conversation, Message } from './types';
import type { OperationsState, ConversationPresence, OrderSubmission } from '@/lib/operations/store';

export type Tone = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'zinc';

export type AnalyticsMetric = { label: string; value: string; sub?: string; tone: Tone };

export type TeamRow = {
  team_member_id: string;
  name: string;
  presence: 'online' | 'away' | 'offline';
  outgoing: number;
  claimed: number;
  closed_today: number;
  avg_first_response_seconds: number | null;
  unresolved: number;
};

export type PipelineRow = { stage: string; count: number; value_aed: number };

export type MediaRow = { kind: 'image' | 'pdf' | 'audio'; count: number; verified: number; unverified: number };

export type PaymentLinkRow = { provider: 'tamara' | 'tabby' | 'bank' | 'shopify_invoice'; sent: number; paid: number; expired: number };

export type WhatsAppAnalytics = {
  generated_at: string;
  top_metrics: AnalyticsMetric[];
  happiness: { avg: number; tier: 'happy' | 'mixed' | 'unhappy'; per_chat: { conversation_id: string; phone: string; level: number; tone: Tone }[] };
  segments: { new: number; returning: number; vip: number; at_risk: number };
  team: TeamRow[];
  response_rate: { total: number; replied_within_5m: number; replied_within_15m: number; never_replied: number; pct_5m: number; pct_15m: number };
  unresolved: { conversation_id: string; phone: string; customer_id: string | null; minutes_idle: number; reason: string }[];
  upsell: { total_orders: number; multi_line_orders: number; pct: number; avg_lines: number; revenue_aed: number };
  payment_links: PaymentLinkRow[];
  pipeline: PipelineRow[];
  submitted_orders: { id: string; customer: string; total_aed: number; status: string; target: string; assignee: string }[];
  received_media: MediaRow[];
  numbers: {
    revenue_paid_aed: number; revenue_pipeline_aed: number; aov_aed: number; messages_today: number;
    outgoing_today: number; unread: number; unclaimed: number; claimed: number; transcripts: number;
  };
};

const TARGET_RESPONSE_5M = 5 * 60 * 1000;
const TARGET_RESPONSE_15M = 15 * 60 * 1000;

function happinessTier(avg: number): 'happy' | 'mixed' | 'unhappy' {
  if (avg >= 7) return 'happy';
  if (avg >= 5) return 'mixed';
  return 'unhappy';
}

function toneForHappiness(level: number): Tone {
  if (level >= 8) return 'emerald';
  if (level >= 6) return 'sky';
  if (level >= 4) return 'amber';
  return 'rose';
}

function lastCustomerMessage(conv: Conversation): Message | null {
  return [...conv.messages].reverse().find((m) => m.from === 'customer') || null;
}

function lastAgentMessage(conv: Conversation, presence: ConversationPresence | null): { at: string | null } {
  const fromMessages = [...conv.messages].reverse().find((m) => m.from === 'agent');
  const fromPresence = presence?.outgoing?.[presence.outgoing.length - 1];
  const presenceAt = fromPresence?.at || presence?.last_agent_reply_at || null;
  // Pick the freshest (presence is ISO, conv.messages are HH:MM only — assume today)
  if (presenceAt) return { at: presenceAt };
  return { at: fromMessages ? `today ${fromMessages.at}` : null };
}

function parseTime(at: string | null): number | null {
  if (!at) return null;
  if (at.startsWith('today ')) {
    const hhmm = at.slice(6);
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }
  const t = new Date(at).getTime();
  return Number.isFinite(t) ? t : null;
}

function paymentLinkProvider(text: string): 'tamara' | 'tabby' | 'bank' | 'shopify_invoice' | null {
  const lower = text.toLowerCase();
  if (lower.includes('tamara')) return 'tamara';
  if (lower.includes('tabby')) return 'tabby';
  if (lower.includes('iban') || lower.includes('bank transfer')) return 'bank';
  if (lower.includes('invoice') || lower.includes('checkout.shopify')) return 'shopify_invoice';
  return null;
}

export function buildWhatsAppAnalytics(state: OperationsState, conversations: Conversation[]): WhatsAppAnalytics {
  const presenceMap = state.whatsapp_presence;
  const orders = state.orders;
  const customers = state.customers;

  // ─── Happiness ─────────────────────────────────────────────────────────
  const happinessPerChat = conversations.map((c) => ({
    conversation_id: c.id, phone: c.phone,
    level: c.vibes.happiness_level,
    tone: toneForHappiness(c.vibes.happiness_level),
  }));
  const avgHappiness = conversations.length ? Number((conversations.reduce((s, c) => s + c.vibes.happiness_level, 0) / conversations.length).toFixed(1)) : 0;

  // ─── Segments ──────────────────────────────────────────────────────────
  let segNew = 0, segReturning = 0, segVip = 0, segAtRisk = 0;
  for (const c of conversations) {
    const customer = c.customer_id ? customers.find((cu) => cu.id === c.customer_id || cu.platform_ids.whatsapp === c.id) : null;
    if (!customer) segNew += 1;
    else {
      if (customer.vip) segVip += 1;
      if (customer.orders_count > 0) segReturning += 1;
      if (customer.finance_flags.length > 0 || c.vibes.fraud_risk === 'high') segAtRisk += 1;
    }
  }

  // ─── Team performance ──────────────────────────────────────────────────
  const team = state.team.map((m): TeamRow => {
    const claimedConvs = Object.values(presenceMap).filter((p) => p.claimed_by_id === m.id);
    const outgoing = Object.values(presenceMap).reduce((s, p) => s + p.outgoing.filter((o) => o.sent_by_id === m.id).length, 0);
    const responses = Object.values(presenceMap).filter((p) => p.claimed_by_id === m.id && p.first_response_seconds !== null).map((p) => p.first_response_seconds!);
    const avg = responses.length ? Math.round(responses.reduce((s, x) => s + x, 0) / responses.length) : null;
    const unresolved = claimedConvs.filter((p) => p.unresolved).length;
    return {
      team_member_id: m.id, name: m.name, presence: m.status,
      outgoing, claimed: claimedConvs.length, closed_today: m.closed_today,
      avg_first_response_seconds: avg, unresolved,
    };
  }).sort((a, b) => b.outgoing - a.outgoing);

  // ─── Response rate ─────────────────────────────────────────────────────
  let within5m = 0, within15m = 0, neverReplied = 0;
  for (const conv of conversations) {
    const presence = presenceMap[conv.id] || null;
    const lastCustomer = lastCustomerMessage(conv);
    if (!lastCustomer) continue;
    const lastCustomerTs = parseTime(`today ${lastCustomer.at}`);
    const lastAgentTs = parseTime(lastAgentMessage(conv, presence).at);
    if (!lastCustomerTs || !lastAgentTs) {
      neverReplied += 1;
      continue;
    }
    const diff = lastAgentTs - lastCustomerTs;
    if (diff < 0) {
      // customer wrote after agent — count as reply happened (we replied to a prior one)
      within5m += 1; within15m += 1;
      continue;
    }
    if (diff <= TARGET_RESPONSE_5M) within5m += 1;
    if (diff <= TARGET_RESPONSE_15M) within15m += 1;
  }
  const total = conversations.length;
  const responseRate = {
    total, replied_within_5m: within5m, replied_within_15m: within15m, never_replied: neverReplied,
    pct_5m: total ? Math.round((within5m / total) * 100) : 0,
    pct_15m: total ? Math.round((within15m / total) * 100) : 0,
  };

  // ─── Unresolved ────────────────────────────────────────────────────────
  const unresolved: WhatsAppAnalytics['unresolved'] = [];
  for (const conv of conversations) {
    const presence = presenceMap[conv.id] || null;
    const lastCustomer = lastCustomerMessage(conv);
    if (!lastCustomer) continue;
    const presenceUnresolved = presence?.unresolved ?? (conv.status === 'unclaimed' || conv.status === 'awaiting_customer' || conv.vibes.fraud_risk === 'high');
    if (!presenceUnresolved) continue;
    const lastTs = parseTime(`today ${lastCustomer.at}`);
    const minutesIdle = lastTs ? Math.round((Date.now() - lastTs) / 60000) : 0;
    let reason = 'Awaiting reply';
    if (conv.status === 'unclaimed') reason = 'Unclaimed conversation';
    else if (conv.vibes.fraud_risk === 'high') reason = 'Fraud risk — manager hold';
    else if (conv.vibes.seniority_needed === 'manager') reason = 'Manager needed';
    else if (conv.status === 'awaiting_customer') reason = 'Waiting on customer';
    unresolved.push({
      conversation_id: conv.id, phone: conv.phone,
      customer_id: conv.customer_id, minutes_idle: minutesIdle, reason,
    });
  }
  unresolved.sort((a, b) => b.minutes_idle - a.minutes_idle);

  // ─── Upsell ────────────────────────────────────────────────────────────
  const whatsappOrders = orders.filter((o) => o.source === 'whatsapp');
  const multiLine = whatsappOrders.filter((o) => o.lines.length > 1);
  const avgLines = whatsappOrders.length ? Number((whatsappOrders.reduce((s, o) => s + o.lines.length, 0) / whatsappOrders.length).toFixed(2)) : 0;
  const upsell = {
    total_orders: whatsappOrders.length,
    multi_line_orders: multiLine.length,
    pct: whatsappOrders.length ? Math.round((multiLine.length / whatsappOrders.length) * 100) : 0,
    avg_lines: avgLines,
    revenue_aed: whatsappOrders.reduce((s, o) => s + o.total_aed, 0),
  };

  // ─── Payment links ─────────────────────────────────────────────────────
  const linkBuckets: Record<string, { sent: number; paid: number; expired: number }> = {
    tamara: { sent: 0, paid: 0, expired: 0 },
    tabby: { sent: 0, paid: 0, expired: 0 },
    bank: { sent: 0, paid: 0, expired: 0 },
    shopify_invoice: { sent: 0, paid: 0, expired: 0 },
  };
  for (const presence of Object.values(presenceMap)) {
    for (const o of presence.outgoing) {
      if (!o.payment_link) continue;
      const provider = paymentLinkProvider(o.body) || 'bank';
      linkBuckets[provider].sent += 1;
    }
  }
  for (const order of orders) {
    if (order.payment_method === 'tamara' || order.payment_method === 'tabby') {
      const bucket = linkBuckets[order.payment_method];
      if (order.payment_status === 'confirmed') bucket.paid += 1;
      else if (order.payment_status === 'rejected') bucket.expired += 1;
    } else if (order.payment_method === 'bank_transfer') {
      const bucket = linkBuckets.bank;
      if (order.payment_status === 'confirmed') bucket.paid += 1;
    }
  }
  const paymentLinks: PaymentLinkRow[] = (Object.keys(linkBuckets) as (keyof typeof linkBuckets)[]).map((provider) => ({
    provider: provider as PaymentLinkRow['provider'],
    sent: linkBuckets[provider].sent,
    paid: linkBuckets[provider].paid,
    expired: linkBuckets[provider].expired,
  }));

  // ─── Pipeline ──────────────────────────────────────────────────────────
  const stages: Record<string, { count: number; value_aed: number }> = {
    'extracted (chat → draft)': { count: 0, value_aed: 0 },
    'manager review': { count: 0, value_aed: 0 },
    'payment pending': { count: 0, value_aed: 0 },
    'paid': { count: 0, value_aed: 0 },
    'fulfilled': { count: 0, value_aed: 0 },
    'refunded': { count: 0, value_aed: 0 },
  };
  for (const order of orders) {
    if (order.status === 'draft') { stages['extracted (chat → draft)'].count += 1; stages['extracted (chat → draft)'].value_aed += order.total_aed; }
    if (order.flags.includes('manager_needed') || order.flags.includes('discount_over_threshold')) { stages['manager review'].count += 1; stages['manager review'].value_aed += order.total_aed; }
    if (order.status === 'payment_pending') { stages['payment pending'].count += 1; stages['payment pending'].value_aed += order.total_aed; }
    if (order.status === 'paid') { stages.paid.count += 1; stages.paid.value_aed += order.total_aed; }
    if (order.status === 'fulfilled') { stages.fulfilled.count += 1; stages.fulfilled.value_aed += order.total_aed; }
    if (order.status === 'refunded') { stages.refunded.count += 1; stages.refunded.value_aed += order.total_aed; }
  }
  const pipeline: PipelineRow[] = Object.entries(stages).map(([stage, v]) => ({ stage, count: v.count, value_aed: v.value_aed }));

  // ─── Submitted orders ──────────────────────────────────────────────────
  const submitted = orders
    .filter((o) => o.source === 'whatsapp')
    .map((o): WhatsAppAnalytics['submitted_orders'][number] => {
      const customer = customers.find((c) => c.id === o.customer_id);
      const assignee = state.team.find((m) => m.id === o.assignee);
      return {
        id: o.id, customer: customer?.name || o.customer_phone,
        total_aed: o.total_aed, status: o.status,
        target: o.target_store, assignee: assignee?.name || 'unassigned',
      };
    })
    .slice(0, 30);

  // ─── Received media ────────────────────────────────────────────────────
  const mediaBuckets: Record<'image' | 'pdf' | 'audio', { count: number; verified: number; unverified: number }> = {
    image: { count: 0, verified: 0, unverified: 0 },
    pdf:   { count: 0, verified: 0, unverified: 0 },
    audio: { count: 0, verified: 0, unverified: 0 },
  };
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (!msg.media) continue;
      const bucket = mediaBuckets[msg.media.kind];
      bucket.count += 1;
      if (msg.media.verified) bucket.verified += 1;
      else bucket.unverified += 1;
    }
  }
  const receivedMedia: MediaRow[] = (Object.keys(mediaBuckets) as Array<'image' | 'pdf' | 'audio'>).map((kind) => ({ kind, ...mediaBuckets[kind] }));

  // ─── Numbers ───────────────────────────────────────────────────────────
  const messagesToday = conversations.reduce((s, c) => s + c.messages.length, 0);
  const outgoingToday = Object.values(presenceMap).reduce((s, p) => s + p.outgoing.length, 0);
  const unread = conversations.reduce((s, c) => s + c.unread, 0);
  const claimedCount = Object.values(presenceMap).filter((p) => p.claimed_by_id).length;
  const unclaimedCount = conversations.length - claimedCount;
  const revenuePaid = orders.filter((o) => o.status === 'paid' || o.status === 'fulfilled').reduce((s, o) => s + o.total_aed, 0);
  const revenuePipeline = orders.filter((o) => o.status === 'draft' || o.status === 'payment_pending').reduce((s, o) => s + o.total_aed, 0);
  const paidOrders = orders.filter((o) => o.status === 'paid' || o.status === 'fulfilled').length;
  const aov = paidOrders ? Math.round(revenuePaid / paidOrders) : 0;
  const transcripts = Object.values(presenceMap).reduce((s, p) => s + p.transcriptions.length, 0);

  // ─── Top metrics ───────────────────────────────────────────────────────
  const topMetrics: AnalyticsMetric[] = [
    { label: 'Open chats', value: String(conversations.length), sub: `${unclaimedCount} unclaimed · ${claimedCount} claimed`, tone: 'sky' },
    { label: 'Happiness avg', value: `${avgHappiness}/10`, sub: happinessTier(avgHappiness), tone: avgHappiness >= 7 ? 'emerald' : avgHappiness >= 5 ? 'amber' : 'rose' },
    { label: 'Response rate ≤5m', value: `${responseRate.pct_5m}%`, sub: `${within5m} of ${total}`, tone: responseRate.pct_5m >= 70 ? 'emerald' : responseRate.pct_5m >= 40 ? 'amber' : 'rose' },
    { label: 'Unresolved', value: String(unresolved.length), sub: `${unresolved.filter((u) => u.minutes_idle > 60).length} > 1h idle`, tone: unresolved.length === 0 ? 'emerald' : 'rose' },
    { label: 'Submitted orders', value: String(submitted.length), sub: `AED ${revenuePipeline.toLocaleString()} in flight`, tone: 'amber' },
    { label: 'Revenue paid', value: `AED ${revenuePaid.toLocaleString()}`, sub: `${paidOrders} orders · AOV AED ${aov.toLocaleString()}`, tone: 'emerald' },
    { label: 'Upsell rate', value: `${upsell.pct}%`, sub: `${upsell.multi_line_orders} multi-line / ${upsell.total_orders}`, tone: upsell.pct >= 25 ? 'emerald' : 'amber' },
    { label: 'Returning customers', value: String(segReturning), sub: `${segVip} VIP · ${segAtRisk} at risk`, tone: 'sky' },
    { label: 'Payment links sent', value: String(paymentLinks.reduce((s, r) => s + r.sent, 0)), sub: `${paymentLinks.reduce((s, r) => s + r.paid, 0)} paid`, tone: 'violet' },
    { label: 'Received media', value: String(receivedMedia.reduce((s, r) => s + r.count, 0)), sub: `${mediaBuckets.image.count} image · ${mediaBuckets.pdf.count} pdf · ${mediaBuckets.audio.count} voice`, tone: 'sky' },
    { label: 'Voice transcripts', value: String(transcripts), sub: 'AI-summarized voice notes', tone: 'violet' },
    { label: 'Messages today', value: String(messagesToday), sub: `${unread} unread · ${outgoingToday} sent`, tone: 'zinc' },
  ];

  return {
    generated_at: new Date().toISOString(),
    top_metrics: topMetrics,
    happiness: { avg: avgHappiness, tier: happinessTier(avgHappiness), per_chat: happinessPerChat },
    segments: { new: segNew, returning: segReturning, vip: segVip, at_risk: segAtRisk },
    team,
    response_rate: responseRate,
    unresolved,
    upsell,
    payment_links: paymentLinks,
    pipeline,
    submitted_orders: submitted,
    received_media: receivedMedia,
    numbers: {
      revenue_paid_aed: revenuePaid,
      revenue_pipeline_aed: revenuePipeline,
      aov_aed: aov,
      messages_today: messagesToday,
      outgoing_today: outgoingToday,
      unread, unclaimed: unclaimedCount, claimed: claimedCount,
      transcripts,
    },
  };
}
