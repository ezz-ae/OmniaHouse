import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/whatsapp/mock';
import { listWhatsappPresence } from '@/lib/operations/store';

export async function GET() {
  const conversations = getConversations();
  const presence = await listWhatsappPresence();
  const enriched = conversations.map((c) => ({
    ...c,
    presence: presence[c.id] || null,
  }));
  return NextResponse.json({ ok: true, conversations: enriched });
}
