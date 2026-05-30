// WhatsApp persistence — text inbound + outbound delivery statuses.
//
// Spec: docs/specs/2026-05-26-whatsapp-webhook-persistence.md
//
// Every function is org-scoped: the caller must pass `orgId`. Without it,
// none of the queries run. Uses the service-role Supabase client because
// the webhook route is unauthenticated (Meta sends no bearer token); RLS
// policies on the two tables guard browser-facing reads via a separate spec.

import { createServiceClient } from '@/lib/supabase/server';
import type { SendResult } from './cloud/client';
import type { NormalizedIncomingMessage } from './cloud/types';
import { detectLanguage, isMeaningfulForLanguageFlip } from './language';

// ─── Result types ─────────────────────────────────────────────────────────

export type PersistedConversation = { id: string; created: boolean };
export type PersistedInbound = { id: string; wamid: string; existed: boolean };
export type StatusUpdateResult = 'matched' | 'unmatched';

type NormalizedIncomingType = 'text' | 'media_pending' | 'interactive' | 'system';

export type NormalizedForPersist = NormalizedIncomingMessage & {
  // Spec §6 — the normalizer is extended in cloud/client.ts to include
  // an interactive case. We carry both fields explicitly so callers don't
  // re-derive type from the raw Meta payload.
  type?: NormalizedIncomingType;
  interactive?: unknown;
};

// ─── Upsert conversation ──────────────────────────────────────────────────

export async function upsertConversation(
  orgId: string,
  phone: string,
  fields: { language?: 'en' | 'ar'; meaningful?: boolean } = {},
): Promise<PersistedConversation> {
  const client = createServiceClient();
  if (!client) throw new Error('supabase_service_role_unavailable');

  const now = new Date().toISOString();

  // Fetch existing row first so we can preserve assigned_to + status
  // and only flip language when the new value differs AND the body
  // carried enough words to be confident (spec §4).
  const { data: existing } = await client
    .from('whatsapp_conversations')
    .select('id, language')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {
      last_message_at: now,
      last_inbound_at: now,
      updated_at: now,
    };
    // Bump unread on every inbound. The Desk decrements it when the agent
    // opens the chat — that path lives in the read-side spec.
    const { data: row } = await client
      .from('whatsapp_conversations')
      .select('unread_count')
      .eq('id', existing.id)
      .single();
    patch.unread_count = (row?.unread_count ?? 0) + 1;

    if (fields.language && fields.meaningful && fields.language !== existing.language) {
      patch.language = fields.language;
    }
    await client.from('whatsapp_conversations').update(patch).eq('id', existing.id);
    return { id: existing.id, created: false };
  }

  const { data: inserted, error } = await client
    .from('whatsapp_conversations')
    .insert({
      org_id: orgId,
      phone,
      status: 'unclaimed',
      unread_count: 1,
      language: fields.language || 'en',
      last_message_at: now,
      last_inbound_at: now,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    // ON CONFLICT race — re-fetch.
    const { data: row } = await client
      .from('whatsapp_conversations')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone', phone)
      .single();
    if (!row) throw error || new Error('conversation_insert_failed');
    return { id: row.id, created: false };
  }
  return { id: inserted.id, created: true };
}

// ─── Inbound message ──────────────────────────────────────────────────────

