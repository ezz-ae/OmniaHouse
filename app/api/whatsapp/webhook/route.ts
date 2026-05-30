import { NextResponse } from 'next/server';
import {
  getCloudConfig,
  verifyWebhookSignature,
  normalizeIncoming,
  markRead,
} from '@/lib/whatsapp/cloud/client';
import type { WACloudWebhook } from '@/lib/whatsapp/cloud/types';
import {
  resolveOrgId,
  upsertConversation,
  insertInboundMessage,
  recordStatusUpdate,
  inferLanguageFromBody,
} from '@/lib/whatsapp/persistence';
import { logSystemActivity, AUDIT_ACTIONS } from '@/lib/audit';
import { maskPhone } from '@/lib/whatsapp/language';

/**
 * /api/whatsapp/webhook
 *
 * GET  — one-time verification handshake from Meta. We echo the
 *        hub.challenge back when hub.verify_token matches the env
 *        var we set in Meta's webhook configuration screen.
 *
 * POST — every incoming message + status update from Meta. We verify
 *        the signature, normalize the payload, then persist inbound
 *        messages + outbound status callbacks to Supabase via
 *        lib/whatsapp/persistence.ts.
 *
 * Spec: docs/specs/2026-05-26-whatsapp-webhook-persistence.md
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const cfg = getCloudConfig();
  if (!cfg) {
    return new NextResponse('not_configured', { status: 503 });
  }

  if (mode === 'subscribe' && token === cfg.verify_token && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(req: Request) {
  // Read raw body BEFORE parsing — required for signature verification.
  const raw = await req.text();
  const sig = req.headers.get('x-hub-signature-256');

  // If we're not configured, accept silently with 200 so Meta retries
  // don't pile up. Meta requires 200 OK to consider delivery successful.
  if (!getCloudConfig()) {
    return NextResponse.json({ ok: true, mode: 'not_configured' });
  }

  if (!verifyWebhookSignature(raw, sig)) {
    return new NextResponse('bad_signature', { status: 401 });
  }

  let payload: WACloudWebhook;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse('bad_payload', { status: 400 });
  }

  // Spec §1 — without OMNIA_ORG_ID we accept the payload and bail. Returning
  // 5xx would cause Meta to pause delivery for the whole number.
  const orgId = resolveOrgId();
  if (!orgId) {
    return NextResponse.json({ ok: true, mode: 'org_unresolved' });
  }

  try {
    await processWebhook(payload, orgId);
  } catch (err) {
    // Always 200 even on internal error — Meta will pause delivery if we 5xx
    // repeatedly. We log + recover async instead.
    console.error('webhook handler failed:', err);
  }
  return NextResponse.json({ ok: true });
}

// ─── Domain handler ────────────────────────────────────────────────────────

async function processWebhook(payload: WACloudWebhook, orgId: string) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const profileByPhone = new Map<string, string>();
      for (const c of value.contacts || []) {
        profileByPhone.set(c.wa_id, c.profile?.name || '');
      }

      // Incoming messages
      for (const msg of value.messages || []) {
        const profile = profileByPhone.get(msg.from) || null;
        const norm = normalizeIncoming(msg, profile);
        if (!norm) continue;

        // Mark as read so the customer sees the blue ticks.
        // (Cheap, idempotent, Meta-recommended.)
        markRead(norm.wamid).catch(() => {});

        try {
          const { language, meaningful } = inferLanguageFromBody(norm.body);
          const conv = await upsertConversation(orgId, norm.phone, { language, meaningful });
          const result = await insertInboundMessage(orgId, conv.id, norm);
          await logSystemActivity(AUDIT_ACTIONS.WA_MESSAGE_PERSISTED, orgId, {
            phone: maskPhone(norm.phone),
            wamid: norm.wamid,
            type: norm.type || 'text',
            conversation_created: conv.created,
            replayed: result.existed,
          });
          // Spec §10 — masked phone in stdout only.
          console.log('[wa.persist.inbound]', JSON.stringify({
            phone: maskPhone(norm.phone),
            type: norm.type || 'text',
            wamid: norm.wamid,
            existed: result.existed,
          }));
        } catch (err) {
          console.error('[wa.persist.inbound] failed:', err);
        }
      }

      // Delivery / read statuses for OUR outbound messages
      for (const s of value.statuses || []) {
        try {
          const result = await recordStatusUpdate(orgId, s.id, s.status as any, {
            error_code: s.errors?.[0]?.code ?? null,
            error_message: s.errors?.[0]?.title ?? null,
            pricing_billable: s.pricing?.billable ?? null,
            pricing_category: s.pricing?.category ?? null,
            at_ms: Number(s.timestamp) * 1000,
          });
          if (result === 'unmatched') {
            // Spec §7.2 — log and ignore; do not create synthetic outbound rows.
            console.log('[wa.status.unmatched]', JSON.stringify({ wamid_prefix: s.id.slice(0, 12), status: s.status }));
          } else {
            await logSystemActivity(AUDIT_ACTIONS.WA_STATUS_PERSISTED, orgId, {
              wamid: s.id,
              status: s.status,
              to: maskPhone(s.recipient_id),
            });
          }
        } catch (err) {
          console.error('[wa.persist.status] failed:', err);
        }
      }
    }
  }
}
