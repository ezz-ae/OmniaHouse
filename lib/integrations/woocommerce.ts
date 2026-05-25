// WooCommerce REST API client — authenticated profile lookup.
// Mirrors Shopify client: returns { configured: false, ... } when keys
// are not present so the unified profile renders with operations-store
// data alone.

export type WooCommerceCustomerRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  total_spent_aed: number;
  orders_count: number;
  billing: { city: string | null; country: string | null; address_1: string | null; postcode: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WooCommerceOrderRecord = {
  id: string;
  number: string;
  status: string;
  payment_method: string;
  total_aed: number;
  created_at: string;
  line_items: { sku: string | null; title: string; qty: number; price_aed: number }[];
};

export type WooCommerceProfile = {
  configured: boolean;
  customer: WooCommerceCustomerRecord | null;
  orders: WooCommerceOrderRecord[];
  reason?: string;
};

const TIMEOUT_MS = 8_000;

export function isWooConfigured() {
  return Boolean(
    process.env.WOOCOMMERCE_CONSUMER_KEY &&
    process.env.WOOCOMMERCE_CONSUMER_SECRET &&
    process.env.WOOCOMMERCE_URL,
  );
}

function authHeader(): string {
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';
  return 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
}

async function wooFetch(path: string, params: Record<string, string> = {}): Promise<any | null> {
  if (!isWooConfigured()) return null;
  const base = (process.env.WOOCOMMERCE_URL || '').replace(/\/$/, '');
  const url = new URL(`${base}/wp-json/wc/v3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWooCommerceProfile(input: { phone?: string | null; email?: string | null; customer_id?: string | null }): Promise<WooCommerceProfile> {
  if (!isWooConfigured()) {
    return { configured: false, customer: null, orders: [], reason: 'WOOCOMMERCE_CONSUMER_KEY/SECRET/URL not set' };
  }

  let raw: any = null;
  if (input.customer_id) {
    raw = await wooFetch(`/customers/${encodeURIComponent(input.customer_id)}`);
  } else if (input.email) {
    const list = await wooFetch('/customers', { email: input.email });
    raw = Array.isArray(list) ? list[0] : null;
  } else if (input.phone) {
    // WooCommerce search by phone is awkward — use orders search as a proxy.
    const orders = await wooFetch('/orders', { search: input.phone, per_page: '5' });
    const orderWithCustomer = Array.isArray(orders) ? orders.find((o: any) => o.customer_id) : null;
    if (orderWithCustomer?.customer_id) {
      raw = await wooFetch(`/customers/${orderWithCustomer.customer_id}`);
    }
  }

  if (!raw) return { configured: true, customer: null, orders: [], reason: 'No matching customer' };

  const customer: WooCommerceCustomerRecord = {
    id: String(raw.id),
    first_name: raw.first_name ?? null,
    last_name: raw.last_name ?? null,
    email: raw.email ?? null,
    phone: raw.billing?.phone || null,
    total_spent_aed: Number(raw.total_spent || 0),
    orders_count: Number(raw.orders_count || 0),
    billing: raw.billing ? {
      city: raw.billing.city ?? null, country: raw.billing.country ?? null,
      address_1: raw.billing.address_1 ?? null, postcode: raw.billing.postcode ?? null,
    } : null,
    created_at: raw.date_created ?? null,
    updated_at: raw.date_modified ?? null,
  };

  const ordersJson = await wooFetch('/orders', { customer: customer.id, per_page: '20' });
  const orders: WooCommerceOrderRecord[] = (Array.isArray(ordersJson) ? ordersJson : []).map((o: any): WooCommerceOrderRecord => ({
    id: String(o.id), number: o.number || String(o.id),
    status: o.status || 'unknown',
    payment_method: o.payment_method || 'unknown',
    total_aed: Number(o.total || 0),
    created_at: o.date_created,
    line_items: (o.line_items || []).map((l: any) => ({
      sku: l.sku || null, title: l.name || 'Untitled',
      qty: Number(l.quantity || 0),
      price_aed: Number(l.price || (Number(l.subtotal || 0) / Math.max(1, Number(l.quantity || 1)))),
    })),
  }));

  return { configured: true, customer, orders };
}
