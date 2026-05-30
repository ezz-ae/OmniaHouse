import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/whatsapp/mock';
import { listWhatsappPresence } from '@/lib/operations/store';
import { getConversationsLive, isWhatsAppLiveAvailable } from '@/lib/whatsapp/queries';

/**
 * GET /api/whatsapp/conversations
 *
 * Returns the inbox list. Supabase-first when OMNIA_ORG_ID + service-role
 * key are configured AND the table actually has rows; falls back to the
 * mock conversations so local dev + first-time prod (before any Meta
 * traffic hits the webhook) keep working.
 *
 * The Desk's claim/release state lives in two places during the migration:
 *   • Authoritative: whatsapp_conversations.assigned_to (Postgres)
 *   • Soft overlay:  in-memory operations-store presence (faster polling,
 *                    survives until the read-side claims are wired live)
 * This endpoint returns both so the UI can render whichever exists first.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceMock = url.searchParams.get('source') === 'mock';

  if (!forceMock && isWhatsAppLiveAvailable()) {
    const live = await getConversationsLive({ limit: 100 });
    if (live && live.length > 0) {
      const presence = await listWhatsappPresence();
      const enriched = live.map((c) => ({ ...c, presence: presence[c.id] || null }));
      return NextResponse.json({ ok: true, source: 'live', conversations: enriched });
    }
  }

  const conversations = getConversations();
  const presence = await listWhatsappPresence();
  const enriched = conversations.map((c) => ({ ...c, presence: presence[c.id] || null }));
  return NextResponse.json({ ok: true, source: 'mock', conversations: enriched });
}
