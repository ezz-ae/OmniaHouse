import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const visibility = url.searchParams.get('visibility');
  const state = await operationsSnapshot();
  const audit = visibility ? state.audit.filter((a) => a.visibility === visibility) : state.audit;
  return NextResponse.json({ ok: true, audit, activity: state.activity.slice(0, 50) });
}
