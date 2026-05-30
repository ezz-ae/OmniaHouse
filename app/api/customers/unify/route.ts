import { NextResponse } from 'next/server';
import { operationsSnapshot, upsertCustomerFromConversation, updateCustomerProfile } from '@/lib/operations/store';
import {
  isCustomersLiveAvailable,
  upsertCustomerLive,
  patchCustomerLive,
  getCustomerLive,
} from '@/lib/customers/queries';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, customers: state.customers });
}

/**
 * POST /api/customers/unify
 *
 * Two write modes:
 *   • { id, ...patch }                  — direct update by id (Customer 360 actions)
 *   • { phone, name?, extraction?, … } — upsert by phone (WhatsApp Extract save)
 *
 * Both write to Supabase (customers table) when live, AND mirror to the
 * operations store so the other rooms that still read from JSON state
 * (orders, signals, follow-ups) keep seeing the same customer record.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const live = isCustomersLiveAvailable();
    const isPatch = Boolean(
      body.id && (
        body.vip !== undefined || body.marketing_consent !== undefined ||
        body.name !== undefined || body.tags !== undefined ||
        body.email !== undefined || body.city !== undefined
      ),
    );

    if (isPatch) {
      const { id, ...patch } = body;
      const liveRow = live ? await patchCustomerLive(id, patch, body.actor || null) : null;
      const customer = await safeMockUpdate(id, patch);
      return NextResponse.json({ ok: true, source: liveRow ? 'live' : 'mock', customer: liveRow || customer });
    }

    // Upsert flow — used by the WhatsApp Extract "Save customer profile"
    // button. We accept the same shape the in-memory upsert understands and
    // also write to Supabase.
    const extraction = body.extraction || {};
    const upsertInput = {
      phone: body.phone || extraction.phone,
      name: body.name || extraction.customer_name || null,
      email: body.email || null,
      country: body.country || extraction.country || null,
      language: body.language || extraction.language || 'en',
      city: body.city || extraction.emirate_or_city || null,
      customer_type: body.customer_type || extraction.customer_type || 'new',
      source: body.source || 'whatsapp',
      whatsapp_wa_id: body.whatsapp_wa_id || body.conversation?.phone || null,
      tags: body.tags || null,
      created_by: body.actor || null,
    };

    let liveRow = null;
    if (live && upsertInput.phone) {
      liveRow = await upsertCustomerLive(upsertInput);
    }

    const mockCustomer = await upsertCustomerFromConversation(body);
    return NextResponse.json({
      ok: true,
      source: liveRow ? 'live' : 'mock',
      customer: liveRow || mockCustomer,
      mock_customer: mockCustomer,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not unify customer' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
    const { id, ...patch } = body;
    const live = isCustomersLiveAvailable();
    const liveRow = live ? await patchCustomerLive(id, patch, body.actor || null) : null;
    const mock = await safeMockUpdate(id, patch);
    return NextResponse.json({
      ok: true,
      source: liveRow ? 'live' : 'mock',
      customer: liveRow || mock,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update customer' }, { status: 400 });
  }
}

// Try the in-memory mock update; swallow "not found" so a Supabase-only
// customer doesn't blow up.
async function safeMockUpdate(id: string, patch: any) {
  try {
    return await updateCustomerProfile({ id, patch });
  } catch {
    return null;
  }
}
