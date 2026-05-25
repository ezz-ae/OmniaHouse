import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function BackyardPage() {
  return (
    <RoomWorkspace
      title="Backyard"
      description="Team pulse room for XP, perks, milestones, learning, wellbeing, workload balance, and privacy-safe recognition."
      shortcuts={[
        { label: 'Omnia AI → Team agents', href: '/omnia-ai', hint: 'Each team member has their own agent showing their XP, skills, and current tasks.' },
      ]}
    />
  );
}
