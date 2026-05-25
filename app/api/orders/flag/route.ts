import { NextResponse } from 'next/server';
import { flagOrder, updateOrderStatus } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.order_id) return NextResponse.json({ ok: false, error: 'order_id is required' }, { status: 400 });
    if (body.status) {
      const order = await updateOrderStatus({ order_id: body.order_id, status: body.status, rationale: body.rationale, actor: body.actor });
      return NextResponse.json({ ok: true, order });
    }
    if (!body.flag) return NextResponse.json({ ok: false, error: 'flag or status is required' }, { status: 400 });
    const order = await flagOrder({ order_id: body.order_id, flag: body.flag, remove: body.remove, actor: body.actor });
    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not flag order' }, { status: 400 });
  }
}
