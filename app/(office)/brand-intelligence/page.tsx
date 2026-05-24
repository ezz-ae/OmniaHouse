import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Kpi } from '@/components/ui/kpi';
import { getGASnapshot, getMetaSignals, getGhostHeatmap } from '@/lib/mock/brand';
import { formatAED, formatNumber, formatPct } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

export default function BrandIntelligencePage() {
  const ga = getGASnapshot();
  const meta = getMetaSignals();
  const ghosts = getGhostHeatmap();
  const lost = ghosts.reduce((s, g) => s + g.value_lost_aed, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Intelligence"
        title="Brand Intelligence"
        description="GA snapshot, Meta signal, ghost heatmap, agentic network — all in one place."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Sessions today" value={formatNumber(ga.sessions_today)} delta={4.2} />
        <Kpi label="Bounce rate" value={`${ga.bounce_rate}%`} delta={-2.1} hint="lower is better" />
        <Kpi label="Conv. rate" value={`${ga.conversion_rate_pct}%`} delta={0.3} />
        <Kpi label="Ghost value" value={formatAED(lost, { compact: true })} hint="abandoned carts" />
      </div>

      {/* GA + Meta side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionHeader title="Traffic sources" hint="last 24h" />
          <Card>
            <ul className="divide-y divide-line-soft">
              {ga.channels.map((c) => (
                <li key={c.channel} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-ink">{c.channel}</div>
                      <div className="text-2xs text-ink-dim numeric">
                        {formatNumber(c.sessions)} · {c.share_pct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-canvas-inset overflow-hidden">
                      <div
                        className="h-full bg-gold/70"
                        style={{ width: `${c.share_pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          <SectionHeader title="Meta campaigns" hint="live spend" />
          <Card>
            <ul className="divide-y divide-line-soft">
              {meta.map((m) => (
                <li key={m.campaign} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink font-medium truncate">{m.campaign}</div>
                      {m.note && (
                        <div className="text-2xs text-ink-dim mt-0.5">{m.note}</div>
                      )}
                    </div>
                    <Badge tone={m.status === 'good' ? 'good' : m.status === 'warn' ? 'warn' : 'bad'}>
                      {m.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-2xs">
                    <div>
                      <div className="label">Spend</div>
                      <div className="text-ink numeric">{formatAED(m.spend_today)}</div>
                    </div>
                    <div>
                      <div className="label">ROAS</div>
                      <div className={m.roas >= 3 ? 'text-good numeric' : m.roas >= 1 ? 'text-warn numeric' : 'text-bad numeric'}>
                        {m.roas.toFixed(1)}×
                      </div>
                    </div>
                    <div>
                      <div className="label">CTR</div>
                      <div className="text-ink numeric">{m.ctr_pct}%</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Ghost heatmap */}
      <div>
        <SectionHeader title="Ghost heatmap" hint="cart adds without checkout" />
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-soft">
                <th className="label px-3 py-2 text-left">Product</th>
                <th className="label px-3 py-2 text-right">Cart adds</th>
                <th className="label px-3 py-2 text-right">Value lost</th>
                <th className="label px-3 py-2 text-center">7d trend</th>
              </tr>
            </thead>
            <tbody>
              {ghosts.map((g) => (
                <tr key={g.sku} className="border-b border-line-soft last:border-b-0 hover:bg-canvas-inset/40">
                  <td className="px-3 py-2.5">
                    <div className="text-sm text-ink">{g.product}</div>
                    <div className="text-2xs text-ink-dim font-mono">{g.sku}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm numeric">{formatNumber(g.cart_adds_no_checkout)}</td>
                  <td className="px-3 py-2.5 text-right text-sm text-bad numeric">{formatAED(g.value_lost_aed, { compact: true })}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Trend t={g.trend_7d} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Top pages */}
      <div>
        <SectionHeader title="Top pages" hint="last 24h" />
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {ga.top_pages.map((p) => (
              <li key={p.path} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-ink truncate">{p.path}</div>
                </div>
                <div className="text-2xs text-ink-dim numeric">{formatNumber(p.sessions)} sessions</div>
                <div className="text-2xs numeric w-16 text-right" style={{ color: p.bounce_rate > 40 ? '#D9A75B' : '#7CB87C' }}>
                  {p.bounce_rate}% bounce
                </div>
                <ExternalLink className="w-3 h-3 text-ink-faint" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Trend({ t }: { t: 'up' | 'down' | 'flat' }) {
  if (t === 'up') return <TrendingUp className="w-4 h-4 text-bad inline" />;
  if (t === 'down') return <TrendingDown className="w-4 h-4 text-good inline" />;
  return <Minus className="w-4 h-4 text-ink-dim inline" />;
}
