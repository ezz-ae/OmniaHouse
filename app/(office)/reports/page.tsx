import { RoomStub } from '@/components/navigation/room-stub';

export default function ReportsPage() {
  return (
    <RoomStub
      title="Reports"
      description="Daily, weekly, and monthly summaries in plain language. Not a wall of charts — a short read of what happened, what changed, and what to watch next."
      shortcuts={[
        { label: 'Brand Intelligence', href: '/brand-intelligence', hint: 'Raw signal layer that feeds these reports.' },
        { label: 'Management', href: '/management', hint: 'Live cross-store state.' },
      ]}
    />
  );
}
