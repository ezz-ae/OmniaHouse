'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getDraftOrders, type DraftOrder } from '@/lib/mock/orders';
import { ShoppingBag, AlertTriangle, ArrowUpRight } from 'lucide-react';

type Filter = 'all' | DraftOrder['status'];

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'invoice_sent', label: 'Invoice sent' },
  { id: 'paid', label: 'Paid' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'refund_pending', label: 'Refunds' },
];

export default function OrdersPage() {
  const all = useMemo(() => getDraftOrders(), []);
  const [filter, setFilter] = useState<Filter>('all');

  const rows = filter === 'all' ? all : all.filter((o) => o.status === filter);

  const totals = useMemo(() => {
    const value = all.reduce((sum, o) => sum + o.total_aed, 0);
    const flagged = all.filter((o) => o.status === 'flagged').length;
    const refunds = all.filter((o) => o.status === 'refund_pending').length;
    return { value, flagged, refunds };
  }, [all]);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <ShoppingBag className="w-3.5 h-3.5" />
            Orders
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Cross-channel queue</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Drafts from the WhatsApp Desk, paid orders from Shopify and WooCommerce, and refund-pending tickets — one queue.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="In flight" value={String(all.length)} />
            <Stat label="Pipeline value" value={`${totals.value.toLocaleString()} AED`} />
            <Stat label="Needs attention" value={String(totals.flagged + totals.refunds)} tone={totals.flagged + totals.refunds > 0 ? 'warn' : undefined} />
          </div>

          <div className="flex gap-1 mb-3 overflow-x-auto -mx-1 px-1 pb-1">
            {FILTERS.map((f) => {
              const count = f.id === 'all' ? all.length : all.filter((o) => o.status === f.id).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 h-8 px-3 rounded-md text-xs whitespace-nowrap transition-colors ${
                    filter === f.id
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  {f.label} <span className="text-zinc-600 ml-1">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-zinc-500">No orders match this filter.</div>
            ) : rows.map((o) => (
              <div key={o.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors">
                <div className="text-sm font-mono text-zinc-300 w-16 shrink-0">{o.number}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-100 truncate">{o.customer.name}</div>
                  <div className="text-2xs text-zinc-500 truncate flex items-center gap-1.5 flex-wrap">
                    <StoreBadge store={o.store} />
                    <span>· {o.items} item{o.items !== 1 ? 's' : ''}</span>
                    {o.agent && <span>· {o.agent}</span>}
                    {o.flags && o.flags.map((f) => (
                      <span key={f} className="inline-flex items-center gap-0.5 text-amber-400">
                        <AlertTriangle className="w-2.5 h-2.5" /> {f.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-zinc-100 tabular-nums hidden sm:block">{o.total_aed.toLocaleString()} AED</div>
                <StatusPill status={o.status} />
                <span className="text-2xs text-zinc-500 hidden md:block w-12 text-right">{o.created_at}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Drafts originate in the WhatsApp Desk and push to the store from there.</span>
            <Link href="/whatsapp-desk" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 shrink-0 ml-3">
              Open Desk <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'good' }) {
  const toneClass = tone === 'warn' ? 'text-amber-400' : tone === 'good' ? 'text-emerald-400' : 'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function StoreBadge({ store }: { store: DraftOrder['store'] }) {
  const map: Record<DraftOrder['store'], { label: string; cls: string }> = {
    shopify:     { label: 'Shopify',     cls: 'text-emerald-300' },
    woocommerce: { label: 'WooCommerce', cls: 'text-blue-300' },
    whatsapp:    { label: 'WhatsApp',    cls: 'text-amber-300' },
  };
  const v = map[store];
  return <span className={v.cls}>{v.label}</span>;
}

function StatusPill({ status }: { status: DraftOrder['status'] }) {
  const map: Record<DraftOrder['status'], string> = {
    draft:           'bg-zinc-800 text-zinc-300 border-zinc-700',
    invoice_sent:    'bg-blue-500/10 text-blue-300 border-blue-500/30',
    paid:            'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    shipped:         'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    completed:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    flagged:         'bg-amber-500/10 text-amber-300 border-amber-500/30',
    refund_pending:  'bg-rose-500/10 text-rose-300 border-rose-500/30',
  };
  return (
    <span className={`text-2xs uppercase tracking-wider px-2 py-0.5 rounded border ${map[status]} shrink-0`}>
      {status.replace('_', ' ')}
    </span>
  );
}
