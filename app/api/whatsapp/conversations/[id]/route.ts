import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/whatsapp/mock';
import { getWhatsappPresence } from '@/lib/operations/store';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const conv = getConversations().find((c) => c.id === decodeURIComponent(params.id));
  if (!conv) return NextResponse.json({ ok: false, error: 'Conversation not found' }, { status: 404 });
  const presence = await getWhatsappPresence(conv.id);
  return NextResponse.json({ ok: true, conversation: conv, presence });
}
