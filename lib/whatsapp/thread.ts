/**
 * The conversation thread is a single ordered stream of TURNS.
 * A turn can be a message (customer/agent) OR an AI card (extract,
 * verify, optimize, magazine). AI cards live INSIDE the thread, not
 * in a side panel — they appear where the agent invoked them.
 */

import type {
  Message, Extraction, ReplyOptimization, PaymentVerification, Magazine,
} from './types';

export type Turn =
  | { kind: 'message'; at: string; data: Message }
  | { kind: 'extract'; at: string; data: Extraction }
  | { kind: 'optimize'; at: string; data: ReplyOptimization }
  | { kind: 'verify'; at: string; data: PaymentVerification; for_filename?: string }
  | { kind: 'magazine'; at: string; data: Magazine }
  | { kind: 'shortcut'; at: string; data: { trigger_key: string; en: string; ar: string } }
  | { kind: 'system'; at: string; data: { text: string; tone?: 'info' | 'warn' | 'good' } };

export function messagesToTurns(messages: Message[]): Turn[] {
  return messages.map((m) => ({ kind: 'message', at: m.at, data: m } as Turn));
}
