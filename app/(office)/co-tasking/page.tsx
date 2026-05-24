import { RoomStub } from '@/components/navigation/room-stub';

export default function CoTaskingPage() {
  return (
    <RoomStub
      title="Co-Tasking"
      description="Help requests between team members, collaboration score, +50 XP bonus for the helper on completion. Backed by co_tasks SQL. The agentic-task layer (agentic_tasks) is already live in the Omnia AI Room — peer-to-peer help is the next pass."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Tasks routed by Omnia + cross-agent notes are the foundation this room builds on.' },
      ]}
    />
  );
}
