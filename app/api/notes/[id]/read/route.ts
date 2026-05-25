import { NextResponse } from 'next/server';
import { markNoteRead } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.member_id) return NextResponse.json({ ok: false, error: 'member_id required' }, { status: 400 });
    const note = await markNoteRead({ note_id: decodeURIComponent(params.id), member_id: body.member_id });
    return NextResponse.json({ ok: true, note });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not mark read' }, { status: 400 });
  }
}
