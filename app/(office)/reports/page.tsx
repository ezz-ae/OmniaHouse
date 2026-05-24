import { RoomStub } from '@/components/navigation/room-stub';

export default function ReportsPage() {
  return (
    <RoomStub
      title="Reports"
      description="Daily, weekly, and monthly summaries in plain language. Generated from orders_unified + ga_events + agentic_tasks. Not a dashboard of tiles — a short, readable narrative of what happened and what changed."
      shortcuts={[
        { label: 'Brand Intelligence', href: '/brand-intelligence', hint: 'Raw signal layer that feeds these reports.' },
        { label: 'Management', href: '/management', hint: 'Live cross-store state.' },
      ]}
    />
  );
}
