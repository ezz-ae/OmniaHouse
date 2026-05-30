import { NextResponse } from 'next/server';
import { escalateEntity } from '@/lib/operations/store';
import { isOrdersLiveAvailable, escalateOrderLive } from '@/lib/orders/queries';

/**
 * POST /api/orders/escalate
 * Body: { entity_id (order id), reason, entity_kind?, actor? }
 *
 * Adds the `manager_needed` flag and prepends a note onto the order.
 * Writes to Supabase when live (so the Orders room + Customer 360
 * reflect it) and mirrors to the in-memory operations store.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.entity_id || !body.reason) {
      return NextResponse.json({ ok: false, error: 'entity_id and reason are required' }, { status: 400 });
    }

    let liveRow: any = null;
    if (isOrdersLiveAvailable() && (body.entity_kind || 'order') === 'order') {
      liveRow = await escalateOrderLive({
        order_id: body.entity_id,
        reason: body.reason,
        actor: body.actor || null,
      });
    }

    // Always also touch the in-memory store so any room still reading
    // from JSON state sees the same escalation.
    const result = await escalateEntity({
      entity_kind: body.entity_kind || 'order',
      entity_id: body.entity_id,
      reason: body.reason,
      actor: body.actor,
    });

    return NextResponse.json({
      ok: true,
      source: liveRow ? 'live' : 'mock',
      escalated: result,
      order: liveRow,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not escalate' }, { status: 400 });
  }
}
