import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { BACKYARD_EVENT_DECISION_PROMPT } from '@/lib/prompts';

/**
 * POST /api/backyard/event-decision
 * Body: { event_type: string, description: string, submitted_by: string }
 *
 * Decides whether a personal life event from a team member should be
 * shared publicly in the Yard. Default: private unless clearly a milestone.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_type, description } = body;
    if (!event_type || !description) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: BACKYARD_EVENT_DECISION_PROMPT,
        userInput: JSON.stringify(body),
        model: 'gpt-4o-mini',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o-mini', ...result });
      }
    }

    const PUBLIC_EVENTS = ['marriage', 'wedding', 'birthday', 'birth', 'graduation', 'anniversary', 'promotion', 'engagement'];
    const should_be_public = PUBLIC_EVENTS.some((e) => event_type.toLowerCase().includes(e));

    return NextResponse.json({
      ok: true,
      mode: 'mock',
      should_be_public,
      ai_reasoning: should_be_public
        ? `"${event_type}" is a positive life milestone the Yard celebrates publicly.`
        : `"${event_type}" sits outside the public-milestone set — keeping it private.`,
      celebratory_message: should_be_public
        ? 'The House sends its warmest wishes. May this milestone bring even more good ahead.'
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
