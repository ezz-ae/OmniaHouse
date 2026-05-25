import { NextResponse } from 'next/server';
import { releaseConversation } from '@/lib/operations/store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const presence = await releaseConversation({
      conversation_id: decodeURIComponent(params.id),
      team_member_id: body.team_member_id,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, presence });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not release' }, { status: 400 });
  }
}
