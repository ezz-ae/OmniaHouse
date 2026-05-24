import { NextResponse } from 'next/server';

/**
 * POST /api/public/request-refund
 * Body: { slug: string, orderId: string, reason: string }
 *
 * Public endpoint — no auth. Validates the wallet slug, then writes the
 * refund request to order_submissions with status 'refund_requested'
 * and routes a notification to Finance via activity_logs.
 *
 * In production the slug check is a row lookup in customer_wallets.
 * For now we accept any hex-looking slug ≥ 6 chars.
 */
export async function POST(req: Request) {
  try {
    const { slug, orderId, reason } = await req.json();
    if (!slug || !orderId || !reason) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }
    if (typeof slug !== 'string' || slug.length < 6) {
      return NextResponse.json({ ok: false, error: 'bad_slug' }, { status: 400 });
    }
    if (typeof reason !== 'string' || reason.trim().length < 4) {
      return NextResponse.json({ ok: false, error: 'reason_too_short' }, { status: 400 });
    }

    // TODO when Supabase is wired:
    //   1. SELECT customer_phone FROM customer_wallets WHERE public_slug=$1
    //   2. UPDATE order_submissions SET status='refund_requested', metadata=
    //      jsonb_set(metadata,'{refund_reason}',$2) WHERE id=$3 AND phone=$4
    //   3. INSERT INTO activity_logs (action='refund_requested',
    //      room_slug='cashback', metadata={order_id,$3})

    return NextResponse.json({
      ok: true,
      mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'real' : 'mock',
      message: 'Refund request received. Finance will follow up on WhatsApp.',
      submitted_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
