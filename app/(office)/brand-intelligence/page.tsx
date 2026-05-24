import { RoomStub } from '@/components/navigation/room-stub';

export default function BrandIntelligencePage() {
  return (
    <RoomStub
      title="Brand Intelligence"
      description="Meta Sentinel (attack detection over ad comments), Behavioral Intelligence (Window Shoppers, Abandoned Luxury, fraud patterns), Ghost Heatmap fed by crm_identity_links, and the brand_intelligence memory feed. The 17 AI prompts that power this room are in prompts/raw-prompts.txt."
      shortcuts={[
        { label: 'Omnia AI', href: '/omnia-ai', hint: 'Ask Omnia for cross-room intelligence today; the dedicated room comes next.' },
        { label: 'Inventory Showroom', href: '/inventory', hint: 'Inventory Strategist runs INVENTORY_STRATEGY_PROMPT against live data — same family of intelligence.' },
      ]}
    />
  );
}
