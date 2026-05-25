import { NextResponse } from 'next/server';
import { recordDecision } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.meeting_id || !body.title || !body.owner || !body.rationale) {
      return NextResponse.json({ ok: false, error: 'meeting_id, title, owner, rationale are required' }, { status: 400 });
    }
    const decision = await recordDecision(body);
    return NextResponse.json({ ok: true, decision });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not record decision' }, { status: 400 });
  }
}
