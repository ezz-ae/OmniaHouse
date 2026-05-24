/**
 * Converts UnifiedLiveProduct (from live-scrape.ts) into the Product shape
 * the Inventory room already knows how to render. Fields that don't exist
 * on live products yet — SEO, weakness audit, GA metrics — get safe defaults.
 *
 * The Inventory components don't need to know whether a product is mock or
 * live. They check `source` only to render the LIVE badge.
 */

import type { UnifiedLiveProduct } from './live-scrape';
import type { Product, ParitySummary } from './types';

export function toProduct(p: UnifiedLiveProduct): Product {
  // Build a usable SKU. Live products often have empty SKUs — fall back to
  // a short fingerprint of the title so React keys stay stable.
  const skuFromKey = p.match_key.replace(/^(sku|title):/, '').slice(0, 40);
  const sku = p.sku || skuFromKey;

  return {
    id: `live_${p.match_key}`,
    master_sku: sku,
    master_title: p.master_title,
    display_title: p.display_title,
    category: p.category,
    material: p.material,
    is_limited_edition: p.is_limited_edition,
    image_url: p.image_url,
    source: 'live',
    on_shopify: p.on_shopify,
    on_woocommerce: p.on_woocommerce,
    shopify_price_aed: p.shopify_price_aed,
    woocommerce_price_aed: p.woocommerce_price_aed,
    shopify_qty: p.shopify_qty,
    woocommerce_qty: p.woocommerce_qty,
    shopify_url: p.shopify_url,
    woocommerce_url: p.woocommerce_url,
    parity_status: p.parity_status,
    price_delta_pct: p.price_delta_pct,
    last_synced_at: p.last_synced_at,
    // Not yet wired for live data — placeholders so the existing UI doesn't break
    seo_title: null,
    seo_description: null,
    seo_status: 'pending',
    google_shopping_status: 'pending',
    ai_audit_notes: { weakness_score: 5, missing_details: ['SEO scan pending'], backlink_keywords: [] },
    metrics: { seen_7d: 0, bought_7d: 0, searched_7d: 0, bounced_7d: 0, high_bounce_alert: false },
  };
}

/**
 * Parity summary computed from the live scrape — same shape as
 * lib/inventory/mock.ts getParitySummary() so the existing ParityCard
 * renders without changes.
 */
export function paritySummaryFromLive(
  products: UnifiedLiveProduct[],
  meta: { age_sec: number; total: number },
): ParitySummary {
  const lowStock = products.filter(
    (p) =>
      (p.shopify_qty !== null && p.shopify_qty <= 3) ||
      (p.woocommerce_qty !== null && p.woocommerce_qty <= 3),
  ).length;

  const ageMins = Math.floor(meta.age_sec / 60);
  const lastRun = meta.age_sec < 10 ? 'just now' : ageMins < 1 ? `${meta.age_sec}s ago` : `${ageMins} min ago`;
  const nextRun = ageMins < 30 ? `in ${30 - ageMins} min` : 'overdue';

  return {
    total: meta.total,
    both_match: products.filter((p) => p.parity_status === 'both_match').length,
    both_price_drift: products.filter((p) => p.parity_status === 'both_price_drift').length,
    shopify_only: products.filter((p) => p.parity_status === 'shopify_only').length,
    woocommerce_only: products.filter((p) => p.parity_status === 'woocommerce_only').length,
    low_stock: lowStock,
    limited_editions: products.filter((p) => p.is_limited_edition).length,
    needs_seo: products.length, // none of the live products have seo_title yet
    needs_shopping_list: products.length, // ditto for Google Shopping
    last_run: lastRun,
    next_run: nextRun,
    source: 'live',
  };
}
