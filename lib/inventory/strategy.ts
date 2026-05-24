import type { Product, StrategySuggestion, StrategyAction } from './types';

/**
 * Mock implementation of INVENTORY_STRATEGY_PROMPT.
 * Strict logic from the prompt:
 *   - High Seen / Low Bought   → PRICE_CHECK   (check market parity)
 *   - High Searched / High Bounced → OPTIMIZE_CONTENT (missing stone/size info)
 *   - High Searched / google_shopping_status='pending' → LIST_GOOGLE_SHOPPING
 *   - High Bought / Low Stock   → RESTOCK
 */
export function runStrategy(products: Product[]): StrategySuggestion[] {
  const suggestions: StrategySuggestion[] = [];

  for (const p of products) {
    const m = p.metrics;
    const ratio = m.seen_7d > 0 ? m.bought_7d / m.seen_7d : 0;
    const bounceRate = m.seen_7d > 0 ? m.bounced_7d / m.seen_7d : 0;

    // RESTOCK — High Bought / Low Stock
    const onShopifyLow = p.on_shopify && p.shopify_qty !== null && p.shopify_qty <= 3;
    const onWooLow = p.on_woocommerce && p.woocommerce_qty !== null && p.woocommerce_qty <= 3;
    if (m.bought_7d >= 10 && (onShopifyLow || onWooLow)) {
      const totalQty = (p.shopify_qty || 0) + (p.woocommerce_qty || 0);
      suggestions.push({
        sku: p.master_sku,
        master_title: p.display_title,
        action: 'RESTOCK',
        reason: `${m.bought_7d} sold in 7d, only ${totalQty} left across stores.`,
        impact_score: clamp(60 + m.bought_7d * 2 - totalQty * 5, 1, 100),
        signal: snapshot(m),
      });
      continue; // RESTOCK dominates other actions for the same SKU
    }

    // PRICE_CHECK — High Seen / Low Bought (conversion gap)
    if (m.seen_7d >= 400 && ratio < 0.02) {
      suggestions.push({
        sku: p.master_sku,
        master_title: p.display_title,
        action: 'PRICE_CHECK',
        reason: `${m.seen_7d} views, only ${m.bought_7d} bought (${(ratio * 100).toFixed(1)}%). Possible price mismatch with market.`,
        impact_score: clamp(40 + Math.floor(m.seen_7d / 30), 1, 100),
        signal: snapshot(m),
      });
    }

    // OPTIMIZE_CONTENT — High Searched / High Bounced
    if (m.searched_7d >= 50 && bounceRate >= 0.30) {
      suggestions.push({
        sku: p.master_sku,
        master_title: p.display_title,
        action: 'OPTIMIZE_CONTENT',
        reason: `${m.searched_7d} internal searches, ${(bounceRate * 100).toFixed(0)}% bounce. Likely missing ${p.ai_audit_notes.missing_details[0] || 'product info'}.`,
        impact_score: clamp(50 + Math.floor(bounceRate * 100), 1, 100),
        signal: snapshot(m),
      });
    }

    // LIST_GOOGLE_SHOPPING — High intent, not yet listed
    if (m.searched_7d >= 40 && p.google_shopping_status === 'pending') {
      suggestions.push({
        sku: p.master_sku,
        master_title: p.display_title,
        action: 'LIST_GOOGLE_SHOPPING',
        reason: `${m.searched_7d} searches indicate intent. Listing on Google Shopping could capture demand.`,
        impact_score: clamp(45 + m.searched_7d, 1, 100),
        signal: snapshot(m),
      });
    }

    // LIVE-data fallback rules — work without GA events, derived from the
    // parity scrape alone. Important now because the 4,400+ live products
    // have no metrics until ga_events is wired.
    if (p.source === 'live') {
      if (p.parity_status === 'both_price_drift' && p.price_delta_pct !== null && Math.abs(p.price_delta_pct) > 5) {
        suggestions.push({
          sku: p.master_sku,
          master_title: p.display_title,
          action: 'PRICE_CHECK',
          reason: `Price drift ${p.price_delta_pct.toFixed(1)}% between .ae (${p.shopify_price_aed}) and .com (${p.woocommerce_price_aed}).`,
          impact_score: clamp(40 + Math.floor(Math.abs(p.price_delta_pct)), 1, 100),
          signal: snapshot(m),
        });
      }
      // Woo-only stock running low
      if (p.parity_status !== 'shopify_only' && p.woocommerce_qty !== null && p.woocommerce_qty <= 3 && p.woocommerce_qty > 0) {
        suggestions.push({
          sku: p.master_sku,
          master_title: p.display_title,
          action: 'RESTOCK',
          reason: `Only ${p.woocommerce_qty} left on omniastores.com.`,
          impact_score: clamp(55 + (5 - p.woocommerce_qty) * 5, 1, 100),
          signal: snapshot(m),
        });
      }
      // Shopify-only LE pieces — flag for Google Shopping listing
      const isInStock = (p.shopify_qty !== null && p.shopify_qty > 0)
        || (p.woocommerce_qty !== null && p.woocommerce_qty > 0)
        || (p.on_shopify && p.shopify_qty === null);
      if (p.parity_status === 'shopify_only' && p.is_limited_edition && isInStock) {
        suggestions.push({
          sku: p.master_sku,
          master_title: p.display_title,
          action: 'LIST_GOOGLE_SHOPPING',
          reason: 'Limited edition on .ae only. Listing on Google Shopping captures cross-country demand.',
          impact_score: 65,
          signal: snapshot(m),
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.impact_score - a.impact_score);
}


function snapshot(m: Product['metrics']) {
  return {
    seen_7d: m.seen_7d,
    bought_7d: m.bought_7d,
    searched_7d: m.searched_7d,
    bounced_7d: m.bounced_7d,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function actionTone(action: StrategyAction): 'bad' | 'warn' | 'gold' | 'info' {
  switch (action) {
    case 'RESTOCK':
      return 'bad';
    case 'OPTIMIZE_CONTENT':
      return 'warn';
    case 'LIST_GOOGLE_SHOPPING':
      return 'gold';
    case 'PRICE_CHECK':
      return 'info';
  }
}

export function actionLabel(action: StrategyAction): string {
  return action.toLowerCase().replace(/_/g, ' ');
}
