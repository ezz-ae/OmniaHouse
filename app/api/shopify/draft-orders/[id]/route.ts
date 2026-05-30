import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * /api/shopify/draft-orders/[id]
 *   GET     — fetch a single draft for edit
 *   PUT     — update note / line_items
 *   DELETE  — remove a draft from Shopify
 */

const SHOPIFY_API_VERSION = '2024-04';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: true,
      mode: 'mock',
      draft_order: {
        id: Number(params.id) || 7701,
        name: `#DRAFT-${params.id}`,
        status: 'open',
        total_price: '1500.00',
        line_items: [{ title: 'Crescent Ring 925', quantity: 1, price: '1500.00' }],
        note: 'Pre-payment requested for Sharjah COD.',
      },
    });
  }
  return shopifyProxy(params.id, 'GET', null);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, mode: 'mock', draft_order: { id: params.id, ...body } });
  }
  return shopifyProxy(params.id, 'PUT', { draft_order: body });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, mode: 'mock', deleted: params.id });
  }
  return shopifyProxy(params.id, 'DELETE', null);
}

async function shopifyProxy(id: string, method: 'GET' | 'PUT' | 'DELETE', body: any) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('org_integrations')
    .select('base_url, api_key')
    .eq('provider', 'shopify')
    .single();

  if (!integration?.base_url || !integration?.api_key) {
    return NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 });
  }

  const res = await fetch(`${integration.base_url}/admin/api/${SHOPIFY_API_VERSION}/draft_orders/${id}.json`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': integration.api_key },
    body: body ? JSON.stringify(body) : undefined,
    next: { revalidate: 0 },
  });
  const result = method === 'DELETE' ? { deleted: id } : await res.json();
  if (!res.ok) return NextResponse.json({ error: result?.errors?.toString() || 'Shopify request failed' }, { status: 500 });
  return NextResponse.json({ success: true, mode: 'real', ...result });
}
