import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kpi } from '@/components/ui/kpi';
import { ShoppingBag, Globe, MessageSquare, Sparkles, Database, Plug, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The Management Room — integrations health & operational levers.
 *
 * The original ManagementRoom (645 lines, Supabase-backed) lives in git
 * history. This is the design-system-aligned version that boots without
 * any backend. Wire to Supabase per spec once Phase 2 is done.
 */

type Integration = {
  id: string;
  provider: string;
  name: string;
  category: 'storefront' | 'messaging' | 'ai' | 'analytics' | 'finance' | 'cms';
  status: 'healthy' | 'degraded' | 'down' | 'not_connected';
  last_sync: string;
  records_synced?: number;
  icon: React.ComponentType<{ className?: string }>;
  notes?: string;
};

const INTEGRATIONS: Integration[] = [
  { id: 'i1', provider: 'shopify', name: 'Shopify (omniastores.ae)', category: 'storefront', status: 'healthy', last_sync: '2 min ago', records_synced: 847, icon: ShoppingBag },
  { id: 'i2', provider: 'woocommerce', name: 'WooCommerce (omniastores.com)', category: 'storefront', status: 'healthy', last_sync: '2 min ago', records_synced: 612, icon: ShoppingBag },
  { id: 'i3', provider: 'whatsapp', name: 'WhatsApp Business · +971 56 547 8227', category: 'messaging', status: 'healthy', last_sync: 'live', icon: MessageSquare },
  { id: 'i4', provider: 'openai', name: 'OpenAI · GPT-4o', category: 'ai', status: 'healthy', last_sync: '< 1 sec', records_synced: 142, icon: Sparkles, notes: '142 extractions today' },
  { id: 'i5', provider: 'ga4', name: 'Google Analytics 4', category: 'analytics', status: 'healthy', last_sync: '4 min ago', icon: Globe },
  { id: 'i6', provider: 'hex', name: 'Hex.tech · Inventory parity', category: 'analytics', status: 'healthy', last_sync: '2 min ago', records_synced: 847, icon: Database },
  { id: 'i7', provider: 'meta', name: 'Meta Ads · Business Manager', category: 'analytics', status: 'degraded', last_sync: '24 min ago', icon: Globe, notes: 'Token refresh recommended' },
  { id: 'i8', provider: 'wordpress', name: 'WordPress (omnia-bridge.php)', category: 'cms', status: 'healthy', last_sync: '8 min ago', icon: Globe },
  { id: 'i9', provider: 'tamara', name: 'Tamara BNPL', category: 'finance', status: 'not_connected', last_sync: 'never', icon: Plug, notes: 'Awaiting onboarding decision' },
  { id: 'i10', provider: 'tabby', name: 'Tabby BNPL', category: 'finance', status: 'not_connected', last_sync: 'never', icon: Plug, notes: 'Awaiting onboarding decision' },
];

const CATEGORIES: { id: Integration['category']; label: string }[] = [
  { id: 'storefront', label: 'Storefronts' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'ai', label: 'AI' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'cms', label: 'CMS' },
  { id: 'finance', label: 'Finance' },
];

export default function ManagementPage() {
  const healthy = INTEGRATIONS.filter((i) => i.status === 'healthy').length;
  const degraded = INTEGRATIONS.filter((i) => i.status === 'degraded').length;
  const down = INTEGRATIONS.filter((i) => i.status === 'down').length;
  const notConnected = INTEGRATIONS.filter((i) => i.status === 'not_connected').length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admin"
        title="Management"
        description="Integration health, sync status, and the levers only owners pull."
        actions={
          <Button variant="subtle" size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Sync all
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Healthy" value={`${healthy}`} hint="syncing on schedule" />
        <Kpi label="Degraded" value={`${degraded}`} hint="needs attention" />
        <Kpi label="Down" value={`${down}`} hint="action required" />
        <Kpi label="Not connected" value={`${notConnected}`} hint="awaiting setup" />
      </div>

      {CATEGORIES.map((cat) => {
        const list = INTEGRATIONS.filter((i) => i.category === cat.id);
        if (!list.length) return null;
        return (
          <div key={cat.id}>
            <SectionHeader title={cat.label} hint={`${list.length} provider${list.length === 1 ? '' : 's'}`} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {list.map((i) => (
                <IntegrationCard key={i.id} i={i} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntegrationCard({ i }: { i: Integration }) {
  const Icon = i.icon;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded border shrink-0',
            i.status === 'healthy' && 'bg-good/10 border-good/30 text-good',
            i.status === 'degraded' && 'bg-warn/10 border-warn/30 text-warn',
            i.status === 'down' && 'bg-bad/10 border-bad/30 text-bad',
            i.status === 'not_connected' && 'bg-canvas-inset border-line text-ink-dim',
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm font-medium text-ink truncate">{i.name}</div>
            <StatusBadge status={i.status} />
          </div>
          <div className="text-2xs text-ink-dim">
            {i.last_sync === 'never' ? (
              <span>Not connected</span>
            ) : (
              <span>
                Last sync <span className="text-ink-muted numeric">{i.last_sync}</span>
                {i.records_synced !== undefined && (
                  <>
                    {' · '}
                    <span className="text-ink-muted numeric">{i.records_synced}</span> records
                  </>
                )}
              </span>
            )}
          </div>
          {i.notes && <div className="text-2xs text-warn mt-1.5">{i.notes}</div>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {i.status === 'not_connected' ? (
            <Button variant="primary" size="sm">
              <Plug className="w-3 h-3" /> Connect
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: Integration['status'] }) {
  const map: Record<Integration['status'], { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
    healthy: { label: 'healthy', tone: 'good' },
    degraded: { label: 'degraded', tone: 'warn' },
    down: { label: 'down', tone: 'bad' },
    not_connected: { label: 'idle', tone: 'neutral' },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
