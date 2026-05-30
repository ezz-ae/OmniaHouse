# Spec: WhatsApp webhook persistence (text + delivery status)

## Goal
Stop dropping every Meta webhook delivery into `console.log`. Today `/api/whatsapp/webhook` verifies the signature, normalizes the payload, then writes to stdout with `TODO when Supabase is wired` comments. As a result, no inbound customer message and no outbound delivery status is recoverable five minutes later, the WhatsApp Desk reads from `lib/whatsapp/mock.ts`, and Meta retries pile up unseen errors. V1 of this spec persists **text-only inbound messages** and **outbound delivery statuses** into Postgres so the Desk can render live traffic and Mahmoud can audit every conversation. Media handling and AI extraction-on-receive are explicitly deferred to follow-up specs so this one stays one page.

## Out of scope
- **Media pipeline.** Inbound image/document/audio/video/voice/sticker messages are persisted as text rows with `type='media_pending'` and a stub body; download to Supabase Storage and `MEDIA_VERIFICATION_PROMPT` execution are a separate spec.
- **Interactive replies, button clicks, Flow completions, MPM/PDM selections.** Persisted as `type='interactive'` with the raw JSON in `interactive_json`; parsing to order intents is a separate spec.
- **Auto-running `WHATSAPP_EXTRACTION_PROMPT` on inbound.** Persistence first; extraction-on-arrival is a separate spec that consumes from this table.
- **Outbound send path.** `lib/whatsapp/cloud/client.ts` already implements `sendText`/`sendTemplate`; this spec only persists the **status callbacks** for sends. Wiring the Desk's compose box through `sendText` is a separate spec.
- **Phone normalization for UAE `+97105…` zero-after-country-code.** Meta's `wa_id` is already clean digits-only; that normalization only matters for agent-typed numbers and lives in a separate spec.
- **RLS policies on the new tables.** Migration carries `org_id` so policies can attach; policy files land when `db/policies/` is populated (separate spec).
- **Multi-org.** V1 is single-org: every webhook resolves to one `org_id` read from `OMNIA_ORG_ID` env. Multi-org via `OrgIntegration.metadata.phone_number_id` lookup is V2.

## Files to be touched
- `db/migrations/20260616000000_whatsapp_messages.sql`        {role: new}
- `prisma/schema.prisma`                                      {role: edit (add 2 models)}
- `lib/whatsapp/persistence.ts`                               {role: new}
- `app/api/whatsapp/webhook/route.ts`                         {role: edit (replace TODOs)}
- `lib/whatsapp/cloud/client.ts`                              {role: edit (sendText/sendTemplate return value persisted by caller — no signature change)}
- `lib/audit.ts`                                              {role: edit (one new action constant)}

## Schema delta

New migration `db/migrations/20260616000000_whatsapp_messages.sql` creates two tables:

```sql
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
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX whatsapp_messages_conv_idx ON whatsapp_messages (conversation_id, sent_at DESC);
CREATE INDEX whatsapp_messages_org_phone_idx ON whatsapp_messages (org_id, phone, sent_at DESC);
```

Two corresponding Prisma models added to `prisma/schema.prisma` mirroring exactly. `Organization` gains relations `whatsapp_conversations` and `whatsapp_messages`.

`Activity_logs` gains no schema change. `lib/audit.ts` declares two new action constants: `wa.message.persisted` and `wa.status.persisted`.

## Behaviour

1. **Env contract**: `OMNIA_ORG_ID` is required at runtime for the webhook route. Missing → webhook returns 200 with `{ ok: true, mode: 'org_unresolved' }` and a single `console.error` per cold start (not per request). The route never 5xx's regardless.
2. **Webhook GET handshake** is unchanged.
3. **Webhook POST signature gate** is unchanged.
4. **New module `lib/whatsapp/persistence.ts`** exports three pure-ish functions, all `org_id`-scoped:
   - `upsertConversation(orgId, phone, fields): Promise<{ id }>` — `ON CONFLICT (org_id, phone) DO UPDATE` setting `last_message_at`, `last_inbound_at` (when inbound), `language` (when changed), `updated_at`. Never overwrites `assigned_to` or `status` on upsert.
   - `insertInboundMessage(orgId, conversationId, normalized): Promise<{ id, wamid }>` — INSERT with `direction='inbound'`. On `UNIQUE meta_message_id` conflict, returns the existing row's id (idempotent: Meta retries are safe).
   - `recordStatusUpdate(orgId, wamid, status, fields): Promise<'matched' | 'unmatched'>` — UPDATE the outbound row by `meta_message_id`. If no row matches, returns `'unmatched'` (see Open Q2). When status moves to `delivered`/`read`/`failed`, the corresponding timestamp column is set.
5. **Inbound message flow** (replacing the `console.log` block at `webhook/route.ts:84-108`):
   1. Resolve `org_id` from `OMNIA_ORG_ID`. If missing, return early (step 1).
   2. Call `normalizeIncoming` (existing).
   3. Call `upsertConversation(orgId, norm.phone, { language: detectLanguage(norm.body) })`.
   4. Determine `type` from `msg.type`: `'text'` → text; image/document/audio/video/voice/sticker → `'media_pending'` with `media_meta` populated; `interactive` (new in normalizer) → `'interactive'` with `interactive_json`; everything else → `'system'`.
   5. Call `insertInboundMessage(orgId, conv.id, normalized)`.
   6. `markRead(norm.wamid)` fire-and-forget (already done — keep it).
   7. Best-effort `audit.log('wa.message.persisted', { phone: mask(norm.phone), wamid: norm.wamid, type })`.
   8. Throwing in any of the above is caught by the existing try/catch at `webhook/route.ts:63-69`; the route still returns 200.
