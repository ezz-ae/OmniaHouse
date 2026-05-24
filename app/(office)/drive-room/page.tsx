import { RoomStub } from '@/components/navigation/room-stub';

export default function DriveRoomPage() {
  return (
    <RoomStub
      title="Drive Room"
      description="The Safe. Files with three visibility levels (all, role, private) gated by RLS. Corridors — when a file lands here, it can be routed to the right room (Inventory for an invoice, Finance for a settlement) and the target room sees a pending handoff."
      shortcuts={[
        { label: 'Inventory', href: '/inventory', hint: 'Invoices and price-list PDFs flow here via Corridors.' },
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Files shared between agents live here.' },
      ]}
    />
  );
}
