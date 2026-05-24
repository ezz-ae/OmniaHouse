/**
 * Live inventory scrape — mirrors hex/inventory-parity.yaml exactly.
 *
 * Shopify (omniastores.ae) and WooCommerce (omniastores.com) both expose
 * public JSON product endpoints that don't need auth. The Hex notebook
 * pulls from these and unifies them; this module is the same logic in
 * TypeScript so the Next.js server can do it directly.
 *
 *   Shopify     →  https://omniastores.ae/products.json
 *   WooCommerce →  https://omniastores.com/wp-json/wc/store/v1/products
 *
 * Output: unified product rows with parity tagging, matching the shape
 * of df_unified + df_parity from the Hex project.
 */

const SHOPIFY_BASE = 'https://omniastores.ae';
const SHOPIFY_PRODUCTS = `${SHOPIFY_BASE}/products.json`;
const WOO_BASE = 'https://omniastores.com';
const WOO_PRODUCTS = `${WOO_BASE}/wp-json/wc/store/v1/products`;

const UA = 'OmniaHouse internal sync (+read-only catalogue parity)';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_PAGES = 10;

const COLOR_SUFFIX_RE = /\s+(white|red|pink|gold|green|blue|silver|purple|yellow|rose gold|multicolor|moonstone|ruby|emerald|sapphire)$/i;
const TITLE_SPLIT_RE = /\s+[-–—]\s+/;

// ─── Shopify scrape ────────────────────────────────────────────────────────

export type ShopifyRow = {
  source: 'shopify';
  source_id: string;
  handle: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  tags: string;
  sku: string | null;
  variant_title: string | null;
  price_aed: number | null;
  compare_at_price_aed: number | null;
  available: boolean;
  featured_image_url: string | null;
  permalink: string;
  updated_at: string | null;
};

export async function scrapeShopify(): Promise<ShopifyRow[]> {
  const out: ShopifyRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await safeFetch(`${SHOPIFY_PRODUCTS}?limit=250&page=${page}`);
    const products = data?.products as any[] | undefined;
    if (!products || products.length === 0) break;
    for (const p of products) {
      const images = p.images || [];
      const variants = p.variants || [{}];
      for (const v of variants) {
        out.push({
          source: 'shopify',
          source_id: String(p.id),
          handle: p.handle,
          title: p.title || '',
          vendor: p.vendor || null,
          product_type: p.product_type || null,
          tags: p.tags || '',
          sku: v.sku || null,
          variant_title: v.title || null,
          price_aed: parseDecimal(v.price),
          compare_at_price_aed: parseDecimal(v.compare_at_price),
          available: !!v.available,
          featured_image_url: images[0]?.src || null,
          permalink: `${SHOPIFY_BASE}/products/${p.handle}`,
          updated_at: p.updated_at || null,
        });
      }
    }
    if (products.length < 250) break;
  }
  return out;
}

// ─── WooCommerce scrape ────────────────────────────────────────────────────

export type WooRow = {
  source: 'woocommerce';
  source_id: string;
  slug: string;
  title: string;
  sku: string | null;
  price_aed: number | null;
  regular_price_aed: number | null;
  sale_price_aed: number | null;
  on_sale: boolean;
  is_in_stock: boolean;
  stock_quantity: number | null;
  categories: string;
  tags: string;
  featured_image_url: string | null;
  permalink: string;
};

