import { NextResponse } from 'next/server';
import { operationsSnapshot, createNote, type TeamRole, type NotePriority } from '@/lib/operations/store';
import { isAIEnabled, callJSON, resolveModelName } from '@/lib/ai/client';

/**
 * POST /api/notes/generate
 *
 * Omnia AI reads the live operating state and writes targeted notes for
 * the right roles. Each note is short, specific, and tied to actual data
 * — not a generic "here's a tip" newsletter.
 *
 * Returns the list of notes it created (already persisted to the store
 * so the header bell badge updates immediately).
 */

const PROMPT = `
You are Omnia AI writing internal notes to the OmniaHouse team. You see
the live operating state of OmniaStores (Dubai luxury jewellery, two
storefronts, WhatsApp Desk, ~AED 3M/month). Produce a short batch of
notes — one per role that has something specific to act on right now.

Audience roles you may target:
  owner · admin · whatsapp_manager · whatsapp_agent · marketing ·
  strategy · finance · shipping · inventory

Rules:
- Each note is ≤ 280 characters, plain prose (no bullets, no markdown).
- Reference concrete data points from the snapshot (counts, AED amounts,
  customer names, SKUs). Never invent numbers.
- Use Gulf-friendly business tone — calm, precise, never marketing-speak.
- Priority "high" only when there's revenue at risk or a customer is
  going cold; "normal" for routine ops; "low" for FYI.
- Skip a role entirely if nothing material is happening for them.
- Maximum 6 notes total.
- Tags should be short kebab-case strings (e.g. "discount", "ksa", "le").

Return strict JSON:
{
  "notes": [
    {
      "to_role": "owner" | "admin" | "whatsapp_manager" | "whatsapp_agent" |
                 "marketing" | "strategy" | "finance" | "shipping" | "inventory",
      "body": string,
      "priority": "low" | "normal" | "high",
      "tags": string[]
    }
  ]
}
No markdown fences. No commentary.
`.trim();

type GeneratedNote = {
  to_role: TeamRole;
  body: string;
  priority: NotePriority;
  tags: string[];
};

export async function POST() {
  try {
    const state = await operationsSnapshot();

    const snapshot = {
      orders: {
        draft: state.orders.filter((o) => o.status === 'draft').length,
        pending: state.orders.filter((o) => o.status === 'payment_pending').length,
        paid: state.orders.filter((o) => o.status === 'paid').length,
        blocked: state.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f))).map((o) => ({
          id: o.id, total_aed: o.total_aed, flags: o.flags,
          customer: state.customers.find((c) => c.id === o.customer_id)?.name,
        })),
        revenue_at_risk_aed: state.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f))).reduce((s, o) => s + o.total_aed, 0),
      },
      customers: {
        total: state.customers.length,
        vip: state.customers.filter((c) => c.vip).length,
        at_risk: state.customers.filter((c) => c.finance_flags.length > 0).map((c) => ({ name: c.name, flags: c.finance_flags })),
      },
      signals: state.signals.slice(0, 5).map((s) => ({ summary: s.summary, tone: s.tone, kind: s.kind, action: s.recommended_action })),
      followups_open: state.followups.filter((f) => f.status !== 'done').slice(0, 5).map((f) => ({ reason: f.reason, due: f.due, customer: state.customers.find((c) => c.id === f.customer_id)?.name })),
      access_pending: state.access_requests.filter((a) => a.status === 'pending').map((a) => ({ name: a.requester_name, role: a.requested_role, sensitive: a.sensitive_scope.length > 0 })),
      help_open: state.help_requests.filter((h) => h.status === 'open').length,
      team_online: state.team.filter((m) => m.status === 'online').map((m) => ({ name: m.name, role: m.role, load: m.load })),
      integrations_down: state.integrations.filter((i) => i.status !== 'connected').map((i) => ({ service: i.service, fix: i.fix_action })),
    };

    let generated: GeneratedNote[] = [];
    let mode: 'real' | 'mock' | 'mock_fallback' = 'mock';
    let model: string | null = null;

    if (isAIEnabled()) {
      const ai = await callJSON<{ notes: GeneratedNote[] }>({
        systemPrompt: PROMPT,
        userInput: JSON.stringify(snapshot),
        model: 'default',
        temperature: 0.4,
        maxTokens: 1500,
      });
      if (ai?.notes && Array.isArray(ai.notes) && ai.notes.length > 0) {
        generated = ai.notes;
        mode = 'real';
        model = resolveModelName('default');
      } else {
        mode = 'mock_fallback';
      }
    }

    // Rule-based fallback so the button always produces something useful
    if (generated.length === 0) {
      generated = ruleBasedNotes(snapshot);
    }

    const created = [];
    for (const g of generated) {
      const note = await createNote({
        from_id: 'omnia_ai',
        from_name: 'Omnia AI',
        body: g.body,
        audience: 'role',
        to_role: g.to_role,
        priority: g.priority,
        tags: g.tags || [],
        kind: 'ai_to_role',
        source: 'orchestrator',
      });
      created.push(note);
    }

    return NextResponse.json({ ok: true, mode, model, generated: created.length, notes: created });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not generate notes' }, { status: 500 });
  }
}

function ruleBasedNotes(snapshot: any): GeneratedNote[] {
  const out: GeneratedNote[] = [];
  if (snapshot.orders.blocked.length > 0) {
    const top = snapshot.orders.blocked[0];
    out.push({
      to_role: 'owner', priority: 'high', tags: ['orders'],
      body: `${snapshot.orders.blocked.length} blocked orders need owner decision (AED ${snapshot.orders.revenue_at_risk_aed.toLocaleString()} at risk). Top: ${top.customer} · AED ${top.total_aed.toLocaleString()} · flags ${top.flags.join(', ')}.`,
    });
  }
  if (snapshot.customers.at_risk.length > 0) {
    out.push({
      to_role: 'finance', priority: 'normal', tags: ['customer', 'finance'],
      body: `${snapshot.customers.at_risk.length} customers carry finance flags. Pending review: ${snapshot.customers.at_risk.map((c: any) => c.name).join(', ')}.`,
    });
  }
  if (snapshot.followups_open.length > 0) {
    const top = snapshot.followups_open[0];
    out.push({
      to_role: 'whatsapp_manager', priority: 'normal', tags: ['followup'],
      body: `${snapshot.followups_open.length} open follow-ups. Next due: ${top.customer || 'a customer'} — ${top.reason}.`,
    });
  }
  if (snapshot.signals.length > 0) {
    const top = snapshot.signals[0];
    out.push({
      to_role: 'marketing', priority: top.tone === 'negative' ? 'high' : 'normal',
      tags: ['signal'],
      body: `${top.summary}${top.action ? ` Action: ${top.action}` : ''}`,
    });
  }
  if (snapshot.access_pending.length > 0) {
    out.push({
      to_role: 'admin', priority: 'normal', tags: ['access'],
      body: `${snapshot.access_pending.length} access request${snapshot.access_pending.length === 1 ? '' : 's'} pending. ${snapshot.access_pending.map((a: any) => `${a.name} → ${a.role}${a.sensitive ? ' (sensitive)' : ''}`).join('; ')}.`,
    });
  }
  if (snapshot.integrations_down.length > 0) {
    out.push({
      to_role: 'admin', priority: 'high', tags: ['integration'],
      body: `${snapshot.integrations_down.length} integration${snapshot.integrations_down.length === 1 ? ' is' : 's are'} not connected: ${snapshot.integrations_down.map((i: any) => i.service).join(', ')}. ${snapshot.integrations_down[0].fix || ''}`.trim(),
    });
  }
  return out;
}
