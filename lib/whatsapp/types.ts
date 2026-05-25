/**
 * WhatsApp Desk type definitions.
 * Matches the SQL schema (ai_extractions, order_submissions, customer_wallets,
 * crm_identity_links, crm_shortcuts) + the prompts in prompts/raw-prompts.txt.
 */

export type Language = 'en' | 'ar' | 'mixed';
export type Store = 'shopify' | 'woocommerce' | 'whatsapp';
export type Country = 'AE' | 'SA' | 'KW' | 'BH' | 'QA' | 'OM' | 'OTHER';

// ─── Conversation ──────────────────────────────────────────────────────────

export type ConvStatus = 'unclaimed' | 'in_progress' | 'awaiting_customer' | 'ready_for_draft' | 'closed_won' | 'closed_lost';

export type Message = {
  id: string;
  at: string;           // HH:MM
  from: 'customer' | 'agent' | 'system';
  body: string;
  language: Language;
  media?: { kind: 'image' | 'pdf' | 'audio'; filename: string; verified?: boolean; verification_score?: number; duration_sec?: number };
  // Internal attribution: who on the team actually sent this message.
  // Customer messages have null. Used by analytics, audit, and the bubble label.
  sent_by_id?: string | null;
  sent_by_name?: string | null;
};

export type VoiceTranscription = {
  message_id: string;
  filename: string;
  language: Language;
  transcript: string;
  summary: string;
  intent: string | null;
  duration_sec: number | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  phone: string;
  country: Country;
  customer_id: string | null;       // matched OmniaCustomer id, or null = new
  status: ConvStatus;
  assignee: string | null;
  unread: number;
  language: Language;
  last_at: string;
  messages: Message[];
  // computed by AI on conversation open
  vibes: Vibes;
  // labels from order_submissions.labels[]
  labels: string[];
};

// ─── Customer (cross-store unified) ────────────────────────────────────────

export type CustomerHistory = {
  orders: number;
  ltv_aed: number;
  last_at: string;
  stores: Store[];
  prior_returns: number;
  refund_requests: number;        // > 1 = flag in repeat-refund warning
  vip_flag: boolean;
};

export type GhostBrowse = {
  sessions: number;
  pages_viewed: { sku: string; title: string; views: number }[];
  cart_adds_no_checkout: { sku: string; title: string; at: string }[];
  abandoned_carts: { sku: string; value_aed: number; at: string }[];
  first_seen_at: string;
};

export type CustomerCard = {
  matched: boolean;
  customer_id: string | null;
  display_name: string | null;
  phone: string;
  country: Country;
  language_pref: Language;
  history: CustomerHistory | null;
  ghost: GhostBrowse | null;
  wallet: WalletState | null;
  labels: string[];
  warnings: { type: 'repeat_refund' | 'fraud_history' | 'cod_failure' | 'price_negotiator'; severity: 'info' | 'warn' | 'bad'; note: string }[];
};

// ─── Cashback wallet (LE-restricted) ───────────────────────────────────────

export type WalletState = {
  balance_aed: number;          // restricted to Limited Editions
  last_transaction_at: string;
  recent: { at: string; amount: number; type: 'accrual' | 'spending'; note: string }[];
};

// ─── Vibes (from WHATSAPP_EXTRACTION_PROMPT.conversation_vibes) ────────────

export type Vibes = {
  happiness_level: number;       // 1-10
  urgency: 'low' | 'medium' | 'high' | 'critical';
  fraud_risk: 'low' | 'medium' | 'high';
  is_spam: boolean;
  business_blockers: string | null;
  seniority_needed: 'junior' | 'senior' | 'manager';
};

// ─── The 47-field extraction (WHATSAPP_EXTRACTION_PROMPT output) ───────────

export type ExtractedItem = {
  sku: string;
  title: string;
  store_source: Store | null;
  qty: number;
  price_aed: number | null;
  ring_size?: string;
  matched: boolean;
  confidence: number;
};

