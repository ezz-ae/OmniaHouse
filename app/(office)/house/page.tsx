import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Kpi } from '@/components/ui/kpi';
import { Card, CardHeader } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge, Dot } from '@/components/ui/badge';
import { StoreChip } from '@/components/ui/store-chip';
import { Button } from '@/components/ui/button';
import {
  getPulse,
  getRevenueSplit,
  getRecentActivity,
  getTopProducts,
  type RecentActivity,
  type TopProduct,
  type RevenueSplit,
} from '@/lib/mock/pulse';
import { getTasks } from '@/lib/mock/team';
import { formatAED, formatNumber, formatPct } from '@/lib/utils';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getSession } from '@/lib/session';

export default function HousePage() {
  const session = getSession();
  const pulse = getPulse();
  const split = getRevenueSplit();
  const activity = getRecentActivity();
  const products = getTopProducts();
  const tasks = getTasks().filter((t) => t.assigned_to.startsWith(session.user.name.split(' ')[0])).slice(0, 4);

  const greeting = greet();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${greeting}, ${session.user.name.split(' ')[0]}`}
        title="House"
        description="What is happening right now across both stores. Click any number to drill in."
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Sparkles className="w-3.5 h-3.5" /> Ask
            </Button>
            <Link href="/whatsapp-desk">
              <Button variant="primary" size="sm">
                Open WhatsApp Desk <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </>
        }
      />

      {/* Big numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Today"
          value={formatAED(pulse.revenue_today, { compact: true })}
          delta={pulse.revenue_delta_pct}
          hint="vs same time yesterday"
          size="lg"
        />
        <Kpi
          label="Month to date"
          value={formatAED(pulse.revenue_7d * 4.3, { compact: true })}
          delta={9.4}
          hint="on pace AED 3.1M"
          size="lg"
        />
        <Kpi
          label="WhatsApp drafts"
          value={`${pulse.draft_orders}`}
          hint={`${pulse.whatsapp_queue} unclaimed in queue`}
          size="lg"
        />
        <Kpi
          label="Issues"
          value={`${pulse.parity_drift + pulse.low_stock}`}
          hint={`${pulse.parity_drift} drift · ${pulse.low_stock} low stock`}
          size="lg"
        />
      </div>

      {/* Revenue split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {split.map((s) => (
          <Card key={s.store}>
            <div className="p-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="label">{s.store}</span>
                <StoreChip
                  store={
                    s.store === 'omniastores.ae'
                      ? 'shopify'
                      : s.store === 'omniastores.com'
                        ? 'woocommerce'
                        : 'whatsapp'
                  }
                />
              </div>
              <div className="font-serif text-2xl font-medium numeric">
                {formatAED(s.today, { compact: true })}
              </div>
              <div className="text-2xs text-ink-dim">
                MTD {formatAED(s.mtd, { compact: true })} · {s.share_pct.toFixed(1)}% of revenue
              </div>
              {/* Share bar */}
              <div className="h-1.5 mt-2 rounded-full bg-canvas-inset overflow-hidden">
                <div
                  className="h-full bg-gold/80"
                  style={{ width: `${s.share_pct}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Recent activity */}
        <div className="lg:col-span-3">
          <SectionHeader
            title="Live feed"
            hint="last 60 minutes"
            actions={
              <Button variant="ghost" size="sm">
                <Dot tone="good" pulse /> Live
              </Button>
            }
          />
          <Card>
            <ul className="divide-y divide-line-soft">
              {activity.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </ul>
          </Card>
        </div>

        {/* My tasks */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="On your plate"
            hint={`${tasks.length} open`}
            actions={
              <Link href="/co-tasking" className="text-2xs text-ink-dim hover:text-ink">
                view all →
              </Link>
            }
          />
          <Card>
            <ul className="divide-y divide-line-soft">
              {tasks.length === 0 ? (
                <li className="p-4 text-sm text-ink-dim">Nothing for you. Take the wins where you can.</li>
              ) : (
                tasks.map((t) => (
                  <li key={t.id} className="p-3 flex items-start gap-3 hover:bg-canvas-inset/40">
                    <input type="checkbox" className="mt-1 accent-gold" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1 text-2xs text-ink-dim">
                        <span>due {t.due}</span>
                        <span>·</span>
                        <Badge tone={t.priority === 'high' ? 'bad' : t.priority === 'med' ? 'warn' : 'neutral'}>
                          {t.priority}
                        </Badge>
                        <span>·</span>
                        <Link href={`/${t.room}`} className="hover:text-ink">
                          {t.room}
                        </Link>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>

      {/* Top products today */}
      <div>
        <SectionHeader
          title="Top movers today"
          actions={
            <Link href="/inventory" className="text-2xs text-ink-dim hover:text-ink">
              full catalogue →
            </Link>
          }
        />
        <DataTable<TopProduct>
          rows={products}
          columns={[
            {
              key: 'title',
              header: 'Product',
              cell: (p) => (
                <div className="flex items-center gap-2.5 min-w-0">
                  <StoreChip store={p.store} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    {p.variant && <div className="text-2xs text-ink-dim truncate">{p.variant}</div>}
                  </div>
                </div>
              ),
            },
            { key: 'sku', header: 'SKU', cell: (p) => <span className="font-mono text-2xs text-ink-dim">{p.sku}</span> },
            { key: 'units', header: 'Units', align: 'right', cell: (p) => formatNumber(p.units_today) },
            {
              key: 'revenue',
              header: 'Revenue',
              align: 'right',
              cell: (p) => <span className="text-ink">{formatAED(p.revenue_today)}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}

function ActivityRow({ a }: { a: RecentActivity }) {
  return (
    <li className="p-3 flex items-start gap-3 hover:bg-canvas-inset/40">
      <div className="w-12 text-2xs text-ink-dim numeric pt-0.5">{a.at}</div>
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-ink font-medium">{a.actor}</span>{' '}
        <span className="text-ink-muted">{a.action}</span>{' '}
        <span className={a.tone === 'gold' ? 'text-gold' : a.tone === 'bad' ? 'text-bad' : a.tone === 'warn' ? 'text-warn' : a.tone === 'good' ? 'text-good' : a.tone === 'info' ? 'text-info' : 'text-ink'}>
          {a.target}
        </span>
      </div>
    </li>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}
