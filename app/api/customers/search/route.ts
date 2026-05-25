import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { searchCustomers } from '@/lib/customers/unified-profile';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = Number(url.searchParams.get('limit') || 25);
  const state = await operationsSnapshot();
  const hits = searchCustomers(state, q, limit);
  return NextResponse.json({ ok: true, hits, total: hits.length });
}
