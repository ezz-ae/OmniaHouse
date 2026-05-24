import { NextResponse } from 'next/server';
import { isAIEnabled, callJSON } from '@/lib/ai/client';
import { DRIVE_INTELLIGENCE_PROMPT } from '@/lib/prompts';

/**
 * POST /api/drive/intelligence
 * Body: { filename: string, mime_type?: string, content_excerpt?: string, context?: string }
 *
 * Routes a file through The Corridors. Real mode runs DRIVE_INTELLIGENCE_PROMPT
 * with the file context and returns the suggested corridor + extracted data.
 * Mock mode infers the corridor from the filename and synthesises a brief.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const filename: string = body.filename || '';
    if (!filename) {
      return NextResponse.json({ ok: false, error: 'missing_filename' }, { status: 400 });
    }

    if (isAIEnabled()) {
      const result = await callJSON({
        systemPrompt: DRIVE_INTELLIGENCE_PROMPT,
        userInput: JSON.stringify({
          filename,
          mime_type: body.mime_type ?? null,
          content_excerpt: body.content_excerpt ?? null,
          context: body.context ?? null,
        }),
        model: 'pro',
      });
      if (result) {
        return NextResponse.json({ ok: true, mode: 'real', model: 'pro', ...result });
      }
    }

    return NextResponse.json({ ok: true, mode: 'mock', ...mockIntelligence(filename) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

function mockIntelligence(filename: string) {
  const lower = filename.toLowerCase();
  const isInvoice = /invoice|fatura|bill/.test(lower);
  const isAd = /meta|facebook|ig|reel|campaign/.test(lower);
  const isFinance = /statement|settlement|payout/.test(lower);
  return {
    suggested_corridor: isInvoice ? 'inventory' : isFinance ? 'finance' : isAd ? 'marketing' : 'none',
    extracted_data: {
      items: isInvoice
        ? [
            { sku: 'OM-RING-CR-925', title: 'Crescent Ring 925', price: 510 },
            { sku: 'OM-PEND-MS-925', title: 'Moonstone Pendant', price: 360 },
          ]
        : [],
      summary: isInvoice
        ? 'Supplier invoice with two SKUs. Routes to Inventory for cost-of-goods update.'
        : isFinance
        ? 'Settlement file from acquirer. Routes to Finance for reconciliation.'
        : isAd
        ? 'Campaign brief. Routes to Marketing for review.'
        : 'No clear corridor — left in The Safe.',
    },
    draft_email: {
      subject: isInvoice ? 'Confirming receipt of supplier invoice' : 'Document received',
      body: 'Received and routing for review. Will revert with action.',
      target: 'internal' as const,
    },
  };
}
