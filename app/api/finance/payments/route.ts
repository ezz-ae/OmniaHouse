import { NextResponse } from 'next/server';
import { confirmPayment } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const order = await confirmPayment(body);
    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not confirm payment' }, { status: 400 });
  }
}
