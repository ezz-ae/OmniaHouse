import type { Country, Store, StoreRouting, CustomerHistory } from './types';

/**
 * Country detection from a normalised E.164 phone number.
 * Per Implementation Book §8.3 and §11.2.
 */
export function detectCountry(phoneE164: string): Country {
  const p = phoneE164.replace(/\s+/g, '');
  if (p.startsWith('+966')) return 'SA';
  if (p.startsWith('+971')) return 'AE';
  if (p.startsWith('+965')) return 'KW';
  if (p.startsWith('+973')) return 'BH';
  if (p.startsWith('+974')) return 'QA';
  if (p.startsWith('+968')) return 'OM';
  return 'OTHER';
}

/**
 * Decide which store should receive the WhatsApp order, per Book §8.3:
 *
 *   - +966 (KSA)        → Shopify (.ae). KSA-specific SKUs and shipping there.
 *   - +965/+973/+974/+968 → default Shopify (.ae), confirm with agent.
 *   - +971 (UAE)        → either store. Default to customer's last_store_wins.
 *                          If no history, ask the agent.
 *   - Single-store SKU  → that store. No prompt.
 */
export function routeForOrder(opts: {
  country: Country;
  history: CustomerHistory | null;
  product_on_shopify: boolean;
  product_on_woocommerce: boolean;
}): StoreRouting {
  const { country, history, product_on_shopify, product_on_woocommerce } = opts;

  // Single-store SKU dominates the rule.
  if (product_on_shopify && !product_on_woocommerce) {
    return {
      country,
      rule: 'shopify_only',
      default_store: 'shopify',
      reason: 'Product only listed on omniastores.ae',
    };
  }
  if (product_on_woocommerce && !product_on_shopify) {
    return {
      country,
      rule: 'woocommerce_only',
      default_store: 'woocommerce',
      reason: 'Product only listed on omniastores.com',
    };
  }

  if (country === 'SA') {
    return {
      country,
      rule: 'shopify_only',
      default_store: 'shopify',
      reason: 'KSA customers route to omniastores.ae per shipping/SKU rules',
    };
  }

  if (country === 'KW' || country === 'BH' || country === 'QA' || country === 'OM') {
    return {
      country,
      rule: 'ask_agent',
      default_store: 'shopify',
      reason: `${country} customer — Shopify default, confirm with customer`,
    };
  }

  if (country === 'AE') {
    if (history && history.stores.length > 0) {
      const last = history.stores[history.stores.length - 1];
      if (last === 'shopify' || last === 'woocommerce') {
        return {
          country,
          rule: 'last_store_wins',
          default_store: last,
          reason: `UAE customer — last ordered on ${last === 'shopify' ? '.ae' : '.com'}`,
        };
      }
    }
    return {
      country,
      rule: 'ask_agent',
      default_store: 'shopify',
      reason: 'UAE customer with no history — ask the agent which store',
    };
  }

  return {
    country,
    rule: 'ask_agent',
    default_store: 'shopify',
    reason: 'Unknown country — Shopify default, confirm with customer',
  };
}

/**
 * E.164 normalisation for UAE: strip leading 0 after +971.
 * "+9710501234567" → "+971501234567".
 */
export function normalizeE164(raw: string): string {
  if (!raw) return raw;
  let p = raw.replace(/[\s\-()]/g, '');
  if (!p.startsWith('+')) {
    if (p.startsWith('00')) p = '+' + p.slice(2);
    else if (p.startsWith('971') || p.startsWith('966')) p = '+' + p;
  }
  // UAE-specific: strip leading 0 after country code.
  p = p.replace(/^\+9710/, '+971');
  return p;
}

/**
 * Mask phone for LOGS and AI PROMPTS only. Per Implementation Book §15.3 —
 * "Customer phones masked (+971•••227) in prompts unless requester has
 * view_customer_private."
 * DO NOT use this in the agent's own UI. The agent needs to see the number.
 */
export function maskPhoneForLogs(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 6) return cleaned;
  return `${cleaned.slice(0, 4)}•••${cleaned.slice(-3)}`;
}

/**
 * Display-format an E.164 phone for the agent's screen.
 * +971501234884 → +971 50 123 4884
 * +966507733091 → +966 50 773 3091
 * +965XXXXXXX   → +965 XX XX XX XX (best-effort grouping)
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) return cleaned;

  // GCC patterns — country code (3 digits) + 9-digit national number
  const gcc = cleaned.match(/^(\+9(?:71|66|65|73|74|68))(\d{2})(\d{3})(\d{4})$/);
  if (gcc) return `${gcc[1]} ${gcc[2]} ${gcc[3]} ${gcc[4]}`;

  // Fallback: group last digits in 3s/4s
  if (cleaned.length === 12) return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  if (cleaned.length === 13) return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
  return cleaned;
}
