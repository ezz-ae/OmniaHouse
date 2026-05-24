import { NextResponse } from 'next/server';
import { getConversations, mockExtract } from '@/lib/whatsapp/mock';
import { callJSON, isAIEnabled } from '@/lib/ai/client';
import { WHATSAPP_EXTRACTION_PROMPT } from '@/lib/whatsapp/prompts';
import type { Extraction, Conversation } from '@/lib/whatsapp/types';

/**
 * POST /api/whatsapp/extract
 * Body: { conversation_id: string, user_role?: string }
 *      OR { raw_text: string, user_role?: string }
 *
 * Real mode (OPENAI_API_KEY set): calls GPT-4o with WHATSAPP_EXTRACTION_PROMPT,
 * returns the 47-field schema as JSON.
 * Mock mode: returns deterministic mock data from lib/whatsapp/mock.ts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userRole = body.user_role || 'agent';

    // Build the chat text — from conversation_id or raw_text
    let text: string | null = null;
    let fallbackConv: Conversation | null = null;
    if (body.conversation_id) {
      const conv = getConversations().find((c) => c.id === body.conversation_id);
      if (!conv) return NextResponse.json({ ok: false, error: 'conversation_not_found' }, { status: 404 });
      fallbackConv = conv;
      text = conv.messages.map((m) => `${m.from}: ${m.body}`).join('\n');
    } else if (body.raw_text) {
      text = body.raw_text;
      fallbackConv = getConversations()[0];
    }

    if (!text) return NextResponse.json({ ok: false, error: 'missing_conversation_id_or_raw_text' }, { status: 400 });

    // Real AI path
    if (isAIEnabled()) {
      const real = await callJSON<Extraction>({
        systemPrompt: WHATSAPP_EXTRACTION_PROMPT,
        userInput: `User role: ${userRole}\n\n### CHAT:\n${text}`,
      });
      if (real) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', extraction: real });
      }
    }

    // Mock fallback
    return NextResponse.json({
      ok: true,
      mode: isAIEnabled() ? 'mock_fallback' : 'mock',
      extraction: mockExtract(fallbackConv!),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
