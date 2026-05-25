import type { ManagedProduct, OrderSubmission, BrandSignal, OperationsState } from '@/lib/operations/store';

// Mirrors the Hex notebook analysis cells. Pure functions that can be
// invoked from /api/inventory/analysis or from any room aggregator.

export type InventoryHealth = {
  metric: string;
  value: number | string;
};

export type CategoryRow = {
  category: string;
  shopify: number;
  woocommerce: number;
  total: number;
};

export type RestockRow = {
  sku: string;
  display_title: string;
  on_shopify: boolean;
  on_woocommerce: boolean;
  remaining_qty: number;
  price_aed: number | null;
  reason: string;
};

export type DriftSeverity = 'minor' | 'low' | 'medium' | 'high' | 'critical';
export type DriftRow = { severity: DriftSeverity; products: number; pct_range: string };
export type DriftDetail = {
  sku: string;
  master_title: string;
  shopify_price_aed: number | null;
  woocommerce_price_aed: number | null;
  price_delta_pct: number;
  abs_delta: number;
  severity: DriftSeverity;
};

export type LeLifecycleRow = {
  source: 'shopify' | 'woocommerce' | 'both';
  in_stock: number;
  out_of_stock: number;
};

export type GapRow = { gap: string; products: number };

export type TopMoverRow = {
  sku: string;
  display_title: string;
  bought_7d: number;
  seen_7d: number;
  ratio: number;
  signal: string;
};

export type SlowMoverRow = {
  sku: string;
  display_title: string;
  seen_7d: number;
  bought_7d: number;
  bounce_pct: number;
  reason: string;
};

export type DemandSignalRow = {
  sku: string;
  display_title: string | null;
  whatsapp_asks: number;
  ghost_browse: number;
  positive_signals: number;
  negative_signals: number;
  recommended_action: string;
};

export type InventoryAnalysis = {
  generated_at: string;
  inventory_health: InventoryHealth[];
  category_mix: CategoryRow[];
  restock_recommendations: RestockRow[];
  drift_severity: DriftRow[];
  drift_details: DriftDetail[];
  le_lifecycle: LeLifecycleRow[];
  per_store_gap: GapRow[];
  top_movers: TopMoverRow[];
  slow_movers: SlowMoverRow[];
  demand_signals: DemandSignalRow[];
  shopify_only: { sku: string; display_title: string; price_aed: number | null }[];
  woocommerce_only: { sku: string; display_title: string; price_aed: number | null }[];
};

// ─── Calculation helpers ──────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safe(n: number | null): number { return n ?? 0; }

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Number((xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2));
}

function driftSeverity(absDelta: number): DriftSeverity {
  if (absDelta < 2) return 'minor';
  if (absDelta < 5) return 'low';
  if (absDelta < 10) return 'medium';
  if (absDelta < 25) return 'high';
  return 'critical';
}

// ─── Cells ────────────────────────────────────────────────────────────────

