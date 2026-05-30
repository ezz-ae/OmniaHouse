import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON, callWithTools, resolveModelName } from '@/lib/ai/client';
import { OMNIA_PARTNERSHIP_PROMPT } from '@/lib/prompts';
import { getAgents, getAllTasks, mockAgentReply, getAgent } from '@/lib/agents/mock';
import { operationsSnapshot } from '@/lib/operations/store';

/**
 * POST /api/omnia/converse
 * Body: { message: string, user_id?: string }
 *
 * Dual-mode:
 *   - OMNIA_USE_MCP=1  → tool-use path. Gemini calls MCP tools
 *                        (get_orders, find_customers, get_signals, …) and
 *                        composes its answer from real, fresh data. No
 *                        snapshot is pre-baked into the prompt.
 *   - default          → legacy path. We pre-bake an OmniaHouse-today
 *                        snapshot and dump it as JSON to the model.
 *
 * Mock fallback applies in both modes when GOOGLE_API_KEY is unset or the
 * model fails. The response always carries `mode` and `model` so the
 * client can show a badge.
 */

const USE_MCP = process.env.OMNIA_USE_MCP === '1' || process.env.OMNIA_USE_MCP === 'true';

const MCP_GUIDE = `
You have access to MCP tools that read live OmniaHouse data (catalogue,
customers, orders, WhatsApp inbox, signals, team load). Before answering
operational questions, call the tools you need rather than guessing.
Examples:
  • "what's blocked today?"      → orders_today_summary
  • "who can take a bridal lead" → get_team_load
  • "which SKUs drift the most"  → find_products(parity='both_price_drift')
  • "VIP from Saudi"             → find_customers + get_customer_summary
Then reply in the same JSON shape the system prompt specifies.
`.trim();

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ ok: false, error: 'missing_message' }, { status: 400 });

    const agents = getAgents();
    const tasks = getAllTasks();
    const omnia = getAgent('agent_omnia')!;

    if (isAIEnabled() && USE_MCP) {
      // MCP path · model decides what to fetch via tools.
      const teamLite = agents
        .filter((a) => a.kind === 'member')
        .map((a) => ({ id: a.id, name: a.short_name, role: a.for_user_role, skills: a.skills }));
      const activeTasks = tasks
        .filter((t) => t.status !== 'completed')
        .map((t) => ({ id: t.id, title: t.title, assignee: t.assignee_agent_id, priority: t.priority }));

      const userTurn = JSON.stringify({
        user_message: message,
        team: teamLite,
        active_tasks: activeTasks,
        hint: 'Call MCP tools to learn about catalogue, customers, orders, WhatsApp, signals before deciding.',
      });

      const result = await callWithTools({
        systemPrompt: `${OMNIA_PARTNERSHIP_PROMPT}\n\n${MCP_GUIDE}`,
        userInput: userTurn,
        model: 'pro',
        temperature: 0.3,
        maxTokens: 2500,
      });

      if (result?.text) {
        // Try to parse JSON; fall back to wrapping prose in response_message.
        let parsed: any = null;
        try { parsed = JSON.parse(result.text); } catch {
          const first = result.text.indexOf('{');
          const last = result.text.lastIndexOf('}');
          if (first !== -1 && last > first) {
            try { parsed = JSON.parse(result.text.slice(first, last + 1)); } catch {}
          }
        }
        if (parsed && typeof parsed === 'object') {
          return NextResponse.json({
            ok: true, mode: 'mcp', model: result.model,
            tool_log: result.tool_log.map((t) => ({ tool: t.tool, args: t.args, result_summary: t.result_summary })),
            ...parsed,
          });
        }
        return NextResponse.json({
          ok: true, mode: 'mcp', model: result.model,
          tool_log: result.tool_log.map((t) => ({ tool: t.tool, args: t.args, result_summary: t.result_summary })),
          response_message: result.text.trim(),
          new_tasks: [], memory_to_save: [], stalled_tasks_update: [],
        });
      }
      // fall through to legacy path
    }

    if (isAIEnabled()) {
      // Legacy prompt path.
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
