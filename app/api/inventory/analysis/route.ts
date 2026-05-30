import { NextResponse } from 'next/server';
import { operationsSnapshot, type ManagedProduct } from '@/lib/operations/store';
import { buildInventoryAnalysis } from '@/lib/inventory/analysis';
import { scrapeShopify, scrapeWoo, unify } from '@/lib/inventory/live-scrape';
import { toProduct } from '@/lib/inventory/live-adapter';
import { isInventoryLiveAvailable, listProductsLive, inventoryStats } from '@/lib/inventory/queries';

// GET /api/inventory/analysis
//
//   Read-path order:
//     1. Supabase products table (the system of record once the sync has
//        run at least once). Has stable ids, freshness timestamps, and
//        joins to live_catalogue_runs.
//     2. In-process live scrape (omniastores.ae + omniastores.com) when
//        Supabase is empty or unavailable. Same data the Hex notebook
//        uses.
//     3. Seeded mock catalogue as a last resort so a brand-new deploy
//        never shows an empty Inventory room.
//
//   ?source=supabase | live | mock forces a specific source.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forcedSource = url.searchParams.get('source') || 'auto';

  const state = await operationsSnapshot();

  let products: ManagedProduct[] = state.products;
  let used: 'supabase' | 'live' | 'mock' = 'mock';
  let scrapeError: string | null = null;
  let counts = { shopify: 0, woocommerce: 0, total: 0 };
  let lastSyncedAt: string | null = null;

  // 1. Supabase
  if (forcedSource !== 'mock' && forcedSource !== 'live' && isInventoryLiveAvailable()) {
    const live = await listProductsLive({ limit: 5000 });
    if (live && live.length > 0) {
      const stamped = new Date().toISOString();
      products = live.map((p) => ({
        ...p,
        created_at: p.last_synced_at || stamped,
        updated_at: p.last_synced_at || stamped,
        platform_ids: {
          shopify: p.on_shopify ? p.master_sku : undefined,
          woocommerce: p.on_woocommerce ? p.master_sku : undefined,
        },
        sync_status: {
          shopify: (p.on_shopify ? 'synced' : 'pending') as 'synced' | 'pending',
          woocommerce: (p.on_woocommerce ? 'synced' : 'pending') as 'synced' | 'pending',
        },
        sync_errors: {},
      })) as ManagedProduct[];
      used = 'supabase';
      counts = { shopify: live.filter((p) => p.on_shopify).length, woocommerce: live.filter((p) => p.on_woocommerce).length, total: live.length };
      const stats = await inventoryStats();
      lastSyncedAt = stats?.last_synced_at || null;
    }
  }

  // 2. Live scrape (when Supabase had no data or was explicitly requested)
  if (used === 'mock' && forcedSource !== 'mock') {
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

  if (forcedSource === 'live' && used !== 'live') {
    return NextResponse.json({ ok: false, error: `Live scrape failed · ${scrapeError || 'no products returned'}` }, { status: 502 });
  }
  if (forcedSource === 'supabase' && used !== 'supabase') {
    return NextResponse.json({ ok: false, error: `Supabase products unavailable. Hit /api/inventory/sync-from-live first.` }, { status: 502 });
  }

  const analysis = buildInventoryAnalysis({ ...state, products });

  return NextResponse.json({
    ok: true,
    source: used,
    last_synced_at: lastSyncedAt,
    live_counts: counts,
    scrape_error: scrapeError,
    analysis,
  });
}
