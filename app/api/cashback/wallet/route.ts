import { NextResponse } from 'next/server';
import { createWalletEntry, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, entries: state.wallet_entries });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customer_id || !body.type || body.amount_aed === undefined || !body.reason) {
      return NextResponse.json({ ok: false, error: 'customer_id, type, amount_aed, reason are required' }, { status: 400 });
    }
    const entry = await createWalletEntry({
      ...body,
      amount_aed: Number(body.amount_aed),
    });
    return NextResponse.json({ ok: true, entry });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create wallet entry' }, { status: 400 });
  }
}
