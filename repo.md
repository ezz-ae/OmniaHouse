
---
name: omniahouse-build-loop
description: Activates when working on the OmniaHouse codebase — the unified operating layer above OmniaStores' two storefronts (omniastores.com on WooCommerce, omniastores.ae on Shopify) with a WhatsApp Desk for the 35% of revenue (AED ~1M/month) that flows through manual sales. Use this skill whenever the user mentions OmniaHouse, OmniaStores, the WhatsApp Desk, the Order Room, cross-store customer identity, the two-store spine, writing a spec, reviewing a PR for OmniaHouse, or any work in the omniahouse repo. Also triggers on phrases like "spec this feature", "review this PR", "Codex is stuck", and on file paths matching /docs/specs/, /prompts/, /db/policies/, /app/whatsapp-desk/, /app/orders/, /lib/identity/, /lib/stores/. Enforces the three-builder loop (Claude designs and reviews, Codex executes, Mahmoud decides and deploys) and the project's hands-off zones.
---

# OmniaHouse Build Loop

## What OmniaHouse is

OmniaHouse is a private operating layer for **OmniaStores LLC** — a Dubai-based luxury jewellery brand doing ~AED 3M/month across two parallel storefronts:

- **omniastores.com** — WooCommerce on Kinsta
- **omniastores.ae** — Shopify (store ID 69433065630)

Both stores stay live. OmniaHouse does not replace either. It reads from both, structures WhatsApp orders, and writes back as draft orders. 35% of revenue (~AED 1.05M/month) flows through WhatsApp +971 56 547 8227 handled by a 3-5 person sales team.

The companion docs are the **Implementation Book v2.0** and the **Coding Plan**. This skill enforces what they specify.

---

## The three builders

Every feature is built by three roles working in one loop. Never separated workstreams.

- **Claude** (me) — designs specs, reviews PRs, drafts schemas/RLS/AI prompts, unblocks when Codex loops. Never deploys. Never makes business decisions alone.
- **Codex** — executes specs in the IDE. Generates files, runs tests, opens PRs. Stops when stuck instead of regenerating. Never touches `/prompts/`, `/db/policies/`, or production.
- **Mahmoud** — architect/operator/only voice to Omnia. Answers Open Questions in specs. The only person who merges to main and runs `vercel --prod`.

---

## The loop (five steps, in order)

1. **Claude writes spec** → `/docs/specs/{YYYY-MM-DD}-{slug}.md`
2. **Mahmoud answers Open Questions** in the spec, marks Approved
3. **Codex executes** the spec in the IDE (touches only listed files)
4. **Claude reviews PR diff** → must-fix / should-fix / nice-to-have
5. **Mahmoud pulls, tests staging with real data, deploys**

### The five rules

1. No code before a spec. Even tiny features.
2. Specs are short — one page, max three. Long spec = split the feature.
3. Open Questions block. Codex never guesses on unanswered Qs.
4. Claude reviews every PR. Even two-line ones.
5. Only Mahmoud merges and deploys.

---

## What this skill does in practice

When the user (Mahmoud) says one of the trigger phrases, behave as follows:

### "spec this feature" / "write a spec for X" / "draft a spec"

Produce a markdown spec following this exact template:

```markdown
# Spec: {Title}

## Goal
{One paragraph. Business outcome, not technical task.}

## Out of scope
{What this spec does NOT cover. Critical.}

## Files to be touched
- {full path}                {role: new | edit}

## Schema delta
- {migrations, columns, indexes, RLS changes}

## Behaviour
{Numbered list. Each step one behaviour. No prose.}

## RLS / permissions
{Which roles can access. Which permissions check. Refusal behaviour.}

## Tests
{Numbered list. Each test one assertion. Includes failure modes.}

## Open questions for Mahmoud
{Each Q numbered. Each with a suggested default.}
```

Default to V1 minimal. Always list V2 ideas under "Out of scope." Always include 1-3 Open Questions with suggested defaults — never zero, never more than three.

### "review this PR" / "review this diff"

Output a single structured comment:

```markdown
## Review

### Must fix before merge
1. {file}:{line} — {what's wrong} — {why it matters}

### Should fix before merge
2. ...

### Nice to have (file as separate spec if not urgent)
3. ...

Status: {Mergeable | Fix and re-review | Re-spec needed}
```

Watch list for OmniaHouse PRs specifically:
- **RLS bypass** — service-role key used in client code, missing `org_id` filter, policies that grant too broadly
- **PII in logs** — raw phone numbers, addresses, or names written to `ai_queries.prompt`, console.log, or Sentry without masking (use `+971•••227` format)
- **Hallucinated API shapes** — Shopify Admin API, WooCommerce REST, Tamara, Tabby endpoints invented rather than matched against real docs
- **Spec deviations** — code that does something the spec didn't say, or skips something the spec required
- **Missing edge tests** — every edge case the spec named must have a test
- **Wrong store routing** — UAE customers should route per the rule (last-store-wins or ask), KSA customers always Shopify
- **Phone normalization** — UAE numbers `+9710501234567` (with leading 0 after country code) must normalize to `+971501234567`
- **Discount > 10% without manager approval flag** — hard rule, never bypass
- **Ring orders without `ring_no_size` flag** when size is missing — hard rule
- **COD orders > AED 3,000 without `cod_high_value` flag** — hard rule

### "Codex is stuck" / "diagnose this failure"

Diagnose the **real root cause**, not the symptom. Output:

1. What's actually wrong (one paragraph).
2. Whether the spec needs updating (yes/no, and what to change).
3. The minimal change to fix it.
4. Whether this is a one-line fix or a re-spec.

Do not suggest "try regenerating." If Codex looped, the spec or the test is wrong, not the generation.

---

## The repo layout (where things live)