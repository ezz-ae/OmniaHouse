import { NextResponse } from 'next/server';
import { resolveHelpRequest } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const help = await resolveHelpRequest({ id: decodeURIComponent(params.id), actor: body.actor || 'operator' });
    return NextResponse.json({ ok: true, help });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not resolve' }, { status: 400 });
  }
}
