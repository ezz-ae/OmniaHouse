import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { OMNIA_PARTNERSHIP_PROMPT } from '@/lib/prompts';
import { getAgents, getAllTasks, mockAgentReply, getAgent } from '@/lib/agents/mock';

/**
 * POST /api/omnia/converse
 * Body: { message: string, user_id?: string }
 *
 * The main agentic loop. Real mode runs OMNIA_PARTNERSHIP_PROMPT with the
 * team profiles + active tasks injected so the model can route work.
 * Mock mode returns a deterministic reply from agents/mock.ts.
 */
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ ok: false, error: 'missing_message' }, { status: 400 });

    const agents = getAgents();
    const tasks = getAllTasks();
    const omnia = getAgent('agent_omnia')!;

    if (isAIEnabled()) {
      const context = {
        team: agents
          .filter((a) => a.kind === 'member')
          .map((a) => ({
            id: a.id,
            name: a.short_name,
            role: a.for_user_role,
            skills: a.skills,
            performance_score: a.performance_score,
            level: a.level,
            online: a.online,
            status: a.status,
            help_given_count: a.help_given_count,
            help_received_count: a.help_received_count,
          })),
        active_tasks: tasks
          .filter((t) => t.status !== 'completed')
          .map((t) => ({
            id: t.id,
            title: t.title,
            assignee_id: t.assignee_agent_id,
            priority: t.priority,
            status: t.status,
            reminder_count: t.reminder_count,
            deadline: t.deadline,
          })),
        user_message: message,
      };
      const result = await callJSON({
        systemPrompt: OMNIA_PARTNERSHIP_PROMPT,
        userInput: JSON.stringify(context),
        model: 'gpt-4o',
        temperature: 0.4,
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o', ...result });
      }
    }

    const reply = mockAgentReply(omnia, message);
    return NextResponse.json({
      ok: true,
      mode: 'mock',
      response_message: reply.body,
      new_tasks: [],
      memory_to_save: [],
      stalled_tasks_update: [],
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
