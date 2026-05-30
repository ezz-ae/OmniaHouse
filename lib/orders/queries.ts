// Orders · Supabase read + write path (slice 2.5).
//
// order_submissions is the system of record. The in-memory operations
// store keeps a parallel copy until rooms that join orders to side-tables
// (signals, follow-ups, wallet) finish migrating.
//
// Every helper is org-scoped via OMNIA_ORG_ID and uses the service-role
// client because the WhatsApp Desk's outbound flow lands on /api/orders/place
// which may run without an authed Supabase session in the auth-bypass mode.

import { createServiceClient } from '@/lib/supabase/server';
import { resolveOrgId } from '@/lib/whatsapp/persistence';

export type OrderRow = {
  id: string;
  org_id: string;
  customer_id: string | null;
  phone: string;
  customer_name: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string;
  language: string;
  source: string | null;
  target_store: string | null;
  country: string | null;
  items: any;
  total_aed: number | null;
  cashback_earned_aed: number;
  cashback_applied_aed: number;
  labels: string[];
  is_archived: boolean;
  assigned_agent_id: string | null;
  flags: string[];
  metadata: any;
  shopify_draft_id: string | null;
  woocommerce_order_id: string | null;
  notes: string[];
  due_at: string | null;
  intent: string | null;
  created_at: string;
  updated_at: string;
};

export function isOrdersLiveAvailable(): boolean {
  if (!resolveOrgId()) return false;
  return !!createServiceClient();
}

function cleanPhone(phone: string) {
  return phone ? phone.replace(/[^\d+]/g, '').replace(/^00/, '+') : '';
}

// ─── Read ─────────────────────────────────────────────────────────────────

export async function listOrdersLive(opts: { limit?: number; status?: string; phone?: string; customer_id?: string } = {}): Promise<OrderRow[] | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  let q = client
    .from('order_submissions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 200, 500));
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.phone) q = q.eq('phone', cleanPhone(opts.phone));
  if (opts.customer_id) q = q.eq('customer_id', opts.customer_id);

  const { data, error } = await q;
  if (error || !data) return null;
  return (data as OrderRow[]).map(normalizeRow);
}

export async function getOrderLive(id: string): Promise<OrderRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data, error } = await client
    .from('order_submissions')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as OrderRow);
}

// ─── Write ────────────────────────────────────────────────────────────────

export type OrderLine = { sku: string; title: string; qty: number; price_aed: number };

export type CreateOrderInput = {
  customer_id?: string | null;
  phone: string;
  customer_name?: string | null;
  language?: string | null;
  source?: string | null;
  target_store?: 'shopify' | 'woocommerce' | string | null;
  country?: string | null;
  items: OrderLine[];
  total_aed?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  shipping_address?: Record<string, any> | null;
  intent?: string | null;
  flags?: string[];
  labels?: string[];
  notes?: string[];
  assigned_agent_id?: string | null;
  due_at?: string | null;
  created_by?: string | null;
  metadata?: Record<string, any> | null;
};

export async function createOrderLive(input: CreateOrderInput): Promise<OrderRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const phone = cleanPhone(input.phone);
  const total = input.total_aed ?? input.items.reduce((s, l) => s + l.qty * (l.price_aed || 0), 0);

  // Auto-flag well-known policies so the Orders room sees them right away.
  const flags = new Set<string>(input.flags || []);
  if (input.payment_method === 'cod' && total > 3000) flags.add('cod_high_value');
  if (input.items.some((l) => /ring/i.test(l.title)) && !input.metadata?.ring_size) flags.add('ring_no_size');

  const row = {
    org_id: orgId,
    customer_id: input.customer_id ?? null,
    phone,
    customer_name: input.customer_name ?? null,
    status: total > 0 ? 'payment_pending' : 'draft',
    payment_method: input.payment_method ?? null,
    payment_status: input.payment_status ?? 'unverified',
    language: input.language || 'en',
    source: input.source || 'whatsapp',
    target_store: input.target_store ?? 'shopify',
    country: input.country ?? null,
    items: input.items,
    total_aed: total,
    intent: input.intent ?? null,
    labels: input.labels ?? [],
    flags: Array.from(flags),
    notes: input.notes ?? [],
    assigned_agent_id: input.assigned_agent_id ?? null,
    due_at: input.due_at ?? null,
    metadata: { ...(input.metadata || {}), shipping_address: input.shipping_address || null, created_by: input.created_by || null },
  };

  const { data, error } = await client.from('order_submissions').insert(row).select('*').single();
  if (error || !data) return null;
  return normalizeRow(data as OrderRow);
}

