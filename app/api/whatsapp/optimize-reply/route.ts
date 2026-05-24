import { NextResponse } from 'next/server';
import { mockOptimizeReply } from '@/lib/whatsapp/mock';

/**
 * POST /api/whatsapp/optimize-reply
 * Body: { draft: string, language?: 'en' | 'ar' }
 *
 * Calls MESSAGE_OPTIMIZATION_PROMPT (real mode) or mock variant. Returns
 * conversion probability + warning + recommendation + optimized draft.
 */
export async function POST(req: Request) {
  try {
    const { draft, language = 'en' } = await req.json();
    if (!draft) return NextResponse.json({ ok: false, error: 'missing_draft' }, { status: 400 });

    const real = !!process.env.OPENAI_API_KEY;
    if (real) {
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    return NextResponse.json({ ok: true, mode: 'mock', optimization: mockOptimizeReply(draft, language) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
