// CRM customers · Supabase read + write path (slice 2).
//
// The legacy operations-store (.data/operations-store.json or /tmp on
// Vercel) stays in the loop because it powers other rooms (orders, signals,
// wallet, follow-ups) that haven't been moved to Postgres yet. Every
// helper here is therefore additive: Supabase is the system of record for
// the customer row itself; the operations store is the side index for the
// related entities until those slices land.

import { createServiceClient } from '@/lib/supabase/server';
import { resolveOrgId } from '@/lib/whatsapp/persistence';

export type CustomerRow = {
  id: string;
  org_id: string;
  phone: string;
  whatsapp_number: string | null;
  email: string | null;
  shopify_customer_id: string | null;
  woocommerce_customer_id: string | null;
  whatsapp_wa_id: string | null;
  instagram_handle: string | null;
  name: string | null;
  country: string | null;
  language: string;
  city: string | null;
  source: string;
  customer_type: string;
  vip: boolean;
  marketing_consent: boolean;
  whatsapp_promo_consent: boolean;
  tags: string[];
  finance_flags: string[];
  ltv_aed: number;
  orders_count: number;
  last_order_at: string | null;
  first_seen_at: string | null;
  last_touch_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isCustomersLiveAvailable(): boolean {
  if (!resolveOrgId()) return false;
  return !!createServiceClient();
}

function cleanPhone(phone: string) {
  return phone ? phone.replace(/[^\d+]/g, '').replace(/^00/, '+') : '';
}

// ─── Read ─────────────────────────────────────────────────────────────────

export async function getCustomerLive(idOrPhone: string): Promise<CustomerRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const cleaned = cleanPhone(idOrPhone);
  // First, treat as UUID id.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrPhone)) {
    const { data } = await client
      .from('customers')
      .select('*')
      .eq('org_id', orgId)
      .eq('id', idOrPhone)
      .maybeSingle();
    if (data) return data as CustomerRow;
  }

  // Then phone (cleaned or as-given), then email.
  const { data: byPhone } = await client
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .eq('phone', cleaned || idOrPhone)
    .maybeSingle();
  if (byPhone) return byPhone as CustomerRow;

  if (idOrPhone.includes('@')) {
    const { data: byEmail } = await client
      .from('customers')
      .select('*')
      .eq('org_id', orgId)
      .ilike('email', idOrPhone)
      .maybeSingle();
    if (byEmail) return byEmail as CustomerRow;
  }

  return null;
}

export type CustomerSearchHit = Pick<
  CustomerRow,
  'id' | 'phone' | 'name' | 'email' | 'country' | 'language' | 'orders_count' | 'ltv_aed' | 'vip' | 'tags' | 'last_order_at' | 'source'
> & { match_score: number };

export async function searchCustomersLive(query: string, limit = 25): Promise<CustomerSearchHit[] | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const q = query.trim();
  const cleaned = cleanPhone(q);
  const cap = Math.min(limit, 100);

  let builder = client
    .from('customers')
    .select('id, phone, name, email, country, language, orders_count, ltv_aed, vip, tags, last_order_at, source')
    .eq('org_id', orgId)
    .limit(cap);

  if (q) {
    // Match name (ilike), email (ilike), phone (eq cleaned), tags (contains).
    const filters: string[] = [];
    filters.push(`name.ilike.%${q}%`);
    if (q.includes('@')) filters.push(`email.ilike.%${q}%`);
    if (cleaned) filters.push(`phone.eq.${cleaned}`);
    builder = builder.or(filters.join(','));
  } else {
    builder = builder.order('ltv_aed', { ascending: false });
  }

  const { data, error } = await builder;
  if (error || !data) return null;

  // Score (mirror the in-memory ranker so the UI's sort order doesn't drift).
  return data.map((row): CustomerSearchHit => {
    let score = 0;
    if (q) {
      if (row.name?.toLowerCase().includes(q.toLowerCase())) score += 3;
      if (cleanPhone(row.phone) === cleaned && cleaned) score += 4;
      if (row.email?.toLowerCase() === q.toLowerCase()) score += 3;
      if (row.tags?.some((t: string) => t.toLowerCase().includes(q.toLowerCase()))) score += 1;
    } else {
      score = Number(row.ltv_aed) / 1000;
    }
    return { ...row, ltv_aed: Number(row.ltv_aed), match_score: score } as CustomerSearchHit;
  }).sort((a, b) => b.match_score - a.match_score || (b.ltv_aed - a.ltv_aed));
}

