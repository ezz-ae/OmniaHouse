import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();

    const { data: integration } = await supabase
      .from('org_integrations')
      .select('*')
      .eq('provider', 'shopify')
      .single();

    if (!integration || !integration.api_key || !integration.base_url) {
      return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
    }

    // Resolve campaign value - In production, this would query a 'marketing_campaigns' table
    let discountValue = 0;
    const normalizedCode = code.toUpperCase();

    if (normalizedCode.includes('10')) discountValue = 10.0;
    else if (normalizedCode.includes('20')) discountValue = 20.0;
    else if (normalizedCode === 'WELCOME') discountValue = 5.0;
    else throw new Error('Invalid or expired discount code');

    const shopifyUrl = `${integration.base_url}/admin/api/2024-04/draft_orders/${params.id}.json`;
    
    const updateRes = await fetch(shopifyUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': integration.api_key
      },
      body: JSON.stringify({
        draft_order: {
          applied_discount: {
            description: `Campaign: ${normalizedCode}`,
            value: discountValue.toString(),
            value_type: "percentage",
            title: normalizedCode
          }
        }
      })
    });

    if (!updateRes.ok) throw new Error('Failed to update Shopify draft order');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
