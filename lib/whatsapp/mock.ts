import type {
  Conversation, CustomerCard, Extraction, ReplyOptimization, WritingCheck,
  PaymentVerification, Magazine, Vibes, GhostBrowse, CustomerHistory, WalletState,
} from './types';
import type { ProductShare } from './thread';
import { detectCountry, routeForOrder } from './routing';
import { getCatalogue } from '@/lib/inventory/mock';

// ─── Conversations ─────────────────────────────────────────────────────────

export function getConversations(): Conversation[] {
  return [
    {
      id: 'w1',
      phone: '+971501234884',
      country: 'AE',
      customer_id: 'cu_aisha',
      status: 'in_progress',
      assignee: 'Layla',
      unread: 0,
      language: 'en',
      last_at: '14:32',
      labels: ['vip', 'instagram_lead'],
      vibes: { happiness_level: 8, urgency: 'high', fraud_risk: 'low', is_spam: false, business_blockers: null, seniority_needed: 'junior' },
      messages: [
        { id: 'm1', at: '14:18', from: 'customer', body: 'hi! im interested in the crescent ring i saw on instagram', language: 'en' },
        { id: 'm2', at: '14:18', from: 'customer', body: 'do you have it in 925 silver, size 7?', language: 'en' },
        { id: 'm3', at: '14:19', from: 'customer', body: 'actually i want 2, one for me one for my sister', language: 'en' },
        { id: 'm4', at: '14:22', from: 'agent', body: 'Hi Aisha! 👋 Yes both are in stock — 925 silver, size 7. AED 1,300 each.', language: 'en' },
        { id: 'm5', at: '14:30', from: 'customer', body: 'ok perfect. ship to Al Wasl Road, Villa 42, Dubai. cod ok?', language: 'en' },
        { id: 'm6', at: '14:30', from: 'customer', body: 'my number for delivery is +971 50 123 4884', language: 'en' },
        { id: 'm7', at: '14:31', from: 'agent', body: 'Perfect, will arrange COD. Need it by when?', language: 'en' },
        { id: 'm8', at: '14:32', from: 'customer', body: 'thursday if possible 🙏', language: 'en' },
      ],
    },
    {
      id: 'w2',
      phone: '+971552170844',
      country: 'AE',
      customer_id: null,
      status: 'unclaimed',
      assignee: null,
      unread: 1,
      language: 'ar',
      last_at: '14:30',
      labels: [],
      vibes: { happiness_level: 6, urgency: 'medium', fraud_risk: 'low', is_spam: false, business_blockers: null, seniority_needed: 'junior' },
      messages: [
        { id: 'm1', at: '14:30', from: 'customer', body: 'السلام عليكم، السلسلة الذهبية متوفرة؟', language: 'ar' },
      ],
    },
    {
      id: 'w3',
      phone: '+971555478217',
      country: 'AE',
      customer_id: 'cu_noura',
      status: 'awaiting_customer',
      assignee: 'Omar',
      unread: 0,
      language: 'en',
      last_at: '14:27',
      labels: ['vip'],
      vibes: { happiness_level: 7, urgency: 'medium', fraud_risk: 'low', is_spam: false, business_blockers: null, seniority_needed: 'junior' },
      messages: [
        { id: 'm1', at: '14:12', from: 'customer', body: 'Hi, want to confirm the Moonstone pendant in rose gold', language: 'en' },
        { id: 'm2', at: '14:15', from: 'agent', body: 'Hi Noura! Of course — AED 1,850. Bank transfer or Tamara?', language: 'en' },
        { id: 'm3', at: '14:22', from: 'customer', body: 'transfer please. send IBAN', language: 'en' },
        { id: 'm4', at: '14:23', from: 'agent', body: '/bank-uae', language: 'en' },
        { id: 'm5', at: '14:27', from: 'customer', body: 'I sent the bank transfer screenshot. Can you confirm?', language: 'en', media: { kind: 'image', filename: 'IMG_20260524_142701.jpg', verified: false } },
      ],
    },
    {
      id: 'w4',
      phone: '+966507733091',
      country: 'SA',
      customer_id: 'cu_mariam',
      status: 'ready_for_draft',
      assignee: 'Layla',
      unread: 0,
      language: 'ar',
      last_at: '14:21',
      labels: ['ksa', 'bridal'],
      vibes: { happiness_level: 9, urgency: 'critical', fraud_risk: 'low', is_spam: false, business_blockers: 'wedding deadline thursday', seniority_needed: 'senior' },
      messages: [
        { id: 'm1', at: '14:10', from: 'customer', body: 'أبغى طقم العروس من أومنيا، عاجل', language: 'ar' },
        { id: 'm2', at: '14:11', from: 'customer', body: 'بس لازم تخلصه قبل يوم الخميس لأني هسافر', language: 'ar' },
        { id: 'm3', at: '14:15', from: 'agent', body: 'أهلاً بك! بأي مقاس الخاتم؟', language: 'ar' },
        { id: 'm4', at: '14:21', from: 'customer', body: 'مقاس 6. عنواني الرياض، حي العليا', language: 'ar' },
      ],
    },
    {
      id: 'w5',
      phone: '+971589224401',
      country: 'AE',
      customer_id: null,
      status: 'unclaimed',
      assignee: null,
      unread: 2,
      language: 'en',
      last_at: '14:18',
      labels: [],
      vibes: { happiness_level: 5, urgency: 'low', fraud_risk: 'low', is_spam: false, business_blockers: null, seniority_needed: 'junior' },
      messages: [
        { id: 'm1', at: '14:16', from: 'customer', body: 'price for moonstone pendant in rose gold?', language: 'en' },
        { id: 'm2', at: '14:18', from: 'customer', body: 'and is it in stock today?', language: 'en' },
      ],
    },
    {
      id: 'w6',
      phone: '+971501009922',
      country: 'AE',
      customer_id: null,
      status: 'unclaimed',
      assignee: null,
      unread: 3,
      language: 'en',
      last_at: '14:02',
      labels: ['pressure'],
      vibes: { happiness_level: 3, urgency: 'critical', fraud_risk: 'high', is_spam: false, business_blockers: null, seniority_needed: 'manager' },
      messages: [
        { id: 'm1', at: '13:48', from: 'customer', body: 'Hello? Did you see my message from yesterday', language: 'en' },
        { id: 'm2', at: '13:52', from: 'customer', body: 'I need to confirm NOW. Please give me 20% discount or I will cancel', language: 'en' },
        { id: 'm3', at: '14:02', from: 'customer', body: '[Media: Payment.pdf]', language: 'en', media: { kind: 'pdf', filename: 'Payment.pdf', verified: false, verification_score: 32 } },
      ],
    },
  ];
}

