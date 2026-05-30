// MCP tools · whatsapp domain.

import { getConversationsLive, getConversationLive, findConversationByPhone } from '@/lib/whatsapp/queries';

export async function list_conversations(args: { limit?: number }) {
  const rows = await getConversationsLive({ limit: args.limit ?? 25 });
  if (!rows) return { ok: false, reason: 'whatsapp_unavailable' };
  return {
    ok: true,
    matched: rows.length,
    conversations: rows.map((c) => ({
      id: c.id,
      phone: c.phone,
      country: c.country,
      language: c.language,
      status: c.status,
      assignee: c.assignee,
      last_at: c.last_at,
      unread: c.unread,
      labels: c.labels,
    })),
  };
}

export async function get_conversation(args: { conversation_id?: string; phone?: string }) {
  let id = args.conversation_id;
  if (!id && args.phone) {
    const hit = await findConversationByPhone(args.phone);
    id = hit?.id;
  }
  if (!id) return { ok: false, reason: 'not_found' };

  const conv = await getConversationLive(id);
  if (!conv) return { ok: false, reason: 'not_found' };
  return {
    ok: true,
    id: conv.id,
    phone: conv.phone,
    country: conv.country,
    language: conv.language,
    status: conv.status,
    assignee: conv.assignee,
    last_at: conv.last_at,
    messages: (conv.messages || []).slice(-20).map((m) => ({
      from: m.from,
      body: m.body,
      at: m.at,
      sent_by_name: m.sent_by_name ?? null,
    })),
  };
}
