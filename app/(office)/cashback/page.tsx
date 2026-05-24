import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kpi } from '@/components/ui/kpi';
import { getWallets, getLimitedEditions } from '@/lib/mock/cashback';
import { formatAED, maskPhone } from '@/lib/utils';
import { Sparkles, Wallet as WalletIcon } from 'lucide-react';

export default function CashbackPage() {
  const wallets = getWallets();
  const les = getLimitedEditions();
  const totalBalance = wallets.reduce((s, w) => s + w.balance_aed, 0);
  const totalEarned = wallets.reduce((s, w) => s + w.earned_30d_aed, 0);
  const totalSpent = wallets.reduce((s, w) => s + w.spent_30d_aed, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Commerce"
        title="Cashback"
        description="Customer wallets, limited editions, the loyalty loop."
        actions={
          <Button variant="primary" size="sm">
            <Sparkles className="w-3.5 h-3.5" /> New LE
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Wallet balance" value={formatAED(totalBalance, { compact: true })} hint="all customers" />
        <Kpi label="Earned 30d" value={formatAED(totalEarned, { compact: true })} delta={14.2} />
        <Kpi label="Spent 30d" value={formatAED(totalSpent, { compact: true })} delta={-3.4} />
        <Kpi label="Live LEs" value={`${les.filter((l) => l.status === 'live').length}`} hint={`${les.filter((l) => l.status === 'coming_soon').length} coming soon`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wallets */}
        <div className="lg:col-span-2">
          <SectionHeader title="Top wallets" />
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-soft">
                  <th className="label px-3 py-2 text-left">Customer</th>
                  <th className="label px-3 py-2 text-right">Balance</th>
                  <th className="label px-3 py-2 text-right">Earned 30d</th>
                  <th className="label px-3 py-2 text-right">Spent 30d</th>
                  <th className="label px-3 py-2 text-right">Last</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.id} className="border-b border-line-soft last:border-b-0 hover:bg-canvas-inset/40">
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-ink">{w.customer}</div>
                      <div className="text-2xs text-ink-dim font-mono">{maskPhone(w.phone)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-gold numeric">{formatAED(w.balance_aed)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-good numeric">+{formatAED(w.earned_30d_aed)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-ink-muted numeric">
                      {w.spent_30d_aed ? `-${formatAED(w.spent_30d_aed)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-2xs text-ink-dim numeric">{w.last_activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Limited editions */}
        <div>
          <SectionHeader title="Limited editions" />
          <Card>
            <ul className="divide-y divide-line-soft">
              {les.map((le) => {
                const sold = le.total_units - le.remaining;
                const pct = (sold / le.total_units) * 100;
                return (
                  <li key={le.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{le.name}</div>
                        <div className="text-2xs text-ink-dim mt-0.5">
                          {formatAED(le.price_aed)} · launched {le.launched_at}
                        </div>
                      </div>
                      <LEBadge status={le.status} />
                    </div>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="font-serif text-base text-gold numeric">{sold}</span>
                      <span className="text-2xs text-ink-dim">/ {le.total_units} sold</span>
                    </div>
                    <div className="h-1 rounded-full bg-canvas-inset overflow-hidden">
                      <div className="h-full bg-gold/70" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LEBadge({ status }: { status: 'live' | 'coming_soon' | 'sold_out' | 'archived' }) {
  const map: Record<string, { label: string; tone: 'good' | 'gold' | 'bad' | 'neutral' }> = {
    live: { label: 'live', tone: 'good' },
    coming_soon: { label: 'soon', tone: 'gold' },
    sold_out: { label: 'sold out', tone: 'bad' },
    archived: { label: 'archived', tone: 'neutral' },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
