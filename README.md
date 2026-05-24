# OmniaHouse

Private operating layer for **OmniaStores LLC** (Dubai luxury jewellery):

- `omniastores.com` — WooCommerce on Kinsta
- `omniastores.ae` — Shopify (store ID 69433065630)
- WhatsApp Desk on +971 56 547 8227

OmniaHouse reads from both stores, structures WhatsApp orders, and writes back as draft orders. It does not replace either storefront.

## Quick start

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

## How we build

See [`CLAUDE.md`](./CLAUDE.md) for the three-builder loop (Claude designs, Codex executes, Mahmoud deploys). Read [`plan.md`](./plan.md) for the full flow and [`repo.md`](./repo.md) for the skill definition.

## Layout

| Path | What's in it |
|---|---|
| `app/` | Next.js App Router (auth, office rooms, API routes) |
| `lib/` | Server + client helpers (rbac, audit, inventory, prompts) |
| `components/` | React components by domain |
| `db/migrations/` | Forward-only SQL — Claude reviews each |
| `db/policies/` | RLS policies — Claude-owned |
| `prompts/` | AI system prompts — Claude-owned |
| `docs/specs/` | Feature specs |
| `docs/decisions/` | ADRs |
| `hex/` | Hex.tech analytics project YAMLs |
| `integrations/wordpress/` | WordPress bridge plugin |
| `middleware.ts` | Auth + session security |

## Status

Phase 1 (repo scaffold + reorganization) complete. Phase 2 (Supabase + first room boots end-to-end) pending.
