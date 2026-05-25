import { NextResponse } from 'next/server';
import { createFollowUp, updateFollowUp, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, followups: state.followups });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customer_id || !body.reason) return NextResponse.json({ ok: false, error: 'customer_id and reason are required' }, { status: 400 });
    const followup = await createFollowUp(body);
    return NextResponse.json({ ok: true, followup });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create follow-up' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
    const followup = await updateFollowUp(body.id, body);
    return NextResponse.json({ ok: true, followup });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update follow-up' }, { status: 400 });
  }
}
