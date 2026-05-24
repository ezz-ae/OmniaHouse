import OpenAI from 'openai';

/**
 * AI client — single place that calls the model.
 *
 * Reads OPENAI_API_KEY from env. When set: every API route in
 * /api/whatsapp/* and /api/agents/* calls real GPT-4o with the
 * prompts from lib/whatsapp/prompts.ts (and the wider prompts/
 * library). When not set: returns null and routes fall back to
 * the deterministic mocks in lib/whatsapp/mock.ts and lib/agents/mock.ts.
 *
 * Real mode is opt-in via the env var. UI does not change.
 */

let cached: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (cached !== undefined) return cached;
  const key = process.env.OPENAI_API_KEY;
  if (!key) { cached = null; return null; }
  cached = new OpenAI({ apiKey: key });
  return cached;
}

export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export type AICallOpts = {
  systemPrompt: string;
  userInput: string;
  model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';
  temperature?: number;
  /** If true, asks the model for JSON output and parses. */
  json?: boolean;
  maxTokens?: number;
};

/** Call the model. Returns the assistant message text (or parsed JSON object). */
export async function callAI(opts: AICallOpts): Promise<string | null> {
  const client = getOpenAI();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: opts.model || 'gpt-4o',
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens || 1500,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userInput },
      ],
      ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
    });
    return completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error('AI call failed:', err);
    return null;
  }
}

/** Convenience: call the model and parse JSON, returning null on any failure. */
export async function callJSON<T = any>(opts: Omit<AICallOpts, 'json'>): Promise<T | null> {
  const text = await callAI({ ...opts, json: true });
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('AI JSON parse failed:', err, 'raw:', text?.slice(0, 200));
    return null;
  }
}
