import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { BEHAVIORAL_INTELLIGENCE_PROMPT } from '@/lib/prompts';

/**
 * POST /api/brand/behavioral
 * Body: { session: GASessionSummary }
 *
 * Returns one of: monitor / flag_fraud / retarget / ignore, with reasoning
 * and a risk score 1-100. Reads from ga_events + user_intelligence eventually.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = body.session ?? {};

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: BEHAVIORAL_INTELLIGENCE_PROMPT,
        userInput: JSON.stringify({ session }),
        model: 'gpt-4o',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o', ...result });
      }
    }

    // Rule-based mock
    const cartAdds = session.cart_adds ?? 0;
    const checkoutStarts = session.checkout_starts ?? 0;
    const ccvAttempts = session.ccv_attempts ?? 0;
    const cartValue = session.cart_value_aed ?? 0;

    let decision: 'monitor' | 'flag_fraud' | 'retarget' | 'ignore' = 'monitor';
    let reasoning = 'Session sits within normal browse bounds.';
    let actionable_insight = 'No action required.';
    let risk_score = 10;

    if (ccvAttempts >= 3) {
      decision = 'flag_fraud';
      reasoning = `Payment brute-force pattern — ${ccvAttempts} CCV attempts on the same session.`;
      actionable_insight = 'Block the IP and surface to Finance immediately.';
      risk_score = 92;
    } else if (cartAdds >= 5 && checkoutStarts === 0) {
      decision = 'retarget';
      reasoning = 'Window shopper — five-plus cart adds but no checkout intent.';
      actionable_insight = 'Add to Meta retargeting LAL with a 24-hour expiry.';
      risk_score = 28;
    } else if (cartValue >= 5000 && checkoutStarts > 0 && (session.checkouts_completed ?? 0) === 0) {
      decision = 'retarget';
      reasoning = 'Abandoned-luxury cart — high-value items left after checkout start.';
      actionable_insight = 'Send a personalised WhatsApp follow-up with the magazine flow.';
      risk_score = 35;
    }

    return NextResponse.json({ ok: true, mode: 'mock', decision, reasoning, actionable_insight, risk_score });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
