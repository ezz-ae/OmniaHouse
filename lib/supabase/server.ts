import { createServerClient } from '@supabase/ssr';
import { createClient as createPlainClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { requireSupabaseServerConfig } from './config';

export async function createClient() {
  const { url, key } = requireSupabaseServerConfig();
  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot write cookies; middleware handles refreshes.
          }
        });
      },
    },
  });
}

// Service-role client for routes that run without an authed user
// (webhooks, background jobs). NEVER expose this client to the browser
// — it bypasses every RLS policy.
let _serviceClient: SupabaseClient | null = null;
export function createServiceClient(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) return null;
  _serviceClient = createPlainClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}
