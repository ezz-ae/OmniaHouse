import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function ShippingPage() {
  return (
    <RoomWorkspace
      title="Shipping"
      description="Dispatch board for urgent orders, GCC handoff, address completion, courier sheets, exceptions, and delivery proof."
      shortcuts={[
        { label: 'Orders', href: '/orders', hint: 'Order queue with current status (paid, shipped, refund-pending).' },
        { label: 'WhatsApp Desk', href: '/whatsapp-desk', hint: 'Where the customer asks where their parcel is.' },
      ]}
    />
  );
}
