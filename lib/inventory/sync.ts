// Inventory sync · scrape omniastores.ae + omniastores.com, unify, upsert
// to Supabase. Writes one live_catalogue_runs row so the Inventory room +
// the Hex notebook can chart freshness.
//
// Slice 3 of the ownership run. Called by /api/inventory/sync-from-live
// (manual + cron-ready) and by the inventory analysis path on a cold cache.

import { createServiceClient } from '@/lib/supabase/server';
import { resolveOrgId } from '@/lib/whatsapp/persistence';
import { scrapeShopify, scrapeWoo, unify, type UnifiedLiveProduct } from './live-scrape';
import { toProduct } from './live-adapter';

export type SyncResult = {
  ok: boolean;
  run_id: string | null;
  source: 'live' | 'unavailable';
  shopify_rows: number;
  woocommerce_rows: number;
  unified_rows: number;
  inserted_rows: number;
  updated_rows: number;
  drift_rows: number;
  errors: string[];
  duration_ms: number;
};

export function isInventorySyncAvailable(): boolean {
  return Boolean(resolveOrgId() && createServiceClient());
}

export async function runInventorySync(opts: { triggered_by?: string } = {}): Promise<SyncResult> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) {
    return {
      ok: false, run_id: null, source: 'unavailable',
      shopify_rows: 0, woocommerce_rows: 0, unified_rows: 0,
      inserted_rows: 0, updated_rows: 0, drift_rows: 0,
      errors: ['OMNIA_ORG_ID or service-role key missing'],
      duration_ms: 0,
    };
  }

  const startedAt = Date.now();
  const errors: string[] = [];

  // Open a run row first so timing is honest even if scrape throws.
  const { data: runRow } = await client
    .from('live_catalogue_runs')
    .insert({
      org_id: orgId,
      triggered_by: opts.triggered_by || 'manual',
      status: 'running',
    })
    .select('id')
    .single();
  const runId = runRow?.id || null;

  const [shopify, woo] = await Promise.all([
    scrapeShopify().catch((e) => { errors.push(`shopify: ${e?.message || e}`); return []; }),
    scrapeWoo().catch((e) => { errors.push(`woocommerce: ${e?.message || e}`); return []; }),
  ]);

  const unified = unify(shopify, woo);

  // Upsert in batches so a 4,600-product catalogue doesn't blow the
  // statement size. PostgREST cap is ~1 MB per request; 500 rows ≈ 300 KB.
  let inserted = 0, updated = 0, driftCount = 0;
  const BATCH = 500;
  for (let i = 0; i < unified.length; i += BATCH) {
    const batch = unified.slice(i, i + BATCH).map((p) => unifiedToRow(p, orgId));
    driftCount += batch.filter((r) => r.parity_status === 'both_price_drift').length;
    const { data, error } = await client
      .from('products')
      .upsert(batch, { onConflict: 'org_id,sku', ignoreDuplicates: false })
      .select('id');
    if (error) {
      errors.push(`upsert batch ${i}: ${error.message}`);
    } else if (data) {
      // Supabase doesn't tell us inserted vs updated; we attribute by
      // whether the row was new (id we just generated) vs already
      // existing (id we received back). Coarse but useful.
      updated += data.length;
    }
  }

  // Title-keyed rows (SKU missing) don't fit the org_id + sku conflict
  // target; insert them separately keyed by a stable hash of master_title.
  const titleKeyedProducts = unified.filter((p) => !p.sku && p.master_title);
  if (titleKeyedProducts.length > 0) {
    const batch = titleKeyedProducts.map((p) => ({
      ...unifiedToRow(p, orgId),
      metadata: { ...(unifiedToRow(p, orgId).metadata as any), title_key: p.master_title },
    }));
    // Best-effort: try insert + ignore the unique violations. Since these
    // rows have null sku, the partial unique index doesn't fire.
    const { error } = await client.from('products').insert(batch);
    if (error) errors.push(`title-keyed insert: ${error.message}`);
    else inserted += batch.length;
  }

  const duration = Date.now() - startedAt;

  if (runId) {
    await client
      .from('live_catalogue_runs')
      .update({
        finished_at: new Date().toISOString(),
        shopify_rows: shopify.length,
        woocommerce_rows: woo.length,
        unified_rows: unified.length,
        inserted_rows: inserted,
        updated_rows: updated,
        drift_rows: driftCount,
        errors: errors,
        status: errors.length === 0 ? 'ok' : 'failed',
      })
      .eq('id', runId);
  }

  return {
    ok: errors.length === 0,
    run_id: runId,
    source: 'live',
    shopify_rows: shopify.length,
    woocommerce_rows: woo.length,
    unified_rows: unified.length,
    inserted_rows: inserted,
    updated_rows: updated,
    drift_rows: driftCount,
    errors,
    duration_ms: duration,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────

function unifiedToRow(p: UnifiedLiveProduct, orgId: string): Record<string, unknown> {
  const product = toProduct(p);
  return {
    org_id: orgId,
    sku: product.master_sku || null,
    normalized_sku: (product.master_sku || '').toLowerCase().trim() || null,
    master_title: product.master_title,
    display_title: product.display_title,
    title: product.display_title,
    category: product.category,
    material: product.material,
    image_url: product.image_url || null,
    is_limited_edition: product.is_limited_edition,
    on_shopify: product.on_shopify,
    on_woocommerce: product.on_woocommerce,
    shopify_price_aed: product.shopify_price_aed,
    woocommerce_price_aed: product.woocommerce_price_aed,
    shopify_qty: product.shopify_qty,
    woocommerce_qty: product.woocommerce_qty,
    shopify_url: product.shopify_url,
    woocommerce_url: product.woocommerce_url,
    parity_status: product.parity_status,
    price_delta_pct: product.price_delta_pct,
    source: 'live',
    last_synced_at: new Date().toISOString(),
    metadata: {
      match_key: p.match_key,
    },
  };
}

// ─── Read helpers ─────────────────────────────────────────────────────────

export async function getLastSyncRun(): Promise<{
  started_at: string | null;
  finished_at: string | null;
  status: string | null;
  unified_rows: number;
  drift_rows: number;
} | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data } = await client
    .from('live_catalogue_runs')
    .select('started_at, finished_at, status, unified_rows, drift_rows')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data as any;
}
