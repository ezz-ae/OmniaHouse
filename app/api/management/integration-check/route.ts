import { NextResponse } from 'next/server';
import { refreshIntegrations, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, integrations: state.integrations });
}

export async function POST() {
  try {
    const integrations = await refreshIntegrations();
    return NextResponse.json({ ok: true, integrations });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not refresh integrations' }, { status: 500 });
  }
}
