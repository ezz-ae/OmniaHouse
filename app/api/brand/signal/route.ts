import { NextResponse } from 'next/server';
import { createSignal, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, signals: state.signals });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.kind || !body.source || !body.summary) {
      return NextResponse.json({ ok: false, error: 'kind, source, and summary are required' }, { status: 400 });
    }
    const signal = await createSignal(body);
    return NextResponse.json({ ok: true, signal });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create signal' }, { status: 400 });
  }
}