export function inventoryHealth(products: ManagedProduct[], orders: OrderSubmission[]): InventoryHealth[] {
  const both = products.filter((p) => p.on_shopify && p.on_woocommerce);
  const shopOnly = products.filter((p) => p.on_shopify && !p.on_woocommerce);
  const wooOnly = products.filter((p) => !p.on_shopify && p.on_woocommerce);
  const drifted = products.filter((p) => p.parity_status === 'both_price_drift');

  const stockValueShopify = products.filter((p) => p.on_shopify).reduce((s, p) => s + safe(p.shopify_price_aed) * (num(p.shopify_qty) ?? 0), 0);
  const stockValueWoo = products.filter((p) => p.on_woocommerce).reduce((s, p) => s + safe(p.woocommerce_price_aed) * (num(p.woocommerce_qty) ?? 0), 0);

  const outShopify = products.filter((p) => p.on_shopify && (num(p.shopify_qty) ?? 0) <= 0).length;
  const outWoo = products.filter((p) => p.on_woocommerce && (num(p.woocommerce_qty) ?? 0) <= 0).length;
  const lowShopify = products.filter((p) => p.on_shopify && (num(p.shopify_qty) ?? 99) > 0 && (num(p.shopify_qty) ?? 99) <= 3).length;
  const lowWoo = products.filter((p) => p.on_woocommerce && (num(p.woocommerce_qty) ?? 99) > 0 && (num(p.woocommerce_qty) ?? 99) <= 3).length;

  const ordersThisWeek = orders.filter((o) => o.status !== 'draft').length;
  const revenue = orders.filter((o) => o.status === 'paid' || o.status === 'fulfilled').reduce((s, o) => s + o.total_aed, 0);
  const aov = ordersThisWeek > 0 ? revenue / ordersThisWeek : 0;
  const avgPriceShopify = avg(products.filter((p) => p.on_shopify).map((p) => safe(p.shopify_price_aed)));
  const avgPriceWoo = avg(products.filter((p) => p.on_woocommerce).map((p) => safe(p.woocommerce_price_aed)));

  return [
    { metric: 'products_total', value: products.length },
    { metric: 'products_shopify', value: products.filter((p) => p.on_shopify).length },
    { metric: 'products_woocommerce', value: products.filter((p) => p.on_woocommerce).length },
    { metric: 'products_both', value: both.length },
    { metric: 'products_shopify_only', value: shopOnly.length },
    { metric: 'products_woocommerce_only', value: wooOnly.length },
    { metric: 'price_drift_count', value: drifted.length },
    { metric: 'out_of_stock_shopify', value: outShopify },
    { metric: 'out_of_stock_woocommerce', value: outWoo },
    { metric: 'low_stock_shopify', value: lowShopify },
    { metric: 'low_stock_woocommerce', value: lowWoo },
    { metric: 'stock_value_shopify_aed', value: Math.round(stockValueShopify) },
    { metric: 'stock_value_woocommerce_aed', value: Math.round(stockValueWoo) },
    { metric: 'avg_price_aed_shopify', value: avgPriceShopify },
    { metric: 'avg_price_aed_woocommerce', value: avgPriceWoo },
    { metric: 'orders_paid_total', value: orders.filter((o) => o.status === 'paid' || o.status === 'fulfilled').length },
    { metric: 'revenue_paid_aed', value: Math.round(revenue) },
    { metric: 'avg_order_value_aed', value: Math.round(aov) },
  ];
}

export function categoryMix(products: ManagedProduct[]): CategoryRow[] {
  const buckets = new Map<string, { shopify: number; woocommerce: number }>();
  for (const p of products) {
    const cat = p.category || 'Uncategorized';
    if (!buckets.has(cat)) buckets.set(cat, { shopify: 0, woocommerce: 0 });
    const b = buckets.get(cat)!;
    if (p.on_shopify) b.shopify += 1;
    if (p.on_woocommerce) b.woocommerce += 1;
  }
  return Array.from(buckets.entries())
    .map(([category, b]) => ({ category, shopify: b.shopify, woocommerce: b.woocommerce, total: b.shopify + b.woocommerce }))
    .sort((a, b) => b.total - a.total);
}

export function restockRecommendations(products: ManagedProduct[]): RestockRow[] {
  const out: RestockRow[] = [];
  for (const p of products) {
    const sq = num(p.shopify_qty);
    const wq = num(p.woocommerce_qty);
    const remaining = Math.min(...[sq, wq].filter((v): v is number => v !== null && v > 0).concat([99]));
    if (remaining > 3) continue;
    if (sq !== null && sq <= 3 && sq >= 0) {
      out.push({
        sku: p.master_sku, display_title: p.display_title,
        on_shopify: p.on_shopify, on_woocommerce: p.on_woocommerce,
        remaining_qty: sq,
        price_aed: p.shopify_price_aed,
        reason: sq === 0 ? 'Out of stock on .ae' : `Only ${sq} left on .ae`,
      });
    }
    if (wq !== null && wq <= 3 && wq >= 0) {
      out.push({
        sku: p.master_sku, display_title: p.display_title,
        on_shopify: p.on_shopify, on_woocommerce: p.on_woocommerce,
        remaining_qty: wq,
        price_aed: p.woocommerce_price_aed,
        reason: wq === 0 ? 'Out of stock on .com' : `Only ${wq} left on .com`,
      });
    }
  }
  return out.sort((a, b) => a.remaining_qty - b.remaining_qty).slice(0, 30);
}

