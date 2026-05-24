import { NextResponse } from 'next/server';
import { getCatalogue, getParitySummary } from '@/lib/inventory/mock';

/**
 * GET /api/inventory/parity
 *
 * Real mode: reads from `products_unified` + per-store tables, computes
 * parity_status from latest sync, returns summary + drift detail.
 * Mock mode: returns the seed catalogue summary.
 */
export async function GET() {
  const real = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (real) {
    return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
  }
  return NextResponse.json({
    ok: true,
    mode: 'mock',
    summary: getParitySummary(),
    drift_detail: getCatalogue()
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
