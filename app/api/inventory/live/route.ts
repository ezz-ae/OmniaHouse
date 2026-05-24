import { NextResponse } from 'next/server';
import { scrapeShopify, scrapeWoo, unify, type UnifiedLiveProduct } from '@/lib/inventory/live-scrape';

/**
 * GET /api/inventory/live?q=crescent&limit=20
 *   Live, unified catalogue from omniastores.ae + omniastores.com.
 *   Same data the Hex notebook produces (df_unified + df_parity).
 *   Cached in-memory for 30 minutes.
 *
 * POST /api/inventory/live
 *   Force-refreshes the cache.
 */

type Cache = {
  at: number;
  products: UnifiedLiveProduct[];
  shopify_count: number;
  woo_count: number;
  errors: string[];
};

const TTL_MS = 30 * 60 * 1000;

// Module-level cache. Lives for the lifetime of the Node process.
let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;

async function refresh(): Promise<Cache> {
  const errors: string[] = [];
  const [shopify, woo] = await Promise.all([
    scrapeShopify().catch((e) => { errors.push(`shopify: ${e}`); return []; }),
    scrapeWoo().catch((e) => { errors.push(`woo: ${e}`); return []; }),
  ]);
  const products = unify(shopify, woo);
  cache = {
    at: Date.now(),
    products,
    shopify_count: shopify.length,
    woo_count: woo.length,
    errors,
  };
  inflight = null;
  return cache;
}

async function getCache(): Promise<Cache> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = refresh();
  return inflight;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);

    const c = await getCache();

    let results = c.products;
    if (q) {
      results = results.filter(
        (p) =>
          p.master_title.includes(q) ||
          p.display_title.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q),
      );
    }

    return NextResponse.json({
      ok: true,
      source: 'live',
      cached_at: c.at,
      age_sec: Math.round((Date.now() - c.at) / 1000),
      stats: {
        total: c.products.length,
        shopify_rows: c.shopify_count,
        woo_rows: c.woo_count,
        matched: results.length,
      },
      errors: c.errors,
      products: results.slice(0, limit),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    cache = null;
    inflight = null;
    const c = await refresh();
    return NextResponse.json({
      ok: true,
      refreshed_at: c.at,
      stats: {
        total: c.products.length,
        shopify_rows: c.shopify_count,
        woo_rows: c.woo_count,
      },
      errors: c.errors,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
