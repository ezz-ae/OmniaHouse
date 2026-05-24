import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/dist/client/components/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: integration } = await supabase
      .from('org_integrations')
      .select('*')
      .eq('provider', 'shopify')
      .single();

    if (!integration || !integration.api_key || !integration.base_url) {
      return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
    }

    // 1. Fetch current draft order details to maintain context
    const getRes = await fetch(`${integration.base_url}/admin/api/2024-04/draft_orders/${params.id}.json`, {
      headers: { 'X-Shopify-Access-Token': integration.api_key }
    });
    const { draft_order } = await getRes.json();

    /**
     * 2. Neural CRM Sync logic:
     * This is where we would normally search the 'customer_wallets' or 'order_submissions'
     * to find matching profiles and enrich the Shopify draft with CRM-specific metadata.
     */
    
    // 3. Update Shopify Draft Order with CRM sync flag
    const updateRes = await fetch(`${integration.base_url}/admin/api/2024-04/draft_orders/${params.id}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': integration.api_key
      },
      body: JSON.stringify({ draft_order: { tags: `${draft_order.tags || ''}, CRM_SYNCED`.trim() } })
    });

    if (!updateRes.ok) throw new Error('Failed to synchronize CRM data to Shopify');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}