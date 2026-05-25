import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function ReportsPage() {
  return (
    <RoomWorkspace
      title="Reports"
      description="Action-first reports for what is waiting, missing, stuck, ready, manager-needed, demanded, and financially exposed."
      shortcuts={[
        { label: 'Brand Intelligence', href: '/brand-intelligence', hint: 'Raw signal layer that feeds these reports.' },
        { label: 'Management', href: '/management', hint: 'Live cross-store state.' },
      ]}
    />
  );
}
