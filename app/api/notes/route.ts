import { NextResponse } from 'next/server';
import { listNotes, createNote, unreadNoteCount } from '@/lib/operations/store';

// GET /api/notes?for=tm_2&unread_count=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const forId = url.searchParams.get('for') || undefined;
  const limit = Number(url.searchParams.get('limit') || 100);
  const notes = await listNotes({ for_member_id: forId, limit });
  const unread = forId ? await unreadNoteCount(forId) : 0;
  return NextResponse.json({ ok: true, notes, unread });
}

// POST /api/notes
// Body: { from_id, body, audience: 'individual'|'role'|'all',
//         to_member_ids?, to_role?, priority?, tags?, kind?, reply_to? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.from_id || !body.body || !body.audience) {
      return NextResponse.json({ ok: false, error: 'from_id, body, audience are required' }, { status: 400 });
    }
    if (body.audience === 'individual' && (!body.to_member_ids || body.to_member_ids.length === 0)) {
      return NextResponse.json({ ok: false, error: 'to_member_ids required when audience=individual' }, { status: 400 });
    }
    if (body.audience === 'role' && !body.to_role) {
      return NextResponse.json({ ok: false, error: 'to_role required when audience=role' }, { status: 400 });
    }
    const note = await createNote(body);
    return NextResponse.json({ ok: true, note });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create note' }, { status: 400 });
  }
}
