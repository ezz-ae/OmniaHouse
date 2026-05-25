import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { buildUnifiedProfile, findCustomer } from '@/lib/customers/unified-profile';
import { getConversations, getCustomerCard } from '@/lib/whatsapp/mock';
import { fetchShopifyProfile, isShopifyConfigured } from '@/lib/integrations/shopify';
import { fetchWooCommerceProfile, isWooConfigured } from '@/lib/integrations/woocommerce';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const idOrPhone = decodeURIComponent(params.id);
  const state = await operationsSnapshot();
  const customer = findCustomer(state, idOrPhone);
  if (!customer) return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });

  const conversations = getConversations();
  const profile = buildUnifiedProfile(state, customer, conversations, getCustomerCard);

  // Enrich with authenticated platform data when keys are present.
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
