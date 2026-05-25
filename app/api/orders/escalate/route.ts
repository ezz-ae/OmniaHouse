import { NextResponse } from 'next/server';
import { escalateEntity } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.entity_id || !body.reason) return NextResponse.json({ ok: false, error: 'entity_id and reason are required' }, { status: 400 });
    const result = await escalateEntity({
      entity_kind: body.entity_kind || 'order',
      entity_id: body.entity_id,
      reason: body.reason,
      actor: body.actor,
    });
    return NextResponse.json({ ok: true, escalated: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not escalate' }, { status: 400 });
  }
}
