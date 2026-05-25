import { NextResponse } from 'next/server';
import { pushOrderToStore } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const order = await pushOrderToStore({ order_id: decodeURIComponent(params.id), actor: body.actor });
    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not push order' }, { status: 400 });
  }
}
