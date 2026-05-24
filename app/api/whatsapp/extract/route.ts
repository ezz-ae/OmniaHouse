import { NextResponse } from 'next/server';
import { getConversations, mockExtract } from '@/lib/whatsapp/mock';

/**
 * POST /api/whatsapp/extract
 * Body: { conversation_id: string } OR { raw_text: string, user_role?: string }
 *
 * Real mode (OPENAI_API_KEY + Supabase): loads WHATSAPP_EXTRACTION_PROMPT,
 *   calls GPT-4o, inserts into ai_extractions, returns parsed JSON.
 * Mock mode: returns the 47-field schema from lib/whatsapp/mock.ts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const real = !!process.env.OPENAI_API_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (real) {
      // TODO(phase-2): wire OpenAI + supabase here. Spec already written.
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    if (body.conversation_id) {
      const conv = getConversations().find((c) => c.id === body.conversation_id);
      if (!conv) return NextResponse.json({ ok: false, error: 'conversation_not_found' }, { status: 404 });
      const extraction = mockExtract(conv);
      return NextResponse.json({ ok: true, mode: 'mock', extraction });
    }

    // Raw paste path
    if (body.raw_text) {
      const conv = getConversations()[0]; // demo fallback
      return NextResponse.json({ ok: true, mode: 'mock', extraction: mockExtract(conv) });
    }

    return NextResponse.json({ ok: false, error: 'missing_conversation_id_or_raw_text' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
