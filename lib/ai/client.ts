import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { geminiFunctionDeclarations, getTool } from '@/lib/mcp/registry';

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

/**
 * Current stable Gemini models for SDK @google/generative-ai 0.24.x.
 * Default is 2.5 Flash (fast + cheap, fits 99% of room calls).
 * Pro is 2.5 Pro (Omnia orchestration, meeting analysis, strategy).
 * Mini is 2.5 Flash Lite for short classifications. Override via env:
 *   GEMINI_DEFAULT_MODEL, GEMINI_PRO_MODEL, GEMINI_MINI_MODEL
 */
const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';
const PRO_MODEL = process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro';
const MINI_MODEL = process.env.GEMINI_MINI_MODEL || 'gemini-2.5-flash-lite';

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

export function resolveModelName(m?: ModelTier | string): string {
  if (!m || m === 'default') return DEFAULT_MODEL;
  if (m === 'pro') return PRO_MODEL;
  if (m === 'mini') return MINI_MODEL;
  if (typeof m === 'string' && m.startsWith('gemini')) return m;
  if (typeof m === 'string' && m.startsWith('gpt')) return DEFAULT_MODEL; // back-compat
  return DEFAULT_MODEL;
}

function pickModel(client: GoogleGenerativeAI, opts: AICallOpts): GenerativeModel {
  return client.getGenerativeModel({
    model: resolveModelName(opts.model),
    systemInstruction: opts.systemPrompt,
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxTokens || 1500,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  });
}

export function getModelInventory() {
  return { default: DEFAULT_MODEL, pro: PRO_MODEL, mini: MINI_MODEL };
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

/**
 * Call the model and parse JSON. Forgiving: strips ```json fences, extracts
 * the largest {...} block, and returns the raw text wrapped in
 * { response_message: text } as a last resort so chat routes can still
 * deliver a real Gemini answer instead of falling back to mock.
 */
export async function callJSON<T = any>(opts: Omit<AICallOpts, 'json'>): Promise<T | null> {
  const text = await callAI({ ...opts, json: true });
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // 1. Strip ```json … ``` fences
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try { return JSON.parse(fenced[1].trim()) as T; } catch {}
    }
    // 2. Extract the largest {...} substring
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try { return JSON.parse(text.slice(first, last + 1)) as T; } catch {}
    }
    // 3. Last resort — wrap the model's prose so chat routes still answer.
    console.error('AI JSON parse failed; returning text fallback. raw:', text.slice(0, 200));
    return { response_message: text.trim(), new_tasks: [], memory_to_save: [], stalled_tasks_update: [] } as T;
  }
}

/** Back-compat: some routes call getOpenAI() — keep the name so callers don't break. */
export function getOpenAI() {
  return getClient();
}

// ─── MCP / tool-use path ──────────────────────────────────────────────────
//
// callWithTools(): runs Gemini function-calling against the registered MCP
// tool catalog. The model decides what to fetch from Supabase / live data
// instead of receiving a pre-baked JSON dump. Used by /api/omnia/converse
// when OMNIA_USE_MCP=1 (and future endpoints as we migrate).
//
// Returns { text, tool_log }. tool_log is an array of { tool, args, result }
// so the chat UI can render a "Omnia · used 3 tools" badge.

export type ToolLogEntry = { tool: string; args: any; result_summary: string; result?: any };
export type ToolCallResult = { text: string; tool_log: ToolLogEntry[]; model: string } | null;

const MAX_TOOL_ROUNDS = 6;

function geminiTools() {
  // SDK accepts FunctionDeclaration[] inside tools[0].functionDeclarations.
  return [{ functionDeclarations: geminiFunctionDeclarations() as any }];
}

function summarizeResult(value: any): string {
  if (!value || typeof value !== 'object') return String(value).slice(0, 120);
  if (value.ok === false) return `error: ${value.reason || 'unknown'}`;
  const counts: string[] = [];
  for (const [k, v] of Object.entries(value)) {
    if (k === 'ok') continue;
    if (typeof v === 'number') counts.push(`${k}=${v}`);
    else if (Array.isArray(v)) counts.push(`${k}=${v.length}`);
  }
  return counts.join(' · ').slice(0, 160) || 'ok';
}

export async function callWithTools(opts: {
  systemPrompt: string;
  userInput: string;
  model?: ModelTier | string;
  temperature?: number;
  maxTokens?: number;
}): Promise<ToolCallResult> {
  const client = getClient();
  if (!client) return null;

  const modelName = resolveModelName(opts.model);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: opts.systemPrompt,
    tools: geminiTools(),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens || 2000,
    },
  });

  const chat = model.startChat();
  const tool_log: ToolLogEntry[] = [];
  let prompt: any = opts.userInput;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response;
    try {
      const send = await chat.sendMessage(prompt);
      response = send.response;
    } catch (err) {
      console.error('callWithTools sendMessage failed:', err);
      return null;
    }

    const calls = (response as any).functionCalls?.() || [];
    if (!calls.length) {
      // No more tool calls — model has produced a final answer.
      const text = response.text();
      return { text, tool_log, model: modelName };
    }

    // Dispatch every function call from this turn in parallel.
    const settled = await Promise.all(
      calls.map(async (call: any) => {
        const tool = getTool(call.name);
        if (!tool) {
          return { name: call.name, response: { ok: false, reason: 'unknown_tool' } };
        }
        try {
          const result = await tool.handler(call.args || {});
          tool_log.push({ tool: call.name, args: call.args || {}, result_summary: summarizeResult(result), result });
          return { name: call.name, response: result };
        } catch (err: any) {
          const result = { ok: false, reason: 'tool_error', error: String(err?.message || err) };
          tool_log.push({ tool: call.name, args: call.args || {}, result_summary: summarizeResult(result), result });
          return { name: call.name, response: result };
        }
      }),
    );

    prompt = settled.map((r) => ({ functionResponse: { name: r.name, response: r.response } }));
  }

  // Tool budget exhausted — ask the model for a final answer with no further tools.
  try {
    const final = await chat.sendMessage([{ text: 'Summarise what you have learned and respond to the user.' }]);
    return { text: final.response.text(), tool_log, model: modelName };
  } catch {
    return { text: '', tool_log, model: modelName };
  }
}
