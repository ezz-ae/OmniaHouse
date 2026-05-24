import { NextResponse } from 'next/server';
import { mockMagazine } from '@/lib/whatsapp/mock';
import { callJSON, isAIEnabled } from '@/lib/ai/client';
import { OMNIA_MAGAZINE_PROMPT } from '@/lib/whatsapp/prompts';
import type { Magazine } from '@/lib/whatsapp/types';

/**
 * POST /api/whatsapp/magazine
 * Body: { customer_name: string, items?: any[], ghost_history?: any[] }
 *
 * Real mode: GPT-4o + OMNIA_MAGAZINE_PROMPT.
 * Mock mode: deterministic editorial template.
 */
export async function POST(req: Request) {
  try {
    const { customer_name, items, ghost_history } = await req.json();
    if (!customer_name) return NextResponse.json({ ok: false, error: 'missing_customer_name' }, { status: 400 });

    if (isAIEnabled()) {
      const userInput = [
        `### CUSTOMER NAME: ${customer_name}`,
        items && `### ITEMS PURCHASED: ${JSON.stringify(items)}`,
        ghost_history && `### GHOST BROWSE HISTORY: ${JSON.stringify(ghost_history)}`,
      ].filter(Boolean).join('\n');
      const real = await callJSON<Magazine>({
        systemPrompt: OMNIA_MAGAZINE_PROMPT,
        userInput,
        temperature: 0.7, // creative output
      });
      if (real) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', magazine: real });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: isAIEnabled() ? 'mock_fallback' : 'mock',
      magazine: mockMagazine(customer_name),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
