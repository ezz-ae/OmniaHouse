import { NextResponse } from 'next/server';
import { toggleAutomation, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, automations: state.automations });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.key) return NextResponse.json({ ok: false, error: 'key is required' }, { status: 400 });
    const automation = await toggleAutomation({
      key: body.key,
      enabled: body.enabled,
      threshold: body.threshold,
      actor: body.actor,
    });
    return NextResponse.json({ ok: true, automation });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not toggle automation' }, { status: 400 });
  }
}