// ─── Write ────────────────────────────────────────────────────────────────

export type UpsertInput = {
  phone: string;
  name?: string | null;
  email?: string | null;
  country?: string | null;
  language?: string | null;
  city?: string | null;
  source?: string | null;
  customer_type?: string | null;
  whatsapp_wa_id?: string | null;
  shopify_customer_id?: string | null;
  woocommerce_customer_id?: string | null;
  vip?: boolean | null;
  marketing_consent?: boolean | null;
  whatsapp_promo_consent?: boolean | null;
  tags?: string[] | null;
  finance_flags?: string[] | null;
  created_by?: string | null;
};

export async function upsertCustomerLive(input: UpsertInput): Promise<CustomerRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const phone = cleanPhone(input.phone);
  if (!phone) return null;

  // Existing? Patch. Else insert.
  const { data: existing } = await client
    .from('customers')
    .select('id')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .maybeSingle();

  if (existing?.id) {
    return patchCustomerLive(existing.id, input as Partial<CustomerRow>, input.created_by ?? null);
  }

  const row = {
    org_id: orgId,
    phone,
    whatsapp_number: input.whatsapp_wa_id || phone,
    email: input.email ?? null,
    shopify_customer_id: input.shopify_customer_id ?? null,
    woocommerce_customer_id: input.woocommerce_customer_id ?? null,
    whatsapp_wa_id: input.whatsapp_wa_id ?? null,
    name: input.name ?? null,
    country: input.country ?? null,
    language: input.language || 'en',
    city: input.city ?? null,
    source: input.source || 'whatsapp',
    customer_type: input.customer_type || 'new',
    vip: input.vip ?? false,
    marketing_consent: input.marketing_consent ?? true,
    whatsapp_promo_consent: input.whatsapp_promo_consent ?? true,
    tags: input.tags ?? [],
    finance_flags: input.finance_flags ?? [],
    first_seen_at: new Date().toISOString(),
    last_touch_at: new Date().toISOString(),
    created_by: input.created_by ?? null,
  };

  const { data, error } = await client.from('customers').insert(row).select('*').single();
  if (error) {
    // ON CONFLICT race — re-fetch.
    const { data: byPhone } = await client
      .from('customers')
      .select('*')
      .eq('org_id', orgId)
      .eq('phone', phone)
      .single();
    return (byPhone as CustomerRow) || null;
  }
  return data as CustomerRow;
}

export async function patchCustomerLive(
  id: string,
  patch: Partial<CustomerRow>,
  actor?: string | null,
): Promise<CustomerRow | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const allowed: (keyof CustomerRow)[] = [
    'name', 'email', 'country', 'language', 'city', 'tags', 'finance_flags',
    'vip', 'marketing_consent', 'whatsapp_promo_consent',
    'shopify_customer_id', 'woocommerce_customer_id', 'whatsapp_wa_id', 'instagram_handle',
    'customer_type', 'source',
  ];
  const sanitized: Record<string, unknown> = { updated_by: actor || null, last_touch_at: new Date().toISOString() };
  for (const key of Object.keys(patch) as (keyof CustomerRow)[]) {
    if (!allowed.includes(key)) continue;
    sanitized[key] = patch[key] as unknown;
  }
  const { data, error } = await client
    .from('customers')
    .update(sanitized)
    .eq('org_id', orgId)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return null;
  return data as CustomerRow;
}

// ─── Bulk listing for room aggregator ────────────────────────────────────

export async function listCustomersLive(opts: { limit?: number } = {}): Promise<CustomerRow[] | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('last_touch_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(opts.limit ?? 200, 500));
  if (error || !data) return null;
  return data as CustomerRow[];
}
