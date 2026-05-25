import { NextResponse } from 'next/server';
import { operationsSnapshot, type ManagedProduct } from '@/lib/operations/store';
import { buildInventoryAnalysis } from '@/lib/inventory/analysis';
import { scrapeShopify, scrapeWoo, unify } from '@/lib/inventory/live-scrape';
import { toProduct } from '@/lib/inventory/live-adapter';

// GET /api/inventory/analysis
//   Pulls the live scrape from omniastores.ae + omniastores.com (the same
//   data the Hex notebook uses) and runs the full analysis against it.
//   Falls back to the seeded mock catalogue if the scrape fails, so the
//   demo never shows an empty page.
//
//   ?source=mock forces the seeded catalogue.
//   ?source=live forces a live scrape and errors if it fails.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get('source') || 'auto';

  const state = await operationsSnapshot();

  let products: ManagedProduct[] = state.products;
  let used = 'mock';
  let scrapeError: string | null = null;
  let counts = { shopify: 0, woocommerce: 0, total: 0 };

  if (source !== 'mock') {
    try {
      const [shopify, woo] = await Promise.all([
        scrapeShopify().catch((e) => { scrapeError = `shopify: ${e?.message || e}`; return []; }),
        scrapeWoo().catch((e) => { scrapeError = `woo: ${e?.message || e}`; return []; }),
      ]);
      counts = { shopify: shopify.length, woocommerce: woo.length, total: shopify.length + woo.length };
      if (counts.total > 0) {
        const unified = unify(shopify, woo);
        const stamped = new Date().toISOString();
        products = unified.map((p) => {
          const baseProduct = toProduct(p);
          return {
            ...baseProduct,
            created_at: stamped,
            updated_at: stamped,
            platform_ids: {
              shopify: baseProduct.on_shopify ? baseProduct.master_sku : undefined,
              woocommerce: baseProduct.on_woocommerce ? baseProduct.master_sku : undefined,
            },
            sync_status: {
              shopify: (baseProduct.on_shopify ? 'synced' : 'pending') as 'synced' | 'pending',
              woocommerce: (baseProduct.on_woocommerce ? 'synced' : 'pending') as 'synced' | 'pending',
            },
            sync_errors: {},
          } as ManagedProduct;
        });
        used = 'live';
      }
    } catch (err: any) {
      scrapeError = err?.message || String(err);
    }
  }

  if (source === 'live' && used !== 'live') {
    return NextResponse.json({ ok: false, error: `Live scrape failed · ${scrapeError || 'no products returned'}` }, { status: 502 });
  }

  // Merge: keep live products as the catalogue, keep operations-store
  // signals/orders/customers as the demand-side context.
  const analysis = buildInventoryAnalysis({ ...state, products });

  return NextResponse.json({
    ok: true,
    analysis,
    source: used,
    live_counts: counts,
    scrape_error: scrapeError,
  });
}
