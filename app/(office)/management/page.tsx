import dynamic from 'next/dynamic';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { Building2 } from 'lucide-react';

/**
 * Management Room.
 *
 * The full Supabase-backed switchboard is in `_client.tsx`. It boots the
 * Supabase client at module load. When the env vars are absent, we render
 * an honest placeholder explaining what this room does and where the data
 * comes from — never a blank page or a runtime crash.
 *
 * When NEXT_PUBLIC_SUPABASE_URL is set, we hand off to the real client.
 */
const ManagementRoom = dynamic(() => import('./_client'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-zinc-900 text-zinc-100 flex flex-col">
      <DeskTopBar />
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
        Loading Management Room…
      </div>
    </div>
  ),
});

export default function ManagementPage() {
  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseConfigured) {
    return <ManagementPlaceholder />;
  }
  return <ManagementRoom />;
}

function ManagementPlaceholder() {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-16">
          <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-zinc-500">
            <Building2 className="w-3.5 h-3.5" />
            Management — awaiting connection
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 mb-3">Switchboard</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Management is the operator&apos;s switchboard. It reads the live integrations table
            (Shopify, WooCommerce, WhatsApp, Tamara, Tabby) and writes back through the same
            endpoints. Draft orders cross-store, customer sync, wallet balance, integration
            health — all in one place.
          </p>
          <div className="border border-zinc-800 rounded-md p-4 bg-zinc-900/60">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Connection required</div>
            <div className="text-sm text-zinc-300 leading-relaxed mb-3">
              This room needs the Supabase keys to come alive. Once configured, the same page
              wakes up and reads from <code className="px-1 py-0.5 rounded bg-zinc-800 text-emerald-300 text-2xs">org_integrations</code>.
            </div>
            <div className="text-2xs text-zinc-500 font-mono">
              NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
