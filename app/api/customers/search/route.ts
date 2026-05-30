import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { searchCustomers } from '@/lib/customers/unified-profile';
import { isCustomersLiveAvailable, searchCustomersLive } from '@/lib/customers/queries';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = Number(url.searchParams.get('limit') || 25);
  const forceMock = url.searchParams.get('source') === 'mock';

  // Try Supabase first when live + reachable. Falls back to the mock
  // search over the operations store when no rows match (so local dev +
  // pre-flip prod keep returning sane results to the WhatsApp Desk).
  if (!forceMock && isCustomersLiveAvailable()) {
    const live = await searchCustomersLive(q, limit);
    if (live && live.length > 0) {
      return NextResponse.json({ ok: true, source: 'live', hits: live, total: live.length });
    }
  }

  const state = await operationsSnapshot();
  const hits = searchCustomers(state, q, limit);
  return NextResponse.json({ ok: true, source: 'mock', hits, total: hits.length });
}
