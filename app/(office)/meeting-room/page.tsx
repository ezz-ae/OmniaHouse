import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function MeetingRoomPage() {
  return (
    <RoomWorkspace
      title="Meeting Room"
      description="Meeting capture room for recordings, summaries, decisions, follow-ups, owners, due dates, and Drive archive handoff."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Where follow-up tasks land after a meeting.' },
        { label: 'Drive Room', href: '/drive-room', hint: 'Transcripts and recordings are stored here.' },
      ]}
    />
  );
}
