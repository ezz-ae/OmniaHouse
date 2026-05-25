import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/inventory/mock';
import { runStrategy } from '@/lib/inventory/strategy';
import { isAIEnabled, callJSON, resolveModelName } from '@/lib/ai/client';
import { INVENTORY_STRATEGY_PROMPT } from '@/lib/prompts';
import { scrapeShopify, scrapeWoo, unify } from '@/lib/inventory/live-scrape';
import { toProduct } from '@/lib/inventory/live-adapter';
import type { Product } from '@/lib/inventory/types';

/**
 * POST /api/inventory/strategy
 * Body: { skus?: string[], source?: 'auto' | 'live' | 'mock' }
 *
 * Real mode (GOOGLE_API_KEY set): sends a compact metric table to Gemini
 * with INVENTORY_STRATEGY_PROMPT. Returns the model's ranked suggestions.
 * Mock mode: applies the prompt's rule logic to the catalogue.
 *
 * Source resolution: 'auto' tries live scrape first and falls back to the
 * seeded mock if it fails. Live products carry source='live' so the
 * fallback rules in runStrategy fire (parity gap, missing image, pending SEO).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source || 'auto';

    let products: Product[] = [];
    let usedSource: 'live' | 'mock' = 'mock';

    if (source !== 'mock') {
      try {
        const [shopify, woo] = await Promise.all([
          scrapeShopify().catch(() => []),
          scrapeWoo().catch(() => []),
        ]);
        if (shopify.length + woo.length > 0) {
          const unified = unify(shopify, woo);
          products = unified.map(toProduct);
          usedSource = 'live';
        }
      } catch {
        // fall through to mock
      }
    }
    if (products.length === 0) {
      products = getCatalogue();
      usedSource = 'mock';
    }

    if (Array.isArray(body.skus) && body.skus.length) {
      const set = new Set<string>(body.skus);
      products = products.filter((p) => set.has(p.master_sku));
    }

    if (isAIEnabled() && products.length > 0) {
      // Sample so we don't blow the prompt budget on 4,600 live rows.
      const sample = products.slice(0, 50);
      const metrics = sample.map((p) => ({
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
        parity_status: p.parity_status,
        is_limited_edition: p.is_limited_edition,
        google_shopping_status: p.google_shopping_status,
        seo_status: p.seo_status,
        has_image: Boolean(p.image_url),
      }));
      const result = await callJSON<{ suggestions: any[] }>({
        systemPrompt: INVENTORY_STRATEGY_PROMPT,
        userInput: JSON.stringify({ products: metrics, total_catalogue: products.length }),
        model: 'default',
        maxTokens: 2500,
      });
      if (result?.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        return NextResponse.json({
          ok: true, mode: 'real', model: resolveModelName('default'),
          source: usedSource, total_products: products.length,
          suggestions: result.suggestions,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: isAIEnabled() ? 'mock_fallback' : 'mock',
      source: usedSource,
      total_products: products.length,
      suggestions: runStrategy(products),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
