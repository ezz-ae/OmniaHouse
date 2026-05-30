import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/bridge/wordpress/drafts
 *
 * Calls the WordPress bridge plugin (omnia-bridge.php) via the configured
 * org_integrations row and returns pending product/post drafts.
 *
 * Mock mode (no Supabase): returns three synthetic drafts so the
 * Management Room renders without a connected backend.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: true,
      mode: 'mock',
      drafts: [
        { ID: 7701, post_title: 'Crescent Ring 925 — long-form story', post_type: 'post', post_status: 'draft', post_modified: '2026-05-23 14:12:00' },
        { ID: 7702, post_title: 'Moonstone Pendant (out of stock notice)', post_type: 'product', post_status: 'draft', post_modified: '2026-05-22 09:30:00' },
        { ID: 7703, post_title: 'Eid 2026 — landing page', post_type: 'post', post_status: 'draft', post_modified: '2026-05-20 16:45:00' },
      ],
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: integration } = await supabase
      .from('org_integrations')
      .select('base_url, api_secret')
      .eq('provider', 'woocommerce')
      .single();

    if (!integration || !integration.base_url) {
      return NextResponse.json({ error: 'WordPress bridge not configured' }, { status: 400 });
    }

    const response = await fetch(`${integration.base_url}/wp-json/omnia/v1/cms-bridge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Omnia-Secret': integration.api_secret || '',
      },
      body: JSON.stringify({ action: 'get_drafts' }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Bridge request failed');

    return NextResponse.json({ success: true, mode: 'real', ...data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
