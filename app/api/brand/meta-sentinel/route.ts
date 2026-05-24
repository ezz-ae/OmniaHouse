import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { META_INTELLIGENCE_PROMPT } from '@/lib/prompts';

/**
 * POST /api/brand/meta-sentinel
 * Body: { recent_comments?: any[], recent_ads?: any[], inventory_signals?: any }
 *
 * Watches Meta for brand-attack patterns, ROAS dips, and optimal post times.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: META_INTELLIGENCE_PROMPT,
        userInput: JSON.stringify(body),
        model: 'pro',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', ...result });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'mock',
      alerts: [
        {
          type: 'attack_warning',
          severity: 'medium',
          message: 'Three negative comments on the Bridal Ring post in the past 40 minutes.',
          suggested_action: 'Hide off-topic comments, draft a public response, and watch the next hour.',
        },
        {
          type: 'ad_risk',
          severity: 'high',
          message: 'ROAS on the Eid Teaser ad dropped from 4.2 to 1.8 over 48 hours.',
          suggested_action: 'Pause the ad and refresh creative before tomorrow morning.',
        },
      ],
      schedule_suggestions: [
        {
          content_theme: 'High-stock Bridal Rings',
          best_time: 'Thursday 21:30 GST',
          reasoning: 'Three months of post data show 1.7× engagement Thursday nights for bridal content.',
        },
      ],
      roas_summary: 'Overall ROAS 3.1 (target ≥ 3.0). One creative is dragging the average.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
