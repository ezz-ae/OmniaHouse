import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { getConversations } from '@/lib/whatsapp/mock';
import { buildWhatsAppAnalytics } from '@/lib/whatsapp/analytics';

export async function GET() {
  try {
    const state = await operationsSnapshot();
    const conversations = getConversations();
    const analytics = buildWhatsAppAnalytics(state, conversations);
    return NextResponse.json({ ok: true, analytics });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not build analytics' }, { status: 500 });
  }
}
