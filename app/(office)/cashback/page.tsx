import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getWallets, getLimitedEditions, type LimitedEdition } from '@/lib/mock/cashback';
import { Wallet } from 'lucide-react';

export default function CashbackPage() {
  const wallets = getWallets();
  const editions = getLimitedEditions();

  const pool = wallets.reduce((s, w) => s + w.balance_aed, 0);
  const earned = wallets.reduce((s, w) => s + w.earned_30d_aed, 0);
  const spent = wallets.reduce((s, w) => s + w.spent_30d_aed, 0);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <Wallet className="w-3.5 h-3.5" />
            Cashback
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Wallets &amp; limited editions</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Cashback wallets are redeemable only against Limited Editions. Customers see their balance via /portal/[slug]; agents see it inside the WhatsApp Desk drawer.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Wallet pool" value={`${pool.toLocaleString()} AED`} />
            <Stat label="Earned (30d)" value={`${earned.toLocaleString()} AED`} tone="good" />
            <Stat label="Spent (30d)" value={`${spent.toLocaleString()} AED`} />
          </div>

          <Section title="Top wallets">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {wallets.map((w) => (
                <div key={w.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{w.customer}</div>
                    <div className="text-2xs text-zinc-500 truncate font-mono">{maskPhone(w.phone)} · last {w.last_activity}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-emerald-400 tabular-nums">{w.balance_aed.toLocaleString()} AED</div>
                    <div className="text-2xs text-zinc-500 uppercase tracking-wider">
                      +{w.earned_30d_aed} / -{w.spent_30d_aed} (30d)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Limited editions">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {editions.map((le) => (
                <EditionCard key={le.id} le={le} />
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
  const toneClass = tone === 'good' ? 'text-emerald-400' : 'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function EditionCard({ le }: { le: LimitedEdition }) {
  const sold = le.total_units - le.remaining;
  const pct = (sold / le.total_units) * 100;

  const statusMap: Record<LimitedEdition['status'], string> = {
    live:         'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    coming_soon:  'bg-blue-500/10 text-blue-300 border-blue-500/30',
    sold_out:     'bg-zinc-800 text-zinc-400 border-zinc-700',
    archived:     'bg-zinc-800 text-zinc-500 border-zinc-700',
  };

  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="text-sm font-medium text-zinc-100 leading-tight">{le.name}</div>
        <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${statusMap[le.status]}`}>
          {le.status.replace('_', ' ')}
        </span>
      </div>
      <div className="text-2xs text-zinc-500 mb-3 font-mono">{le.price_aed.toLocaleString()} AED · launched {le.launched_at}</div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
        <div className="h-full bg-amber-400/70" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-2xs">
        <span className="text-zinc-500">{sold}/{le.total_units} sold</span>
        <span className="text-zinc-300 tabular-nums">{le.remaining} left</span>
      </div>
    </div>
  );
}

function maskPhone(p: string): string {
  return p.length > 7 ? `${p.slice(0, 4)}•••${p.slice(-3)}` : p;
}
