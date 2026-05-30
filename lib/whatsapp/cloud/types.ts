/**
 * WhatsApp Cloud API payload types.
 *
 * Trimmed to what we actually use. Meta's full schemas are larger;
 * we keep only the fields the Desk reads, so a breaking change in
 * an unrelated field doesn't cascade.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

// ─── Incoming webhook payload (what Meta sends us) ─────────────────────────

export type WACloudWebhook = {
  object: 'whatsapp_business_account';
  entry: WACloudEntry[];
};

export type WACloudEntry = {
  id: string;                       // WABA id
  changes: WACloudChange[];
};

export type WACloudChange = {
  value: WACloudValue;
  field: 'messages';
};

export type WACloudValue = {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WACloudContact[];
  messages?: WACloudIncomingMessage[];
  statuses?: WACloudStatus[];       // delivered, read, sent, failed
};

export type WACloudContact = {
  profile: { name: string };
  wa_id: string;                    // customer phone, no +
};

export type WACloudIncomingMessage = {
  from: string;                     // customer wa_id (no +)
  id: string;                       // wamid.* — Meta message id
  timestamp: string;                // unix seconds as string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'voice' | 'sticker' | 'reaction' | 'location' | 'interactive' | 'button';
  text?:    { body: string };
  image?:   WACloudMedia;
  document?: WACloudMedia & { filename?: string };
  audio?:   WACloudMedia;
  video?:   WACloudMedia;
  voice?:   WACloudMedia;
  sticker?: WACloudMedia;
  reaction?: { message_id: string; emoji: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  context?:  { from: string; id: string };   // when the customer replies to a specific message
};

export type WACloudMedia = {
  id: string;                       // media id; download via /v18.0/{id}
  mime_type: string;
  sha256?: string;
  caption?: string;
};

export type WACloudStatus = {
  id: string;                       // our outbound message id (wamid)
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: { code: number; title: string; message?: string }[];
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: { type: 'user_initiated' | 'business_initiated' | 'referral_conversion' };
  };
  pricing?: {
    billable: boolean;
    pricing_model: 'CBP' | 'PMP';
    category: 'authentication' | 'marketing' | 'utility' | 'service' | 'referral_conversion';
  };
};

// ─── Outbound send payload (what we send to Meta) ──────────────────────────

export type WACloudSendTextPayload = {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;                       // E.164 without +
  type: 'text';
  text: { body: string; preview_url?: boolean };
  context?: { message_id: string }; // reply to a specific incoming
};

export type WACloudSendTemplatePayload = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };       // 'en' / 'ar' / 'en_US'
    components?: WACloudTemplateComponent[];
  };
};

export type WACloudTemplateComponent =
  | { type: 'header'; parameters: WACloudTemplateParam[] }
  | { type: 'body'; parameters: WACloudTemplateParam[] }
  | { type: 'button'; sub_type: 'url' | 'quick_reply'; index: string; parameters: WACloudTemplateParam[] };

export type WACloudTemplateParam =
  | { type: 'text'; text: string }
  | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: 'date_time'; date_time: { fallback_value: string } }
  | { type: 'image'; image: { link: string } };

export type WACloudSendResponse = {
  messaging_product: 'whatsapp';
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
};

// ─── Our internal normalised shape ─────────────────────────────────────────

export type NormalizedIncomingMessage = {
  /** Meta's message id (wamid.*) for status correlation. */
  wamid: string;
  /** Customer phone in E.164 (+97150…). */
  phone: string;
  /** When the customer sent it (unix ms). */
  at_ms: number;
  /** Profile name from the customer's WhatsApp. May be empty. */
  customer_name: string;
  /** Plain-text body. For media, this is the caption (may be empty). */
  body: string;
  /** Persistence type — drives the whatsapp_messages.type column. */
  type?: 'text' | 'media_pending' | 'interactive' | 'system';
  /** When the message had media, the metadata we kept. */
  media?: {
    media_id: string;
    mime_type: string;
    filename?: string;
    kind: 'image' | 'document' | 'audio' | 'video' | 'voice' | 'sticker';
  };
  /** Raw interactive payload (button click, list reply, flow completion). */
  interactive?: unknown;
  /** When the customer replied to one of our messages. */
  in_reply_to_wamid?: string;
};
