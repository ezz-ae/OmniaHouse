import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runVeo } from '@/lib/inventory/veo';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { VEO_CONTENT_INTELLIGENCE_PROMPT } from '@/lib/prompts';

/**
 * POST /api/inventory/veo-prompt
 * Body: { sku: string }
 *
 * Real mode (OPENAI_API_KEY set): runs VEO_CONTENT_INTELLIGENCE_PROMPT.
 * Mock mode: composes the brief from material + LE state + category.
 */
export async function POST(req: Request) {
  try {
    const { sku } = await req.json();
    if (!sku) return NextResponse.json({ ok: false, error: 'missing_sku' }, { status: 400 });

    const p = getCatalogue().find((x) => x.master_sku === sku);
    if (!p) return NextResponse.json({ ok: false, error: 'sku_not_found' }, { status: 404 });

    if (isAIEnabled()) {
      const veo = await callJSON({
        systemPrompt: VEO_CONTENT_INTELLIGENCE_PROMPT,
        userInput: JSON.stringify({
          sku: p.master_sku,
          title: p.master_title,
          display_title: p.display_title,
          material: p.material,
          category: p.category,
          is_limited_edition: p.is_limited_edition,
        }),
        model: 'pro',
      });
      if (veo) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', veo });
      }
    }

    return NextResponse.json({ ok: true, mode: 'mock', veo: runVeo(p) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
