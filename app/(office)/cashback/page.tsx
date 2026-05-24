import { RoomStub } from '@/components/navigation/room-stub';

export default function CashbackPage() {
  return (
    <RoomStub
      title="Cashback"
      description="Customer wallets restricted to Limited Editions, transaction ledger, public customer portal at /portal/[slug] for wallet self-service, and the auto-block flow when fraud risk crosses threshold. Wallet balances are visible per customer inside the WhatsApp Desk drawer."
      shortcuts={[
        { label: 'WhatsApp Desk → Customer drawer', href: '/whatsapp-desk', hint: 'Click "Customer" in any chat header to see their wallet balance, ledger, and block toggle.' },
      ]}
    />
  );
}
