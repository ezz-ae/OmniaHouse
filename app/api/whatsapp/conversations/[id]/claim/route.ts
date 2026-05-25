import { NextResponse } from 'next/server';
import { claimConversation } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.team_member_id) {
      return NextResponse.json({ ok: false, error: 'team_member_id is required' }, { status: 400 });
    }
    const presence = await claimConversation({
      conversation_id: decodeURIComponent(params.id),
      team_member_id: body.team_member_id,
      force: Boolean(body.force),
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, presence });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not claim' }, { status: 409 });
  }
}
