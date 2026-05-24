'use client';

import { useMemo, useState } from 'react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getCustomers, type Customer } from '@/lib/mock/customers';
import { Users, Search } from 'lucide-react';

type Segment = 'all' | Customer['segment'];

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'vip', label: 'VIP' },
  { id: 'repeat', label: 'Repeat' },
  { id: 'new', label: 'New' },
  { id: 'at_risk', label: 'At risk' },
];

export default function CustomersPage() {
  const all = useMemo(() => getCustomers(), []);
  const [segment, setSegment] = useState<Segment>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let rows = segment === 'all' ? all : all.filter((c) => c.segment === segment);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [all, segment, query]);

  const ltv = useMemo(() => all.reduce((sum, c) => sum + c.ltv_aed, 0), [all]);
  const wallet = useMemo(() => all.reduce((sum, c) => sum + c.wallet_balance_aed, 0), [all]);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <Users className="w-3.5 h-3.5" />
            Customers
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Unified profiles</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Cross-store identity, lifetime value, wallet balance, segment. Ghost links from crm_identity_links join .ae, .com, and WhatsApp into one record.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Profiles" value={String(all.length)} />
            <Stat label="Total LTV" value={`${(ltv / 1000).toFixed(1)}K AED`} />
            <Stat label="Wallet pool" value={`${wallet.toLocaleString()} AED`} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone, or city…"
                className="w-full h-8 pl-9 pr-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 outline-none focus:border-zinc-700"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0">
              {SEGMENTS.map((s) => {
                const count = s.id === 'all' ? all.length : all.filter((c) => c.segment === s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSegment(s.id)}
                    className={`shrink-0 h-8 px-3 rounded-md text-xs whitespace-nowrap transition-colors ${
                      segment === s.id
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                    }`}
                  >
                    {s.label} <span className="text-zinc-600 ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-zinc-500">No customers match.</div>
            ) : filtered.map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors">
                <SegmentDot segment={c.segment} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-100 truncate">{c.name}</div>
                  <div className="text-2xs text-zinc-500 truncate font-mono">
                    {maskPhone(c.phone)} · {c.city}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {c.stores.map((s) => (
                    <StoreChip key={s} store={s} />
                  ))}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm text-zinc-100 tabular-nums">{c.ltv_aed.toLocaleString()}</div>
                  <div className="text-2xs text-zinc-500 uppercase tracking-wider">LTV · {c.orders} orders</div>
                </div>
                {c.wallet_balance_aed > 0 && (
                  <div className="hidden md:block text-2xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                    {c.wallet_balance_aed} wallet
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 text-2xs text-zinc-500">
            Phone numbers masked in logs. Full numbers visible only inside an open chat.
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className="text-base font-medium text-zinc-100 tabular-nums">{value}</div>
    </div>
  );
}

function SegmentDot({ segment }: { segment: Customer['segment'] }) {
  const map: Record<Customer['segment'], string> = {
    vip:     'bg-amber-400',
    repeat:  'bg-emerald-400',
    new:     'bg-blue-400',
    at_risk: 'bg-rose-400',
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${map[segment]}`} title={segment} />;
}

function StoreChip({ store }: { store: 'shopify' | 'woocommerce' | 'whatsapp' }) {
  const map: Record<typeof store, string> = {
    shopify:     'text-emerald-300 border-emerald-500/30',
    woocommerce: 'text-blue-300 border-blue-500/30',
    whatsapp:    'text-amber-300 border-amber-500/30',
  };
  const label = store === 'whatsapp' ? 'WA' : store === 'shopify' ? '.ae' : '.com';
  return <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border bg-zinc-900 ${map[store]}`}>{label}</span>;
}

function maskPhone(p: string): string {
  return p.length > 7 ? `${p.slice(0, 4)}•••${p.slice(-3)}` : p;
}
