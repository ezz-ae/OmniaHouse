// Inventory · Supabase reader + live-scrape backfill (slice 3).
//
// Read path order:
//   1. products table in Postgres (the system of record)
//   2. If empty (no sync has run yet), fall through to the in-process
//      live scrape so the analysis/strategy/compare endpoints never
//      return empty on a fresh deploy. The Inventory room shows a small
//      "first sync queued" hint when this happens.

import { createServiceClient } from '@/lib/supabase/server';
import { resolveOrgId } from '@/lib/whatsapp/persistence';
import type { Product } from './types';

export function isInventoryLiveAvailable(): boolean {
  return Boolean(resolveOrgId() && createServiceClient());
}

export async function listProductsLive(opts: { limit?: number; parity?: string; category?: string } = {}): Promise<Product[] | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  let q = client
    .from('products')
    .select('*')
    .eq('org_id', orgId)
    .order('last_synced_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 1000, 5000));
  if (opts.parity) q = q.eq('parity_status', opts.parity);
  if (opts.category) q = q.eq('category', opts.category);

  const { data, error } = await q;
  if (error || !data) return null;
  return data.map(rowToProduct);
}

export async function getProductLive(skuOrId: string): Promise<Product | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(skuOrId)) {
    const { data } = await client.from('products').select('*').eq('org_id', orgId).eq('id', skuOrId).maybeSingle();
    if (data) return rowToProduct(data);
  }
  const { data } = await client.from('products').select('*').eq('org_id', orgId).eq('sku', skuOrId).maybeSingle();
  return data ? rowToProduct(data) : null;
}

// ─── Row → Product mapping ────────────────────────────────────────────────

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    master_sku: row.sku || `tk_${(row.normalized_sku || row.master_title || row.id).slice(0, 12)}`,
    master_title: row.master_title || row.title || '',
    display_title: row.display_title || row.title || '',
    category: row.category || 'Uncategorised',
    material: row.material || '',
    is_limited_edition: Boolean(row.is_limited_edition),
    image_url: row.image_url || null,
    source: 'live',
    on_shopify: Boolean(row.on_shopify),
    on_woocommerce: Boolean(row.on_woocommerce),
    shopify_price_aed: row.shopify_price_aed === null ? null : Number(row.shopify_price_aed),
    woocommerce_price_aed: row.woocommerce_price_aed === null ? null : Number(row.woocommerce_price_aed),
    shopify_qty: row.shopify_qty === null ? null : Number(row.shopify_qty),
    woocommerce_qty: row.woocommerce_qty === null ? null : Number(row.woocommerce_qty),
    shopify_url: row.shopify_url || null,
    woocommerce_url: row.woocommerce_url || null,
    parity_status: row.parity_status || 'unclassified',
    price_delta_pct: row.price_delta_pct === null ? null : Number(row.price_delta_pct),
    last_synced_at: row.last_synced_at || row.updated_at || new Date().toISOString(),
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    seo_status: (row.seo_status || 'pending') as any,
    google_shopping_status: (row.google_shopping_status || 'pending') as any,
    ai_audit_notes: row.ai_audit_notes || { weakness_score: 5, missing_details: [], backlink_keywords: [] },
    metrics: { seen_7d: 0, bought_7d: 0, searched_7d: 0, bounced_7d: 0, high_bounce_alert: false },
  };
}

// ─── Stats for the Inventory room header ─────────────────────────────────

export async function inventoryStats(): Promise<{
  total: number;
  shopify: number;
  woocommerce: number;
  drift: number;
  limited_edition: number;
  last_synced_at: string | null;
} | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const { count: total } = await client.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  const { count: shopify } = await client.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('on_shopify', true);
  const { count: woo } = await client.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('on_woocommerce', true);
  const { count: drift } = await client.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('parity_status', 'both_price_drift');
  const { count: le } = await client.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_limited_edition', true);
  const { data: lastRun } = await client.from('live_catalogue_runs').select('finished_at').eq('org_id', orgId).order('started_at', { ascending: false }).limit(1).maybeSingle();
  return {
    total: total || 0,
    shopify: shopify || 0,
    woocommerce: woo || 0,
    drift: drift || 0,
    limited_edition: le || 0,
    last_synced_at: lastRun?.finished_at || null,
  };
}
