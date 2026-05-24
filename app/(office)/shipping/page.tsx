import { RoomStub } from '@/components/navigation/room-stub';

export default function ShippingPage() {
  return (
    <RoomStub
      title="Shipping"
      description="Three swimlanes — urgent today / KSA-GCC / exceptions. Courier sheets generated per swimlane. Proof-of-delivery uploads stored to drive_files. Today the dispatch view lives next to the order, not as its own board."
      shortcuts={[
        { label: 'Orders', href: '/orders', hint: 'Order queue with current status (paid, shipped, refund-pending).' },
        { label: 'WhatsApp Desk', href: '/whatsapp-desk', hint: 'Where the customer asks where their parcel is.' },
      ]}
    />
  );
}
