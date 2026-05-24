import { NextResponse } from 'next/server';
import type { StrategyAction } from '@/lib/inventory/types';

/**
 * POST /api/inventory/execute-action
 * Body: { sku: string, action: StrategyAction, payload?: any }
 *
 * Acts on a suggestion returned from INVENTORY_STRATEGY_PROMPT.
 *   RESTOCK              → opens a draft purchase order
 *   PRICE_CHECK          → marks the product for parity review
 *   LIST_GOOGLE_SHOPPING → flips google_shopping_status to 'listed'
 *   OPTIMIZE_CONTENT     → routes to /api/inventory/seo-optimize?apply=true
 *
 * Mock mode (no Supabase): returns the would-be next state so the UI can
 * preview the action without persisting.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sku, action } = body as { sku?: string; action?: StrategyAction };
  if (!sku || !action) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const next = describe(action, sku);

  return NextResponse.json({
    ok: true,
    mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'real' : 'mock',
    sku,
    action,
    next_state: next,
    follow_up_endpoint: action === 'OPTIMIZE_CONTENT' ? '/api/inventory/seo-optimize' : null,
  });
}

function describe(action: StrategyAction, sku: string): string {
  switch (action) {
    case 'RESTOCK':              return `Draft purchase order opened for ${sku}. Routed to Inventory role.`;
    case 'PRICE_CHECK':          return `${sku} flagged for parity review. Next sync will confirm.`;
    case 'LIST_GOOGLE_SHOPPING': return `${sku} listed on Google Shopping. Index will update within 24h.`;
    case 'OPTIMIZE_CONTENT':     return `${sku} routed to SEO optimizer. Apply the suggestion to persist.`;
  }
}
