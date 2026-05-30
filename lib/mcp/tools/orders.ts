// MCP tools · orders domain.

import { listOrdersLive, getOrderLive } from '@/lib/orders/queries';

export async function find_orders(args: { status?: string; phone?: string; customer_id?: string; limit?: number }) {
  const rows = await listOrdersLive({
    status: args.status,
    phone: args.phone,
    customer_id: args.customer_id,
    limit: args.limit ?? 25,
  });
  if (!rows) return { ok: false, reason: 'orders_unavailable' };
  return {
    ok: true,
    matched: rows.length,
    orders: rows.map((o) => ({
      id: o.id,
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      total_aed: o.total_aed,
      country: o.country,
      target_store: o.target_store,
      flags: o.flags,
      customer_name: o.customer_name,
      phone: o.phone,
      created_at: o.created_at,
      due_at: o.due_at,
      item_count: Array.isArray(o.items) ? o.items.length : 0,
    })),
  };
}

export async function get_order(args: { order_id: string }) {
  const o = await getOrderLive(args.order_id);
  if (!o) return { ok: false, reason: 'not_found' };
  return {
    ok: true,
    id: o.id,
    status: o.status,
    payment_status: o.payment_status,
    payment_method: o.payment_method,
    total_aed: o.total_aed,
    target_store: o.target_store,
    country: o.country,
    flags: o.flags,
    notes: o.notes,
    items: o.items,
    customer_name: o.customer_name,
    phone: o.phone,
    customer_id: o.customer_id,
    shopify_draft_id: o.shopify_draft_id,
    woocommerce_order_id: o.woocommerce_order_id,
    created_at: o.created_at,
    updated_at: o.updated_at,
  };
}

export async function orders_today_summary() {
  const rows = await listOrdersLive({ limit: 500 });
  if (!rows) return { ok: false, reason: 'orders_unavailable' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = today.toISOString();
  const recent = rows.filter((o) => o.created_at >= cutoff);
  const blocking = new Set(['manager_needed', 'discount_over_threshold', 'finance_hold', 'payment_proof_pending', 'ring_no_size', 'address_incomplete']);
  return {
    ok: true,
    total_today: recent.length,
    revenue_today_aed: Math.round(recent.reduce((s, o) => s + (o.total_aed || 0), 0)),
    by_status: recent.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}),
    blocked: recent.filter((o) => (o.flags || []).some((f) => blocking.has(f))).map((o) => ({
      id: o.id,
      flags: o.flags,
      total_aed: o.total_aed,
      customer_name: o.customer_name,
    })),
  };
}
