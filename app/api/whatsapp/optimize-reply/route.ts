import { NextResponse } from 'next/server';
import { mockOptimizeReply } from '@/lib/whatsapp/mock';
import { callJSON, isAIEnabled } from '@/lib/ai/client';
import { MESSAGE_OPTIMIZATION_PROMPT } from '@/lib/whatsapp/prompts';
import type { ReplyOptimization } from '@/lib/whatsapp/types';

/**
 * POST /api/whatsapp/optimize-reply
 * Body: { draft: string, language?: 'en' | 'ar', context?: string }
 *
 * Real mode: GPT-4o + MESSAGE_OPTIMIZATION_PROMPT — conversion prediction,
 * warning if pushy/short, rewrite in both EN and AR.
 * Mock mode: rule-based heuristic from lib/whatsapp/mock.ts.
 */
export async function POST(req: Request) {
  try {
    const { draft, language = 'en', context } = await req.json();
    if (!draft) return NextResponse.json({ ok: false, error: 'missing_draft' }, { status: 400 });

    if (isAIEnabled()) {
      const userInput = `Language: ${language}\n${context ? `### CONVERSATION CONTEXT:\n${context}\n\n` : ''}### AGENT DRAFT:\n${draft}`;
      const real = await callJSON<ReplyOptimization>({
        systemPrompt: MESSAGE_OPTIMIZATION_PROMPT,
        userInput,
      });
      if (real) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', optimization: real });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: isAIEnabled() ? 'mock_fallback' : 'mock',
      optimization: mockOptimizeReply(draft, language),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
