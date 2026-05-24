/**
 * The conversation thread is a single ordered stream of TURNS.
 * A turn can be a message, an AI card, a shared product, or a system note.
 * Everything lives INSIDE the thread — no parked panels.
 */

import type {
  Message, Extraction, ReplyOptimization, PaymentVerification, Magazine,
} from './types';

export type ProductShare = {
  sku: string;
  title: string;
  category: string;
  material: string;
  image_hint?: string;
  shopify_price_aed: number | null;
  woocommerce_price_aed: number | null;
  shopify_url: string | null;
  woocommerce_url: string | null;
  in_stock_anywhere: boolean;
  is_limited_edition: boolean;
};

export type Turn =
  | { kind: 'message'; at: string; data: Message }
  | { kind: 'extract'; at: string; data: Extraction }
  | { kind: 'optimize'; at: string; data: ReplyOptimization }
  | { kind: 'verify'; at: string; data: PaymentVerification; for_filename?: string }
  | { kind: 'magazine'; at: string; data: Magazine }
  | { kind: 'shortcut'; at: string; data: { trigger_key: string; en: string; ar: string } }
  | { kind: 'product_share'; at: string; data: ProductShare }
  | { kind: 'system'; at: string; data: { text: string; tone?: 'info' | 'warn' | 'good' | 'bad' } };

export function messagesToTurns(messages: Message[]): Turn[] {
  return messages.map((m) => ({ kind: 'message', at: m.at, data: m } as Turn));
}
