import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON, resolveModelName } from '@/lib/ai/client';
import { OMNIA_PARTNERSHIP_PROMPT } from '@/lib/prompts';
import { getAgents, getAllTasks, mockAgentReply, getAgent } from '@/lib/agents/mock';
import { operationsSnapshot } from '@/lib/operations/store';

/**
 * POST /api/omnia/converse
 * Body: { message: string, user_id?: string }
 *
 * The main agentic loop. Real mode runs OMNIA_PARTNERSHIP_PROMPT with the
 * team profiles, active tasks, AND live OmniaHouse operations context
 * injected (orders pending, customers at risk, signals, follow-ups) so the
 * model can route real work — not just chat.
 *
 * Mock mode (no GOOGLE_API_KEY) returns a deterministic reply from
 * agents/mock.ts. The response always carries `mode` and `model` so the
 * client can show a badge.
 */
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ ok: false, error: 'missing_message' }, { status: 400 });

    const agents = getAgents();
    const tasks = getAllTasks();
    const omnia = getAgent('agent_omnia')!;

    if (isAIEnabled()) {
      const ops = await operationsSnapshot();

      const drafts = ops.orders.filter((o) => o.status === 'draft' || o.status === 'payment_pending');
      const blocked = ops.orders.filter((o) => o.flags.some((f) => ['manager_needed', 'discount_over_threshold', 'finance_hold'].includes(f)));
      const ready = ops.orders.filter((o) => o.status === 'paid').length;

      const context = {
        team: agents
          .filter((a) => a.kind === 'member')
          .map((a) => ({
            id: a.id, name: a.short_name, role: a.for_user_role,
            skills: a.skills, performance_score: a.performance_score,
            level: a.level, online: a.online, status: a.status,
            help_given_count: a.help_given_count, help_received_count: a.help_received_count,
          })),
        active_tasks: tasks
          .filter((t) => t.status !== 'completed')
          .map((t) => ({
            id: t.id, title: t.title, assignee_id: t.assignee_agent_id,
            priority: t.priority, status: t.status,
            reminder_count: t.reminder_count, deadline: t.deadline,
          })),
        omniahouse_today: {
          orders_draft: drafts.length,
          orders_blocked: blocked.length,
          orders_ready: ready,
          customers_total: ops.customers.length,
          vip_customers: ops.customers.filter((c) => c.vip).length,
          unresolved_signals: ops.signals.filter((s) => s.status === 'open').length,
          pending_access_requests: ops.access_requests.filter((r) => r.status === 'pending').length,
          open_help_requests: ops.help_requests.filter((h) => h.status === 'open').length,
          top_blocked: blocked.slice(0, 3).map((o) => ({
            id: o.id, total_aed: o.total_aed, flags: o.flags,
            customer: ops.customers.find((c) => c.id === o.customer_id)?.name,
          })),
          top_signals: ops.signals.slice(0, 3).map((s) => ({ kind: s.kind, summary: s.summary, tone: s.tone })),
        },
        user_message: message,
      };
      // Try Flash first — faster and more reliable for chat. If it fails,
      // fall back to Pro. If both fail, drop to mock (logged in /ai/status).
      let result = await callJSON({
        systemPrompt: OMNIA_PARTNERSHIP_PROMPT,
        userInput: JSON.stringify(context),
        model: 'default',
        temperature: 0.4,
        maxTokens: 2000,
      });
      let usedModel = resolveModelName('default');
      if (!result) {
        result = await callJSON({
          systemPrompt: OMNIA_PARTNERSHIP_PROMPT,
          userInput: JSON.stringify(context),
          model: 'pro',
          temperature: 0.4,
          maxTokens: 2000,
        });
        usedModel = resolveModelName('pro');
      }
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: usedModel, ...result });
      }
    }

    const reply = mockAgentReply(omnia, message);
    return NextResponse.json({
      ok: true,
      mode: isAIEnabled() ? 'mock_fallback' : 'mock',
      reason: isAIEnabled() ? 'Gemini call returned no usable result — check the server log for the underlying error.' : 'GOOGLE_API_KEY (or GEMINI_API_KEY) not set in the deploy environment.',
      response_message: reply.body,
      new_tasks: [],
      memory_to_save: [],
      stalled_tasks_update: [],
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
