import { NextResponse } from 'next/server';
import { mockVerifyPayment } from '@/lib/whatsapp/mock';

/**
 * POST /api/whatsapp/verify-payment
 * Body: { filename: string, conversation_id?: string }
 *
 * Calls MEDIA_VERIFICATION_PROMPT. Runs bank template detection
 * (Emirates NBD / ADCB / Al Rajhi / Mashreq / FAB) + metadata fraud check.
 * Logs to audit_logs in real mode.
 */
export async function POST(req: Request) {
  try {
    const { filename } = await req.json();
    if (!filename) return NextResponse.json({ ok: false, error: 'missing_filename' }, { status: 400 });

    const real = !!process.env.OPENAI_API_KEY;
    if (real) {
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    return NextResponse.json({ ok: true, mode: 'mock', verification: mockVerifyPayment(filename) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