// ─── Customer cards (cross-store + ghost + wallet) ─────────────────────────

const CUSTOMER_CARDS: Record<string, CustomerCard> = {
  cu_aisha: {
    matched: true,
    customer_id: 'cu_aisha',
    display_name: 'Aisha M.',
    phone: '+971501234884',
    country: 'AE',
    language_pref: 'en',
    history: {
      orders: 3,
      ltv_aed: 14_400,
      last_at: '2026-04-12',
      stores: ['whatsapp', 'woocommerce', 'whatsapp'],
      prior_returns: 0,
      refund_requests: 0,
      vip_flag: false,
    },
    ghost: {
      sessions: 5,
      pages_viewed: [
        { sku: 'CR-925-07', title: 'Crescent Ring · 925 silver', views: 4 },
        { sku: 'PS-18-01', title: 'Pearl Strand Necklace', views: 2 },
      ],
      cart_adds_no_checkout: [{ sku: 'CR-925-07', title: 'Crescent Ring · 925 silver', at: 'yesterday 22:14' }],
      abandoned_carts: [],
      first_seen_at: '2026-04-08',
    },
    wallet: {
      balance_aed: 420,
      last_transaction_at: '2026-04-12',
      recent: [
        { at: '2026-04-12', amount: 320, type: 'accrual', note: 'Order #1156 (AED 6,400 × 5%)' },
        { at: '2026-03-21', amount: 100, type: 'accrual', note: 'Order #1098 (AED 2,000 × 5%)' },
      ],
    },
    labels: ['repeat', 'instagram_lead'],
    warnings: [],
  },
  cu_noura: {
    matched: true,
    customer_id: 'cu_noura',
    display_name: 'Noura A.',
    phone: '+971555478217',
    country: 'AE',
    language_pref: 'en',
    history: {
      orders: 7,
      ltv_aed: 38_200,
      last_at: '2026-05-19',
      stores: ['shopify', 'whatsapp', 'shopify', 'whatsapp', 'shopify', 'whatsapp', 'shopify'],
      prior_returns: 1,
      refund_requests: 0,
      vip_flag: true,
    },
    ghost: {
      sessions: 14,
      pages_viewed: [
        { sku: 'MS-RG-01', title: 'Moonstone Pendant · rose gold', views: 6 },
        { sku: 'CN-GD-LE', title: 'Celestial Necklace LE 2026', views: 11 },
      ],
      cart_adds_no_checkout: [{ sku: 'CN-GD-LE', title: 'Celestial Necklace LE 2026', at: '2 days ago' }],
      abandoned_carts: [{ sku: 'CN-GD-LE', value_aed: 4_900, at: '2 days ago' }],
      first_seen_at: '2025-11-04',
    },
    wallet: {
      balance_aed: 1_910,
      last_transaction_at: '2026-05-19',
      recent: [
        { at: '2026-05-19', amount: 295, type: 'accrual', note: 'Order #1268 (AED 5,900 × 5%)' },
        { at: '2026-04-30', amount: 425, type: 'accrual', note: 'Order #1218 (AED 8,500 × 5%)' },
      ],
    },
    labels: ['vip', 'le_browser'],
    warnings: [],
  },
  cu_mariam: {
    matched: true,
    customer_id: 'cu_mariam',
    display_name: 'Mariam K.',
    phone: '+966507733091',
    country: 'SA',
    language_pref: 'ar',
    history: { orders: 1, ltv_aed: 3_400, last_at: '2026-02-08', stores: ['whatsapp'], prior_returns: 0, refund_requests: 0, vip_flag: false },
    ghost: { sessions: 2, pages_viewed: [], cart_adds_no_checkout: [], abandoned_carts: [], first_seen_at: '2026-02-08' },
    wallet: { balance_aed: 170, last_transaction_at: '2026-02-08', recent: [{ at: '2026-02-08', amount: 170, type: 'accrual', note: 'Order #998 (AED 3,400 × 5%)' }] },
    labels: ['ksa'],
    warnings: [],
  },
};

