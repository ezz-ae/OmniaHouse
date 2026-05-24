import { RoomStub } from '@/components/navigation/room-stub';

export default function CoTaskingPage() {
  return (
    <RoomStub
      title="Co-Tasking"
      description="When someone needs help, they post it here. Whoever picks it up gets credit. Builds the habit of helping each other instead of going to one person every time."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Talk to a teammate\'s assistant first if the request can be answered without their full attention.' },
      ]}
    />
  );
}
