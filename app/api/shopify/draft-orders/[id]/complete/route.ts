import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SHOPIFY_API_VERSION = '2024-04';

/**
 * POST /api/shopify/draft-orders/[id]/complete
 *
 * Converts the named draft into a real Shopify order. In production this
 * also fires the wallet-accrual trigger on order_submissions.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      mode: 'mock',
      order: { id: Date.now(), name: `#OM-${Math.floor(Math.random() * 9000 + 1000)}`, from_draft: params.id },
    });
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
    `${integration.base_url}/admin/api/${SHOPIFY_API_VERSION}/draft_orders/${params.id}/complete.json?payment_pending=false`,
    {
      method: 'PUT',
      headers: { 'X-Shopify-Access-Token': integration.api_key },
    },
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.errors?.toString() || 'complete failed' }, { status: 500 });

  return NextResponse.json({ success: true, mode: 'real', ...data });
}
