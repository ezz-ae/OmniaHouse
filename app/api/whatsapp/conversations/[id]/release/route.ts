import { NextResponse } from 'next/server';
import { releaseConversation } from '@/lib/operations/store';
import { releaseConversationLive, isWhatsAppLiveAvailable } from '@/lib/whatsapp/queries';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const convId = decodeURIComponent(params.id);

    let liveRow: any = null;
    if (isWhatsAppLiveAvailable() && body.user_id) {
      try {
        liveRow = await releaseConversationLive({ conversation_id: convId, user_id: body.user_id });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || 'Could not release in Supabase' }, { status: 400 });
      }
    }

    const presence = await releaseConversation({
      conversation_id: convId,
      team_member_id: body.team_member_id,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, presence, live: liveRow });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not release' }, { status: 400 });
  }
}
