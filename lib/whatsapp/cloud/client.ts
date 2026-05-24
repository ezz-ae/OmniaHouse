import crypto from 'node:crypto';
import type {
  WACloudIncomingMessage, NormalizedIncomingMessage,
  WACloudSendTextPayload, WACloudSendTemplatePayload, WACloudSendResponse,
  WACloudTemplateComponent,
} from './types';

/**
 * WhatsApp Cloud API client.
 *
 * One server-side surface, four functions:
 *   - isCloudConfigured()        — are the env vars set?
 *   - verifyWebhookSignature()   — checks X-Hub-Signature-256 from Meta
 *   - sendText() / sendTemplate() — outbound to a customer
 *   - getMediaDownloadUrl()       — resolve a media_id to a fetchable URL
 *   - normalizeIncoming()         — convert Meta's shape to our Message
 *
 * Each function fails closed: when env vars are missing, send functions
 * return { ok: false, error: 'not_configured' } so the Desk falls back
 * to mock mode rather than crashing.
 */

// ─── Config ────────────────────────────────────────────────────────────────

export type CloudConfig = {
  phone_number_id: string;
  business_account_id?: string;
  access_token: string;
  app_secret: string;
  verify_token: string;
  graph_version: string;
};

export function getCloudConfig(): CloudConfig | null {
  const phone_number_id    = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const access_token       = process.env.WHATSAPP_ACCESS_TOKEN;
  const app_secret         = process.env.WHATSAPP_APP_SECRET;
  const verify_token       = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!phone_number_id || !access_token || !app_secret || !verify_token) return null;
  return {
    phone_number_id,
    business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    access_token,
    app_secret,
    verify_token,
    graph_version: process.env.WHATSAPP_GRAPH_VERSION || 'v21.0',
  };
}

export function isCloudConfigured(): boolean {
  return !!getCloudConfig();
}

// ─── Webhook signature verification ────────────────────────────────────────

/**
 * Meta signs every webhook POST with sha256 = HMAC(app_secret, rawBody).
 * Sent as `X-Hub-Signature-256: sha256=<hex>`. We compute the same and
 * compare in constant time.
 *
 * IMPORTANT: rawBody must be the exact bytes Meta sent. Don't pass a
 * JSON-stringified copy of the parsed body — it won't match.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const cfg = getCloudConfig();
  if (!cfg || !signatureHeader) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;

  const provided = signatureHeader.slice('sha256='.length);
  const expected = crypto
    .createHmac('sha256', cfg.app_secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
}

// ─── Phone helpers ─────────────────────────────────────────────────────────

/** Customer wa_id from Meta is digits-only ("971501234567"). Add +. */
export function toE164(waId: string): string {
  const digits = waId.replace(/\D/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/** Outbound: Meta wants the recipient as digits-only, no +. */
export function toWaId(phoneE164: string): string {
  return phoneE164.replace(/\D/g, '');
}

// ─── Incoming → normalised ─────────────────────────────────────────────────

export function normalizeIncoming(
  msg: WACloudIncomingMessage,
  profileName: string | null,
): NormalizedIncomingMessage | null {
  const at_ms = Number(msg.timestamp) * 1000;
  const phone = toE164(msg.from);
  const base: NormalizedIncomingMessage = {
    wamid: msg.id,
    phone,
    at_ms,
    customer_name: profileName || '',
    body: '',
    in_reply_to_wamid: msg.context?.id,
  };

  switch (msg.type) {
    case 'text':
      return { ...base, body: msg.text?.body || '' };
    case 'image':
    case 'document':
    case 'audio':
    case 'video':
    case 'voice':
    case 'sticker': {
      const media = msg[msg.type as 'image' | 'document' | 'audio' | 'video' | 'voice' | 'sticker'];
      if (!media) return base;
      return {
        ...base,
        body: media.caption || '',
        media: {
          media_id: media.id,
          mime_type: media.mime_type,
          filename: 'filename' in media ? media.filename : undefined,
          kind: msg.type as any,
        },
      };
    }
    case 'reaction':
      return { ...base, body: `(reaction: ${msg.reaction?.emoji || ''})` };
    case 'location':
      return {
        ...base,
        body: msg.location
          ? `(location: ${msg.location.name || ''} ${msg.location.latitude},${msg.location.longitude})`
          : '(location)',
      };
    default:
      return { ...base, body: `(${msg.type})` };
  }
}

// ─── Outbound · text ───────────────────────────────────────────────────────

export type SendResult =
  | { ok: true; wamid: string; raw: WACloudSendResponse }
  | { ok: false; error: string; details?: any };

export async function sendText(opts: {
  to: string;                      // E.164 (+97150…) or wa_id
  body: string;
  reply_to_wamid?: string;
  preview_url?: boolean;
}): Promise<SendResult> {
  const cfg = getCloudConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };

  const payload: WACloudSendTextPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toWaId(opts.to),
    type: 'text',
    text: { body: opts.body, preview_url: opts.preview_url ?? true },
    ...(opts.reply_to_wamid ? { context: { message_id: opts.reply_to_wamid } } : {}),
  };
  return callGraph(cfg, payload);
}