export async function scrapeWoo(): Promise<WooRow[]> {
  const out: WooRow[] = [];
  for (let page = 1; page <= MAX_PAGES * 2; page++) {
    const data = await safeFetch(`${WOO_PRODUCTS}?per_page=100&page=${page}`);
    const products = Array.isArray(data) ? data : undefined;
    if (!products || products.length === 0) break;
    for (const p of products) {
      const prices = p.prices || {};
      const minor = parseInt(String(prices.currency_minor_unit ?? '2'), 10) || 2;
      const div = Math.pow(10, minor);
      const categories = (p.categories || []).map((c: any) => c.name).filter(Boolean).join(', ');
      const tags = (p.tags || []).map((t: any) => t.name).filter(Boolean).join(', ');
      const images = p.images || [];
      out.push({
        source: 'woocommerce',
        source_id: String(p.id),
        slug: p.slug,
        title: p.name || '',
        sku: p.sku || null,
        price_aed: prices.price ? Number(prices.price) / div : null,
        regular_price_aed: prices.regular_price ? Number(prices.regular_price) / div : null,
        sale_price_aed: p.on_sale && prices.sale_price ? Number(prices.sale_price) / div : null,
        on_sale: !!p.on_sale,
        is_in_stock: !!p.is_in_stock,
        stock_quantity: p.stock_quantity ?? null,
        categories,
        tags,
        featured_image_url: images[0]?.src || null,
        permalink: p.permalink || `${WOO_BASE}/product/${p.slug}`,
      });
    }
    if (products.length < 100) break;
  }
  return out;
}

// ─── Unify (mirrors hex df_unified + df_parity) ────────────────────────────

export type UnifiedLiveProduct = {
  match_key: string;
  master_title: string;
  display_title: string;
  sku: string | null;
  category: string;
  material: string;
  on_shopify: boolean;
  on_woocommerce: boolean;
  shopify_price_aed: number | null;
  woocommerce_price_aed: number | null;
  shopify_qty: number | null;
  woocommerce_qty: number | null;
  shopify_url: string | null;
  woocommerce_url: string | null;
  in_stock_anywhere: boolean;
  is_limited_edition: boolean;
  parity_status: 'both_match' | 'both_price_drift' | 'shopify_only' | 'woocommerce_only' | 'unclassified';
  price_delta_pct: number | null;
  image_url: string | null;
  last_synced_at: string;
};

export function unify(shopifyRows: ShopifyRow[], wooRows: WooRow[]): UnifiedLiveProduct[] {
  const now = new Date().toISOString();

  // Index Shopify by normalized SKU and by master title
  const sBySku = new Map<string, ShopifyRow>();
  const sByMaster = new Map<string, ShopifyRow>();
  for (const s of shopifyRows) {
    const sku = norm(s.sku);
    const master = cleanMasterTitle(s.title);
    if (sku && !sBySku.has(sku)) sBySku.set(sku, s);
    if (master && !sByMaster.has(master)) sByMaster.set(master, s);
  }

  const seen = new Set<string>();
  const result: UnifiedLiveProduct[] = [];

  // First pass: WooCommerce rows, matched to Shopify when possible
  for (const w of wooRows) {
    const wsku = norm(w.sku);
    const wmaster = cleanMasterTitle(w.title);
    const matchKey = wsku ? `sku:${wsku}` : `title:${wmaster}`;
    if (seen.has(matchKey)) continue;
    seen.add(matchKey);

    let s: ShopifyRow | undefined;
    if (wsku) s = sBySku.get(wsku);
    if (!s) s = sByMaster.get(wmaster);

    if (s) {
      const sPrice = s.price_aed;
      const wPrice = w.price_aed;
      const delta = sPrice !== null && wPrice !== null && wPrice > 0
        ? ((sPrice - wPrice) / wPrice) * 100
        : null;
      const parity = delta === null
        ? 'unclassified'
        : Math.abs(delta) <= 1 ? 'both_match' : 'both_price_drift';

      result.push({
        match_key: matchKey,
        master_title: wmaster,
        display_title: w.title,
        sku: w.sku || s.sku,
        category: firstSegment(w.categories) || s.product_type || 'Jewelry',
        material: extractMaterial(w.title || s.title),
        on_shopify: true,
        on_woocommerce: true,
        shopify_price_aed: sPrice,
        woocommerce_price_aed: wPrice,
        shopify_qty: null,
        woocommerce_qty: w.stock_quantity,
        shopify_url: s.permalink,
        woocommerce_url: w.permalink,
        in_stock_anywhere: !!(s.available || w.is_in_stock),
        is_limited_edition: detectLE(w.title, w.categories, w.tags) || detectLE(s.title, '', s.tags),
        parity_status: parity,
        price_delta_pct: delta,
        image_url: w.featured_image_url || s.featured_image_url,
        last_synced_at: now,
      });
    } else {
      result.push({
        match_key: matchKey,
        master_title: wmaster,
        display_title: w.title,
        sku: w.sku,
        category: firstSegment(w.categories) || 'Jewelry',
        material: extractMaterial(w.title),
        on_shopify: false,
        on_woocommerce: true,
        shopify_price_aed: null,
        woocommerce_price_aed: w.price_aed,
        shopify_qty: null,
        woocommerce_qty: w.stock_quantity,
        shopify_url: null,
        woocommerce_url: w.permalink,
        in_stock_anywhere: w.is_in_stock,
        is_limited_edition: detectLE(w.title, w.categories, w.tags),
        parity_status: 'woocommerce_only',
        price_delta_pct: null,
        image_url: w.featured_image_url,
        last_synced_at: now,
      });
    }
  }

  // Second pass: Shopify-only products (anything not already matched)
  for (const s of shopifyRows) {
    const ssku = norm(s.sku);
    const smaster = cleanMasterTitle(s.title);
    const matchKey = ssku ? `sku:${ssku}` : `title:${smaster}`;
    if (seen.has(matchKey)) continue;
    seen.add(matchKey);

    result.push({
      match_key: matchKey,
      master_title: smaster,
      display_title: s.title,
      sku: s.sku,
      category: s.product_type || 'Jewelry',
      material: extractMaterial(s.title),
      on_shopify: true,
      on_woocommerce: false,
      shopify_price_aed: s.price_aed,
      woocommerce_price_aed: null,
      shopify_qty: null,
      woocommerce_qty: null,
      shopify_url: s.permalink,
      woocommerce_url: null,
      in_stock_anywhere: s.available,
      is_limited_edition: detectLE(s.title, '', s.tags),
      parity_status: 'shopify_only',
      price_delta_pct: null,
      image_url: s.featured_image_url,
      last_synced_at: now,
    });
  }

  return result;
}

