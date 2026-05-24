import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { MEETING_INTELLIGENCE_PROMPT } from '@/lib/prompts';

/**
 * POST /api/meeting/analyze
 * Body: { transcript: string, attendees?: string[] }
 *
 * Bridges a meeting transcript into: a summary, decisions, and a list of
 * tasks ready for Omnia AI to route.
 */
export async function POST(req: Request) {
  try {
    const { transcript, attendees } = await req.json();
    if (!transcript) return NextResponse.json({ ok: false, error: 'missing_transcript' }, { status: 400 });

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: MEETING_INTELLIGENCE_PROMPT,
        userInput: JSON.stringify({ transcript, attendees: attendees ?? [] }),
        model: 'pro',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', ...result });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'mock',
      ceo_summary:
        'Meeting covered Eid campaign positioning, BNPL trade-offs, and the LE Celestial photography review. Two decisions logged. Three tasks routed.',
      decisions: [
        'Push Eid campaign launch to 2026-05-30. Prep starts two weeks earlier.',
        'Hold BNPL onboarding until LE Celestial settles — luxury tone is the priority.',
      ],
      tasks: [
        {
          title: 'Draft Eid email sequence',
          description: 'Three touch-points across the two-week build.',
          assignee_type: 'marketing',
          priority: 'high',
        },
        {
          title: 'Confirm LE Celestial photography final cut',
          description: 'Sign off before Friday.',
          assignee_type: 'marketing',
          priority: 'medium',
        },
        {
          title: 'Wait on BNPL signing',
          description: 'Revisit after LE launch settles.',
          assignee_type: 'strategy',
          priority: 'low',
        },
      ],
      strategic_advice:
        'The brand benefits from one campaign at a time. Avoid the temptation to layer BNPL on top of the LE launch — it muddies the signal.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
