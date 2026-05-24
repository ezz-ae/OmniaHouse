import { NextResponse } from 'next/server';

/**
 * POST /api/whatsapp/save-draft
 * Body: {
 *   conversation_id: string,
 *   customer: { name, phone, country },
 *   items: [{ sku, title, qty, price_aed, ring_size? }],
 *   shipping_address: {...},
 *   payment_method: 'cod' | 'tamara' | 'tabby' | 'transfer' | 'card',
 *   labels: string[],
 *   target_store: 'shopify' | 'woocommerce',
 *   cashback_earned_aed?: number,
 *   risk_flags: string[],
 *   assigned_agent_id?: string,
 * }
 *
 * Real mode: insert into order_submissions, update customer_wallets if
 * cashback eligible, push to Shopify draft_orders.json or WooCommerce
 * REST endpoint. Returns the created draft.
 *
 * Mock mode: simulates the persistence + push, returns a fake draft id.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const real = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SHOPIFY_ADMIN_TOKEN;

    if (real) {
      return NextResponse.json({ ok: false, error: 'real_mode_not_yet_implemented' }, { status: 501 });
    }

    // Mock mode — pretend we saved + pushed.
    const draftId = `oh_${Math.random().toString(36).slice(2, 10)}`;
    return NextResponse.json({
      ok: true,
      mode: 'mock',
      draft: {
        id: draftId,
        order_submission_id: `os_${Math.random().toString(36).slice(2, 10)}`,
        pushed_to: body.target_store,
        store_admin_url:
          body.target_store === 'shopify'
            ? `https://omniastores-ae.myshopify.com/admin/draft_orders/${draftId}`
            : `https://omniastores.com/wp-admin/admin.php?page=wc-orders&action=edit&id=${draftId}`,
        cashback_credited: body.cashback_earned_aed || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
