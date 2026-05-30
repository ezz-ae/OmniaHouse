import { NextResponse } from 'next/server';
import { runInventorySync, getLastSyncRun, isInventorySyncAvailable } from '@/lib/inventory/sync';

/**
 * GET  /api/inventory/sync-from-live  · returns the latest run row (lets
 *      the Inventory room render "last sync 3 min ago").
 * POST /api/inventory/sync-from-live  · runs a fresh scrape + upsert to
 *      Supabase. Manual today; can be hit from a Vercel cron or an Omnia
 *      schedule once we want unattended freshness.
 *
 * Spec ref: slice 3 of the ownership run.
 */

export async function GET() {
  if (!isInventorySyncAvailable()) {
    return NextResponse.json({ ok: true, status: 'unavailable', reason: 'OMNIA_ORG_ID or service-role key missing' });
  }
  const last = await getLastSyncRun();
  return NextResponse.json({ ok: true, last_run: last });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!isInventorySyncAvailable()) {
    return NextResponse.json({ ok: false, error: 'inventory_sync_unavailable', reason: 'OMNIA_ORG_ID or service-role key missing' }, { status: 503 });
  }
  const result = await runInventorySync({ triggered_by: body.triggered_by || 'manual' });
  const { ok, ...rest } = result;
  return NextResponse.json({ ok, ...rest }, { status: ok ? 200 : 502 });
}
