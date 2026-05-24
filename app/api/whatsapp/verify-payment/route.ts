import { NextResponse } from 'next/server';
import { mockVerifyPayment } from '@/lib/whatsapp/mock';
import { callJSON, isAIEnabled } from '@/lib/ai/client';
import { MEDIA_VERIFICATION_PROMPT } from '@/lib/whatsapp/prompts';
import type { PaymentVerification } from '@/lib/whatsapp/types';

/**
 * POST /api/whatsapp/verify-payment
 * Body: { filename: string, expected_amount_aed?: number, expected_currency?: string, customer_phone?: string }
 *
 * Real mode: GPT-4o + MEDIA_VERIFICATION_PROMPT — bank template check
 * (Emirates NBD / ADCB / Al Rajhi / Mashreq / FAB), metadata consistency,
 * authenticity score, action recommendation.
 * Mock mode: filename-based heuristic (any "Payment.pdf" is rejected).
 *
 * NOTE: full vision-based check (passing the actual image to the model)
 * is a Phase-2 extension. Today the prompt receives the filename + the
 * order context and reasons about authenticity from that signal.
 */
export async function POST(req: Request) {
  try {
    const { filename, expected_amount_aed, expected_currency, customer_phone } = await req.json();
    if (!filename) return NextResponse.json({ ok: false, error: 'missing_filename' }, { status: 400 });

    if (isAIEnabled()) {
      const userInput = [
        `### MEDIA FILENAME: ${filename}`,
        expected_amount_aed && `### EXPECTED AMOUNT: AED ${expected_amount_aed}`,
        expected_currency && `### EXPECTED CURRENCY: ${expected_currency}`,
        customer_phone && `### CUSTOMER PHONE (for device context): ${customer_phone}`,
      ].filter(Boolean).join('\n');
      const real = await callJSON<PaymentVerification>({
        systemPrompt: MEDIA_VERIFICATION_PROMPT,
        userInput,
      });
      if (real) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o', verification: real });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: isAIEnabled() ? 'mock_fallback' : 'mock',
      verification: mockVerifyPayment(filename),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
