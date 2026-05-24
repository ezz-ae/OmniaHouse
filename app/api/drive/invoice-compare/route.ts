import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { INVOICE_COMPARISON_PROMPT } from '@/lib/prompts';

/**
 * POST /api/drive/invoice-compare
 * Body: { invoice_a: string, invoice_b: string }   // raw text/OCR excerpts
 */
export async function POST(req: Request) {
  try {
    const { invoice_a, invoice_b } = await req.json();
    if (!invoice_a || !invoice_b) {
      return NextResponse.json({ ok: false, error: 'missing_invoices' }, { status: 400 });
    }

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: INVOICE_COMPARISON_PROMPT,
        userInput: JSON.stringify({ invoice_a, invoice_b }),
        model: 'gpt-4o',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'gpt-4o', ...result });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'mock',
      comparison_summary:
        'Two invoices compared. One SKU (OM-RING-CR-925) shows a 6.5% cost increase between January and May. Volume on OM-PEND-MS-925 fell from 48 units to 30.',
      discrepancies: [
        { sku: 'OM-RING-CR-925', issue: 'Cost moved from AED 480 to AED 510.' },
        { sku: 'OM-PEND-MS-925', issue: 'Volume −37% — supply tightening.' },
      ],
      savings_opportunity:
        'Negotiate volume commitment with this supplier for Q3 to restore old pricing on OM-RING-CR-925.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
