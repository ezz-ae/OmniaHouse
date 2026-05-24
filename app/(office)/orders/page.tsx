import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreChip } from '@/components/ui/store-chip';
import { Kpi } from '@/components/ui/kpi';
import { getDraftOrders, type DraftOrder } from '@/lib/mock/orders';
import { formatAED, maskPhone } from '@/lib/utils';
import { Plus, AlertTriangle } from 'lucide-react';

export default function OrdersPage() {
  const orders = getDraftOrders();
  const flagged = orders.filter((o) => o.flags?.length);

  const sumToday = orders.reduce((s, o) => s + o.total_aed, 0);
  const completed = orders.filter((o) => o.status === 'completed' || o.status === 'paid').length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Every draft, paid, shipped, and flagged order — across all three sales channels."
        actions={
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" /> New draft
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Today" value={`${orders.length}`} hint="cross-channel" />
        <Kpi label="Revenue" value={formatAED(sumToday, { compact: true })} />
        <Kpi label="Completed" value={`${completed}`} hint={`${Math.round((completed / orders.length) * 100)}% close rate`} />
        <Kpi label="Flagged" value={`${flagged.length}`} hint="needs review" />
      </div>

      {flagged.length > 0 && (
        <Card className="p-4 border-bad/30 bg-bad/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-bad mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink">
                {flagged.length} order{flagged.length === 1 ? '' : 's'} need your attention
              </div>
              <div className="text-2xs text-ink-dim mt-0.5">
                Hard rules tripped: COD over threshold, ring without size, refund requests.
              </div>
            </div>
            <Button variant="danger" size="sm">Review</Button>
          </div>
        </Card>
      )}

      <div>
        <SectionHeader title="All orders today" hint={`${orders.length} total`} />
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-soft">
                <th className="label px-3 py-2 text-left">#</th>
                <th className="label px-3 py-2 text-left">Customer</th>
                <th className="label px-3 py-2 text-left">Channel</th>
                <th className="label px-3 py-2 text-right">Items</th>
                <th className="label px-3 py-2 text-right">Total</th>
                <th className="label px-3 py-2 text-left">Status</th>
                <th className="label px-3 py-2 text-left">Agent</th>
                <th className="label px-3 py-2 text-right">At</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <OrderRow key={o.id} o={o} />
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function OrderRow({ o }: { o: DraftOrder }) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-canvas-inset/40">
      <td className="px-3 py-2.5 font-mono text-xs text-gold">{o.number}</td>
      <td className="px-3 py-2.5">
        <div className="text-sm text-ink">{o.customer.name}</div>
        <div className="text-2xs text-ink-dim font-mono">{maskPhone(o.customer.phone)}</div>
      </td>
      <td className="px-3 py-2.5">
        <StoreChip store={o.store} />
      </td>
      <td className="px-3 py-2.5 text-right text-sm numeric">{o.items}</td>
      <td className="px-3 py-2.5 text-right text-sm numeric text-ink">{formatAED(o.total_aed)}</td>
      <td className="px-3 py-2.5">
        <StatusBadge status={o.status} />
        {o.flags && o.flags.length > 0 && (
          <div className="mt-1 flex gap-1 flex-wrap">
            {o.flags.map((f) => (
              <Badge key={f} tone="bad">{f.replace('_', ' ')}</Badge>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-muted">{o.agent || <span className="text-ink-faint">—</span>}</td>
      <td className="px-3 py-2.5 text-right text-2xs text-ink-dim numeric">{o.created_at}</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: DraftOrder['status'] }) {
  const map: Record<DraftOrder['status'], { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'gold' }> = {
    draft: { label: 'draft', tone: 'gold' },
    invoice_sent: { label: 'invoice sent', tone: 'info' },
    paid: { label: 'paid', tone: 'good' },
    shipped: { label: 'shipped', tone: 'good' },
    completed: { label: 'completed', tone: 'good' },
    flagged: { label: 'flagged', tone: 'bad' },
    refund_pending: { label: 'refund pending', tone: 'warn' },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