// ─── Helpers — clean_master_title is the exact same logic as the Hex Python ─

export function cleanMasterTitle(title: string | null | undefined): string {
  if (!title) return '';
  let v = htmlUnescape(title).toLowerCase().replace(/ /g, ' ').trim();
  v = v.replace(/&/g, ' and ');
  v = v.replace(/\b92\.5\b/g, '925');
  v = v.replace(/^omnia\s+/, '');
  v = v.split(TITLE_SPLIT_RE)[0];
  v = v.replace(COLOR_SUFFIX_RE, '').trim();
  v = v.replace(/\s+/g, ' ');
  return v;
}

function htmlUnescape(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function norm(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase();
}

function firstSegment(csv: string | null | undefined): string {
  if (!csv) return '';
  return csv.split(',')[0]?.trim() || '';
}

function parseDecimal(s: any): number | null {
  if (s === null || s === undefined || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function extractMaterial(title: string): string {
  const t = (title || '').toLowerCase();
  if (/\b18\s*-?\s*k\b|18\s*karat|18k\s*gold/i.test(t)) return '18k gold';
  if (/sterling|925\s*silver|\.925/i.test(t)) return '925 silver';
  if (/rose\s*gold/i.test(t)) return 'rose gold';
  if (/gold[-\s]?plated|gold\s*plate/i.test(t)) return 'gold-plated';
  if (/pearl/i.test(t)) return 'pearl';
  if (/platinum/i.test(t)) return 'platinum';
  if (/diamond/i.test(t)) return 'diamond';
  if (/silver/i.test(t)) return 'silver';
  if (/gold/i.test(t)) return 'gold';
  return 'mixed';
}

function detectLE(title: string, categories: string, tags: string): boolean {
  const text = `${title || ''} ${categories || ''} ${tags || ''}`.toLowerCase();
  return /\blimited[\s-]edition\b|\ble\b|founder\s*series|edition\s*\d{4}/i.test(text);
}

// ─── Fetch with timeout ────────────────────────────────────────────────────

async function safeFetch(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 400) return null;
      throw new Error(`${url} → ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
