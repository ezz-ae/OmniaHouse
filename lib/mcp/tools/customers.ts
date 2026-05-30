// MCP tools · customers domain.

import { searchCustomersLive, getCustomerLive, listCustomersLive } from '@/lib/customers/queries';

export async function find_customers(args: { query?: string; limit?: number }) {
  const hits = await searchCustomersLive(args.query || '', args.limit ?? 20);
  if (!hits) return { ok: false, reason: 'customers_unavailable' };
  return { ok: true, matched: hits.length, customers: hits };
}

export async function get_customer(args: { id_or_phone: string }) {
  const c = await getCustomerLive(args.id_or_phone);
  if (!c) return { ok: false, reason: 'not_found' };
  return {
    ok: true,
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    country: c.country,
    city: c.city,
    language: c.language,
    vip: c.vip,
    customer_type: c.customer_type,
    tags: c.tags,
    finance_flags: c.finance_flags,
    orders_count: c.orders_count,
    ltv_aed: Number(c.ltv_aed),
    last_order_at: c.last_order_at,
    last_touch_at: c.last_touch_at,
    source: c.source,
    consents: {
      marketing: c.marketing_consent,
      whatsapp_promo: c.whatsapp_promo_consent,
    },
    platforms: {
      shopify_customer_id: c.shopify_customer_id,
      woocommerce_customer_id: c.woocommerce_customer_id,
      whatsapp_wa_id: c.whatsapp_wa_id,
    },
  };
}

export async function get_customer_summary(args: { limit?: number }) {
  const rows = await listCustomersLive({ limit: args.limit ?? 500 });
  if (!rows) return { ok: false, reason: 'customers_unavailable' };
  const vip = rows.filter((c) => c.vip).length;
  const ksa = rows.filter((c) => (c.country || '').toLowerCase().includes('saudi')).length;
  const uae = rows.filter((c) => (c.country || '').toLowerCase().includes('emir')).length;
  const ltv_total = rows.reduce((s, c) => s + Number(c.ltv_aed || 0), 0);
  return {
    ok: true,
    total: rows.length,
    vip,
    uae,
    ksa,
    other: rows.length - uae - ksa,
    ltv_total_aed: Math.round(ltv_total),
    avg_ltv_aed: rows.length ? Math.round(ltv_total / rows.length) : 0,
  };
}
