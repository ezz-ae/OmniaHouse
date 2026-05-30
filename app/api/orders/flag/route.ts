import { NextResponse } from 'next/server';
import { flagOrder, updateOrderStatus } from '@/lib/operations/store';
import { isOrdersLiveAvailable, flagOrderLive, updateOrderStatusLive } from '@/lib/orders/queries';

/**
 * POST /api/orders/flag
 * Body: { order_id, flag?, remove?, status?, rationale?, actor? }
 *
 * If `status` is given, transitions the order. Otherwise toggles a flag
 * (adds when remove=false, removes when remove=true). Dual-writes to
 * Supabase + operations store.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.order_id) {
      return NextResponse.json({ ok: false, error: 'order_id is required' }, { status: 400 });
    }

    let live: any = null;
    if (body.status) {
      if (isOrdersLiveAvailable()) {
        live = await updateOrderStatusLive({
          order_id: body.order_id, status: body.status,
          rationale: body.rationale, actor: body.actor || null,
        });
      }
      const op = await updateOrderStatus({ order_id: body.order_id, status: body.status, rationale: body.rationale, actor: body.actor });
      return NextResponse.json({ ok: true, source: live ? 'live' : 'mock', order: live || op });
    }

    if (!body.flag) {
      return NextResponse.json({ ok: false, error: 'flag or status is required' }, { status: 400 });
    }
    if (isOrdersLiveAvailable()) {
      live = await flagOrderLive({ order_id: body.order_id, flag: body.flag, remove: body.remove });
    }
    const op = await flagOrder({ order_id: body.order_id, flag: body.flag, remove: body.remove, actor: body.actor });
    return NextResponse.json({ ok: true, source: live ? 'live' : 'mock', order: live || op });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not flag order' }, { status: 400 });
  }
}