export function getCustomerCard(phone: string, customer_id: string | null): CustomerCard {
  if (customer_id && CUSTOMER_CARDS[customer_id]) {
    return CUSTOMER_CARDS[customer_id];
  }
  return {
    matched: false,
    customer_id: null,
    display_name: null,
    phone,
    country: detectCountry(phone),
    language_pref: 'en',
    history: null,
    ghost: null,
    wallet: null,
    labels: [],
    warnings: [],
  };
}

// ─── 47-field extraction (mock GPT-4o) ─────────────────────────────────────

export function mockExtract(conv: Conversation): Extraction {
  // Hard-code the Aisha case for the demo; fall back to a structural skeleton.
  if (conv.id === 'w1') {
    return {
      customer_match: {
        phone_matched: true,
        matched_customer_id: 'cu_aisha',
        prior_orders_count: 3,
        prior_orders_aed: 14_400,
        prior_sources: ['whatsapp', 'woocommerce'],
      },
      customer_name: 'Aisha M.',
      phone: '+971501234884',
      whatsapp_number: '+971501234884',
      language: 'en',
      customer_type: 'returning',
      source: 'instagram',
      influencer_code: null,
      intent: 'order_submission',
      intent_score: 0.96,
      selected_products: [
        { sku: 'CR-925-07', title: 'Crescent Ring', store_source: 'shopify', qty: 2, price_aed: 1_300, ring_size: '7', matched: true, confidence: 0.97 },
      ],
      target_store: 'shopify',
      ring_size: '7',
      occasion: 'gift',
      occasion_date: null,
      urgency_tier: 'within_3_days',
      payment_method: 'cod',
      payment_currency: 'AED',
      discount_requested_pct: 0,
      discount_approved_pct: 0,
      country: 'AE',
      emirate_or_city: 'Dubai',
      area: 'Al Wasl',
      building: 'Villa 42',
      flat_or_villa: 'Villa 42',
      landmark: null,
      preferred_delivery_window: 'Thursday',
      gift_wrapping: false,
      gift_note: null,
      missing_order_fields: [],
      missing_shipping_fields: [],
      order_ready: true,
      shipping_ready: true,
      objection: null,
      conversation_status: 'committed',
      lost_reason: null,
      follow_up_needed: false,
      follow_up_due: null,
      suggested_next_action: 'Confirm Thursday delivery window, request COD amount confirmation.',
      suggested_customer_message_en: "Lovely Aisha — both rings, size 7, AED 2,600 total, COD to Al Wasl Villa 42 by Thursday. Confirming now and I'll send tracking the moment we dispatch.",
      suggested_customer_message_ar: "تمام يا عيشة — خاتمَين، مقاس 7، الإجمالي 2,600 درهم، دفع عند الاستلام في فيلا 42 الوصل بحد أقصى يوم الخميس. أكدتها وحارسل لك تفاصيل الشحنة فور الإرسال.",
      manager_summary: 'Aisha M. (3 prior orders, AED 14.4K LTV). 2 Crescent Rings 925 silver size 7 to Al Wasl, COD AED 2,600, Thursday deadline. No flags. Ready to push to Shopify .ae.',
      risk_flags: [],
      vibes: conv.vibes,
      role_insights: {
        sales: { tactic: 'Confirm fast — she is committed and has a hard deadline.', objection_handling: [], close_window: 'now — 30 min' },
        marketing: {
          lal_segments: ['Al Wasl Dubai', 'Instagram organic luxury'],
          google_ads_keywords: ['crescent ring 925 silver Dubai', 'twin set sister gift Dubai'],
          meta_retargeting: 'Pair her with the LE Celestial campaign — she viewed it twice last week.',
        },
        strategy: {
          google_ads_alignment: 'Repeat customer from Instagram organic — strong LAL seed candidate.',
          google_business_workflow: 'Update CRM Sheet with sister gift flag for future Q4 campaign.',
        },
        owner: { revenue_risk_aed: 0, conversion_strategy: 'Confirm + add cashback nudge to LE.' },
      },
      google_suite_actions: [
        { app: 'Sheets', action: 'Update CRM_Repeat_Customers row for cu_aisha — add "sister gift" tag', priority: 'medium' },
        { app: 'Docs', action: 'Draft thank-you note for inclusion in package', priority: 'low' },
      ],
      cashback_suggestion: { eligible: true, amount_aed: 130, restricted_to: 'limited_editions', note: '5% on AED 2,600 — usable on LE only.' },
    };
  }

  // Skeleton for any other conversation — UI shows missing fields as red pills.
  return {
    customer_match: { phone_matched: !!conv.customer_id, matched_customer_id: conv.customer_id, prior_orders_count: 0, prior_orders_aed: 0, prior_sources: [] },
    customer_name: null,
    phone: conv.phone,
    whatsapp_number: conv.phone,
    language: conv.language,
    customer_type: conv.customer_id ? 'returning' : 'new',
    source: 'whatsapp',
    influencer_code: null,
    intent: 'product_question',
    intent_score: 0.5,
    selected_products: [],
    target_store: 'not_yet_decided',
    ring_size: null,
    occasion: 'unknown',
    occasion_date: null,
    urgency_tier: 'standard',
    payment_method: 'unknown',
    payment_currency: 'AED',
    discount_requested_pct: 0,
    discount_approved_pct: 0,
    country: conv.country,
    emirate_or_city: null,
    area: null,
    building: null,
    flat_or_villa: null,
    landmark: null,
    preferred_delivery_window: null,
    gift_wrapping: false,
    gift_note: null,
    missing_order_fields: ['customer_name', 'selected_products', 'payment_method'],
    missing_shipping_fields: ['emirate_or_city', 'area', 'building'],
    order_ready: false,
    shipping_ready: false,
    objection: conv.vibes.business_blockers,
    conversation_status: 'considering',
    lost_reason: null,
    follow_up_needed: true,
    follow_up_due: 'tomorrow 10:00',
    suggested_next_action: 'Ask for name and clarify which product they want.',
    suggested_customer_message_en: 'Hello and welcome to Omnia. Could I have your name to set up your order?',
    suggested_customer_message_ar: 'أهلاً وسهلاً بكِ في أومنيا. ممكن أعرف اسمك الكريم لأبدأ الطلب؟',
    manager_summary: 'New inquiry. Needs basic identification.',
    risk_flags: conv.vibes.fraud_risk === 'high' ? ['fraud_pattern'] : [],
    vibes: conv.vibes,
    role_insights: {
      sales: { tactic: 'Establish identity and intent before quoting prices.', objection_handling: [], close_window: 'this hour' },
      marketing: { lal_segments: [], google_ads_keywords: [], meta_retargeting: 'Tag session for retargeting if customer leaves without ordering.' },
      strategy: { google_ads_alignment: 'Track conversion lag from first WhatsApp message.', google_business_workflow: 'Log as new lead in CRM Sheet.' },
      owner: { revenue_risk_aed: 0, conversion_strategy: 'Standard follow-up cadence.' },
    },
    google_suite_actions: [{ app: 'Sheets', action: 'Add new lead to WhatsApp_Inquiries sheet', priority: 'low' }],
    cashback_suggestion: { eligible: false, amount_aed: 0, restricted_to: 'limited_editions', note: 'No order yet.' },
  };
}

