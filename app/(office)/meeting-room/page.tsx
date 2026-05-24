import { RoomStub } from '@/components/navigation/room-stub';

export default function MeetingRoomPage() {
  return (
    <RoomStub
      title="Meeting Room"
      description="Meetings are recorded, summarised, and turned into a short list of decisions plus the follow-ups each person owes. Nothing said is lost."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Where follow-up tasks land after a meeting.' },
        { label: 'Drive Room', href: '/drive-room', hint: 'Transcripts and recordings are stored here.' },
      ]}
    />
  );
}
