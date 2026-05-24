import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getPulse, getRevenueSplit } from '@/lib/mock/pulse';
import { getDraftOrders } from '@/lib/mock/orders';
import { DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function FinancePage() {
  const pulse = getPulse();
  const split = getRevenueSplit();
  const orders = getDraftOrders();

  const refunds = orders.filter((o) => o.status === 'refund_pending');
  const bnplOrders = orders.filter((o) => o.total_aed >= 1500 && (o.store === 'shopify' || o.store === 'woocommerce'));

  const settled = orders
    .filter((o) => o.status === 'paid' || o.status === 'shipped' || o.status === 'completed')
    .reduce((s, o) => s + o.total_aed, 0);

  const inFlight = orders
    .filter((o) => o.status === 'draft' || o.status === 'invoice_sent')
    .reduce((s, o) => s + o.total_aed, 0);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <DollarSign className="w-3.5 h-3.5" />
            Finance
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Today, by store</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Cross-store settlement, BNPL accounting (Tamara, Tabby), and refund ledger. Reads from orders_unified and the wallet ledger.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Stat label="Revenue today" value={`${pulse.revenue_today.toLocaleString()} AED`} delta={pulse.revenue_delta_pct} />
            <Stat label="7-day revenue" value={`${(pulse.revenue_7d / 1000).toFixed(0)}K AED`} delta={pulse.revenue_7d_delta_pct} />
            <Stat label="Settled" value={`${settled.toLocaleString()} AED`} />
            <Stat label="In flight" value={`${inFlight.toLocaleString()} AED`} />
          </div>

          <Section title="Revenue split">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {split.map((row) => (
                <div key={row.store} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-zinc-100">{row.store}</div>
                    <div className="text-sm text-zinc-100 tabular-nums">{row.today.toLocaleString()} AED <span className="text-zinc-500 text-xs">today</span></div>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/60" style={{ width: `${row.share_pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-2xs text-zinc-500">
                    <span>{row.share_pct.toFixed(1)}% of MTD</span>
                    <span className="font-mono">{(row.mtd / 1000).toFixed(0)}K AED MTD</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="BNPL · Tamara · Tabby">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BnplCard provider="Tamara" rate="15%" terms="30 days" volume={bnplOrders.length} valueAed={bnplOrders.reduce((s,o)=>s+o.total_aed,0) / 2} />
              <BnplCard provider="Tabby" rate="12%" terms="14 days" volume={bnplOrders.length - 1} valueAed={bnplOrders.reduce((s,o)=>s+o.total_aed,0) / 3} />
            </div>
            <div className="text-2xs text-zinc-500 mt-2">
              Splits are estimated until the gateway accounting feed lands.
            </div>
          </Section>

          <Section title="Refund ledger">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {refunds.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-500">No pending refunds.</div>
              ) : refunds.map((o) => (
                <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="text-sm font-mono text-zinc-300 w-16 shrink-0">{o.number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{o.customer.name}</div>
                    <div className="text-2xs text-zinc-500 truncate">{o.store} · since {o.created_at}</div>
                  </div>
                  <div className="text-sm text-zinc-100 tabular-nums">{o.total_aed.toLocaleString()} AED</div>
                  <span className="text-2xs uppercase tracking-wider px-2 py-0.5 rounded border bg-rose-500/10 text-rose-300 border-rose-500/30 shrink-0">
                    Pending
                  </span>
                </div>
              ))}
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

function Stat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className="text-base font-medium text-zinc-100 tabular-nums">{value}</div>
      {typeof delta === 'number' && (
        <div className={`text-2xs mt-1 flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function BnplCard({
  provider, rate, terms, volume, valueAed,
}: { provider: string; rate: string; terms: string; volume: number; valueAed: number }) {
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-zinc-100">{provider}</div>
        <div className="text-2xs uppercase tracking-wider text-zinc-500">{rate} fee · {terms}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-0.5">This month</div>
          <div className="text-sm text-zinc-100 tabular-nums">{volume} orders</div>
        </div>
        <div>
          <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-0.5">Settled value</div>
          <div className="text-sm text-zinc-100 tabular-nums">{Math.round(valueAed).toLocaleString()} AED</div>
        </div>
      </div>
    </div>
  );
}
