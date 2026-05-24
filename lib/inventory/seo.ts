import type { Product, SEOResult } from './types';

/**
 * Mock SEO_OPTIMIZATION_PROMPT.
 * Generates an SEO-ready title (≤60), description (≤160), shopping attrs,
 * and a weakness audit. In real mode this is a single GPT-4o call.
 */
export function runSEO(p: Product): SEOResult {
  const brand = 'Omnia';
  const location = 'Dubai Luxury Jewelry';
  const material = p.material.charAt(0).toUpperCase() + p.material.slice(1);

  // Title: try ≤60 chars
  let title = `${brand} ${material} ${p.display_title} - ${location}`;
  if (title.length > 60) {
    title = `${p.display_title} · ${material} · ${brand}`;
    if (title.length > 60) title = title.slice(0, 57) + '…';
  }

  // Description: ≤160
  let description = p.is_limited_edition
    ? `Limited Edition ${p.display_title} in ${material}. Numbered & certified. Hand-crafted in Dubai. Free GCC shipping. ${cashbackHint(p)}`
    : `Hand-finished ${p.display_title} in ${material}. Crafted in Dubai. Free GCC shipping. ${cashbackHint(p)}`;
  if (description.length > 160) description = description.slice(0, 157) + '…';

  // Shopping attributes
  const category = inferGoogleCategory(p.category);
  const gender = inferGender(p);
  const shopping_attributes = {
    google_product_category: category,
    material: p.material,
    gender,
  } as const;

  // Audit — use existing notes + fresh signals
  const missing = [...p.ai_audit_notes.missing_details];
  if (!p.seo_title) missing.push('SEO title');
  if (!p.seo_description) missing.push('Meta description');
  if (p.metrics.high_bounce_alert) missing.push('High bounce rate — likely missing detail');

  return {
    seo_title: title,
    seo_description: description,
    shopping_attributes,
    audit: {
      weakness_score: Math.max(p.ai_audit_notes.weakness_score, missing.length > 0 ? 4 : 2),
      missing_details: missing,
      backlink_opportunity_keywords: backlinkKeywords(p),
    },
  };
}

/**
 * Score a product's current SEO completeness on a 0-10 scale.
 * Used by the catalogue tile to show a ring graph.
 */
export function seoScore(p: Product): number {
  let score = 0;
  if (p.seo_title) score += 2.5;
  if (p.seo_description) score += 2.5;
  if (p.google_shopping_status === 'listed') score += 2;
  if (p.ai_audit_notes.weakness_score <= 4) score += 2;
  if (p.ai_audit_notes.backlink_keywords.length > 0) score += 1;
  return Math.min(10, Math.round(score));
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function cashbackHint(p: Product) {
  if (!p.shopify_price_aed && !p.woocommerce_price_aed) return '';
  const price = p.shopify_price_aed || p.woocommerce_price_aed!;
  const cashback = Math.round(price * 0.05);
  return `Earns AED ${cashback} cashback for Limited Editions.`;
}

function inferGoogleCategory(category: string) {
  const map: Record<string, string> = {
    Rings: 'Apparel & Accessories > Jewelry > Rings',
    Necklaces: 'Apparel & Accessories > Jewelry > Necklaces',
    Earrings: 'Apparel & Accessories > Jewelry > Earrings',
    Bracelets: 'Apparel & Accessories > Jewelry > Bracelets',
    'Bridal Sets': 'Apparel & Accessories > Jewelry > Jewelry Sets',
  };
  return map[category] || 'Apparel & Accessories > Jewelry';
}

function inferGender(p: Product): 'unisex' | 'female' | 'male' {
  if (p.category === 'Bridal Sets') return 'female';
  if (/men|gent|gents/i.test(p.display_title)) return 'male';
  return 'female';
}

function backlinkKeywords(p: Product): string[] {
  const base = [
    `${p.master_title} Dubai`,
    `${p.material} ${p.category.toLowerCase()} GCC`,
    `${p.master_title} Riyadh`,
  ];
  if (p.is_limited_edition) base.push('luxury limited edition Dubai');
  return base;
}
