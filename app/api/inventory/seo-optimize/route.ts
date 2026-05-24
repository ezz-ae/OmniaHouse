import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runSEO } from '@/lib/inventory/seo';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { SEO_OPTIMIZATION_PROMPT } from '@/lib/prompts';

/**
 * POST /api/inventory/seo-optimize
 * Body: { sku: string, apply?: boolean }
 *
 * Real mode (OPENAI_API_KEY set): runs SEO_OPTIMIZATION_PROMPT against the
 * product. When apply=true, the response is what gets written to
 * products.seo_title / seo_description / seo_status (handled by caller).
 * Mock mode: synthesizes the SEO output from rule heuristics.
 */
export async function POST(req: Request) {
  try {
    const { sku, apply } = await req.json();
    if (!sku) return NextResponse.json({ ok: false, error: 'missing_sku' }, { status: 400 });

    const p = getCatalogue().find((x) => x.master_sku === sku);
    if (!p) return NextResponse.json({ ok: false, error: 'sku_not_found' }, { status: 404 });

    if (isAIEnabled()) {
      const seo = await callJSON({
        systemPrompt: SEO_OPTIMIZATION_PROMPT,
        userInput: JSON.stringify({
          sku: p.master_sku,
          title: p.master_title,
          display_title: p.display_title,
          material: p.material,
          category: p.category,
          is_limited_edition: p.is_limited_edition,
          price_aed: p.shopify_price_aed ?? p.woocommerce_price_aed,
          existing_seo_title: p.seo_title,
          existing_seo_description: p.seo_description,
          missing_details: p.ai_audit_notes?.missing_details ?? [],
        }),
        model: 'gpt-4o',
      });
      if (seo) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o', seo, applied: !!apply });
      }
    }

    return NextResponse.json({ ok: true, mode: 'mock', seo: runSEO(p), applied: !!apply });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
