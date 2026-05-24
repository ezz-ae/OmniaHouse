import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SHOPIFY_API_VERSION = '2024-04';

/**
 * POST /api/shopify/draft-orders/[id]/send-invoice
 *
 * Sends the Shopify invoice email for the named draft. In mock mode,
 * returns a success acknowledgement so the Management Room can render
 * the next state.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ success: true, mode: 'mock', invoice_sent: params.id });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('org_integrations')
    .select('base_url, api_key')
    .eq('provider', 'shopify')
    .single();

  if (!integration?.base_url || !integration?.api_key) {
    return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
  }

  const res = await fetch(
    `${integration.base_url}/admin/api/${SHOPIFY_API_VERSION}/draft_orders/${params.id}/send_invoice.json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': integration.api_key },
      body: JSON.stringify({ draft_order_invoice: {} }),
    },
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.errors?.toString() || 'send_invoice failed' }, { status: 500 });

  return NextResponse.json({ success: true, mode: 'real', ...data });
}
