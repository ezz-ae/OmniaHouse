import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreChip } from '@/components/ui/store-chip';
import { Kpi } from '@/components/ui/kpi';
import { getCustomers, type Customer } from '@/lib/mock/customers';
import { formatAED, maskPhone } from '@/lib/utils';
import { UserPlus, Download } from 'lucide-react';

export default function CustomersPage() {
  const customers = getCustomers();
  const vips = customers.filter((c) => c.segment === 'vip').length;
  const atRisk = customers.filter((c) => c.segment === 'at_risk').length;
  const totalLtv = customers.reduce((s, c) => s + c.ltv_aed, 0);
  const walletTotal = customers.reduce((s, c) => s + c.wallet_balance_aed, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="People"
        title="Customers"
        description="Unified profiles across all three sales channels. One customer, one record."
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="primary" size="sm">
              <UserPlus className="w-3.5 h-3.5" /> Add customer
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total" value={`${customers.length}`} hint="shown · 5,247 in DB" />
        <Kpi label="VIPs" value={`${vips}`} hint="LTV ≥ AED 30K" />
        <Kpi label="At risk" value={`${atRisk}`} hint="no orders 60+ days" />
        <Kpi label="In wallets" value={formatAED(walletTotal)} />
      </div>

      <div>
        <SectionHeader title="All customers" hint={`combined LTV ${formatAED(totalLtv, { compact: true })}`} />
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-soft">
                <th className="label px-3 py-2 text-left">Customer</th>
                <th className="label px-3 py-2 text-left">Segment</th>
                <th className="label px-3 py-2 text-left">Channels</th>
                <th className="label px-3 py-2 text-right">Orders</th>
                <th className="label px-3 py-2 text-right">LTV</th>
                <th className="label px-3 py-2 text-right">Wallet</th>
                <th className="label px-3 py-2 text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <CustomerRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function CustomerRow({ c }: { c: Customer }) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-canvas-inset/40">
      <td className="px-3 py-2.5">
        <div className="text-sm text-ink font-medium">{c.name}</div>
        <div className="text-2xs text-ink-dim font-mono">{maskPhone(c.phone)} · {c.city}</div>
      </td>
      <td className="px-3 py-2.5">
        <SegmentBadge segment={c.segment} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          {c.stores.map((s) => (
            <StoreChip key={s} store={s} />
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right text-sm numeric">{c.orders}</td>
      <td className="px-3 py-2.5 text-right text-sm text-gold numeric">{formatAED(c.ltv_aed)}</td>
      <td className="px-3 py-2.5 text-right text-sm numeric">
        {c.wallet_balance_aed ? formatAED(c.wallet_balance_aed) : <span className="text-ink-faint">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right text-2xs text-ink-dim numeric">{c.last_at}</td>
    </tr>
  );
}

function SegmentBadge({ segment }: { segment: Customer['segment'] }) {
  const map: Record<Customer['segment'], { label: string; tone: 'gold' | 'good' | 'info' | 'warn' }> = {
    vip: { label: 'VIP', tone: 'gold' },
    repeat: { label: 'repeat', tone: 'good' },
    new: { label: 'new', tone: 'info' },
    at_risk: { label: 'at risk', tone: 'warn' },
  };
  const { label, tone } = map[segment];
  return <Badge tone={tone}>{label}</Badge>;
}
