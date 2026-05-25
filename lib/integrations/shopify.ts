// Shopify Admin API client — authenticated profile lookup.
// Falls back gracefully when SHOPIFY_ADMIN_ACCESS_TOKEN + SHOPIFY_STORE_DOMAIN
// are not configured: returns { configured: false, ... } so the unified
// profile can render with operations-store data alone.

export type ShopifyCustomerRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  total_spent_aed: number;
  orders_count: number;
  tags: string[];
  default_address: { city: string | null; country: string | null; address1: string | null; zip: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ShopifyOrderRecord = {
  id: string;
  name: string;
  status: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_aed: number;
  created_at: string;
  line_items: { sku: string | null; title: string; qty: number; price_aed: number }[];
};

export type ShopifyProfile = {
  configured: boolean;
  customer: ShopifyCustomerRecord | null;
  orders: ShopifyOrderRecord[];
  reason?: string;
};

const VERSION = '2024-10';
const TIMEOUT_MS = 8_000;

function shopifyToken() {
  return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_TOKEN || '';
}

export function isShopifyConfigured() {
  return Boolean(shopifyToken() && process.env.SHOPIFY_STORE_DOMAIN);
}

function adminBase(): string | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) return null;
  return `https://${domain}/admin/api/${VERSION}`;
}

async function adminFetch(path: string, params: Record<string, string> = {}): Promise<any | null> {
  const base = adminBase();
  if (!base) return null;
  const token = shopifyToken();
  if (!token) return null;
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
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

export async function fetchShopifyProfile(input: { phone?: string | null; email?: string | null; customer_id?: string | null }): Promise<ShopifyProfile> {
  if (!isShopifyConfigured()) {
    return { configured: false, customer: null, orders: [], reason: 'SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STORE_DOMAIN not set' };
  }

  const queryParts: string[] = [];
  if (input.phone) queryParts.push(`phone:${input.phone}`);
  if (input.email) queryParts.push(`email:${input.email}`);
  const query = queryParts.join(' OR ');

  let customerJson: any = null;
  if (input.customer_id) {
    customerJson = await adminFetch(`/customers/${encodeURIComponent(input.customer_id)}.json`);
  } else if (query) {
    customerJson = await adminFetch('/customers/search.json', { query });
  }

  const raw = customerJson?.customer || customerJson?.customers?.[0] || null;
  if (!raw) return { configured: true, customer: null, orders: [], reason: 'No matching customer' };

  const customer: ShopifyCustomerRecord = {
    id: String(raw.id),
    first_name: raw.first_name ?? null,
    last_name: raw.last_name ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    total_spent_aed: Number(raw.total_spent || 0),
    orders_count: Number(raw.orders_count || 0),
    tags: typeof raw.tags === 'string' ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    default_address: raw.default_address ? {
      city: raw.default_address.city ?? null,
      country: raw.default_address.country ?? null,
      address1: raw.default_address.address1 ?? null,
      zip: raw.default_address.zip ?? null,
    } : null,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  };

  const ordersJson = await adminFetch('/orders.json', { customer_id: customer.id, status: 'any', limit: '20' });
  const orders: ShopifyOrderRecord[] = (ordersJson?.orders || []).map((o: any): ShopifyOrderRecord => ({
    id: String(o.id), name: o.name,
    status: o.cancelled_at ? 'cancelled' : 'open',
    financial_status: o.financial_status || 'unknown',
    fulfillment_status: o.fulfillment_status,
    total_aed: Number(o.total_price || 0),
    created_at: o.created_at,
    line_items: (o.line_items || []).map((l: any) => ({
      sku: l.sku || null, title: l.title || 'Untitled',
      qty: Number(l.quantity || 0), price_aed: Number(l.price || 0),
    })),
  }));

  return { configured: true, customer, orders };
}
