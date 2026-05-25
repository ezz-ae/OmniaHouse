import { NextResponse } from 'next/server';
import { decideAccessRequest } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.decision || !body.rationale || !body.actor) {
      return NextResponse.json({ ok: false, error: 'decision, rationale, actor are required' }, { status: 400 });
    }
    if (body.decision !== 'approved' && body.decision !== 'denied') {
      return NextResponse.json({ ok: false, error: 'decision must be approved or denied' }, { status: 400 });
    }
    const access = await decideAccessRequest({
      id: decodeURIComponent(params.id),
      decision: body.decision,
      rationale: body.rationale,
      actor: body.actor,
    });
    return NextResponse.json({ ok: true, access });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not decide access request' }, { status: 400 });
  }
}
