import { RoomStub } from '@/components/navigation/room-stub';

export default function FinancePage() {
  return (
    <RoomStub
      title="Finance"
      description="Settlements across both stores, daily reconciliation, BNPL accounting (Tamara, Tabby), refunds ledger. Reads from orders_unified and the wallet ledger. Today the cross-store totals live inside Management; this room will isolate the finance view from the operator switchboard."
      shortcuts={[
        { label: 'Management', href: '/management', hint: 'Today\'s switchboard. Cross-store draft orders and integration health.' },
        { label: 'Cashback', href: '/cashback', hint: 'Customer wallets and limited-edition redemption.' },
      ]}
    />
  );
}
