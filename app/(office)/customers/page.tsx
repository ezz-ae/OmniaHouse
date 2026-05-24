import { RoomStub } from '@/components/navigation/room-stub';

export default function CustomersPage() {
  return (
    <RoomStub
      title="Customers"
      description="Unified customer profiles across both stores, ghost identity linking from crm_identity_links, lifetime value, wallet balance, blocked-list management, and segment filters. Today the customer view lives inside the WhatsApp Desk."
      shortcuts={[
        { label: 'WhatsApp Desk → Customers', href: '/whatsapp-desk', hint: 'Click a customer row to open their chat and the full Customer 360 drawer.' },
        { label: 'Omnia AI → personal agent', href: '/omnia-ai', hint: 'Notes and tasks about specific customers route here.' },
      ]}
    />
  );
}
