import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function AccessRequestsPage() {
  return (
    <RoomWorkspace
      title="Access Requests"
      description="Owner approval surface for team invites, room access, action-level permissions, sensitive scopes, and audit-backed role decisions."
      shortcuts={[
        { label: 'Settings', href: '/settings', hint: 'For per-user role changes once they\'re in the team.' },
      ]}
    />
  );
}
