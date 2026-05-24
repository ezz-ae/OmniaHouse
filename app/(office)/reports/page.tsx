import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getPulse, getRevenueSplit, getTopProducts, getRecentActivity, type RecentActivity, type TopProduct } from '@/lib/mock/pulse';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const pulse = getPulse();
  const split = getRevenueSplit();
  const top = getTopProducts();
  const activity = getRecentActivity();

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <BarChart3 className="w-3.5 h-3.5" />
            Reports
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Today, in one read</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            A short narrative of what happened, not a tile dashboard. Generated each morning, refreshed live during the day.
          </p>

          <Section title="Daily">
            <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-5 leading-relaxed text-sm text-zinc-300">
              The House closed yesterday at{' '}
              <strong className="text-zinc-100 tabular-nums">{pulse.revenue_today.toLocaleString()} AED</strong>{' '}
              ({pulse.revenue_delta_pct >= 0 ? '+' : ''}{pulse.revenue_delta_pct.toFixed(1)}% vs. last 7-day average). The WhatsApp Desk handled{' '}
              <strong className="text-zinc-100">{pulse.whatsapp_queue}</strong> open chats and pushed{' '}
              <strong className="text-zinc-100">{pulse.draft_orders}</strong> drafts to the stores.{' '}
              Inventory flagged <strong className="text-amber-400">{pulse.parity_drift}</strong> SKUs drifting between .ae and .com,
              and <strong className="text-amber-400">{pulse.low_stock}</strong> products are under the low-stock threshold.
              <br /><br />
              <span className="text-zinc-500">Updated {pulse.updated_at} ago.</span>
            </div>
          </Section>

          <Section title="Revenue split">
            <div className="grid grid-cols-3 gap-3">
              {split.map((row) => (
                <div key={row.store} className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
                  <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1 truncate">{row.store}</div>
                  <div className="text-base font-medium text-zinc-100 tabular-nums">{row.today.toLocaleString()}</div>
                  <div className="text-2xs text-zinc-500 mt-1">{row.share_pct}% of MTD</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Top products today">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {top.map((p) => <ProductRow key={p.id} p={p} />)}
            </div>
          </Section>

          <Section title="Recent activity">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {activity.map((a) => <ActivityRow key={a.id} a={a} />)}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-3">{title}</div>
      {children}
    </section>
  );
}

function ProductRow({ p }: { p: TopProduct }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 truncate">
          {p.title}{p.variant ? <span className="text-zinc-500"> · {p.variant}</span> : ''}
        </div>
        <div className="text-2xs font-mono text-zinc-500">{p.sku} · {p.store}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm text-zinc-100 tabular-nums">{p.units_today} units</div>
        <div className="text-2xs text-emerald-400 tabular-nums">{p.revenue_today.toLocaleString()} AED</div>
      </div>
    </div>
  );
}

function ActivityRow({ a }: { a: RecentActivity }) {
  const toneMap: Record<NonNullable<RecentActivity['tone']>, string> = {
    good: 'bg-emerald-400',
    warn: 'bg-amber-400',
    bad:  'bg-rose-400',
    gold: 'bg-amber-300',
    info: 'bg-blue-400',
  };
  return (
    <div className="px-4 py-2.5 flex items-start gap-3">
      <span className={`w-1 h-1 rounded-full mt-2 shrink-0 ${a.tone ? toneMap[a.tone] : 'bg-zinc-600'}`} />
      <div className="text-2xs font-mono text-zinc-500 w-12 shrink-0 mt-0.5">{a.at}</div>
      <div className="flex-1 min-w-0 text-xs text-zinc-300 leading-snug">
        <span className="text-zinc-100">{a.actor}</span> {a.action} <span className="text-zinc-500">{a.target}</span>
      </div>
    </div>
  );
}
