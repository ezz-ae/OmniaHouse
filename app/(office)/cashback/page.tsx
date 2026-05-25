import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function CashbackPage() {
  return (
    <RoomWorkspace
      title="Cashback"
      description="Wallet control for earned credit, Limited Edition redemption, customer portal links, fraud holds, and refund-linked ledger rules."
      shortcuts={[
        { label: 'WhatsApp Desk → Customer drawer', href: '/whatsapp-desk', hint: 'Click "Customer" in any chat header to see their wallet balance, ledger, and block toggle.' },
      ]}
    />
  );
}
