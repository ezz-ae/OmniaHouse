import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function CoTaskingPage() {
  return (
    <RoomWorkspace
      title="Co-Tasking"
      description="Shared help board for requests, claims, blocked work, helper credit, collaboration score, and permission-aware routing."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Talk to a teammate\'s assistant first if the request can be answered without their full attention.' },
      ]}
    />
  );
}
