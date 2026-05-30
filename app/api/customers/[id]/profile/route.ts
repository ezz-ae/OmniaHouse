import { NextResponse } from 'next/server';
import { operationsSnapshot, type UnifiedCustomer } from '@/lib/operations/store';
import { buildUnifiedProfile, findCustomer } from '@/lib/customers/unified-profile';
import { getConversations, getCustomerCard } from '@/lib/whatsapp/mock';
import { fetchShopifyProfile, isShopifyConfigured } from '@/lib/integrations/shopify';
import { fetchWooCommerceProfile, isWooConfigured } from '@/lib/integrations/woocommerce';
import { getCustomerLive, isCustomersLiveAvailable, type CustomerRow } from '@/lib/customers/queries';

/**
 * GET /api/customers/[id]/profile
 *
 * Resolution order:
 *   1. Supabase customers table (system of record for the profile itself)
 *   2. Operations-store seed (mock fallback while related entities — orders,
 *      signals, wallet, follow-ups — still live in JSON)
 *
 * Whichever source provides the base customer record, the rest of the
 * Customer 360 (orders, conversations, timeline, wallet, signals) comes
 * from the operations store, then gets enriched with authenticated
 * Shopify + Woo data when those keys are present.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const idOrPhone = decodeURIComponent(params.id);
  const state = await operationsSnapshot();
  const conversations = getConversations();

  let customer: UnifiedCustomer | null = null;
  let source: 'live' | 'mock' = 'mock';

  if (isCustomersLiveAvailable()) {
    const liveRow = await getCustomerLive(idOrPhone);
    if (liveRow) {
      customer = liveRowToUnifiedCustomer(liveRow);
      source = 'live';
    }
  }

  if (!customer) {
    customer = findCustomer(state, idOrPhone);
  }
  if (!customer) {
    return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
  }

  const profile = buildUnifiedProfile(state, customer, conversations, getCustomerCard);

  // Live platform enrichment (Shopify Admin + Woo REST in parallel)
  const [shopify, woo] = await Promise.all([
    fetchShopifyProfile({
      phone: customer.phone, email: customer.email,
      customer_id: customer.platform_ids.shopify || null,
    }),
    fetchWooCommerceProfile({
      phone: customer.phone, email: customer.email,
      customer_id: customer.platform_ids.woocommerce || null,
    }),
  ]);

  // Reconcile platform totals into metrics when authenticated values are richer.
  let reconciled = profile;
  if (shopify.customer || woo.customer) {
    const shopSpent = shopify.customer?.total_spent_aed || 0;
    const wooSpent = woo.customer?.total_spent_aed || 0;
    const externalLtv = shopSpent + wooSpent;
    if (externalLtv > reconciled.metrics.ltv_aed) {
      reconciled = {
        ...reconciled,
        metrics: {
          ...reconciled.metrics,
          ltv_aed: externalLtv,
          orders_count: (shopify.customer?.orders_count || 0) + (woo.customer?.orders_count || 0) + reconciled.metrics.orders_count,
        },
      };
    }
  }

  return NextResponse.json({
    ok: true,
    source,
    profile: reconciled,
    platforms: {
      shopify: {
        configured: shopify.configured,
        customer: shopify.customer,
        orders: shopify.orders,
        reason: shopify.reason,
      },
      woocommerce: {
        configured: woo.configured,
        customer: woo.customer,
        orders: woo.orders,
        reason: woo.reason,
      },
    },
    integration_status: {
      shopify_configured: isShopifyConfigured(),
      woocommerce_configured: isWooConfigured(),
    },
  });
}

// ─── Supabase row → operations-store UnifiedCustomer ─────────────────────
// The unified-profile aggregator was built before the Supabase migration; it
// expects the older operations-store shape. This adapter lets the same
// builder accept a live row without rewriting half the room.

function liveRowToUnifiedCustomer(row: CustomerRow): UnifiedCustomer {
  return {
    id: row.id,
    name: row.name || `Customer ${row.phone.slice(-4)}`,
    phone: row.phone,
    whatsapp_number: row.whatsapp_number || row.phone,
    email: row.email,
    country: row.country || 'AE',
    language: (row.language as any) || 'en',
    source: (row.source as any) || 'whatsapp',
    platform_ids: {
      shopify: row.shopify_customer_id || undefined,
      woocommerce: row.woocommerce_customer_id || undefined,
      whatsapp: row.whatsapp_wa_id || undefined,
    },
    tags: row.tags || [],
    ltv_aed: Number(row.ltv_aed) || 0,
    orders_count: row.orders_count || 0,
    last_order_at: row.last_order_at,
    marketing_consent: row.marketing_consent,
    finance_flags: row.finance_flags || [],
    vip: row.vip,
    city: row.city,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
