import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { MILESTONE_ORCHESTRATOR_PROMPT } from '@/lib/prompts';

/**
 * POST /api/backyard/milestone
 * Body: { active_milestones: any[], recent_activity: any[] }
 *
 * Tracks progress against active backyard_milestones (individual or
 * team-role-paid). Returns progress percent + commentary.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: MILESTONE_ORCHESTRATOR_PROMPT,
        userInput: JSON.stringify(body),
        model: 'gpt-4o',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o', ...result });
      }
    }

    const updates = (body.active_milestones ?? []).map((m: any) => {
      const current = m.current_value ?? 0;
      const target = m.target_value ?? 1;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return { id: m.id, progress_pct: pct, is_achieved: pct >= 100 };
    });
    const achieved = updates.filter((u: any) => u.is_achieved).length;
    return NextResponse.json({
      ok: true,
      mode: 'mock',
      milestone_updates: updates,
      orch_commentary:
        achieved > 0
          ? `${achieved} milestone${achieved > 1 ? 's' : ''} achieved. Reward payouts queued.`
          : 'No milestones hit yet this cycle. Two are within range of completion this week.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
