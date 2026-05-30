import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/whatsapp/mock';
import { getWhatsappPresence } from '@/lib/operations/store';
import { getConversationLive, isWhatsAppLiveAvailable } from '@/lib/whatsapp/queries';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);

  if (isWhatsAppLiveAvailable()) {
    const live = await getConversationLive(id);
    if (live) {
      const presence = await getWhatsappPresence(live.id);
      return NextResponse.json({ ok: true, source: 'live', conversation: live, presence });
    }
  }

  const conv = getConversations().find((c) => c.id === id);
  if (!conv) return NextResponse.json({ ok: false, error: 'Conversation not found' }, { status: 404 });
  const presence = await getWhatsappPresence(conv.id);
  return NextResponse.json({ ok: true, source: 'mock', conversation: conv, presence });
}
