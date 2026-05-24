import { NextResponse } from 'next/server';
import {
  getCloudConfig,
  verifyWebhookSignature,
  normalizeIncoming,
  markRead,
} from '@/lib/whatsapp/cloud/client';
import type { WACloudWebhook } from '@/lib/whatsapp/cloud/types';

/**
 * /api/whatsapp/webhook
 *
 * GET  — one-time verification handshake from Meta. We echo the
 *        hub.challenge back when hub.verify_token matches the env
 *        var we set in Meta's webhook configuration screen.
 *
 * POST — every incoming message + status update from Meta.
 *        We verify the signature, normalize the payload, then
 *        delegate to a domain handler (TODO: persist to Supabase
 *        + run extraction). Right now we log so you can confirm
 *        end-to-end as soon as Meta is configured.
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

  try {
    await processWebhook(payload);
  } catch (err) {
    // Always return 200 even on internal error — Meta will pause delivery
    // if we 5xx repeatedly. We log + recover async instead.
    console.error('webhook handler failed:', err);
  }
  return NextResponse.json({ ok: true });
}

// ─── Domain handler ────────────────────────────────────────────────────────

async function processWebhook(payload: WACloudWebhook) {
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

        // TODO when Supabase is wired:
        //   1. UPSERT conversations row by phone
        //   2. INSERT message
        //   3. If media: queue media download → MEDIA_VERIFICATION_PROMPT
        //   4. Run WHATSAPP_EXTRACTION_PROMPT, store ai_extractions row
        //   5. Notify the assigned agent (or unclaimed queue)
        console.log('[wa.incoming]', JSON.stringify({
          wamid: norm.wamid,
          phone: norm.phone,
          name: norm.customer_name,
          at_ms: norm.at_ms,
          body: norm.body.slice(0, 200),
          media: norm.media,
          reply_to: norm.in_reply_to_wamid,
        }));
      }

      // Delivery / read statuses for OUR outbound messages
      for (const s of value.statuses || []) {
        // TODO when Supabase is wired:
        //   UPDATE messages SET delivery_status=$1 WHERE meta_wamid=$2
        console.log('[wa.status]', JSON.stringify({
          wamid: s.id,
          to: s.recipient_id,
          status: s.status,
          ts: s.timestamp,
          errors: s.errors,
          billable: s.pricing?.billable,
          category: s.pricing?.category,
        }));
      }
    }
  }
}
