import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runVeo } from '@/lib/inventory/veo';

/**
 * POST /api/inventory/veo-prompt
 * Body: { sku: string }
 *
 * Real mode: calls VEO_CONTENT_INTELLIGENCE_PROMPT with the product context,
 * returns cinematic video prompt + creative brief + music mood + SEO tags.
 * Mock mode: composes the brief from material + LE state + category.
 */
export async function POST(req: Request) {
  try {
    const { sku } = await req.json();
    if (!sku) return NextResponse.json({ ok: false, error: 'missing_sku' }, { status: 400 });

    const real = !!process.env.OPENAI_API_KEY;
    if (real) {
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    const p = getCatalogue().find((x) => x.master_sku === sku);
    if (!p) return NextResponse.json({ ok: false, error: 'sku_not_found' }, { status: 404 });

    return NextResponse.json({ ok: true, mode: 'mock', veo: runVeo(p) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
