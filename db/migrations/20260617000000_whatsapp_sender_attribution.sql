-- WhatsApp persistence · slice 1.6 follow-up
-- Adds first-class sender attribution columns to whatsapp_messages so the
-- Desk can render "sent by Abdelrahman · internal" without an extra join,
-- and so analytics + audit queries can group outbound by team member.
--
-- Spec ref: docs/specs/2026-05-26-whatsapp-webhook-persistence.md (V1 left
-- the metadata channel implicit; we promote sender attribution to columns
-- now that the compose path is wired through /api/whatsapp/send).

ALTER TABLE whatsapp_messages
  ADD COLUMN sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN sent_by_name    TEXT;

CREATE INDEX whatsapp_messages_sent_by_idx
  ON whatsapp_messages (org_id, sent_by_user_id, sent_at DESC)
  WHERE direction = 'outbound';
