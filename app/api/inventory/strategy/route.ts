import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runStrategy } from '@/lib/inventory/strategy';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { INVENTORY_STRATEGY_PROMPT } from '@/lib/prompts';

/**
 * POST /api/inventory/strategy
 * Body: { skus?: string[] }   // omit to run across the whole catalogue
 *
 * Real mode (OPENAI_API_KEY set): sends a compact metric table to GPT-4o
 * with INVENTORY_STRATEGY_PROMPT. Returns the model's ranked suggestions.
 * Mock mode: applies the prompt's rule logic to the seed catalogue.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    let products = getCatalogue();
    if (Array.isArray(body.skus) && body.skus.length) {
      const set = new Set<string>(body.skus);
      products = products.filter((p) => set.has(p.master_sku));
    }

    if (isAIEnabled()) {
      const metrics = products.slice(0, 30).map((p) => ({
        sku: p.master_sku,
        title: p.master_title,
        seen_7d: p.metrics.seen_7d,
        bought_7d: p.metrics.bought_7d,
        searched_7d: p.metrics.searched_7d,
        bounced_7d: p.metrics.bounced_7d,
        stock: (p.shopify_qty ?? 0) + (p.woocommerce_qty ?? 0),
        price_ae: p.shopify_price_aed,
        price_com: p.woocommerce_price_aed,
        drift_pct: p.price_delta_pct ?? 0,
        google_shopping_status: p.google_shopping_status,
        seo_status: p.seo_status,
      }));
      const result = await callJSON<{ suggestions: any[] }>({
        systemPrompt: INVENTORY_STRATEGY_PROMPT,
        userInput: JSON.stringify({ products: metrics }),
        model: 'pro',
      });
      if (result?.suggestions) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', suggestions: result.suggestions });
      }
      // fall through to mock if AI failed
    }

    return NextResponse.json({ ok: true, mode: 'mock', suggestions: runStrategy(products) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