// ─── Reply optimizer (mock) ────────────────────────────────────────────────

export function mockOptimizeReply(draft: string, lang: 'en' | 'ar'): ReplyOptimization {
  const isPushy = /now|immediately|hurry|must|cancel|الحين|حالاً/i.test(draft);
  const isShort = draft.trim().length < 25;
  const hasGreeting = /hi|hello|أهلاً|سلام/i.test(draft);

  const prob = isPushy ? 38 : isShort ? 54 : hasGreeting ? 84 : 71;
  const prediction: ReplyOptimization['prediction'] = prob >= 65 ? 'conversion_likely' : 'risk_of_loss';

  return {
    prediction,
    conversion_probability: prob,
    warning: prob < 65 ? 'This draft risks losing the conversation. The tone reads transactional, not premium.' : null,
    recommendation: prob < 65
      ? 'Open with the customer\'s name. Confirm the item plainly. Close with a forward-looking line (delivery promise, gift wrap, cashback).'
      : 'Strong tone. Optional: add the cashback amount earned to set the LE hook.',
    optimized_draft: {
      en: hasGreeting && !isPushy
        ? draft + ' Your order earns AED 130 cashback toward our Limited Edition collection — added the moment we dispatch.'
        : 'Lovely to hear from you. Confirming your Crescent Ring (925 silver, size 7) × 2 — AED 2,600 to Al Wasl Villa 42, COD by Thursday. Your order earns AED 130 cashback for our Limited Editions, added at dispatch.',
      ar: 'تمام، أكدنا الخاتمَين مقاس 7 — الإجمالي 2,600 درهم، الدفع عند الاستلام في فيلا 42 الوصل بحد أقصى يوم الخميس. طلبك يكسبك 130 درهم كاش باك على مجموعة الإصدارات المحدودة، يضاف عند الإرسال.',
    },
    impact_score: prob < 65 ? 92 : 41,
    changes: prob < 65
      ? [
          { reason: 'Missing personal greeting', before: '(no greeting)', after: 'Lovely Aisha — / تمام يا عيشة —' },
          { reason: 'No forward-looking close', before: '(transactional ending)', after: 'Cashback line + dispatch promise' },
          { reason: 'Tone reads too short / pushy', before: draft.slice(0, 40) + '…', after: 'Soft confirmation + premium close' },
        ]
      : [{ reason: 'Optional polish', before: '(strong baseline)', after: 'Adds cashback hook' }],
  };
}

