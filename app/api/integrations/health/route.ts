import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/integrations/health
 * Body: { provider: 'shopify' | 'woocommerce' | 'telr' | 'tabby' | 'tamara' }
 *
 * Pings the provider with the integration credentials from
 * org_integrations and updates the integration's status + last_sync_at.
 *
 * Mock mode (no Supabase): returns a deterministic "active" so the
 * Management Room badges resolve.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    const { provider } = await req.json().catch(() => ({ provider: 'unknown' }));
    return NextResponse.json({ mode: 'mock', provider, status: 'active' });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { provider } = await req.json();
    const { data: integration } = await supabase
      .from('org_integrations')
      .select('*')
      .eq('provider', provider)
      .single();

    if (!integration || !integration.base_url) {
      return NextResponse.json({ status: 'disconnected' });
    }

    let status: 'active' | 'error' | 'disconnected' = 'active';
    try {
      if (provider === 'woocommerce') {
        const res = await fetch(`${integration.base_url}/wp-json/omnia/v1/cms-bridge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Omnia-Secret': integration.api_secret || '' },
          body: JSON.stringify({ action: 'get_site_stats' }),
          next: { revalidate: 0 },
        });
        if (!res.ok) status = 'error';
      } else if (provider === 'shopify') {
        const res = await fetch(`${integration.base_url}/admin/api/2024-04/shop.json`, {
          headers: { 'X-Shopify-Access-Token': integration.api_key || '' },
          next: { revalidate: 0 },
        });
        if (!res.ok) status = 'error';
      } else {
        // Telr / Tabby / Tamara: shallow GET on base_url
        const res = await fetch(integration.base_url, { method: 'GET', next: { revalidate: 0 } }).catch(() => null);
        if (!res || !res.ok) status = 'error';
      }
    } catch {
      status = 'error';
    }

    await supabase
      .from('org_integrations')
      .update({ status, last_sync_at: new Date().toISOString() })
      .eq('id', integration.id);

    return NextResponse.json({ mode: 'real', provider, status });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
