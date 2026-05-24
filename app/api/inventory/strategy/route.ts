import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runStrategy } from '@/lib/inventory/strategy';

/**
 * POST /api/inventory/strategy
 * Body: { skus?: string[] }    // omit to run across the whole catalogue
 *
 * Real mode: pulls products + their 7d ga_events aggregates, calls
 * INVENTORY_STRATEGY_PROMPT, returns ranked suggestions, logs to ai_queries.
 * Mock mode: applies the prompt's rule logic to the seed catalogue.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const real = !!process.env.OPENAI_API_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (real) {
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    let products = getCatalogue();
    if (Array.isArray(body.skus) && body.skus.length) {
      const set = new Set<string>(body.skus);
      products = products.filter((p) => set.has(p.master_sku));
    }

    return NextResponse.json({ ok: true, mode: 'mock', suggestions: runStrategy(products) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
