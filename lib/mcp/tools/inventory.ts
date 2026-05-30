// MCP tools · inventory domain.
//
// Thin wrappers over lib/inventory/queries that the model can call by name.
// Each tool returns a slim, JSON-serialisable shape — never the full row dump.

import { listProductsLive, getProductLive, inventoryStats } from '@/lib/inventory/queries';
import { getLastSyncRun } from '@/lib/inventory/sync';

export async function get_inventory_stats() {
  const stats = await inventoryStats();
  if (!stats) return { ok: false, reason: 'inventory_unavailable' };
  return { ok: true, ...stats };
}

export async function find_products(args: {
  parity?: 'matched' | 'both_price_drift' | 'shopify_only' | 'woocommerce_only';
  category?: string;
  min_drift_pct?: number;
  limit?: number;
}) {
  const products = await listProductsLive({ parity: args.parity, category: args.category, limit: args.limit ?? 25 });
  if (!products) return { ok: false, reason: 'inventory_unavailable' };

  const filtered = (args.min_drift_pct
    ? products.filter((p) => Math.abs(p.price_delta_pct ?? 0) >= args.min_drift_pct!)
    : products
  ).slice(0, Math.min(args.limit ?? 25, 100));

  return {
    ok: true,
    matched: filtered.length,
    products: filtered.map((p) => ({
      sku: p.master_sku,
      title: p.display_title || p.master_title,
      category: p.category,
      parity: p.parity_status,
      price_ae: p.shopify_price_aed,
      price_com: p.woocommerce_price_aed,
      drift_pct: p.price_delta_pct,
      qty_ae: p.shopify_qty,
      qty_com: p.woocommerce_qty,
    })),
  };
}

export async function get_product(args: { sku: string }) {
  const p = await getProductLive(args.sku);
  if (!p) return { ok: false, reason: 'not_found' };
  return {
    ok: true,
    sku: p.master_sku,
    title: p.master_title,
    display_title: p.display_title,
    category: p.category,
    material: p.material,
    is_limited_edition: p.is_limited_edition,
    on_shopify: p.on_shopify,
    on_woocommerce: p.on_woocommerce,
    price_ae: p.shopify_price_aed,
    price_com: p.woocommerce_price_aed,
    qty_ae: p.shopify_qty,
    qty_com: p.woocommerce_qty,
    drift_pct: p.price_delta_pct,
    parity: p.parity_status,
    seo_status: p.seo_status,
    google_shopping_status: p.google_shopping_status,
    last_synced_at: p.last_synced_at,
    image_url: p.image_url,
  };
}

export async function get_last_sync_run() {
  const last = await getLastSyncRun();
  return { ok: true, last_run: last };
}
