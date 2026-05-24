import dynamic from 'next/dynamic';

/**
 * The Management Room is a heavy client component that instantiates Supabase
 * at module load. We wrap it with `next/dynamic` + `ssr: false` so prerender
 * doesn't crash when env vars are absent (early dev). Once Supabase is wired,
 * this stays as-is — the dynamic import just defers to the browser.
 */
const ManagementRoom = dynamic(() => import('./_client'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-sm text-ink-dim">Loading Management Room…</div>
  ),
});

export default function ManagementPage() {
  return <ManagementRoom />;
}
