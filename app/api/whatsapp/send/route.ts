import { NextResponse } from 'next/server';
import { sendText, sendTemplate, isCloudConfigured } from '@/lib/whatsapp/cloud/client';
import type { WACloudTemplateComponent } from '@/lib/whatsapp/cloud/types';
import { recordWhatsappOutgoing } from '@/lib/operations/store';
import { insertOutboundMessage, resolveOrgId, upsertConversation } from '@/lib/whatsapp/persistence';
import { createServiceClient } from '@/lib/supabase/server';
import { findConversationByPhone } from '@/lib/whatsapp/queries';

/**
 * POST /api/whatsapp/send
 *
 * Sends a message from the Desk to a customer.
 *
 * Body (text):
 *   { to: "+97150…", body: "…", reply_to_wamid?: "wamid.…" }
 *
 * Body (template — required when no incoming message in the last 24h):
 *   { to: "+97150…", template_name: "payment_confirmed",
 *     language?: "en" | "ar", components?: [...] }
 *
 * Mock mode (no env): returns ok with a synthetic wamid so the Desk
 * UI still shows the message as sent during preview.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to } = body;
    if (!to) {
      return NextResponse.json({ ok: false, error: 'missing_to' }, { status: 400 });
    }

    // Record sender attribution + claim state so two agents can't double-respond.
    let outgoingRecord: any = null;
    if (body.conversation_id && body.team_member_id && typeof body.body === 'string') {
      try {
        const result = await recordWhatsappOutgoing({
          conversation_id: body.conversation_id,
          team_member_id: body.team_member_id,
          body: body.body,
          language: body.language,
          payment_link: Boolean(body.payment_link),
          shortcut_id: body.shortcut_id || null,
          reply_to_message_id: body.reply_to_message_id || null,
          customer_last_message_at: body.customer_last_message_at || null,
        });
        outgoingRecord = { outgoing: result.outgoing, presence: result.presence };
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || 'Could not record send' }, { status: 409 });
      }
    }

    if (!isCloudConfigured()) {
      return NextResponse.json({
        ok: true,
        mode: 'mock',
        wamid: `mock_${Date.now()}`,
        note: 'WhatsApp Cloud API not configured. Set WHATSAPP_* env vars.',
        ...outgoingRecord,
      });
    }

    if (body.template_name) {
      const result = await sendTemplate({
        to,
        template_name: body.template_name,
        language: body.language,
        components: body.components as WACloudTemplateComponent[] | undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ mode: 'real', ...result }, { status: 502 });
      }
      const persisted = await persistOutbound({
        to, body: '(template) ' + body.template_name,
        result, sentByUserId: body.user_id, sentByName: body.sent_by_name, replyTo: body.reply_to_wamid,
      });
      return NextResponse.json({ ok: true, mode: 'real', wamid: result.wamid, ...outgoingRecord, persisted });
    }

    if (typeof body.body !== 'string' || body.body.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'missing_body' }, { status: 400 });
    }

    const result = await sendText({
      to,
      body: body.body,
      reply_to_wamid: body.reply_to_wamid,
      preview_url: body.preview_url,
    });
    if (!result.ok) {
      return NextResponse.json({ mode: 'real', ...result }, { status: 502 });
    }
    const persisted = await persistOutbound({
      to, body: body.body,
      result, sentByUserId: body.user_id, sentByName: body.sent_by_name, replyTo: body.reply_to_wamid,
    });
    return NextResponse.json({ ok: true, mode: 'real', wamid: result.wamid, ...outgoingRecord, persisted });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─── Outbound persist (Slice 1.6) ─────────────────────────────────────────
// Best-effort write to Supabase whatsapp_messages so the status webhook
// has a row to match against. Never throws — a Supabase outage must not
// stop the agent from sending another message.

async function persistOutbound(input: {
  to: string;
  body: string;
  result: Awaited<ReturnType<typeof sendText>>;
  sentByUserId?: string | null;
  sentByName?: string | null;
  replyTo?: string | null;
}): Promise<{ message_id: string | null; conversation_id: string | null; mode: 'live' | 'skipped' }> {
  if (!input.result.ok) return { message_id: null, conversation_id: null, mode: 'skipped' };

  const orgId = resolveOrgId();
  const client = createServiceClient();
  if (!orgId || !client) return { message_id: null, conversation_id: null, mode: 'skipped' };

  try {
    // Resolve conversation_id: prefer an existing row, else upsert a stub so
    // outbound-first conversations (welcome blast, template fan-out) still
    // land somewhere the desk can read.
    const phoneE164 = input.to.startsWith('+') ? input.to : '+' + input.to;
    const existing = await findConversationByPhone(phoneE164);
    const convId = existing?.id || (await upsertConversation(orgId, phoneE164, {})).id;

    const persisted = await insertOutboundMessage(orgId, convId, input.result, input.body, {
      sent_by_user_id: input.sentByUserId || null,
      sent_by_name: input.sentByName || null,
      reply_to_wamid: input.replyTo || null,
    });
    return { message_id: persisted?.id || null, conversation_id: convId, mode: 'live' };
  } catch (err) {
    console.error('[wa.persist.outbound] failed:', err);
    return { message_id: null, conversation_id: null, mode: 'skipped' };
  }
}
