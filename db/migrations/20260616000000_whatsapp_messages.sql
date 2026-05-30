-- WhatsApp persistence · text inbound + outbound delivery statuses
-- Spec: docs/specs/2026-05-26-whatsapp-webhook-persistence.md

CREATE TABLE whatsapp_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone             TEXT NOT NULL,                  -- E.164, +country-no-leading-zero
  status            TEXT NOT NULL DEFAULT 'unclaimed',
  assigned_to       UUID,                            -- user_id of claimer, nullable
  unread_count      INT  NOT NULL DEFAULT 0,
  language          TEXT NOT NULL DEFAULT 'en',
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_inbound_at   TIMESTAMPTZ,
  last_outbound_at  TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, phone)
);
CREATE INDEX whatsapp_conversations_org_status_last_idx
  ON whatsapp_conversations (org_id, status, last_message_at DESC);

CREATE TABLE whatsapp_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id   UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  meta_message_id   TEXT NOT NULL UNIQUE,            -- WAMID
  phone             TEXT NOT NULL,
  direction         TEXT NOT NULL,                   -- 'inbound' | 'outbound'
  type              TEXT NOT NULL,                   -- 'text' | 'media_pending' | 'interactive' | 'system'
  body              TEXT,
  media_caption     TEXT,
  media_meta        JSONB,                           -- { media_id, mime_type, filename, kind } when type='media_pending'
  interactive_json  JSONB,                           -- raw payload when type='interactive'
  reply_to_wamid    TEXT,
  status            TEXT NOT NULL DEFAULT 'received', -- inbound: 'received'; outbound: 'sent'|'delivered'|'read'|'failed'
  error_code        INT,
  error_message     TEXT,
  pricing_billable  BOOLEAN,
  pricing_category  TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_messages_direction_chk CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT whatsapp_messages_type_chk CHECK (type IN ('text', 'media_pending', 'interactive', 'system'))
);
CREATE INDEX whatsapp_messages_conv_idx ON whatsapp_messages (conversation_id, sent_at DESC);
CREATE INDEX whatsapp_messages_org_phone_idx ON whatsapp_messages (org_id, phone, sent_at DESC);

-- Enable RLS so policies (separate spec) can attach. Until policies land,
-- only the service-role key can read/write — which is what the webhook
-- route uses (server-only).
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages      ENABLE ROW LEVEL SECURITY;

-- Auto-bump updated_at on conversation row updates.
CREATE OR REPLACE FUNCTION public.set_whatsapp_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_conversation_updated_at();
