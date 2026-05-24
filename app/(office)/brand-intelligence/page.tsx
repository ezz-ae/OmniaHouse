import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getGASnapshot, getMetaSignals, getGhostHeatmap, type MetaSignal, type GhostPoint } from '@/lib/mock/brand';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function BrandIntelligencePage() {
  const ga = getGASnapshot();
  const meta = getMetaSignals();
  const ghosts = getGhostHeatmap();

  const ghostsValue = ghosts.reduce((s, g) => s + g.value_lost_aed, 0);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <Sparkles className="w-3.5 h-3.5" />
            Brand Intelligence
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">The signal layer</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            GA events, Meta ad signals, ghost-browse heatmap. Where Omnia AI sees demand and intent before the orders arrive.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Stat label="Sessions today" value={ga.sessions_today.toLocaleString()} />
            <Stat label="Bounce" value={`${ga.bounce_rate}%`} />
            <Stat label="Conversion" value={`${ga.conversion_rate_pct}%`} tone="good" />
            <Stat label="Ghost value lost" value={`${(ghostsValue / 1000).toFixed(0)}K AED`} tone="warn" />
          </div>

          <Section title="Top pages today">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {ga.top_pages.map((p) => (
                <div key={p.path} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-zinc-100 truncate">{p.path}</div>
                  </div>
                  <div className="text-2xs text-zinc-500 uppercase tracking-wider hidden sm:block">
                    bounce {p.bounce_rate}%
                  </div>
                  <div className="text-sm text-zinc-100 tabular-nums w-14 text-right shrink-0">{p.sessions}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Meta · live campaigns">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {meta.map((m) => <CampaignRow key={m.campaign} m={m} />)}
            </div>
          </Section>

          <Section title="Ghost heatmap · cart adds without checkout">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {ghosts.map((g) => <GhostRow key={g.sku} g={g} />)}
            </div>
            <div className="text-2xs text-zinc-500 mt-2">
              Identity-linked from crm_identity_links. The WhatsApp Desk can DM these customers directly from the Desk drawer.
            </div>
          </Section>

          <Section title="Channel mix">
            <div className="border border-zinc-800 rounded-md p-4">
              {ga.channels.map((c) => (
                <div key={c.channel} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-zinc-100">{c.channel}</div>
                    <div className="text-2xs text-zinc-500 tabular-nums">{c.sessions.toLocaleString()} · {c.share_pct}%</div>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-500" style={{ width: `${c.share_pct}%` }} />
                  </div>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function CampaignRow({ m }: { m: MetaSignal }) {
  const statusMap: Record<MetaSignal['status'], string> = {
    good: 'bg-emerald-400',
    warn: 'bg-amber-400',
    bad:  'bg-rose-400',
  };
  const roasTone = m.roas >= 3 ? 'text-emerald-400' : m.roas >= 1.5 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMap[m.status]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 truncate">{m.campaign}</div>
        {m.note && <div className="text-2xs text-amber-400 truncate">{m.note}</div>}
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-2xs text-zinc-500 uppercase tracking-wider">CTR</div>
        <div className="text-sm text-zinc-300 tabular-nums">{m.ctr_pct}%</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-2xs text-zinc-500 uppercase tracking-wider">ROAS</div>
        <div className={`text-sm tabular-nums ${roasTone}`}>{m.roas}x</div>
      </div>
      <div className="text-right shrink-0 w-20">
        <div className="text-2xs text-zinc-500 uppercase tracking-wider">Spend</div>
        <div className="text-sm text-zinc-100 tabular-nums">{m.spend_today.toLocaleString()}</div>
      </div>
    </div>
  );
}

function GhostRow({ g }: { g: GhostPoint }) {
  const trendIcon = g.trend_7d === 'up'
    ? <TrendingUp className="w-3 h-3 text-rose-400" />
    : g.trend_7d === 'down'
    ? <TrendingDown className="w-3 h-3 text-emerald-400" />
    : <Minus className="w-3 h-3 text-zinc-500" />;

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 truncate">{g.product}</div>
        <div className="text-2xs font-mono text-zinc-500 truncate">{g.sku}</div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-2xs text-zinc-500 uppercase tracking-wider">Cart adds</div>
        <div className="text-sm text-zinc-100 tabular-nums">{g.cart_adds_no_checkout}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-2xs text-zinc-500 uppercase tracking-wider">Value lost</div>
        <div className="text-sm text-amber-400 tabular-nums">{(g.value_lost_aed / 1000).toFixed(0)}K AED</div>
      </div>
      <div className="shrink-0 w-4 flex justify-center">{trendIcon}</div>
    </div>
  );
}