// ─── Writing assistant (live grammar / completion / tone) ──────────────────

export function mockWritingCheck(text: string, lang: 'en' | 'ar' = 'en'): WritingCheck {
  const issues: WritingCheck['issues'] = [];
  let corrected = text;

  // Quick mock heuristics — real impl calls WRITING_ASSISTANT_PROMPT.
  if (/\bteh\b/i.test(corrected)) {
    issues.push({ kind: 'spelling', before: 'teh', after: 'the' });
    corrected = corrected.replace(/\bteh\b/gi, 'the');
  }
  if (/\bu\b/i.test(corrected)) {
    issues.push({ kind: 'grammar', before: 'u', after: 'you' });
    corrected = corrected.replace(/\bu\b/g, 'you');
  }
  if (corrected && !/[.!?]$/.test(corrected.trim())) {
    issues.push({ kind: 'completeness', before: corrected.slice(-20), after: corrected.slice(-20) + '.' });
  }
  const tone: WritingCheck['tone_check'] = /now|hurry|must/i.test(corrected) ? 'urgent' : /thank|delight|lovely|please/i.test(corrected) ? 'luxury' : 'casual';

  return {
    corrected_text: corrected,
    suggested_completion:
      text.length < 30
        ? ' Could I confirm your delivery address?'
        : '',
    links_detected: /https?:\/\//.test(text),
    tone_check: tone,
    issues,
  };
}

