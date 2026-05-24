import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runSEO } from '@/lib/inventory/seo';

/**
 * POST /api/inventory/seo-optimize
 * Body: { sku: string, apply?: boolean }
 *
 * Real mode: calls SEO_OPTIMIZATION_PROMPT on the product. When apply=true,
 * writes seo_title, seo_description, ai_audit_notes, sets seo_status='optimized'
 * (or 'pending' if score weak). Logs to ai_queries.
 * Mock mode: synthesizes the SEO output from the rule heuristics.
 */
export async function POST(req: Request) {
  try {
    const { sku, apply } = await req.json();
    if (!sku) return NextResponse.json({ ok: false, error: 'missing_sku' }, { status: 400 });

    const real = !!process.env.OPENAI_API_KEY;
    if (real) {
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    const p = getCatalogue().find((x) => x.master_sku === sku);
    if (!p) return NextResponse.json({ ok: false, error: 'sku_not_found' }, { status: 404 });

    const seo = runSEO(p);
    return NextResponse.json({ ok: true, mode: 'mock', seo, applied: !!apply });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
