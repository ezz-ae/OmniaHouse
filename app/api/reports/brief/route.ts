import { NextResponse } from 'next/server';
import { createBrief, generateOwnerBrief, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, briefs: state.briefs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.kind === 'owner_brief' && !body.title) {
      const brief = await generateOwnerBrief();
      return NextResponse.json({ ok: true, brief });
    }
    if (!body.kind || !body.title || !body.question || !body.audience) {
      return NextResponse.json({ ok: false, error: 'kind, title, question, audience are required (or send {kind:owner_brief} to auto-generate)' }, { status: 400 });
    }
    const brief = await createBrief(body);
    return NextResponse.json({ ok: true, brief });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create brief' }, { status: 400 });
  }
}
