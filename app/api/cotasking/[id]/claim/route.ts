import { NextResponse } from 'next/server';
import { claimHelpRequest } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.claimed_by) return NextResponse.json({ ok: false, error: 'claimed_by is required' }, { status: 400 });
    const help = await claimHelpRequest({ id: decodeURIComponent(params.id), claimed_by: body.claimed_by });
    return NextResponse.json({ ok: true, help });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not claim' }, { status: 400 });
  }
}
