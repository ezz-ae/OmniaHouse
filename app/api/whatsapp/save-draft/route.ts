import { NextResponse } from 'next/server';
import { placeOrder } from '@/lib/operations/store';

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
 * Inserts into the OmniaHouse order submission layer and returns the created
 * draft/order record used by WhatsApp Desk, Finance, Shipping, and Reports.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await placeOrder({
      customer_phone: body.customer?.phone || body.customer_phone,
      target_store: body.target_store || 'shopify',
      lines: (body.items || []).map((item: any) => ({
        sku: item.sku,
        title: item.title,
        qty: item.qty || 1,
        price_aed: item.price_aed || 0,
      })),
      payment_method: body.payment_method,
      shipping: body.shipping_address || {},
      notes: [
        ...(body.labels?.length ? [`labels: ${body.labels.join(', ')}`] : []),
        ...(body.assigned_agent_id ? [`assignee: ${body.assigned_agent_id}`] : []),
        ...(body.risk_flags?.length ? [`risk: ${body.risk_flags.join(', ')}`] : []),
      ],
    });
    return NextResponse.json({
      ok: true,
      draft: {
        id: result.order.id,
        order_submission_id: result.order.id,
        pushed_to: result.order.target_store,
        store_admin_url:
          result.order.target_store === 'shopify'
            ? `https://omniastores-ae.myshopify.com/admin/draft_orders/${result.order.platform_ids.shopify_draft || result.order.id}`
            : `https://omniastores.com/wp-admin/admin.php?page=wc-orders&action=edit&id=${result.order.id}`,
        cashback_credited: body.cashback_earned_aed || 0,
        customer_id: result.customer.id,
        total_aed: result.order.total_aed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
