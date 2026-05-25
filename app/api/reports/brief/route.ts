import { NextResponse } from 'next/server';
import { createBrief, generateOwnerBrief, operationsSnapshot, updateBrief } from '@/lib/operations/store';
import { isAIEnabled, callAI, resolveModelName } from '@/lib/ai/client';

// Owner brief prompt — talks like a chief of staff at OmniaStores, not a
// chatbot. Calls out money at risk, who must decide, and what to push today.
const OWNER_BRIEF_PROMPT = `
You are the Omnia House Chief of Staff briefing Mahmoud (founder of
OmniaStores · Dubai luxury jewellery, ~AED 3M/month, WhatsApp ~35% of
revenue). You receive a JSON snapshot of today's operating state.

Write a short brief (max 220 words) for the founder. Use plain prose
with line breaks, no bullets, no markdown headings. Cover, in this order:

1. Money at risk and the single biggest revenue lever today.
2. The two or three decisions that need a human owner.
3. What's ready to push (orders, retargeting, signals) without any
   additional approval.
4. One concrete next action with a clear owner from the team list.

Rules:
- Reference real people from the team by short name (Mahmoud, Ez,
  Abdelrahman, Arslan, Abdallah, Ahmed, Mohamed) when assigning.
- Use AED with comma separators. Never invent numbers — only use what
  the snapshot gives you.
- Tone: calm, precise, never marketing-speak. Imagine a daily standup
  brief for the founder, not a customer email.
- Plain text only. No JSON, no markdown.
`.trim();

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, briefs: state.briefs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.kind === 'owner_brief' && !body.title) {
      // 1. Build the deterministic baseline so we always have a brief.
      let brief = await generateOwnerBrief();

      // 2. If AI is configured, replace the body with a Gemini-written narrative
      // grounded in the same live snapshot the deterministic brief used.
      if (isAIEnabled()) {
        try {
          const state = await operationsSnapshot();
          const snapshot = {
            today: new Date().toISOString().slice(0, 10),
            orders: {
              draft: state.orders.filter((o) => o.status === 'draft').length,
              payment_pending: state.orders.filter((o) => o.status === 'payment_pending').length,
              paid: state.orders.filter((o) => o.status === 'paid').length,
              fulfilled: state.orders.filter((o) => o.status === 'fulfilled').length,
              refunded: state.orders.filter((o) => o.status === 'refunded').length,
              blocked: state.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f))).map((o) => ({
                id: o.id, total_aed: o.total_aed, flags: o.flags,
                customer: state.customers.find((c) => c.id === o.customer_id)?.name,
                assignee: state.team.find((t) => t.id === o.assignee)?.name,
              })),
              revenue_at_risk_aed: state.orders
                .filter((o) => o.flags.includes('discount_over_threshold') || o.flags.includes('finance_hold') || o.flags.includes('manager_needed'))
                .reduce((s, o) => s + o.total_aed, 0),
              ready_to_ship: state.orders.filter((o) => o.status === 'paid').map((o) => ({
                id: o.id, customer: state.customers.find((c) => c.id === o.customer_id)?.name, total_aed: o.total_aed,
              })),
            },
            customers: {
              total: state.customers.length,
              vip: state.customers.filter((c) => c.vip).length,
              at_risk: state.customers.filter((c) => c.finance_flags.length > 0).length,
            },
            signals: state.signals.slice(0, 5).map((s) => ({ summary: s.summary, tone: s.tone, kind: s.kind, recommended_action: s.recommended_action })),
            access_requests_pending: state.access_requests.filter((a) => a.status === 'pending').map((a) => ({ name: a.requester_name, role: a.requested_role, sensitive: a.sensitive_scope.length > 0 })),
            help_requests_open: state.help_requests.filter((h) => h.status === 'open').length,
            team_online: state.team.filter((m) => m.status === 'online').map((m) => ({ name: m.name, load: m.load, skills: m.skills })),
            integrations_down: state.integrations.filter((i) => i.status !== 'connected').map((i) => ({ service: i.service, detail: i.detail, fix: i.fix_action })),
          };

          const text = await callAI({
            systemPrompt: OWNER_BRIEF_PROMPT,
            userInput: JSON.stringify(snapshot),
            model: 'default',
            temperature: 0.4,
            maxTokens: 600,
          });

          if (text && text.trim().length > 50) {
            brief = await updateBrief(brief.id, { body: text.trim(), status: 'ready' });
            return NextResponse.json({ ok: true, mode: 'real', model: resolveModelName('default'), brief });
          }
        } catch {
          // Fall through to the deterministic brief
        }
      }

      return NextResponse.json({ ok: true, mode: isAIEnabled() ? 'mock_fallback' : 'mock', brief });
    }

    if (!body.kind || !body.title || !body.question || !body.audience) {
      return NextResponse.json({ ok: false, error: 'kind, title, question, audience are required (or send {kind:owner_brief} to auto-generate)' }, { status: 400 });
    }
    const brief = await createBrief(body);
    return NextResponse.json({ ok: true, brief });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create brief' }, { status: 400 });
  }
}
