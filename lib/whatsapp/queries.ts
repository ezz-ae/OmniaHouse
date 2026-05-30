// WhatsApp read path · Supabase → desk-shaped Conversation[].
//
// Slice 1.5 follow-on to docs/specs/2026-05-26-whatsapp-webhook-persistence.md.
// Replaces the lib/whatsapp/mock.ts getConversations() import for the Desk
// endpoints. Every helper is org-scoped and uses the service-role client
// because the Desk is gated upstream (Supabase session OR oh_passkey cookie)
// and we explicitly filter by org_id in every query.

import { createServiceClient } from '@/lib/supabase/server';
import { resolveOrgId } from './persistence';
import type { Conversation, Message, Language, Country, ConvStatus } from './types';
import { detectLanguage } from './language';

const NEUTRAL_VIBES = {
  happiness_level: 6,
  urgency: 'medium' as const,
  fraud_risk: 'low' as const,
  is_spam: false,
  business_blockers: null,
  seniority_needed: 'junior' as const,
};

function detectCountry(phone: string): Country {
  if (phone.startsWith('+971')) return 'AE';
  if (phone.startsWith('+966')) return 'SA';
  if (phone.startsWith('+965')) return 'KW';
  if (phone.startsWith('+973')) return 'BH';
  if (phone.startsWith('+974')) return 'QA';
  if (phone.startsWith('+968')) return 'OM';
  return 'OTHER';
}

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function normalizeMediaKind(kind?: string): 'image' | 'pdf' | 'audio' {
  if (kind === 'audio' || kind === 'voice') return 'audio';
  if (kind === 'document') return 'pdf';
  return 'image';
}

// ─── Row → wire mapping ───────────────────────────────────────────────────

type ConvRow = {
  id: string;
  org_id: string;
  phone: string;
  status: string;
  assigned_to: string | null;
  unread_count: number;
  language: string;
  last_message_at: string;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  metadata: any;
  created_at: string;
};

type MsgRow = {
  id: string;
  conversation_id: string;
  meta_message_id: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'media_pending' | 'interactive' | 'system';
  body: string | null;
  media_caption: string | null;
  media_meta: any;
  interactive_json: any;
  reply_to_wamid: string | null;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  sent_by_user_id?: string | null;
  sent_by_name?: string | null;
};

function mapMessage(row: MsgRow, convLang: Language): Message {
  const body = row.type === 'interactive'
    ? '(interactive · button or list reply)'
    : row.body || '';
  const language: Language = body ? detectLanguage(body) : convLang;
  const media = row.media_meta && row.type === 'media_pending' ? {
    kind: normalizeMediaKind(row.media_meta.kind),
    filename: row.media_meta.filename || `${row.media_meta.media_id || 'media'}.bin`,
    duration_sec: row.media_meta.duration_sec || undefined,
  } : undefined;
  return {
    id: row.id,
    at: formatHHMM(row.sent_at),
    from: row.direction === 'inbound' ? 'customer' : 'agent',
    body,
    language,
    media,
    sent_by_id: row.sent_by_user_id ?? null,
    sent_by_name: row.sent_by_name ?? null,
  };
}

function mapConversation(conv: ConvRow, messages: MsgRow[]): Conversation {
  const lang = (conv.language === 'ar' || conv.language === 'mixed') ? conv.language as Language : 'en';
  const md = conv.metadata || {};
  const last = messages[messages.length - 1] || null;
  return {
    id: conv.id,
    phone: conv.phone,
    country: detectCountry(conv.phone),
    customer_id: md.customer_id ?? null,
    status: (conv.status as ConvStatus) || 'unclaimed',
    assignee: conv.assigned_to,
    unread: conv.unread_count,
    language: lang,
    last_at: last ? formatHHMM(last.sent_at) : formatHHMM(conv.last_message_at),
    messages: messages.map((m) => mapMessage(m, lang)),
    vibes: md.vibes || NEUTRAL_VIBES,
    labels: Array.isArray(md.labels) ? md.labels : [],
  };
}

// ─── Public queries ───────────────────────────────────────────────────────

export function isWhatsAppLiveAvailable(): boolean {
  if (!resolveOrgId()) return false;
  return !!createServiceClient();
}

export type ConversationListItem = Conversation;

