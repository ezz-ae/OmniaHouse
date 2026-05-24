import { RoomStub } from '@/components/navigation/room-stub';

export default function BackyardPage() {
  return (
    <RoomStub
      title="Backyard"
      description="XP, levels, streaks per team member. Perks shelf (coupons, bonuses), required learning modules, food order bridge, wellbeing pulse (overtime + mood). BACKYARD_EVENT_DECISION decides which personal events go public; MILESTONE_ORCHESTRATOR tracks targets. The team_profiles SQL backs all of this."
      shortcuts={[
        { label: 'Omnia AI → Team agents', href: '/omnia-ai', hint: 'Each team member has their own agent showing their XP, skills, and current tasks.' },
      ]}
    />
  );
}
