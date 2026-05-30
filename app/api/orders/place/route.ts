import { NextResponse } from 'next/server';
import { operationsSnapshot, placeOrder } from '@/lib/operations/store';
import {
  isOrdersLiveAvailable, listOrdersLive, createOrderLive,
} from '@/lib/orders/queries';
import { isCustomersLiveAvailable, upsertCustomerLive } from '@/lib/customers/queries';

export async function GET() {
  // Prefer Supabase when live, fall back to in-memory state for local dev.
  if (isOrdersLiveAvailable()) {
    const live = await listOrdersLive({ limit: 200 });
    if (live) return NextResponse.json({ ok: true, source: 'live', orders: live });
  }
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, source: 'mock', orders: state.orders });
}

/**
 * POST /api/orders/place
 *
 * Accepts the same body the WhatsApp Desk's "Push draft" flow has always
 * sent (conversation + extraction + customer_phone, optionally explicit
 * lines + target_store). When Supabase is live:
 *   1. Upsert the customer row (idempotent on phone) so we have a stable
 *      customer_id to attach the order to. Skipped if the row already exists.
 *   2. Insert the order into order_submissions with that customer_id.
 *   3. Mirror to the in-memory operations store so other rooms still see it.
 *
 * Falls back to the legacy in-memory placeOrder() when no Supabase keys
 * so local dev + pre-flip prod keep working.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customer_phone) {
      return NextResponse.json({ ok: false, error: 'customer_phone is required' }, { status: 400 });
    }

    // The in-memory placeOrder enforces useful invariants (line items
    // present, total > 0) — let it raise first so we don't write a half
    // order to Supabase.
    const result = await placeOrder(body);

    let live: any = null;
    if (isOrdersLiveAvailable()) {
      const extraction = body.extraction || {};
      const lines = result.order.lines;

      // First, ensure the customer exists in Supabase so the order can
      // reference customer_id. Reuses the same path the WhatsApp Extract
      // save button uses.
      let supaCustomerId: string | null = null;
      if (isCustomersLiveAvailable()) {
        const customer = await upsertCustomerLive({
          phone: body.customer_phone,
          name: extraction.customer_name || result.customer.name || null,
          country: extraction.country || result.customer.country || null,
          language: extraction.language || result.customer.language || 'en',
          city: extraction.emirate_or_city || null,
          customer_type: extraction.customer_type || 'new',
          source: body.source || 'whatsapp',
          whatsapp_wa_id: body.conversation?.phone || null,
          created_by: body.user_id || null,
        });
        supaCustomerId = customer?.id || null;
      }

      live = await createOrderLive({
        customer_id: supaCustomerId,
        phone: body.customer_phone,
        customer_name: extraction.customer_name || result.customer.name || null,
        language: extraction.language || 'en',
        source: body.source || 'whatsapp',
        target_store: body.target_store || extraction.target_store || 'shopify',
        country: extraction.country || result.customer.country || null,
        items: lines,
        total_aed: result.order.total_aed,
        payment_method: body.payment_method || extraction.payment_method || null,
        payment_status: 'unverified',
        shipping_address: result.order.shipping,
        intent: extraction.intent || null,
        labels: body.labels || [],
        notes: result.order.notes,
        assigned_agent_id: body.assignee_id || null,
        created_by: body.user_id || null,
        metadata: { ring_size: extraction.ring_size || null, conversation_id: body.conversation?.id || null },
      });
    }

    return NextResponse.json({
      ok: true,
      source: live ? 'live' : 'mock',
      order: live || result.order,
      customer: result.customer,
      operations_order: result.order,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not place order' }, { status: 400 });
  }
}
