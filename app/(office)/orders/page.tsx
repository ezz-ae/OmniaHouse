import { RoomStub } from '@/components/navigation/room-stub';

export default function OrdersPage() {
  return (
    <RoomStub
      title="Orders"
      description="Unified queue from orders_unified across Shopify, WooCommerce, and WhatsApp drafts. Five filters (source, state, risk, time, mine/team/all). Keyboard shortcuts: / Enter S W ?. Today drafts created from WhatsApp live in the WhatsApp Desk's Drafts section; the consolidated cross-channel queue is the next pass."
      shortcuts={[
        { label: 'WhatsApp Desk → My drafts', href: '/whatsapp-desk', hint: 'WhatsApp-originated drafts, with push to .ae or .com.' },
        { label: 'Management Room', href: '/management', hint: 'Shopify draft order CRUD lives here (your original code).' },
      ]}
    />
  );
}
