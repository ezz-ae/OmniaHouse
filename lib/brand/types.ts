/**
 * Brand Intelligence types — mirror the SQL:
 *   brand_intelligence       (20260526)
 *   ga_events                (20260528)
 *   user_intelligence        (20260528)
 *   meta_posts, meta_ads, meta_alerts (20260601)
 *
 * Plus the agent-output shapes from:
 *   BEHAVIORAL_INTELLIGENCE_PROMPT
 *   META_INTELLIGENCE_PROMPT
 *   META_SENTIMENT_PROMPT
 */

// ─── brand_intelligence ────────────────────────────────────────────────────

export type BrandIntelligenceType =
  | 'google_keyword'
  | 'meta_segment'
  | 'google_ads_perf'
  | 'drive_ref'
  | 'sentiment';

export type BrandIntelligence = {
  id: string;
  org_id: string;
  user_id: string | null;
  type: BrandIntelligenceType;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
};

// ─── ga_events ─────────────────────────────────────────────────────────────

export type GAEventName =
  | 'page_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'payment_attempt'
  | 'payment_success'
  | 'payment_fail'
  | 'click_button'
  | 'bounce'
  | 'search'
  | 'view_product';

export type GAEvent = {
  id: string;
  org_id: string;
  session_id: string;
  user_id: string | null;
  event_name: GAEventName;
  page_path: string | null;
  metadata: {
    sku?: string;
    cart_value_aed?: number;
    button_label?: string;
    ccv_attempts?: number;
    [k: string]: any;
  };
  created_at: string;
};

// ─── user_intelligence ─────────────────────────────────────────────────────

export type IntelligenceDecisionType =
  | 'fraud_flag'
  | 'cart_recovery'
  | 'window_shopper'
  | 'abandoned_luxury'
  | 'payment_brute_forcing'
  | 'identity_mismatch'
  | 'high_bounce_alert'
  | 'heatmap_anomaly';

export type UserIntelligence = {
  id: string;
  org_id: string;
  session_id: string | null;
  decision_type: IntelligenceDecisionType;
  risk_score: number;            // 1-100
  reasoning: string | null;
  actionable_insight: string | null;
  is_resolved: boolean;
  created_at: string;
};

// ─── BEHAVIORAL_INTELLIGENCE_PROMPT output ─────────────────────────────────

export type BehavioralResult = {
  decision: 'monitor' | 'flag_fraud' | 'retarget' | 'ignore';
  reasoning: string;
  actionable_insight: string;
  risk_score: number;            // 1-100
};

// ─── meta_posts ────────────────────────────────────────────────────────────

export type MetaPlatform = 'instagram' | 'facebook';
export type MetaPostType = 'reel' | 'image' | 'carousel' | 'story';
export type MetaPostStatus = 'draft' | 'scheduled' | 'published';

export type MetaPost = {
  id: string;
  org_id: string;
  platform: MetaPlatform;
  post_type: MetaPostType;
  content_text: string | null;
  media_urls: string[];
  performance_metrics: {
    likes?: number;
    shares?: number;
    saves?: number;
    comments?: number;
    reach?: number;
    impressions?: number;
  };
  scheduled_at: string | null;
  status: MetaPostStatus;
  created_at: string;
};

// ─── meta_ads ──────────────────────────────────────────────────────────────

export type MetaAd = {
  id: string;
  org_id: string;
  ad_id: string;                 // external Meta ad id
  campaign_name: string | null;
  spend_aed: number;
  roas: number;
  sentiment_score: number;       // 1-100
  is_monitored: boolean;
  updated_at: string;
};

// ─── meta_alerts ───────────────────────────────────────────────────────────

export type MetaAlertType = 'negative_surge' | 'low_roas' | 'ad_violation' | 'attack_warning' | 'posting_opportunity';
export type MetaAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type MetaAlert = {
  id: string;
  org_id: string;
  type: MetaAlertType;
  severity: MetaAlertSeverity;
  message: string;
  metadata: Record<string, any>;
  is_resolved: boolean;
  created_at: string;
};

// ─── META_INTELLIGENCE_PROMPT output ───────────────────────────────────────

export type MetaSentinelResult = {
  alerts: {
    type: 'attack_warning' | 'ad_risk' | 'posting_opportunity';
    severity: 'medium' | 'high' | 'critical';
    message: string;
    suggested_action: string;
  }[];
  schedule_suggestions: {
    content_theme: string;
    best_time: string;
    reasoning: string;
  }[];
  roas_summary: string;
};

// ─── META_SENTIMENT_PROMPT output ──────────────────────────────────────────

export type MetaSentimentResult = {
  sentiment: 'negative' | 'neutral' | 'positive';
  is_hostile: boolean;
  confidence: number;
  reasoning?: string;
};
