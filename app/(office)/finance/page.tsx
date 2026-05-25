import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function FinancePage() {
  return (
    <RoomWorkspace
      title="Finance"
      description="Finance-only room for payment proof review, refunds, settlement matching, BNPL accounting, wallet ledger, and high-COD policy."
      shortcuts={[
        { label: 'Management', href: '/management', hint: 'Today\'s switchboard. Cross-store draft orders and integration health.' },
        { label: 'Cashback', href: '/cashback', hint: 'Customer wallets and limited-edition redemption.' },
      ]}
    />
  );
}
