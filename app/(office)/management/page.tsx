import dynamic from 'next/dynamic';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { RoomWorkspace } from '@/components/navigation/room-workspace';

/**
 * Management Room.
 *
 * The full Supabase-backed switchboard is in `_client.tsx`. It boots the
 * Supabase client at module load. When the env vars are absent, we render
 * the same complete operating-room surface with local deterministic state
 * so the route remains usable.
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
    return (
      <RoomWorkspace
        title="Management"
        description="Owner switchboard for integrations, cross-store draft order state, CRM sync, wallet exposure, operational risk, and audit decisions."
        shortcuts={[
          { label: 'Orders', href: '/orders', hint: 'Approved drafts, blocked submissions, and store push queue.' },
          { label: 'Access Requests', href: '/access-requests', hint: 'Role and permission decisions that need owner review.' },
          { label: 'Reports', href: '/reports', hint: 'Daily owner readout generated from room queues.' },
        ]}
      />
    );
  }
  return <ManagementRoom />;
}
