import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function CustomersPage() {
  return (
    <RoomWorkspace
      title="Customers"
      description="Unified customer memory across both stores, WhatsApp, wallet, ghost identity, objections, consent, VIP flags, and follow-up history."
      shortcuts={[
        { label: 'WhatsApp Desk → Customers', href: '/whatsapp-desk', hint: 'Click a customer row to open their chat and the full Customer 360 drawer.' },
        { label: 'Omnia AI → personal agent', href: '/omnia-ai', hint: 'Notes and tasks about specific customers route here.' },
      ]}
    />
  );
}
