import { NextResponse } from 'next/server';
import { syncInventory } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const job = await syncInventory({
      target: body.target,
      product_ids: body.product_ids,
      kind: body.kind,
    });
    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Sync failed' }, { status: 400 });
  }
}
