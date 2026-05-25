import { NextResponse } from 'next/server';
import { refundOrder } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.reason) return NextResponse.json({ ok: false, error: 'reason is required' }, { status: 400 });
    const order = await refundOrder(body);
    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not refund order' }, { status: 400 });
  }
}
