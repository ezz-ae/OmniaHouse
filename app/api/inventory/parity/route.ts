import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';

/**
 * GET /api/inventory/parity
 *
 * Reads the active OmniaHouse product catalogue, computes parity status from
 * latest sync state, and returns summary + drift detail.
 */
export async function GET() {
  const state = await operationsSnapshot();
  const products = state.products;
  return NextResponse.json({
    ok: true,
    summary: {
      total: products.length,
      both_match: products.filter((p) => p.parity_status === 'both_match').length,
      both_price_drift: products.filter((p) => p.parity_status === 'both_price_drift').length,
      shopify_only: products.filter((p) => p.parity_status === 'shopify_only').length,
      woocommerce_only: products.filter((p) => p.parity_status === 'woocommerce_only').length,
      low_stock: products.filter((p) => [p.shopify_qty, p.woocommerce_qty].some((q) => typeof q === 'number' && q <= 3)).length,
      limited_editions: products.filter((p) => p.is_limited_edition).length,
      needs_seo: products.filter((p) => p.seo_status === 'pending').length,
      needs_shopping_list: products.filter((p) => p.google_shopping_status === 'pending').length,
    },
    drift_detail: products
      .filter((p) => p.parity_status === 'both_price_drift')
      .map((p) => ({
        sku: p.master_sku,
        title: p.display_title,
        shopify: p.shopify_price_aed,
        woocommerce: p.woocommerce_price_aed,
        delta_pct: p.price_delta_pct,
      })),
  });
}