export async function updateOrderStatusLive(input: { order_id: string; status: string; rationale?: string; actor?: string | null }): Promise<OrderRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data: existing } = await client
    .from('order_submissions')
    .select('notes')
    .eq('org_id', orgId).eq('id', input.order_id).maybeSingle();
  const notes = existing?.notes || [];
  if (input.rationale) notes.unshift(input.rationale);
  const { data, error } = await client
    .from('order_submissions')
    .update({ status: input.status, notes })
    .eq('org_id', orgId).eq('id', input.order_id)
    .select('*').single();
  if (error || !data) return null;
  return normalizeRow(data as OrderRow);
}

export async function flagOrderLive(input: { order_id: string; flag: string; remove?: boolean }): Promise<OrderRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data: existing } = await client
    .from('order_submissions')
    .select('flags')
    .eq('org_id', orgId).eq('id', input.order_id).maybeSingle();
  if (!existing) return null;
  const next = new Set<string>(existing.flags || []);
  if (input.remove) next.delete(input.flag); else next.add(input.flag);
  const { data, error } = await client
    .from('order_submissions')
    .update({ flags: Array.from(next) })
    .eq('org_id', orgId).eq('id', input.order_id)
    .select('*').single();
  if (error || !data) return null;
  return normalizeRow(data as OrderRow);
}

export async function escalateOrderLive(input: { order_id: string; reason: string; actor?: string | null }): Promise<OrderRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data: existing } = await client
    .from('order_submissions')
    .select('flags, notes')
    .eq('org_id', orgId).eq('id', input.order_id).maybeSingle();
  if (!existing) return null;
  const flags = new Set<string>(existing.flags || []);
  flags.add('manager_needed');
  const notes = existing.notes || [];
  notes.unshift(`Escalated: ${input.reason}`);
  const { data, error } = await client
    .from('order_submissions')
    .update({ flags: Array.from(flags), notes })
    .eq('org_id', orgId).eq('id', input.order_id)
    .select('*').single();
  if (error || !data) return null;
  return normalizeRow(data as OrderRow);
}

export async function pushOrderLive(input: { order_id: string; actor?: string | null }): Promise<OrderRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data: existing } = await client
    .from('order_submissions')
    .select('*')
    .eq('org_id', orgId).eq('id', input.order_id).maybeSingle();
  if (!existing) return null;

  const blockingFlags = ['manager_needed', 'discount_over_threshold', 'finance_hold', 'payment_proof_pending', 'ring_no_size', 'address_incomplete'];
  if ((existing.flags || []).some((f: string) => blockingFlags.includes(f))) {
    throw new Error(`Cannot push: blocking flags present — ${(existing.flags || []).join(', ')}`);
  }

  const patch: Record<string, unknown> = {};
  const notes = existing.notes || [];
  notes.unshift(`Pushed to ${existing.target_store || 'shopify'}`);
  patch.notes = notes;
  if (existing.target_store === 'shopify' && !existing.shopify_draft_id) {
    patch.shopify_draft_id = `local_draft_${Date.now()}`;
  } else if (existing.target_store === 'woocommerce' && !existing.woocommerce_order_id) {
    patch.woocommerce_order_id = `local_order_${Date.now()}`;
  }
  const { data, error } = await client
    .from('order_submissions')
    .update(patch)
    .eq('org_id', orgId).eq('id', input.order_id)
    .select('*').single();
  if (error || !data) return null;
  return normalizeRow(data as OrderRow);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalizeRow(row: OrderRow): OrderRow {
  return {
    ...row,
    total_aed: row.total_aed === null ? null : Number(row.total_aed),
    cashback_earned_aed: Number(row.cashback_earned_aed || 0),
    cashback_applied_aed: Number(row.cashback_applied_aed || 0),
    items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items || '[]') : []),
    flags: row.flags || [],
    labels: row.labels || [],
    notes: row.notes || [],
    metadata: row.metadata || {},
  };
}

// Convert a Supabase OrderRow into the operations-store OrderSubmission
// shape used by the room aggregators (so we can overlay live orders
// onto state.orders without rewriting buildOrdersRoom).
export function orderRowToOperationsShape(row: OrderRow): any {
  return {
    id: row.id,
    customer_id: row.customer_id || row.phone, // operations store keys by either
    customer_phone: row.phone,
    source: (row.source as any) || 'whatsapp',
    target_store: (row.target_store as any) || 'shopify',
    lines: row.items || [],
    total_aed: row.total_aed || 0,
    status: row.status as any,
    payment_method: row.payment_method || 'unknown',
    payment_status: (row.payment_status as any) || 'unverified',
    shipping: (row.metadata as any)?.shipping_address || {},
    platform_ids: {
      shopify_draft: row.shopify_draft_id || undefined,
      woocommerce_order: row.woocommerce_order_id || undefined,
    },
    notes: row.notes || [],
    flags: row.flags || [],
    assignee: row.assigned_agent_id,
    due: row.due_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