// ─── Outbound · template ───────────────────────────────────────────────────

export async function sendTemplate(opts: {
  to: string;
  template_name: string;
  language?: string;
  components?: WACloudTemplateComponent[];
}): Promise<SendResult> {
  const cfg = getCloudConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };

  const payload: WACloudSendTemplatePayload = {
    messaging_product: 'whatsapp',
    to: toWaId(opts.to),
    type: 'template',
    template: {
      name: opts.template_name,
      language: { code: opts.language || 'en' },
      ...(opts.components ? { components: opts.components } : {}),
    },
  };
  return callGraph(cfg, payload);
}

async function callGraph(cfg: CloudConfig, payload: object): Promise<SendResult> {
  const url = `https://graph.facebook.com/${cfg.graph_version}/${cfg.phone_number_id}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error?.message || `http_${res.status}`, details: json?.error };
    }
    const data = json as WACloudSendResponse;
    return { ok: true, wamid: data.messages?.[0]?.id, raw: data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'network_error' };
  }
}

// ─── Media · resolve and download ──────────────────────────────────────────

export type MediaURLResult =
  | { ok: true; url: string; mime_type: string; sha256?: string; file_size?: number }
  | { ok: false; error: string };

/**
 * Step 1: look up the media URL from its id.
 * Meta returns a short-lived URL (valid ~5 min). Caller should download
 * immediately and store the bytes.
 */
export async function getMediaDownloadUrl(mediaId: string): Promise<MediaURLResult> {
  const cfg = getCloudConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };

  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.graph_version}/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${cfg.access_token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error?.message || `http_${res.status}` };
    return {
      ok: true,
      url: json.url,
      mime_type: json.mime_type,
      sha256: json.sha256,
      file_size: json.file_size,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'network_error' };
  }
}

/**
 * Step 2: download the bytes. The URL from step 1 needs the same bearer
 * token to fetch — it's not a public CDN URL.
 */
export async function downloadMediaBytes(url: string): Promise<{ ok: true; bytes: ArrayBuffer; mime_type: string } | { ok: false; error: string }> {
  const cfg = getCloudConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${cfg.access_token}` } });
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    return {
      ok: true,
      bytes: await res.arrayBuffer(),
      mime_type: res.headers.get('content-type') || 'application/octet-stream',
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'network_error' };
  }
}

// ─── Mark message as read (so the customer sees the blue ticks) ────────────

export async function markRead(wamid: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getCloudConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };

  const url = `https://graph.facebook.com/${cfg.graph_version}/${cfg.phone_number_id}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: wamid,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: json?.error?.message || `http_${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'network_error' };
  }
}
