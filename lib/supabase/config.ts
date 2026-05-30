type SupabaseServerConfig = {
  url: string | undefined;
  key: string | undefined;
  configured: boolean;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  return {
    url,
    key,
    configured: Boolean(url && key),
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseServerConfig().configured;
}

export function requireSupabaseServerConfig() {
  const config = getSupabaseServerConfig();

  if (!config.url || !config.key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return {
    url: config.url,
    key: config.key,
  };
}
