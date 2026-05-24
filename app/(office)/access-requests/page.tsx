import { RoomStub } from '@/components/navigation/room-stub';

export default function AccessRequestsPage() {
  return (
    <RoomStub
      title="Access Requests"
      description="Pending team approvals. Owner-only. Decisions logged to audit_logs. Two pending requests from the seed data: Sara Khalil (new WhatsApp agent), Hassan Al-Marri (finance role)."
      shortcuts={[
        { label: 'Settings', href: '/settings', hint: 'For per-user role changes once they\'re in the team.' },
      ]}
    />
  );
}