export function driftAnalysis(products: ManagedProduct[]): { severity: DriftRow[]; details: DriftDetail[] } {
  const ladder: Record<DriftSeverity, number> = { minor: 0, low: 0, medium: 0, high: 0, critical: 0 };
  const details: DriftDetail[] = [];
  for (const p of products) {
    if (p.parity_status !== 'both_price_drift') continue;
    const absDelta = Math.abs(p.price_delta_pct ?? 0);
    const sev = driftSeverity(absDelta);
    ladder[sev] += 1;
    details.push({
      sku: p.master_sku, master_title: p.master_title,
      shopify_price_aed: p.shopify_price_aed,
      woocommerce_price_aed: p.woocommerce_price_aed,
      price_delta_pct: p.price_delta_pct ?? 0,
      abs_delta: absDelta, severity: sev,
    });
  }
  const ranges: Record<DriftSeverity, string> = {
    minor: '<2%', low: '2–5%', medium: '5–10%', high: '10–25%', critical: '>25%',
  };
  const severity = (Object.keys(ladder) as DriftSeverity[]).map((sev) => ({ severity: sev, products: ladder[sev], pct_range: ranges[sev] }));
  return { severity, details: details.sort((a, b) => b.abs_delta - a.abs_delta).slice(0, 20) };
}

export function leLifecycle(products: ManagedProduct[]): LeLifecycleRow[] {
  const le = products.filter((p) => p.is_limited_edition);
  const shop = le.filter((p) => p.on_shopify && !p.on_woocommerce);
  const woo = le.filter((p) => p.on_woocommerce && !p.on_shopify);
  const both = le.filter((p) => p.on_shopify && p.on_woocommerce);
  const tally = (group: ManagedProduct[]) => {
    let inStock = 0, oos = 0;
    for (const p of group) {
      const sq = num(p.shopify_qty) ?? 0;
      const wq = num(p.woocommerce_qty) ?? 0;
      if ((p.on_shopify && sq > 0) || (p.on_woocommerce && wq > 0)) inStock += 1;
      else oos += 1;
    }
    return { in_stock: inStock, out_of_stock: oos };
  };
  return [
    { source: 'shopify', ...tally(shop) },
    { source: 'woocommerce', ...tally(woo) },
    { source: 'both', ...tally(both) },
  ];
}

export function perStoreGap(products: ManagedProduct[]): GapRow[] {
  const map: Record<string, number> = {
    'match (both stores)': 0,
    'missing on .com': 0,
    'missing on .ae': 0,
    'price drift': 0,
    'needs review': 0,
  };
  for (const p of products) {
    if (p.parity_status === 'both_match') map['match (both stores)'] += 1;
    else if (p.parity_status === 'shopify_only') map['missing on .com'] += 1;
    else if (p.parity_status === 'woocommerce_only') map['missing on .ae'] += 1;
    else if (p.parity_status === 'both_price_drift') map['price drift'] += 1;
    else map['needs review'] += 1;
  }
  return Object.entries(map).map(([gap, products]) => ({ gap, products })).sort((a, b) => b.products - a.products);
}

export function topMovers(products: ManagedProduct[]): TopMoverRow[] {
  return products
    .filter((p) => p.metrics.bought_7d > 0)
    .map((p) => {
      const seen = p.metrics.seen_7d || 1;
      const ratio = Number((p.metrics.bought_7d / seen).toFixed(3));
      const signal = ratio >= 0.05 ? 'Strong conversion' : ratio >= 0.02 ? 'Healthy demand' : 'Volume play';
      return { sku: p.master_sku, display_title: p.display_title, bought_7d: p.metrics.bought_7d, seen_7d: p.metrics.seen_7d, ratio, signal };
    })
    .sort((a, b) => b.bought_7d - a.bought_7d)
    .slice(0, 12);
}

