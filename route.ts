import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/dist/client/components/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Fetch Shopify Integration credentials
    const { data: integration } = await supabase
      .from('org_integrations')
      .select('*')
      .eq('provider', 'shopify')
      .single();

    if (!integration || !integration.api_key || !integration.base_url) {
      return NextResponse.json({ error: 'Shopify integration not properly configured' }, { status: 400 });
    }

    // 2. Call Shopify Admin API to create a blank draft order
    const shopifyUrl = `${integration.base_url}/admin/api/2024-04/draft_orders.json`;
    
    const shopifyRes = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': integration.api_key
      },
      body: JSON.stringify({
        draft_order: {
          line_items: [
            {
              title: "Digital Office Draft",
              price: "0.00",
              quantity: 1
            }
          ],
          note: "Created via OmniaHouse Digital Office command session."
        }
      })
    });

    const data = await shopifyRes.json();

    if (!shopifyRes.ok) {
      throw new Error(data.errors ? JSON.stringify(data.errors) : 'Shopify API Error');
    }

    return NextResponse.json({ 
      success: true, 
      draft_order: data.draft_order 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}