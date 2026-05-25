import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON, resolveModelName } from '@/lib/ai/client';

/**
 * POST /api/inventory/ai-listing
 * Body: { product: { sku, title, category?, material?, is_limited_edition?, price_aed?, notes? },
 *         locale?: 'en' | 'ar' | 'both' }
 *
 * Generates a full product listing with Gemini:
 *   • seo_title (≤ 60 chars)
 *   • seo_description (≤ 160 chars)
 *   • google_shopping  { google_product_category, material, gender, age_group }
 *   • marketing_copy   (one paragraph for the product page)
 *   • bullets          (4–6 short selling points)
 *   • alt_text         (image alt for screen readers + SEO)
 *   • tags             (search/category tags)
 *   • arabic           (same fields in Arabic when locale=ar|both)
 *
 * Falls back to a rule-based listing when GOOGLE_API_KEY isn't set so the
 * Stores room can still demo without AI.
 */

const PROMPT_EN = `
You are the OmniaStores Listing Editor — a luxury Middle East jewellery
catalogue. Given a product, produce a complete, conversion-ready listing.

Voice: confident, calm, refined. Never use the word "elevate" or marketing
filler ("stunning", "elegant", "exquisite"). Speak about the material,
craft, and occasion the piece is bought for. Reference 925 silver, 18k
gold, rose gold etc. when relevant.

Always include:
  • seo_title          ≤ 60 chars · brand · material · type
  • seo_description    ≤ 160 chars · benefit-led, ends with a soft CTA
  • google_shopping    { google_product_category, material, gender, age_group }
  • marketing_copy     one paragraph (50–80 words), product page body
  • bullets            4–6 strings, each 5–12 words
  • alt_text           ≤ 100 chars, describes the piece for screen readers + SEO
  • tags               5–10 short tags

Return strict JSON only. No markdown fences, no commentary.
`.trim();

const PROMPT_AR = `
You are the OmniaStores Arabic Listing Editor — write a parallel Arabic
version of the same listing fields. Use Gulf-friendly Arabic (modern
standard with Gulf customer phrasing), keep the same fields, but localize
naturally — don't translate word-for-word. Names of materials in Arabic
(فضة 925 / ذهب 18 قيراط / روز جولد).

Return strict JSON only.
`.trim();

type ProductIn = {
  sku?: string;
  title?: string;
  category?: string;
  material?: string;
  is_limited_edition?: boolean;
  price_aed?: number | null;
  notes?: string;
};

function ruleBased(p: ProductIn) {
  const title = p.title || p.sku || 'Untitled product';
  const material = p.material || '925 silver';
  const category = p.category || 'Jewellery';
  return {
    seo_title: `Omnia ${title} · ${material} · Dubai Luxury Jewellery`.slice(0, 60),
    seo_description: `Hand-finished ${title} in ${material}. Free GCC shipping. Shop online or via WhatsApp.`.slice(0, 160),
    google_shopping: {
      google_product_category: 'Apparel & Accessories > Jewelry',
      material, gender: 'female', age_group: 'adult',
    },
    marketing_copy: `The ${title} is hand-finished in ${material}. Designed for daily wear and gifting moments, it travels comfortably between work, evening, and weekends. Available across both stores with same-day Dubai delivery and 14-day exchanges.`,
    bullets: [
      `Hand-finished ${material}`,
      `Comfort fit for daily wear`,
      `Same-day Dubai delivery`,
      `14-day exchange policy`,
      p.is_limited_edition ? 'Limited Edition · numbered piece' : 'Refillable inventory',
    ].filter(Boolean),
    alt_text: `${title} in ${material} from Omnia, displayed on a neutral background.`,
    tags: ['omnia', material.toLowerCase().replace(/\s+/g, '-'), category.toLowerCase(), 'dubai', 'jewellery'],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const product: ProductIn = body.product || {};
    const locale: 'en' | 'ar' | 'both' = body.locale || 'en';

    if (!product.sku && !product.title) {
      return NextResponse.json({ ok: false, error: 'product.sku or product.title is required' }, { status: 400 });
    }

    const base = ruleBased(product);
    if (!isAIEnabled()) {
      return NextResponse.json({ ok: true, mode: 'mock', listing: base, arabic: locale !== 'en' ? base : null });
    }

    const ai = await callJSON({
      systemPrompt: PROMPT_EN,
      userInput: JSON.stringify({ product, brand: 'Omnia · Dubai · luxury jewellery' }),
      model: 'default',
      maxTokens: 800,
    });

    let arabic: any = null;
    if (locale !== 'en' && ai) {
      arabic = await callJSON({
        systemPrompt: PROMPT_AR,
        userInput: JSON.stringify({ product, english_listing: ai }),
        model: 'default',
        maxTokens: 800,
      });
    }

    return NextResponse.json({
      ok: true,
      mode: ai ? 'real' : 'mock_fallback',
      model: ai ? resolveModelName('default') : null,
      listing: ai || base,
      arabic: arabic || (locale !== 'en' ? base : null),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not generate listing' }, { status: 500 });
  }
}
