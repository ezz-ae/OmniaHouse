import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { META_SENTIMENT_PROMPT } from '@/lib/prompts';

/**
 * POST /api/brand/meta-sentiment
 * Body: { comment: string }
 *
 * Classifies a single Meta comment for sentiment + hostility. Used by the
 * Meta Sentinel to upgrade an attack_warning when individual comments
 * cross the hostile threshold.
 */
export async function POST(req: Request) {
  try {
    const { comment } = await req.json();
    if (!comment) return NextResponse.json({ ok: false, error: 'missing_comment' }, { status: 400 });

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: META_SENTIMENT_PROMPT,
        userInput: comment,
        model: 'mini',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'mini', ...result });
      }
    }

    const lower = comment.toLowerCase();
    const negativeMarkers = ['fake', 'scam', 'fraud', 'cheap', 'don\'t buy', 'never again', 'horrible', 'سيء', 'احتيال'];
    const positiveMarkers = ['love', 'amazing', 'beautiful', 'perfect', 'thank', 'رائع', 'جميل'];
    const isNeg = negativeMarkers.some((m) => lower.includes(m));
    const isPos = positiveMarkers.some((m) => lower.includes(m));
    const hostileMarkers = ['fraud', 'scam', 'never again', 'احتيال'];
    const is_hostile = hostileMarkers.some((m) => lower.includes(m));
    const sentiment: 'negative' | 'neutral' | 'positive' = isNeg ? 'negative' : isPos ? 'positive' : 'neutral';

    return NextResponse.json({
      ok: true,
      mode: 'mock',
      sentiment,
      is_hostile,
      confidence: isPos || isNeg ? 0.8 : 0.55,
      reasoning: isNeg
        ? 'Negative markers present.'
        : isPos
        ? 'Positive markers present.'
        : 'No strong sentiment markers.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
