import { NextResponse } from 'next/server';
import { createAccessRequest, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, requests: state.access_requests });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.requester_name || !body.requested_role || !body.reason) {
      return NextResponse.json({ ok: false, error: 'requester_name, requested_role, reason are required' }, { status: 400 });
    }
    const split = (v: unknown) => typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : [];
    const access = await createAccessRequest({
      ...body,
      scope: split(body.scope),
      sensitive_scope: split(body.sensitive_scope),
    });
    return NextResponse.json({ ok: true, access });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create access request' }, { status: 400 });
  }
}
