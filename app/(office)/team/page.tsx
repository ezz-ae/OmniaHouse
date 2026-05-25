import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function TeamPage() {
  return (
    <RoomWorkspace
      title="Team"
      description="People and capacity room for live load, skills, work ownership, blocked handoffs, collaboration, and assistant routing."
      shortcuts={[
        { label: 'Co-Tasking', href: '/co-tasking', hint: 'Open help requests and collaboration handoffs.' },
        { label: 'Backyard', href: '/backyard', hint: 'XP, wellbeing, perks, and privacy-safe recognition.' },
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Talk to Omnia AI and teammate assistants.' },
      ]}
    />
  );
}
