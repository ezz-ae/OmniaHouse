import { RoomWorkspace } from '@/components/navigation/room-workspace';

export default function BrandIntelligencePage() {
  return (
    <RoomWorkspace
      title="Brand Intelligence"
      description="Signal room for Meta Sentinel, behavior intelligence, ghost heatmap, campaign risk, objections, demand, and content handoff."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Ask Omnia for cross-room intelligence and route approved actions.' },
        { label: 'Inventory Showroom', href: '/inventory', hint: 'Inventory Strategist runs INVENTORY_STRATEGY_PROMPT against live data — same family of intelligence.' },
      ]}
    />
  );
}