export async function insertInboundMessage(
  orgId: string,
  conversationId: string,
  msg: NormalizedForPersist,
): Promise<PersistedInbound> {
  const client = createServiceClient();
  if (!client) throw new Error('supabase_service_role_unavailable');

  const type: NormalizedIncomingType = msg.type
    || (msg.media ? 'media_pending'
        : (msg as any).interactive ? 'interactive'
        : msg.body && !/^\(/.test(msg.body) ? 'text' : 'system');

  const row = {
    org_id: orgId,
    conversation_id: conversationId,
    meta_message_id: msg.wamid,
    phone: msg.phone,
    direction: 'inbound',
    type,
    body: msg.body || null,
    media_caption: msg.media ? msg.body || null : null,
    media_meta: msg.media ? msg.media : null,
    interactive_json: type === 'interactive' ? msg.interactive || null : null,
    reply_to_wamid: msg.in_reply_to_wamid || null,
    status: 'received',
    sent_at: new Date(msg.at_ms).toISOString(),
  };

  const { data: inserted, error } = await client
    .from('whatsapp_messages')
    .insert(row)
    .select('id, meta_message_id')
    .single();

  if (error) {
    // Idempotent retry: Meta replays the same WAMID — return the existing id.
    if ((error as any).code === '23505' || /duplicate/i.test(error.message)) {
      const { data: existing } = await client
        .from('whatsapp_messages')
        .select('id, meta_message_id')
        .eq('meta_message_id', msg.wamid)
        .single();
      if (existing) return { id: existing.id, wamid: existing.meta_message_id, existed: true };
    }
    throw error;
  }
  return { id: inserted.id, wamid: inserted.meta_message_id, existed: false };
}

// ─── Outbound status callback ─────────────────────────────────────────────

export async function recordStatusUpdate(
  orgId: string,
  wamid: string,
  status: 'sent' | 'delivered' | 'read' | 'failed' | string,
  fields: {
    error_code?: number | null;
    error_message?: string | null;
    pricing_billable?: boolean | null;
    pricing_category?: string | null;
    at_ms?: number;
  } = {},
): Promise<StatusUpdateResult> {
  const client = createServiceClient();
  if (!client) throw new Error('supabase_service_role_unavailable');

  const stampIso = fields.at_ms ? new Date(fields.at_ms).toISOString() : new Date().toISOString();
  const patch: Record<string, unknown> = { status };
  if (status === 'delivered') patch.delivered_at = stampIso;
  if (status === 'read') patch.read_at = stampIso;
  if (status === 'failed') {
    patch.error_code = fields.error_code ?? null;
    patch.error_message = fields.error_message ?? null;
  }
  if (fields.pricing_billable !== undefined) patch.pricing_billable = fields.pricing_billable;
  if (fields.pricing_category !== undefined) patch.pricing_category = fields.pricing_category;

  const { data, error } = await client
    .from('whatsapp_messages')
    .update(patch)
    .eq('org_id', orgId)
    .eq('meta_message_id', wamid)
    .eq('direction', 'outbound')
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) return 'unmatched';

  // Also bump the conversation's last_outbound_at on terminal statuses.
  if (status === 'delivered' || status === 'read') {
    const { data: msgRow } = await client
      .from('whatsapp_messages')
      .select('conversation_id')
      .eq('meta_message_id', wamid)
      .single();
    if (msgRow?.conversation_id) {
      await client
        .from('whatsapp_conversations')
        .update({ last_outbound_at: stampIso })
        .eq('id', msgRow.conversation_id);
    }
  }
  return 'matched';
}

// ─── Outbound persist (called by future compose spec) ─────────────────────

export async function insertOutboundMessage(
  orgId: string,
  conversationId: string,
  sendResult: SendResult,
  body: string,
  meta?: { sent_by_user_id?: string | null; sent_by_name?: string | null; reply_to_wamid?: string | null },
): Promise<{ id: string } | null> {
  if (!sendResult.ok) return null;
  const client = createServiceClient();
  if (!client) throw new Error('supabase_service_role_unavailable');

  const { data, error } = await client
    .from('whatsapp_messages')
    .insert({
      org_id: orgId,
      conversation_id: conversationId,
      meta_message_id: sendResult.wamid,
      phone: (sendResult.raw as any)?.contacts?.[0]?.wa_id || '',
      direction: 'outbound',
      type: 'text',
      body,
      reply_to_wamid: meta?.reply_to_wamid || null,
      status: 'sent',
      sent_by_user_id: meta?.sent_by_user_id || null,
      sent_by_name: meta?.sent_by_name || null,
    })
    .select('id')
    .single();

  if (error) {
    // Same idempotency rule as inbound.
    if ((error as any).code === '23505') {
      const { data: existing } = await client
        .from('whatsapp_messages')
        .select('id')
        .eq('meta_message_id', sendResult.wamid)
        .single();
      return existing ? { id: existing.id } : null;
    }
    throw error;
  }
  await client
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString(), last_outbound_at: new Date().toISOString() })
    .eq('id', conversationId);
  return { id: data.id };
}

// ─── Org resolution ───────────────────────────────────────────────────────

let _cachedWarnedNoOrg = false;

export function resolveOrgId(): string | null {
  const id = (process.env.OMNIA_ORG_ID || '').trim();
  if (id) return id;
  if (!_cachedWarnedNoOrg) {
    _cachedWarnedNoOrg = true;
    console.error('[wa.persist] OMNIA_ORG_ID not set — webhook will accept but not persist.');
  }
  return null;
}

// Helper for callers that want both detection results in one go.
export function inferLanguageFromBody(body: string | null | undefined) {
  return { language: detectLanguage(body), meaningful: isMeaningfulForLanguageFlip(body) };
}
