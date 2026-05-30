# Spec: Role-aware Gemini context gating

## Goal
Stop the AI routes from leaking sensitive operational data — revenue figures, VIP customer lists, blocked-order totals, financial flags, conversational PII — into responses for staff whose role isn't authorized to see them. Today every caller of `/api/omnia/converse` receives the same operational snapshot in the system prompt, and `/api/whatsapp/extract` trusts a `user_role` field passed in the request body without verifying it against the session. With 19 humans across 6 distinct teams plus the OMNIA service account, this becomes a real exposure: a customer-service agent could currently surface monthly revenue, and a developer could surface customer phone history. This spec installs a single role-aware prompt builder that every AI route must pass through, with the role read from the server session — never from the client — using OmniaStores' real org chart.

## Out of scope
- Replacing the in-memory mock operations store with Prisma reads (separate spec).
- Page-level RBAC and route-level authorization (already lives in `middleware.ts` / `lib/rbac.ts` — that's a different gate; this spec is *only* about what the AI sees).
- Enforcing RLS at the database layer for AI-route writes — covered when `db/policies/` is populated.
- The system-prompt **text** in `prompts/whatsapp.ts` stays as-is; only the *user-input context* injected into it is gated. Prompt-text changes require their own spec.
- V2: per-role response post-filter (defense-in-depth scrub of the model's output text against the same scope).
- V2: per-team team-lead role (e.g. CS team lead, Marketing team lead) — V1 treats all members of a team identically.

## Files to be touched
- `lib/ai/prompt-context.ts`                                  {role: new}
- `lib/ai/__tests__/prompt-context.test.ts`                   {role: new}
- `lib/session.ts`                                            {role: edit (rewrite Session.role union)}
- `app/api/omnia/converse/route.ts`                           {role: edit}
- `app/api/whatsapp/extract/route.ts`                         {role: edit}

## Schema delta
- No migration. The `roles` table from `20260523000000_init_rbac.sql` is seeded with the new role slugs in the existing seed flow (when Phase 2 lands). For now `lib/session.ts` carries the canonical role union and the mock session returns `omnia`.
- One activity-log row per AI call: existing `activity_logs` table, `action='ai.gated_call'`, `metadata={ route, role, scope, keys_passed, model }`. Covered in Behaviour step 8.

## Role taxonomy (canonical — replaces the strings in `lib/session.ts`)

| Role slug | Headcount | Who | Display name |
|---|---|---|---|
| `omnia` | 1 (service) | OMNIA root account — apex audit/ownership identity | OMNIA |
| `management` | 2 | Mahmoud + 1 senior operator | Management |
| `customer_service` | 4 | WhatsApp Desk agents | Customer Service |
| `inventory_manager` | 5 | Catalog & dual-store parity team | Inventory Manager |
| `finance` | 1 | Finance | Finance |
| `marketing` | 4 | Ads, content, retargeting | Marketing |
| `developer` | 3 | Engineering | Developer |

The `Session.role` TypeScript union becomes exactly these seven slugs. Any other value → `deny` scope (fail closed).

## Behaviour

1. New `lib/ai/prompt-context.ts` exports `buildRoleAwareContext(session, fullSnapshot)` returning `{ scope: RoleScope, context: object, mask: PIIMask }`. `RoleScope` is one of `'omnia_root' | 'management_full' | 'cs_agent' | 'inventory_ops' | 'finance_ledger' | 'marketing_funnel' | 'dev_diagnostics' | 'deny'`.

2. Role → scope map:
   - `omnia` → `omnia_root`
   - `management` → `management_full`
   - `customer_service` → `cs_agent`
   - `inventory_manager` → `inventory_ops`
   - `finance` → `finance_ledger`
   - `marketing` → `marketing_funnel`
   - `developer` → `dev_diagnostics`
   - anything else → `deny`

3. Context-key allowlist per scope, enforced by **object-pick (allowlist) not object-omit**, so unknown new keys on the snapshot never leak below `omnia_root`. The picked context fields per scope:

   - **`omnia_root`** (OMNIA service account): every key. Plus the orchestration sub-tree `{ ai: { last_extractions, prompt_versions, memory_top } }` which other scopes never see.

   - **`management_full`** (2 people, including Mahmoud): every operational key — `team`, `active_tasks` (all assignees), `omniahouse_today.*` (orders_draft, orders_blocked, orders_ready, customers_total, vip_customers, unresolved_signals, pending_access_requests, open_help_requests, top_blocked **with** `total_aed`, top_signals), `user_message`. No AI orchestration internals.

   - **`cs_agent`** (4 customer service): `active_tasks` filtered to `assignee_id === session.user.id`, `omniahouse_today.orders_draft` count only (no totals, no list), `omniahouse_today.unresolved_signals` count only, `user_message`. No `team`, no `top_blocked`, no `vip_customers` count, no `customers_total`. Customer phone numbers in the snapshot are masked through `mask.phone` (e.g. `+971•••227`) **except** the phone of the conversation the agent currently has open — passed in as `session.context.active_conversation_phone` and exempted.

   - **`inventory_ops`** (5 inventory managers): `omniahouse_today.unresolved_signals|top_signals` (signals tagged `inventory|out_of_stock|parity|seo`), a new `inventory_today` sub-tree (added in step 6) with `parity_mismatch_count`, `out_of_stock_demand_top`, `seo_pending_count`, `user_message`. No order totals, no customer phones, no conversational logs.

   - **`finance_ledger`** (1 finance): `omniahouse_today.orders_blocked|orders_ready|top_blocked` (with `total_aed` kept and customer names visible, phones masked unless a refund dispute is the topic — see Open Q2), wallet & refund counts via `omniahouse_today.wallet_holds`, `user_message`. No conversational logs in V1. No marketing signals.

   - **`marketing_funnel`** (4 marketing): `omniahouse_today.unresolved_signals|top_signals` (signals tagged `brand|sentiment|ad|content|demand`), aggregated `marketing_today` (campaign-level counts), `out_of_stock_demand_top` from inventory funnel (so ads can be cut), `user_message`. **No** specific customer financials, **no** order totals, **no** phones — only aggregate demand signals.

   - **`dev_diagnostics`** (3 developers): system health envelope only — integrations status, recent webhook deliveries (counts + status codes, no bodies), AI fallback rate, audit-log volume, `user_message`. **No** customer data, **no** order data, **no** PII. Devs read app diagnostics, not business operations. If they need business data they request a temporary scope grant (out of scope here).

   - **`deny`**: only `{ user_message }`. The system-prompt is suffixed with: "You have no operational data scope for this caller. Refuse operational questions politely." The route still returns 200 — see RLS section.

4. **PII mask helper**: `mask.phone(p: string): string` returns `+971•••227`-style strings (keep country code + last 3 digits). `mask.name(n: string): string` returns first name + last-initial. Each scope's allowlist declares which fields go through which masker; `omnia_root` and `management_full` get an identity mask. `finance_ledger` uses `mask.phone` but full `mask.name`. `cs_agent` uses `mask.phone` for all phones except `session.context.active_conversation_phone`.

5. `lib/session.ts`:
   - The `Session.role` union becomes the 7 slugs above.
   - The `Session.user` gains an optional `team_id` and `context?: { active_conversation_phone?: string }` field.
   - `MOCK_SESSION.user.role` becomes `'omnia'` (so local dev keeps full access).
   - New export `getSessionFromRequest(req: Request): Session` — single hook Phase 2 will swap to Supabase. All AI routes must use this.

6. The operations snapshot in `/api/omnia/converse/route.ts` gains two sub-trees `inventory_today` and `marketing_today` (derived from existing `lib/operations/store.ts` data — no new mock writes). These are picked into the relevant scopes per step 3.

7. **`/api/omnia/converse/route.ts`** refactor: read session via `getSessionFromRequest`, build the full snapshot exactly as today, call `buildRoleAwareContext`, inject the **gated** `context` (not the raw snapshot) as the `userInput`. The fallback to Pro and to mock uses the **same** gated context. The response envelope gains `scope: <RoleScope>`.

8. **`/api/whatsapp/extract/route.ts`** refactor: the `user_role` field is **removed from the request body contract**. Role is read from `getSessionFromRequest`. If a client still sends `user_role`, the route logs `wa.extract.user_role_ignored` with the masked phone and ignores the field. The `user_role` line inside the prompt's userInput is derived from the session role's display name. `cs_agent` callers get the AI extraction but only see fields scoped to them in the response (their `assignee_id` filter); `customer_match.prior_orders_aed` is masked to a coarse band (`<1k | 1-5k | 5-20k | >20k`). `inventory_ops`, `finance`, `marketing`, `dev` cannot call this route — it returns `mode='denied'` (extracting a chat is a customer-service action).

9. Every successful AI call (real or mock-fallback) writes one row to `activity_logs` via `lib/audit.ts`: `action='ai.gated_call'`, `metadata={ route, role, scope, keys_passed, model, mode }`. `keys_passed` is the top-level key list of the gated context, **not** the values. Best-effort: a failed audit write must not fail the response.

10. The response envelope of both routes gains a top-level `scope` field so the UI can render a "scope: cs_agent" pill — making the gating visible in the Desk for trust.

## RLS / permissions
- Server-side context filter, not a DB policy. RLS for `AIExtraction` writes is unchanged (handled when `db/policies/` is populated).
- **Refusal behaviour for `scope='deny'`**: route returns 200 with `{ ok: true, mode: 'denied', scope: 'deny', response_message: 'Your role does not have access to operational intelligence. Talk to your manager.' }`. Never 403 — a 403 leaks the route's existence to scope probing. Always 200; the *content* is what changes.
- Calls without a session → same `mode='denied'` envelope.
- `dev_diagnostics` cannot call `/api/whatsapp/extract` — chat content is PII, and devs needing to debug extraction use audit logs not live extraction. Return `mode='denied'` with `reason='dev_no_extract'`.

## Tests
1. **OMNIA full access:** `buildRoleAwareContext({ role: 'omnia' }, fullSnapshot)` returns `scope: 'omnia_root'` and context contains every top-level key in the input snapshot.
2. **Management sees totals:** `management_full` context contains `omniahouse_today.top_blocked` entries with non-null `total_aed`.
3. **CS agent confinement:** `buildRoleAwareContext({ role: 'customer_service', id: 'u1' }, snapshot)` returns a context with no `team` key, no `top_blocked`, and `active_tasks` filtered to only `assignee_id === 'u1'`. `orders_draft` is a number, not a list.
4. **CS phone mask, active exemption:** with `session.context.active_conversation_phone = '+971501234567'`, the CS-scoped context contains that exact phone but every other phone is `+971•••XXX`-masked.
5. **Inventory isolation:** `inventory_ops` context contains zero customer phones and zero `total_aed` fields (assert via `JSON.stringify(ctx).match(/total_aed/)` is null).
6. **Marketing aggregate-only:** `marketing_funnel` context contains aggregate signal counts and `out_of_stock_demand_top` but JSON contains no `+971` substring (no phones).
7. **Finance ledger has totals, no chat:** `finance_ledger` context has `total_aed`, has `wallet_holds`, has zero `messages` or `conversations` keys.
8. **Dev diagnostics has no PII:** `dev_diagnostics` context JSON contains no `+971` substring, no `total_aed`, no `customer_name`. It does contain `integrations` and `webhook_health`.
9. **Deny for unknown role:** `buildRoleAwareContext({ role: 'random' as any }, snapshot)` returns `scope: 'deny'` and context with only `user_message`.
10. **Fail-closed pick:** giving the snapshot an extra `secret_thing: 'x'` top-level key — no scope below `omnia_root` includes it.
11. **Body `user_role` ignored:** `POST /api/whatsapp/extract { user_role: 'omnia', raw_text: '...' }` from a mock session with role `customer_service` returns `scope: 'cs_agent'`, not `omnia_root`.
12. **Dev cannot extract:** `POST /api/whatsapp/extract` with role `developer` → response `{ mode: 'denied', reason: 'dev_no_extract' }`.
13. **Audit row written:** successful `/api/omnia/converse` writes exactly one `activity_logs` row with `action='ai.gated_call'` and `metadata.scope` matching the response's `scope`.
14. **Audit failure doesn't break response:** if `lib/audit.ts` throws, the route still returns 200 with a usable response and `scope` field.

## Open questions for Mahmoud
1. **OMNIA account identity.** Resolved: **service account.** Mahmoud logs in as `management` alongside the second senior operator. OMNIA is the apex identity used by cron, webhook handlers, scheduled AI jobs, and audit — never used for an interactive UI session. This keeps AI orchestration internals out of the owner's daily chat panel and out of the human role hierarchy.
2. **Finance ↔ refund disputes.** Resolved: **defer.** V1 of `finance_ledger` excludes conversational logs entirely. Refund-dispute thread access is a separate spec that introduces a Management-granted, time-boxed scope elevation.
3. **Developer business-data escape hatch.** Resolved: **no automatic access.** Developers see only `dev_diagnostics` (system health, integration status, audit volume — no customer or order data). Bug investigations requiring real data go through a Management-granted temporary scope (separate spec).

**Status: Approved by Mahmoud (2026-05-26). Ready for Codex to execute.**
