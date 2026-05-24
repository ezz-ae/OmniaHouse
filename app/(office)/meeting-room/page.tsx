import { RoomStub } from '@/components/navigation/room-stub';

export default function MeetingRoomPage() {
  return (
    <RoomStub
      title="Meeting Room"
      description="Meeting transcripts captured, decisions extracted, follow-up tasks routed to Omnia AI. One meeting becomes: a summary, a list of decisions, and a set of agentic_tasks with assignees. Nothing said in a meeting is lost."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Where follow-up tasks land after a meeting.' },
        { label: 'Drive Room', href: '/drive-room', hint: 'Transcripts and recordings are stored here.' },
      ]}
    />
  );
}
