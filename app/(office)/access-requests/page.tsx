import { RoomStub } from '@/components/navigation/room-stub';

export default function AccessRequestsPage() {
  return (
    <RoomStub
      title="Access Requests"
      description="Pending team approvals. Decisions are logged to audit_logs. Current pending: Mohamed (WhatsApp agent), Hassan Al-Marri (finance role)."
      shortcuts={[
        { label: 'Settings', href: '/settings', hint: 'For per-user role changes once they\'re in the team.' },
      ]}
    />
  );
}