export function slowMovers(products: ManagedProduct[]): SlowMoverRow[] {
  return products
    .filter((p) => p.metrics.seen_7d >= 100 && p.metrics.bought_7d < 5)
    .map((p) => {
      const bouncePct = p.metrics.seen_7d > 0 ? Math.round((p.metrics.bounced_7d / p.metrics.seen_7d) * 100) : 0;
      const reason = bouncePct >= 30 ? 'High bounce — content audit needed' : p.seo_status !== 'optimized' ? 'SEO not optimized' : 'Strong views, weak conversion';
      return { sku: p.master_sku, display_title: p.display_title, seen_7d: p.metrics.seen_7d, bought_7d: p.metrics.bought_7d, bounce_pct: bouncePct, reason };
    })
    .sort((a, b) => b.bounce_pct - a.bounce_pct)
    .slice(0, 12);
}

export function demandSignals(products: ManagedProduct[], signals: BrandSignal[], orders: OrderSubmission[]): DemandSignalRow[] {
  const byProduct = new Map<string, { positive: number; negative: number; ghost: number; asks: number; product: ManagedProduct | null }>();
  for (const p of products) byProduct.set(p.master_sku, { positive: 0, negative: 0, ghost: 0, asks: 0, product: p });
  for (const s of signals) {
    if (!s.product_sku) continue;
    if (!byProduct.has(s.product_sku)) byProduct.set(s.product_sku, { positive: 0, negative: 0, ghost: 0, asks: 0, product: products.find((p) => p.master_sku === s.product_sku) || null });
    const bucket = byProduct.get(s.product_sku)!;
    if (s.kind === 'ghost_browse') bucket.ghost += s.volume;
    if (s.tone === 'positive') bucket.positive += 1;
    if (s.tone === 'negative') bucket.negative += 1;
  }
  for (const o of orders) {
    for (const line of o.lines) {
      const bucket = byProduct.get(line.sku);
      if (bucket) bucket.asks += line.qty;
    }
  }
  const rows: DemandSignalRow[] = [];
  for (const [sku, b] of byProduct) {
    const score = b.positive * 3 + b.ghost / 3 + b.asks * 2 - b.negative * 2;
    if (score <= 0) continue;
    let action = 'Watch';
    if (b.negative > 0) action = 'Address objection before push';
    else if (b.positive >= 2) action = 'Scale (creative + retarget)';
    else if (b.ghost >= 5) action = 'Retarget ghost browsers via WhatsApp';
    else if (b.asks >= 2) action = 'Stock check + share to recent inquirers';
    rows.push({
      sku, display_title: b.product?.display_title ?? null,
      whatsapp_asks: b.asks, ghost_browse: b.ghost,
      positive_signals: b.positive, negative_signals: b.negative,
      recommended_action: action,
    });
  }
  return rows.sort((a, b) => (b.positive_signals * 3 + b.ghost_browse / 3) - (a.positive_signals * 3 + a.ghost_browse / 3)).slice(0, 12);
}

export function shopifyOnly(products: ManagedProduct[]) {
  return products.filter((p) => p.parity_status === 'shopify_only').map((p) => ({ sku: p.master_sku, display_title: p.display_title, price_aed: p.shopify_price_aed }));
}

export function woocommerceOnly(products: ManagedProduct[]) {
  return products.filter((p) => p.parity_status === 'woocommerce_only').map((p) => ({ sku: p.master_sku, display_title: p.display_title, price_aed: p.woocommerce_price_aed }));
}

// ─── Entry point ─────────────────────────────────────────────────────────

export function buildInventoryAnalysis(state: OperationsState): InventoryAnalysis {
  const products = state.products;
  const orders = state.orders;
  const signals = state.signals;
  const drift = driftAnalysis(products);
  return {
    generated_at: new Date().toISOString(),
    inventory_health: inventoryHealth(products, orders),
    category_mix: categoryMix(products),
    restock_recommendations: restockRecommendations(products),
    drift_severity: drift.severity,
    drift_details: drift.details,
    le_lifecycle: leLifecycle(products),
    per_store_gap: perStoreGap(products),
    top_movers: topMovers(products),
    slow_movers: slowMovers(products),
    demand_signals: demandSignals(products, signals, orders),
    shopify_only: shopifyOnly(products),
    woocommerce_only: woocommerceOnly(products),
  };
}
