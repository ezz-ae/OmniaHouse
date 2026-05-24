/**
 * Inventory Room types — mirror the SQL schema:
 *   products (with seo_*, google_shopping_status, ai_audit_notes,
 *             is_limited_edition, metadata)
 *   ga_events (page views, cart adds, bounces)
 *   user_intelligence (high_bounce_alert from the trigger)
 *
 * Plus the AI agent outputs from:
 *   SEO_OPTIMIZATION_PROMPT
 *   INVENTORY_STRATEGY_PROMPT
 *   VEO_CONTENT_INTELLIGENCE_PROMPT
 */

export type Store = 'shopify' | 'woocommerce';
export type ParityStatus = 'both_match' | 'both_price_drift' | 'shopify_only' | 'woocommerce_only' | 'unclassified';
export type SEOStatus = 'pending' | 'optimized' | 'indexed';
export type ShoppingStatus = 'pending' | 'listed' | 'rejected';

// ─── Catalogue ─────────────────────────────────────────────────────────────

export type Product = {
  id: string;
  master_sku: string;
  master_title: string;
  display_title: string;
  category: string;          // Rings · Necklaces · Earrings · Bracelets · Bridal Sets
  material: string;          // 925 silver / 18k gold / rose gold / etc
  is_limited_edition: boolean;
  image_hint?: string;       // synthetic gradient palette key (mock products)
  image_url?: string | null; // real store image (live products); takes precedence over hint
  /** Whether this row came from the live scrape vs the local mock catalogue. */
  source?: 'live' | 'mock';

  // Per-store presence
  on_shopify: boolean;
  on_woocommerce: boolean;
  shopify_price_aed: number | null;
  woocommerce_price_aed: number | null;
  shopify_qty: number | null;
  woocommerce_qty: number | null;
  shopify_url: string | null;
  woocommerce_url: string | null;

  // Drift
  parity_status: ParityStatus;
  price_delta_pct: number | null;
  last_synced_at: string;

  // SEO
  seo_title: string | null;
  seo_description: string | null;
  seo_status: SEOStatus;
  google_shopping_status: ShoppingStatus;
  ai_audit_notes: AuditNotes;

  // Behaviour (from ga_events aggregates)
  metrics: ProductMetrics;
};

export type AuditNotes = {
  weakness_score: number;          // 1-10, 10 weakest
  missing_details: string[];       // ['stone clarity', 'sizing info', 'material weight']
  backlink_keywords: string[];
};

export type ProductMetrics = {
  seen_7d: number;             // page views
  bought_7d: number;
  searched_7d: number;         // internal search
  bounced_7d: number;
  high_bounce_alert: boolean;  // from the GA trigger
};

// ─── INVENTORY_STRATEGY_PROMPT output ──────────────────────────────────────

export type StrategyAction = 'RESTOCK' | 'PRICE_CHECK' | 'LIST_GOOGLE_SHOPPING' | 'OPTIMIZE_CONTENT';

export type StrategySuggestion = {
  sku: string;
  master_title: string;
  action: StrategyAction;
  reason: string;
  impact_score: number;        // 1-100
  signal: {
    seen_7d: number;
    bought_7d: number;
    searched_7d: number;
    bounced_7d: number;
  };
};

// ─── SEO_OPTIMIZATION_PROMPT output ────────────────────────────────────────

export type ShoppingAttributes = {
  google_product_category: string;
  material: string;
  gender: 'unisex' | 'female' | 'male';
};

export type SEOResult = {
  seo_title: string;           // ≤60 chars
  seo_description: string;     // ≤160 chars
  shopping_attributes: ShoppingAttributes;
  audit: {
    weakness_score: number;
    missing_details: string[];
    backlink_opportunity_keywords: string[];
  };
};

// ─── VEO_CONTENT_INTELLIGENCE_PROMPT output ────────────────────────────────

export type VeoResult = {
  video_prompt: string;
  creative_brief: string;
  music_mood: string;
  seo_video_tags: string[];
};

// ─── Parity summary ────────────────────────────────────────────────────────

export type ParitySummary = {
  total: number;
  both_match: number;
  both_price_drift: number;
  shopify_only: number;
  woocommerce_only: number;
  low_stock: number;            // qty ≤ 3 on either store
  limited_editions: number;
  needs_seo: number;            // seo_status='pending'
  needs_shopping_list: number;  // google_shopping_status='pending'
  last_run: string;
  next_run: string;
  source: 'hex' | 'live';
};
