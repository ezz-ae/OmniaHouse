import { NextResponse } from 'next/server';
import { claimConversation } from '@/lib/operations/store';
import { claimConversationLive, isWhatsAppLiveAvailable } from '@/lib/whatsapp/queries';

/**
 * POST /api/whatsapp/conversations/[id]/claim
 *
 * Body: { team_member_id, user_id?, force?, reason? }
 *
 * Two writes, both org-scoped:
 *   1. Supabase whatsapp_conversations.assigned_to (authoritative once
 *      the migration is run).
 *   2. The in-memory presence cache (instant UI feedback, claim TTL).
 *
 * If the conversation isn't in Supabase yet (mock id from dev fixtures),
 * we skip the live write and only touch the in-memory store — desk still
 * works on local + pre-migration prod.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.team_member_id) {
      return NextResponse.json({ ok: false, error: 'team_member_id is required' }, { status: 400 });
    }
    const convId = decodeURIComponent(params.id);

    let liveRow: any = null;
    if (isWhatsAppLiveAvailable() && body.user_id) {
      try {
        liveRow = await claimConversationLive({
          conversation_id: convId,
          user_id: body.user_id,
          force: Boolean(body.force),
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || 'Could not claim in Supabase' }, { status: 409 });
      }
    }

    const presence = await claimConversation({
      conversation_id: convId,
      team_member_id: body.team_member_id,
      force: Boolean(body.force),
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, presence, live: liveRow });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not claim' }, { status: 409 });
  }
}