export async function getConversationsLive(opts: { limit?: number } = {}): Promise<ConversationListItem[] | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const limit = Math.min(opts.limit ?? 50, 200);
  const { data: convs, error } = await client
    .from('whatsapp_conversations')
    .select('id, org_id, phone, status, assigned_to, unread_count, language, last_message_at, last_inbound_at, last_outbound_at, metadata, created_at')
    .eq('org_id', orgId)
    .order('last_message_at', { ascending: false })
    .limit(limit);
  if (error || !convs) return null;
  if (convs.length === 0) return [];

  // Fetch up to the latest 50 messages per conversation in a single query
  // and group on the way back. Avoids N+1 for the inbox list.
  const ids = convs.map((c) => c.id);
  const { data: messages } = await client
    .from('whatsapp_messages')
    .select('id, conversation_id, meta_message_id, phone, direction, type, body, media_caption, media_meta, interactive_json, reply_to_wamid, status, sent_at, delivered_at, read_at, sent_by_user_id, sent_by_name')
    .in('conversation_id', ids)
    .order('sent_at', { ascending: true });

  const byConv = new Map<string, MsgRow[]>();
  for (const m of (messages || []) as MsgRow[]) {
    const arr = byConv.get(m.conversation_id) || [];
    arr.push(m);
    byConv.set(m.conversation_id, arr);
  }
  return (convs as ConvRow[]).map((c) => mapConversation(c, byConv.get(c.id) || []));
}

export async function getConversationLive(id: string): Promise<Conversation | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const { data: conv, error } = await client
    .from('whatsapp_conversations')
    .select('id, org_id, phone, status, assigned_to, unread_count, language, last_message_at, last_inbound_at, last_outbound_at, metadata, created_at')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error || !conv) return null;

  const { data: messages } = await client
    .from('whatsapp_messages')
    .select('id, conversation_id, meta_message_id, phone, direction, type, body, media_caption, media_meta, interactive_json, reply_to_wamid, status, sent_at, delivered_at, read_at, sent_by_user_id, sent_by_name')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: true })
    .limit(200);

  return mapConversation(conv as ConvRow, (messages || []) as MsgRow[]);
}

export async function findConversationByPhone(phone: string): Promise<{ id: string } | null> {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;
  const { data } = await client
    .from('whatsapp_conversations')
    .select('id')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .maybeSingle();
  return data ? { id: data.id } : null;
}

// ─── Claim / release ──────────────────────────────────────────────────────
// Returns the row after the write. The Desk reads `assigned_to` directly
// from the row — no separate "presence" table for Slice 1.5; the in-memory
// presence store keeps working as a soft layer over the truth in Postgres.

export async function claimConversationLive(input: { conversation_id: string; user_id: string; force?: boolean }) {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const { data: existing, error: readErr } = await client
    .from('whatsapp_conversations')
    .select('id, assigned_to, status')
    .eq('org_id', orgId)
    .eq('id', input.conversation_id)
    .maybeSingle();
  if (readErr || !existing) return null;

  if (existing.assigned_to && existing.assigned_to !== input.user_id && !input.force) {
    throw new Error(`Conversation already claimed by ${existing.assigned_to}. Pass force=true to transfer.`);
  }

  const { data: updated } = await client
    .from('whatsapp_conversations')
    .update({
      assigned_to: input.user_id,
      status: existing.status === 'unclaimed' ? 'in_progress' : existing.status,
    })
    .eq('id', input.conversation_id)
    .select('id, assigned_to, status')
    .single();
  return updated;
}

export async function releaseConversationLive(input: { conversation_id: string; user_id: string }) {
  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return null;

  const { data: existing } = await client
    .from('whatsapp_conversations')
    .select('id, assigned_to')
    .eq('org_id', orgId)
    .eq('id', input.conversation_id)
    .maybeSingle();
  if (!existing) return null;
  if (existing.assigned_to && existing.assigned_to !== input.user_id) {
    throw new Error('Only the current owner can release this conversation.');
  }
  const { data: updated } = await client
    .from('whatsapp_conversations')
    .update({ assigned_to: null, status: 'unclaimed' })
    .eq('id', input.conversation_id)
    .select('id, assigned_to, status')
    .single();
  return updated;
}
