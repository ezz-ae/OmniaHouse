import { NextResponse } from 'next/server';
import { isAIEnabled, callAI, getModelInventory } from '@/lib/ai/client';

/**
 * GET /api/ai/status
 *
 * Health check the team can hit to confirm Gemini is actually reachable
 * from the running environment. Without this, "AI feels like a chatbot"
 * is hard to debug — was the key missing? Wrong model? Rate-limited?
 *
 * Response shape:
 *   { ok: true,
 *     configured: boolean,        // GOOGLE_API_KEY / GEMINI_API_KEY present
 *     key_source: string,         // which var the client picked
 *     models: { default, pro, mini },
 *     live: { ping: boolean, model: string, sample: string, error?: string } | null }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const skipPing = url.searchParams.get('ping') === '0';

  const configured = isAIEnabled();
  const keySource = process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : null;
  const models = getModelInventory();

  if (!configured || skipPing) {
    return NextResponse.json({
      ok: true,
      configured, key_source: keySource, models, live: null,
      hint: configured ? 'Add ?ping=1 to test a live call.' : 'Set GOOGLE_API_KEY in Vercel env and redeploy.',
    });
  }

  // One-token ping with the fast model to confirm reachability.
  let pingOk = false;
  let sample: string | null = null;
  let pingError: string | null = null;
  try {
    const text = await callAI({
      systemPrompt: 'You are a connectivity test. Respond with the single word "ok".',
      userInput: 'ping',
      model: 'default',
      maxTokens: 8,
      temperature: 0,
    });
    if (text && text.trim().length > 0) {
      pingOk = true;
      sample = text.trim().slice(0, 60);
    }
  } catch (err: any) {
    pingError = err?.message || String(err);
  }

  return NextResponse.json({
    ok: true,
    configured,
    key_source: keySource,
    models,
    live: {
      ping: pingOk,
      model: models.default,
      sample,
      ...(pingError ? { error: pingError } : {}),
    },
    hint: pingOk
      ? 'Gemini is reachable. If the chat still looks generic, the prompt context might be the issue.'
      : 'Key is set but the live call failed — check server logs and the GOOGLE_API_KEY value.',
  });
}
