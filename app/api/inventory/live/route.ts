import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
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
const CACHE_FILE = path.join(process.cwd(), '.data', 'inventory-live.json');

// Module-level cache + on-disk snapshot. The disk copy survives dev server
// restarts so we don't re-scrape both stores on every reload.
let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;

async function loadFromDisk(): Promise<Cache | null> {
  try {
    const text = await fs.readFile(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.at === 'number' && Array.isArray(parsed.products)) {
      return parsed as Cache;
    }
  } catch {
    // file missing or unreadable — fine, treat as no cache
  }
  return null;
}

async function saveToDisk(c: Cache): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(c), 'utf-8');
  } catch (err) {
    console.error('inventory cache save failed:', err);
  }
}

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
  // Fire-and-forget disk persist
  saveToDisk(cache);
  return cache;
}

async function getCache(): Promise<Cache> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  // Try disk first (fresh enough?)
  if (!cache) {
    const disk = await loadFromDisk();
    if (disk && Date.now() - disk.at < TTL_MS) {
      cache = disk;
      return cache;
    }
    // Stale disk cache is still useful — return immediately and refresh
    // in the background so the next request gets fresh data.
    if (disk) {
      cache = disk;
      if (!inflight) inflight = refresh().catch((e) => { inflight = null; throw e; });
      return cache;
    }
  }
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
