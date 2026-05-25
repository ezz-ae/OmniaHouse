import { NextResponse } from 'next/server';
import { operationsSnapshot, placeOrder } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, orders: state.orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customer_phone) {
      return NextResponse.json({ ok: false, error: 'customer_phone is required' }, { status: 400 });
    }
    const result = await placeOrder(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not place order' }, { status: 400 });
  }
}