6. **`normalizeIncoming` extension**: add a `'interactive'` case that returns `{ ...base, body: '(interactive)', interactive: msg.interactive }`. The current default branch handling unknown types becomes a `type='system'` insert with body `(${msg.type})`. No other types added in V1.
7. **Outbound status flow** (replacing `webhook/route.ts:112-124`):
   1. For each `s` in `value.statuses`, call `recordStatusUpdate(orgId, s.id, s.status, { error_code, error_message, pricing_billable, pricing_category, delivered_at, read_at })`.
   2. If `recordStatusUpdate` returns `'unmatched'`, log a single line `wa.status.unmatched` with the wamid masked to first 8 chars — do **not** create a synthetic outbound row.
   3. Best-effort audit `wa.status.persisted`.
8. **Outbound persistence on send** (caller-side, no signature change to `sendText`/`sendTemplate`): the agent-compose route (currently still mock — separate spec) is the *only* caller that should write outbound rows. This spec does **not** wire the compose path; it only ensures that when a future spec wires it, the status webhook above will find the outbound row. Add a one-line helper `insertOutboundMessage(orgId, conversationId, sendResult, body): Promise<{ id }>` to `persistence.ts` so the future spec is a single call away.
9. **Idempotency guarantee**: replaying a Meta webhook POST against the route must produce zero new rows. Enforced by `UNIQUE(meta_message_id)` + ON CONFLICT return-existing in `insertInboundMessage`.
10. **PII discipline**: every log line that includes a phone number passes through `mask.phone()` from the role-gating spec's helper (`+971•••227`). The persisted rows themselves carry the real phone (the DB is the system of record); only stdout is masked.

## RLS / permissions
- Both new tables are `org_id`-scoped and ready for RLS. Policies land in `db/policies/` in a separate spec — until then, the webhook route uses the service-role key (server-only) and every query in `persistence.ts` filters by `org_id` explicitly. **No code path in `persistence.ts` may run without an `org_id` argument.**
- The webhook route itself is unauthenticated by design (Meta cannot send a bearer token). Its only gate is the HMAC signature in `verifyWebhookSignature` — already implemented. The org resolution above runs *after* signature verify.
- Read access from the Desk is **not** covered by this spec — that's a follow-on PR that adds `lib/whatsapp/queries.ts` and replaces the `getConversations()` mock import. V1 of this spec writes only; reads keep using the mock so the Desk doesn't break before the read path lands.

## Tests
1. **Signature gate unchanged**: POST without `X-Hub-Signature-256` → 401; signed payload → 200. (Regression assertion.)
2. **Cold conversation upsert**: send a single inbound `text` payload for a brand-new phone → exactly one `whatsapp_conversations` row inserted with `unread_count=1`, `language` matching the detected one, `last_inbound_at` set.
3. **Existing conversation upsert preserves claim**: pre-seed a conversation with `assigned_to='u_test'` and `status='in_progress'`; send another inbound text → row updates `last_message_at` and `unread_count` increments by 1, but `assigned_to` and `status` are **untouched**.
4. **Inbound message row written**: send an inbound text → one row in `whatsapp_messages` with `direction='inbound'`, `type='text'`, `status='received'`, `meta_message_id` equal to the payload's wamid.
5. **Replay idempotency**: post the **identical** signed payload twice → exactly one `whatsapp_messages` row and one `whatsapp_conversations` row (counts unchanged on second call).
6. **Media stub**: send an inbound `image` payload → message row with `type='media_pending'`, `media_meta.media_id` set, `body` containing the caption (or empty), no row in any storage table.
7. **Interactive stub**: send an inbound `interactive` payload → message row with `type='interactive'`, `interactive_json` equal to the raw `interactive` block, `body='(interactive)'`.
8. **Status update matched**: pre-seed an outbound message with wamid `wamid:abc` and `status='sent'`; webhook delivers `{ id: 'wamid:abc', status: 'delivered', timestamp: ... }` → row updates to `status='delivered'`, `delivered_at` set.
9. **Status update unmatched**: webhook delivers a status for an unknown wamid → no row created, returns `'unmatched'`, no exception, route still 200.
10. **Org unresolved**: with `OMNIA_ORG_ID` unset, post a signed inbound payload → route returns 200 with `mode='org_unresolved'`, no rows written, no exception.
11. **Audit row written**: a successful inbound persist writes exactly one `activity_logs` row with `action='wa.message.persisted'` and a **masked** phone in metadata.
12. **No PII in stdout**: capture stdout during inbound persist — the masked phone (`+971•••227`) appears at most once; the real phone never appears.
13. **Failure path doesn't 5xx**: force `insertInboundMessage` to throw → route still returns `{ ok: true }` with 200; the error is logged once.

## Open questions for Mahmoud
1. **`OMNIA_ORG_ID` source.** Default: **env var**, set at deploy time once Supabase is provisioned and the Omnia org row exists. The alternative is to read the first row of `organizations` at cold start — simpler but a footgun if a second org row ever lands. Confirm env var.
2. **Unmatched status updates.** Default: **log and ignore.** A status webhook for a wamid we never recorded is either a Meta replay, a clock-skew race, or noise from another integration on the same number. Auto-creating a synthetic outbound row would corrupt the audit trail. Confirm log-and-ignore.
3. **Language detection on conversation upsert.** Default: **lightweight in-process detector** based on Arabic-character ratio (≥30% Arabic chars → `'ar'`, else `'en'`; existing conversation `language` is overwritten only on the inbound side and only when the new value differs and the message is ≥4 words). The alternative is to defer language to the extraction prompt — but then conversations have no language until extraction runs, which delays Desk filtering. Confirm the in-process detector.

**Status: Awaiting Mahmoud's answers on Open Questions 1–3 before Codex starts.**
