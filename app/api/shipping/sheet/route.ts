import { NextResponse } from 'next/server';
import { createCourierSheet, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, sheets: state.sheets });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.order_id) return NextResponse.json({ ok: false, error: 'order_id is required' }, { status: 400 });
    const sheet = await createCourierSheet({
      order_id: body.order_id,
      courier: body.courier,
      pickup_window: body.pickup_window,
    });
    return NextResponse.json({ ok: true, sheet });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create sheet' }, { status: 400 });
  }
}
