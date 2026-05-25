import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function OrdersPage() {
  return (
    <RoomWorkspace
      title="Orders"
      description="Unified queue for WhatsApp submissions, Shopify drafts, WooCommerce orders, approvals, payment flags, and shipping handoff."
      shortcuts={[
        { label: 'WhatsApp Desk → My drafts', href: '/whatsapp-desk', hint: 'WhatsApp-originated drafts, with push to .ae or .com.' },
        { label: 'Management Room', href: '/management', hint: 'Shopify draft order CRUD lives here (your original code).' },
      ]}
    />
  );
}
