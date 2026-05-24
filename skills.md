
You stopped me — good. Let me check what you need before I burn more output.

I was about to generate another 30-page PDF/DOCX. But re-reading your ask: **"a coding building plan — 3 owners Codex, Mahmoud, Claude who does what in flow not separated."**

You probably don't want another book. You want the actual flow, in chat, that you can read in two minutes and use tomorrow morning. Let me do that instead.

---

# The flow

**Per feature, every time, no exceptions:**

```
                Mahmoud has an idea / problem
                            │
                            ▼
        ┌──────────────────────────────────────┐
        │  1. Claude writes the spec           │
        │     /docs/specs/{date}-{slug}.md     │
        │     Goal · Files · Schema · Tests    │
        │     · Open Qs (with suggested        │
        │     defaults)                        │
        └──────────────────┬───────────────────┘
                            ▼
        ┌──────────────────────────────────────┐
        │  2. Mahmoud answers the Open Qs      │
        │     in the spec file, marks Approved │
        └──────────────────┬───────────────────┘
                            ▼
        ┌──────────────────────────────────────┐
        │  3. Codex executes the spec in IDE   │
        │     Touches only listed files        │
        │     Stops on green tests             │
        │     OR stops + reports if stuck      │
        └──────────────────┬───────────────────┘
                            ▼
        ┌──────────────────────────────────────┐
        │  4. Claude reviews the PR diff       │
        │     must-fix / should-fix / nice     │
        │     → Mergeable | Fix | Re-spec      │
        └─────────┬────────────────────┬───────┘
                  │ Mergeable           │ Fix
                  ▼                     ▼
        ┌──────────────────┐  ┌────────────────────┐
        │ 5. Mahmoud pulls │  │ Back to Codex with │
        │ → staging test   │  │ Claude's list as   │
        │ → deploy         │  │ the delta          │
        └──────────────────┘  └────────────────────┘
```

---

# Who actually does what

**Claude (me)** — designs. Writes specs before code exists. Reviews every PR. Drafts schemas, RLS policies, AI prompts. Unblocks Codex when it loops. Never deploys, never decides business rules.

**Codex** — executes. Generates the 80% boilerplate fast. Runs tests. Opens PRs. Stops when stuck instead of regenerating into a corner. Never touches `/prompts/`, `/db/policies/`, or production.

**Mahmoud (you)** — decides + ships. Triggers Claude. Answers spec Open Qs. Pastes Codex prompts. Reads Claude's reviews. Only person who merges to main, only person who runs `vercel --prod`. Only voice to Omnia.

---

# The five rules

1. **No code before a spec.** Even tiny features. Even "just one button."
2. **Specs are short.** One page, max three. Long spec = split the feature.
3. **Open Questions block.** Codex doesn't guess on unanswered Qs.
4. **Claude reviews every PR.** Even two-line ones — they can break RLS.
5. **Only Mahmoud merges and deploys.** Codex pushes branches; Claude reviews; you ship.

---

# Quick worked example

Feature: "match WhatsApp sender's phone against both stores before agent replies."

| Hand | Does | Output |
|---|---|---|
| You | "Build this" | one sentence |
| Claude | Writes `2026-05-23-phone-match.md` — goal, 7 files to touch, RLS rules, 7 tests, 3 Open Qs | spec file |
| You | Answer Qs in the file, write "Approved" | approved spec |
| Codex | Generates 7 files, tests green, opens PR | PR |
| Claude | Reviews diff — finds PII in logs + wrong UAE phone normalization, says "Fix #1 and #2 before merge" | review comment |
| Codex | Fixes #1 and #2 | new commit |
| Claude | Re-reviews — Mergeable | approval |
| You | Pull branch → run 3 real numbers from yesterday → deploy | live |

---

# The repo shape this needs

```
/docs/specs/          ← Claude writes here
/docs/decisions/       ← ADRs after big calls
/docs/runbook/         ← deploy.md, kill-switch.md
/prompts/              ← AI prompts (Claude-owned, Codex hands-off)
/db/policies/          ← RLS (Claude-owned, Codex hands-off)
/db/migrations/        ← forward-only, Claude reviews each
```

---

# When to switch hands (the signals)

- **Codex → Claude:** test fails twice with same cause, or about to touch `/prompts` or `/db/policies`, or spec has unanswered Q
- **Codex → Mahmoud:** migration touches existing prod shape, or new dependency needed, or CI breaks for unrelated reasons
- **Claude → Mahmoud:** business rule needed that isn't in book, or two valid architectures with long-term consequences
- **Pause everything:** production incident, RLS regression, AI accuracy drops below 90% on weekly audit

---

# Copy-paste prompts (the four you'll actually use)

**Mahmoud → Claude: "spec this"**
> Write a spec for {feature} as markdown following the template. V1 only — list V2 ideas under Out of Scope. List Open Questions with suggested defaults. If schema changes are needed, draft the migration + RLS.

**Mahmoud → Codex: "execute"**
> Execute the spec at `/docs/specs/{path}.md`. Touch only files in the spec's list. Do not modify `/db/policies/*` or `/prompts/*`. If a test fails twice with the same root cause, STOP and report — do not regenerate. After: typecheck, test, open PR on `feature/{slug}`.

**Mahmoud → Claude: "review this PR"**
> Review PR #{N}. Spec: `/docs/specs/{path}.md`. Output as must-fix / should-fix / nice-to-have with file:line refs, ending in Mergeable | Fix | Re-spec. Watch for: RLS bypass, PII in logs, hallucinated API shapes, spec deviations.

**Mahmoud → Claude: "Codex is stuck"**
> Codex is looping. Spec: `{path}`. Failure: `{paste}`. Last attempt: `{paste}`. Diagnose the real root cause (not symptom). Tell me: what's wrong, does the spec need updating, minimal fix, one-line or re-spec.

---

That's the flow. **Is this what you needed, or did you want the full PDF/DOCX version I was about to generate?** I stopped because "?" usually means "wrong direction" or "too much." Tell me which and I'll go.