import { NextResponse } from 'next/server';
import { operationsSnapshot, upsertCustomerFromConversation, updateCustomerProfile } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, customers: state.customers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Two modes:
    //   • { id, ...patch } — direct update of an existing customer (used by Customer 360)
    //   • { conversation, phone, extraction, ... } — unify from WhatsApp Desk
    if (body.id && (body.vip !== undefined || body.marketing_consent !== undefined || body.name !== undefined || body.tags !== undefined || body.email !== undefined || body.city !== undefined)) {
      const { id, ...patch } = body;
      const customer = await updateCustomerProfile({ id, patch });
      return NextResponse.json({ ok: true, customer });
    }
    const customer = await upsertCustomerFromConversation(body);
    return NextResponse.json({ ok: true, customer });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not unify customer' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
    const { id, ...patch } = body;
    const customer = await updateCustomerProfile({ id, patch });
    return NextResponse.json({ ok: true, customer });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update customer' }, { status: 400 });
  }
}
