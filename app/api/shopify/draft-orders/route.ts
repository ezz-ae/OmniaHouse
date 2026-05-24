import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * /api/shopify/draft-orders
 *   GET  ?status=open|completed  — list drafts from Shopify Admin API
 *   POST { customer_phone, line_items[], note? } — create a new draft order
 *
 * Mock mode (no Supabase): returns a small static set so the Management
 * Room renders. Real mode reads the Shopify Admin token from
 * org_integrations and proxies to the Admin API.
 */

const SHOPIFY_API_VERSION = '2024-04';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'open';

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ success: true, mode: 'mock', draft_orders: mockDrafts(status) });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: integration } = await supabase
      .from('org_integrations')
      .select('base_url, api_key')
      .eq('provider', 'shopify')
      .single();

    if (!integration || !integration.base_url || !integration.api_key) {
      return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
    }

    const res = await fetch(
      `${integration.base_url}/admin/api/${SHOPIFY_API_VERSION}/draft_orders.json?status=${status}&limit=50`,
      { headers: { 'X-Shopify-Access-Token': integration.api_key }, next: { revalidate: 0 } },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.errors?.toString() || 'Shopify request failed');

    return NextResponse.json({ success: true, mode: 'real', ...data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      mode: 'mock',
      draft_order: {
        id: Date.now(),
        name: `#DRAFT-${Math.floor(Math.random() * 9000 + 1000)}`,
        status: 'open',
        total_price: '0.00',
        line_items: body.line_items ?? [],
        note: body.note ?? null,
        created_at: new Date().toISOString(),
      },
    });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: integration } = await supabase
      .from('org_integrations')
      .select('base_url, api_key')
      .eq('provider', 'shopify')
      .single();

    if (!integration?.base_url || !integration?.api_key) {
      return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
    }

    const res = await fetch(`${integration.base_url}/admin/api/${SHOPIFY_API_VERSION}/draft_orders.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': integration.api_key },
      body: JSON.stringify({
        draft_order: {
          line_items: body.line_items ?? [],
          note: body.note ?? null,
          customer: body.customer_phone ? { phone: body.customer_phone } : undefined,
          tags: body.tags ?? 'omniahouse',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.errors?.toString() || 'Shopify request failed');

    return NextResponse.json({ success: true, mode: 'real', ...data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function mockDrafts(status: string) {
  const open = [
    { id: 7701, name: '#DRAFT-7701', status: 'open', total_price: '1500.00', customer: { first_name: 'Aisha', phone: '+971501234884' }, created_at: '2026-05-24T11:00:00Z' },
    { id: 7702, name: '#DRAFT-7702', status: 'open', total_price: '3000.00', customer: { first_name: 'Mariam', phone: '+966507733091' }, created_at: '2026-05-24T09:14:00Z' },
    { id: 7703, name: '#DRAFT-7703', status: 'open', total_price: '4500.00', customer: { first_name: 'Reem', phone: '+971566201155' }, created_at: '2026-05-23T18:42:00Z' },
  ];
  const completed = [
    { id: 7600, name: '#DRAFT-7600', status: 'completed', total_price: '12400.00', customer: { first_name: 'Reem', phone: '+971566201155' }, created_at: '2026-05-23T13:18:00Z' },
  ];
  return status === 'completed' ? completed : open;
}