// ─── Payment verification (Emirates NBD / ADCB / Al Rajhi templates) ───────

export function mockVerifyPayment(filename: string): PaymentVerification {
  // Demo: anything called "Payment.pdf" is suspicious; .jpg from a screenshot is OK.
  if (/payment\.pdf$/i.test(filename) || /transfer\.pdf$/i.test(filename)) {
    return {
      is_authentic: false,
      verification_score: 32,
      bank_detected: 'unknown',
      discrepancies: [
        'Filename "Payment.pdf" is a generic template name — real bank exports include reference numbers.',
        'No bank header detected matching Emirates NBD / ADCB / Al Rajhi templates.',
        'Inconsistent font in transaction reference line.',
        'No QR code or digital stamp signature.',
      ],
      metadata_consistency: { status_bar_match: false, resolution_match: false, timestamp_match: false },
      action: 'reject_as_fraud',
      reasoning: 'Generic filename + missing bank-specific layout features. High likelihood of a fabricated PDF.',
    };
  }
  return {
    is_authentic: true,
    verification_score: 91,
    bank_detected: 'Emirates NBD',
    discrepancies: [],
    metadata_consistency: { status_bar_match: true, resolution_match: true, timestamp_match: true },
    action: 'approve',
    reasoning: 'Layout matches Emirates NBD template. Status bar, resolution, and timestamp all consistent with provided device context.',
  };
}

// ─── Personalized magazine (post-purchase) ─────────────────────────────────

export function mockMagazine(customerName: string): Magazine {
  return {
    magazine_headline: `${customerName}'s Crescent Story · LE Issue 24`,
    editorial_content:
      `For ${customerName}, the Crescent Ring is the answer to a question she didn't have to ask twice — luxury that doesn't announce itself. The 925 silver settles into the skin the way a moonless Gulf evening settles into the dunes: cool, certain, and unrepeated.\n\nIf you have followed our Limited Editions, you have already seen the Celestial Necklace appear in the corner of your screen. It is your next step, and yours alone — only two remain in this drop.`,
    featured_limited_edition_sku: 'CN-GD-LE',
    cashback_code: 'AISHA-LE-130',
    generated_at: '2026-05-24 14:35',
  };
}

/**
 * Inventory search inside the conversation.
 * Pulls from the unified catalogue (lib/inventory/mock.ts) — same source
 * the Inventory room uses. In real mode this hits the `products` table
 * with org-scoped RLS, exactly like Gemini's management room did.
 */
export function searchProducts(query: string, limit = 6): ProductShare[] {
  const catalogue = getCatalogue();
  const q = query.toLowerCase().trim();
  const filtered = !q
    ? catalogue
    : catalogue.filter(
        (p) =>
          p.display_title.toLowerCase().includes(q) ||
          p.master_sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q),
      );
  return filtered.slice(0, limit).map((p) => ({
    sku: p.master_sku,
    title: p.display_title,
    category: p.category,
    material: p.material,
    image_hint: p.image_hint,
    shopify_price_aed: p.shopify_price_aed,
    woocommerce_price_aed: p.woocommerce_price_aed,
    shopify_url: p.shopify_url,
    woocommerce_url: p.woocommerce_url,
    in_stock_anywhere:
      (p.shopify_qty !== null && p.shopify_qty > 0) ||
      (p.woocommerce_qty !== null && p.woocommerce_qty > 0),
    is_limited_edition: p.is_limited_edition,
  }));
}