export type Extraction = {
  // Customer match block — loads first
  customer_match: {
    phone_matched: boolean;
    matched_customer_id: string | null;
    prior_orders_count: number;
    prior_orders_aed: number;
    prior_sources: Store[];
  };

  customer_name: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  language: Language;
  customer_type: 'new' | 'returning' | 'vip';
  source: 'whatsapp' | 'instagram' | 'tiktok' | 'website' | 'ad' | 'repeat' | 'influencer';
  influencer_code: string | null;

  intent: 'product_question' | 'gift_inquiry' | 'bridal_inquiry' | 'size_question' | 'price_question' | 'payment_question' | 'delivery_question' | 'order_submission' | 'complaint' | 'return_exchange' | 'other';
  intent_score: number;          // 0-1

  selected_products: ExtractedItem[];
  target_store: Store | 'not_yet_decided';

  ring_size: string | null;
  occasion: 'wedding' | 'engagement' | 'gift' | 'personal' | 'unknown';
  occasion_date: string | null;
  urgency_tier: 'same_day' | 'next_day' | 'within_3_days' | 'standard';

  payment_method: 'cod' | 'card' | 'apple_pay' | 'tamara' | 'tabby' | 'bank_transfer' | 'unknown';
  payment_currency: 'AED' | 'SAR' | 'KWD' | 'BHD' | 'QAR' | 'OMR';
  discount_requested_pct: number;
  discount_approved_pct: number;

  country: Country | null;
  emirate_or_city: string | null;
  area: string | null;
  building: string | null;
  flat_or_villa: string | null;
  landmark: string | null;
  preferred_delivery_window: string | null;
  gift_wrapping: boolean;
  gift_note: string | null;

  missing_order_fields: string[];
  missing_shipping_fields: string[];
  order_ready: boolean;
  shipping_ready: boolean;

  objection: string | null;
  conversation_status: 'committed' | 'considering' | 'cold' | 'won' | 'lost';
  lost_reason: string | null;

  follow_up_needed: boolean;
  follow_up_due: string | null;
  suggested_next_action: string | null;
  suggested_customer_message_en: string | null;
  suggested_customer_message_ar: string | null;

  manager_summary: string;
  risk_flags: RiskFlag[];

  vibes: Vibes;
  role_insights: RoleInsights;
  google_suite_actions: GoogleSuiteAction[];

  // Cashback prompt (from rule #11 in WHATSAPP_EXTRACTION_PROMPT)
  cashback_suggestion: { eligible: boolean; amount_aed: number; restricted_to: 'limited_editions'; note: string };
};

export type RiskFlag =
  | 'ring_no_size'
  | 'cod_high_value'             // > AED 3,000
  | 'discount_over_10'           // manager approval required
  | 'duplicate_customer'
  | 'pii_in_clear'
  | 'price_drift_mention'
  | 'fraud_pattern'              // pressure tactics, generic media filenames
  | 'spam_pattern';

export type RoleInsights = {
  // Different agents see different lens of the same chat
  sales: { tactic: string; objection_handling: string[]; close_window: string };
  marketing: { lal_segments: string[]; google_ads_keywords: string[]; meta_retargeting: string };
  strategy: { google_ads_alignment: string; google_business_workflow: string };
  owner: { revenue_risk_aed: number; conversion_strategy: string };
};

export type GoogleSuiteAction = {
  app: 'Sheets' | 'Docs' | 'Drive' | 'Gmail';
  action: string;
  priority: 'low' | 'medium' | 'high';
};

// ─── Reply optimizer (MESSAGE_OPTIMIZATION_PROMPT) ─────────────────────────

export type ReplyOptimization = {
  prediction: 'conversion_likely' | 'risk_of_loss';
  conversion_probability: number;        // 0-100
  warning: string | null;
  recommendation: string;
  optimized_draft: { en: string; ar: string };
  impact_score: number;                  // 0-100
  changes: { reason: string; before: string; after: string }[];
};

// ─── Writing assistant (WRITING_ASSISTANT_PROMPT) ──────────────────────────

export type WritingCheck = {
  corrected_text: string;
  suggested_completion: string;
  links_detected: boolean;
  tone_check: 'luxury' | 'casual' | 'urgent';
  issues: { kind: 'spelling' | 'grammar' | 'tone' | 'completeness'; before: string; after: string }[];
};

// ─── Payment verification (MEDIA_VERIFICATION_PROMPT) ──────────────────────

export type PaymentVerification = {
  is_authentic: boolean;
  verification_score: number;             // 1-100
  bank_detected: 'Emirates NBD' | 'ADCB' | 'Al Rajhi' | 'Mashreq' | 'FAB' | 'unknown';
  discrepancies: string[];
  metadata_consistency: { status_bar_match: boolean; resolution_match: boolean; timestamp_match: boolean };
  action: 'approve' | 'flag_for_finance' | 'reject_as_fraud';
  reasoning: string;
};

// ─── CRM Shortcuts (crm_shortcuts table) ───────────────────────────────────

export type Shortcut = {
  id: string;
  trigger_key: string;            // /welcome, /size-ring, /bank-uae
  content_en: string;
  content_ar: string;
  category: 'greeting' | 'product' | 'payment' | 'shipping' | 'closing' | 'objection';
};

// ─── Magazine (OMNIA_MAGAZINE_PROMPT) ──────────────────────────────────────

export type Magazine = {
  magazine_headline: string;
  editorial_content: string;
  featured_limited_edition_sku: string;
  cashback_code: string;
  generated_at: string;
};

// ─── Country → Store routing ───────────────────────────────────────────────

export type StoreRouting = {
  country: Country;
  rule: 'shopify_only' | 'woocommerce_only' | 'ask_agent' | 'last_store_wins';
  default_store: Store;
  reason: string;
};
