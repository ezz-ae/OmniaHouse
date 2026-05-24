import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

/**
 * AI client — single place that calls the model.
 *
 * Uses Google Gemini. Reads GOOGLE_API_KEY from env. When set: every API
 * route calls Gemini with the matching prompt from lib/prompts/. When
 * not set: returns null and routes fall back to the deterministic mocks.
 *
 * The shape callJSON returns is identical to before, so every API route
 * keeps working without changes.
 */

let cached: GoogleGenerativeAI | null | undefined;

function getClient(): GoogleGenerativeAI | null {
  if (cached !== undefined) return cached;
  // Accept either name to be friendly — Vercel often uses one, local dev the other.
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) { cached = null; return null; }
  cached = new GoogleGenerativeAI(key);
  return cached;
}

export function isAIEnabled(): boolean {
  return !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
}

/** Default Gemini model when not specified. Flash is fast + cheap. */
const DEFAULT_MODEL = 'gemini-2.0-flash-exp';
/** Pro for harder reasoning (Omnia routing, meeting analysis, strategy). */
const PRO_MODEL = 'gemini-1.5-pro';
/** Cheap model for short classifications (sentiment). */
const MINI_MODEL = 'gemini-1.5-flash';

type ModelTier = 'default' | 'pro' | 'mini';

function resolveModel(tier?: ModelTier | string): string {
  if (!tier || tier === 'default') return DEFAULT_MODEL;
  if (tier === 'pro') return PRO_MODEL;
  if (tier === 'mini') return MINI_MODEL;
  return DEFAULT_MODEL;
}

export type AICallOpts = {
  systemPrompt: string;
  userInput: string;
  /**
   * Either 'default' / 'pro' / 'mini' for tiered routing, or a literal
   * model name passed through for special cases. Old call sites used
   * OpenAI model names like 'gpt-4o' — those resolve to the default tier.
   */
  model?: ModelTier | string;
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
};

function pickModel(client: GoogleGenerativeAI, opts: AICallOpts): GenerativeModel {
  const m = opts.model;
  let name = DEFAULT_MODEL;
  if (!m || m === 'default') name = DEFAULT_MODEL;
  else if (m === 'pro') name = PRO_MODEL;
  else if (m === 'mini') name = MINI_MODEL;
  else if (typeof m === 'string' && m.startsWith('gemini')) name = m;
  else if (typeof m === 'string' && m.startsWith('gpt')) name = DEFAULT_MODEL;  // back-compat
  else name = DEFAULT_MODEL;

  return client.getGenerativeModel({
    model: name,
    systemInstruction: opts.systemPrompt,
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxTokens || 1500,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  });
}

/** Call the model. Returns the assistant message text (or null on failure). */
export async function callAI(opts: AICallOpts): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const model = pickModel(client, opts);
    const result = await model.generateContent(opts.userInput);
    return result.response.text();
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

/** Back-compat: some routes call getOpenAI() — keep the name so callers don't break. */
export function getOpenAI() {
  return getClient();
}
