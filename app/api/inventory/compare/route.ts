import { NextResponse } from 'next/server';
import { scrapeShopify, scrapeWoo, unify } from '@/lib/inventory/live-scrape';
import { toProduct } from '@/lib/inventory/live-adapter';
import { isAIEnabled, callJSON, resolveModelName } from '@/lib/ai/client';

/**
 * GET /api/inventory/compare?skus=A,B[,C…]
 * Returns the side-by-side .ae vs .com data per requested SKU plus, when
 * GOOGLE_API_KEY is set, a Gemini-written verdict on the price/content gap.
 * If no skus given, returns the top 12 widest price drifts across the
 * live catalogue as a default comparison set.
 */

const VERDICT_PROMPT = `
You are the OmniaStores cross-store auditor. For each product you receive,
write a two-line verdict:
  • "drift"   — short reason explaining whether the .ae and .com versions
                are aligned, off-price, or one-store-only.
  • "action"  — single concrete fix ("Match .com to AED X", "List on .ae",
                "Rewrite .com title", "Reduce drift below 5%").

Return strict JSON:  { "verdicts": [{ "sku": string, "drift": string, "action": string }] }
No markdown.
`.trim();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skusParam = url.searchParams.get('skus') || '';
  const wantedSkus = skusParam.split(',').map((s) => s.trim()).filter(Boolean);

  const [shopify, woo] = await Promise.all([scrapeShopify().catch(() => []), scrapeWoo().catch(() => [])]);
  const unified = unify(shopify, woo);
  const products = unified.map(toProduct);

  let picks = products;
  if (wantedSkus.length) {
    picks = products.filter((p) => wantedSkus.includes(p.master_sku) || wantedSkus.includes(p.id));
  } else {
    // Default: widest price drifts on the catalogue.
    picks = products
      .filter((p) => p.parity_status === 'both_price_drift' && p.price_delta_pct !== null)
      .sort((a, b) => Math.abs(b.price_delta_pct || 0) - Math.abs(a.price_delta_pct || 0))
      .slice(0, 12);
  }

  const comparisons = picks.map((p) => ({
    sku: p.master_sku,
    display_title: p.display_title,
    category: p.category,
    material: p.material,
    image_url: p.image_url,
    parity_status: p.parity_status,
    price_delta_pct: p.price_delta_pct,
    shopify: {
      listed: p.on_shopify,
      price_aed: p.shopify_price_aed,
      qty: p.shopify_qty,
      url: p.shopify_url,
    },
    woocommerce: {
      listed: p.on_woocommerce,
      price_aed: p.woocommerce_price_aed,
      qty: p.woocommerce_qty,
      url: p.woocommerce_url,
    },
  }));

  let verdicts: { sku: string; drift: string; action: string }[] = [];
  let mode: 'real' | 'mock' | 'mock_fallback' = 'mock';
  let model: string | null = null;

  if (isAIEnabled() && comparisons.length > 0) {
    const ai = await callJSON<{ verdicts: typeof verdicts }>({
      systemPrompt: VERDICT_PROMPT,
      userInput: JSON.stringify({ products: comparisons.slice(0, 12) }),
      model: 'default',
      maxTokens: 1200,
    });
    if (ai?.verdicts && Array.isArray(ai.verdicts)) {
      verdicts = ai.verdicts;
      mode = 'real';
      model = resolveModelName('default');
    } else {
      mode = 'mock_fallback';
    }
  }

  if (verdicts.length === 0) {
    verdicts = comparisons.map((c) => {
      if (c.parity_status === 'shopify_only') return { sku: c.sku, drift: 'Listed only on .ae — UAE buyers see it, KSA/.com buyers don\'t.', action: 'Mirror to omniastores.com.' };
      if (c.parity_status === 'woocommerce_only') return { sku: c.sku, drift: 'Listed only on .com — UAE customers may bounce on .ae search.', action: 'Mirror to omniastores.ae.' };
      const delta = c.price_delta_pct ?? 0;
      if (Math.abs(delta) > 5) return { sku: c.sku, drift: `Price drift ${delta.toFixed(1)}% between stores — flags as both_price_drift.`, action: `Align prices · pick AED ${Math.min(c.shopify.price_aed || Infinity, c.woocommerce.price_aed || Infinity)} as truth.` };
      return { sku: c.sku, drift: 'Both stores match within tolerance.', action: 'No action needed.' };
    });
  }

  return NextResponse.json({
    ok: true,
    mode, model,
    total_products: products.length,
    compared: comparisons.length,
    comparisons,
    verdicts,
  });
}
