import { NextResponse } from 'next/server';
import { pushOrderToStore } from '@/lib/operations/store';
import { isOrdersLiveAvailable, pushOrderLive } from '@/lib/orders/queries';

/**
 * POST /api/orders/[id]/push
 *
 * Pushes the order to the resolved store (Shopify draft on .ae, Woo order
 * on .com). Refuses if blocking flags are present (manager_needed,
 * payment_proof_pending, discount_over_threshold, finance_hold,
 * ring_no_size, address_incomplete). Dual-writes to Supabase + operations
 * store so the Orders room sees the new platform id immediately.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const order_id = decodeURIComponent(params.id);

    // Try Supabase first; surface the same "blocking flags" error message.
    let live: any = null;
    if (isOrdersLiveAvailable()) {
      try {
        live = await pushOrderLive({ order_id, actor: body.actor || null });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || 'Could not push order' }, { status: 400 });
      }
    }

    let op: any = null;
    let opError: string | null = null;
    try {
      op = await pushOrderToStore({ order_id, actor: body.actor });
    } catch (err: any) {
      opError = err?.message || 'Could not push order';
    }
    if (!live && !op) {
      return NextResponse.json({ ok: false, error: opError || 'Order not found' }, { status: opError ? 400 : 404 });
    }
    return NextResponse.json({ ok: true, source: live ? 'live' : 'mock', order: live || op });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not push order' }, { status: 400 });
  }
}
