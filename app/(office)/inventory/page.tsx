'use client';

import { useState, useMemo } from 'react';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Kpi } from '@/components/ui/kpi';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreChip } from '@/components/ui/store-chip';
import { cn, formatAED, formatPct, formatNumber } from '@/lib/utils';
import { getCatalog, getParitySummary, type CatalogRow } from '@/lib/mock/inventory';
import { RefreshCw, Download, AlertCircle, ArrowUpRight, ArrowDownRight, Filter, Search } from 'lucide-react';

type Filter = 'all' | 'both_match' | 'both_price_drift' | 'shopify_only' | 'woocommerce_only' | 'low_stock';

export default function InventoryPage() {
  const rows = getCatalog();
  const summary = getParitySummary();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let f = rows;
    if (filter === 'low_stock') {
      f = f.filter(
        (r) =>
          (r.shopify_qty !== null && r.shopify_qty <= 3) ||
          (r.woocommerce_qty !== null && r.woocommerce_qty <= 3),
      );
    } else if (filter !== 'all') {
      f = f.filter((r) => r.parity_status === filter);
    }
    if (q) {
      const n = q.toLowerCase();
      f = f.filter(
        (r) =>
          r.display_title.toLowerCase().includes(n) ||
          r.sku.toLowerCase().includes(n) ||
          r.category.toLowerCase().includes(n),
      );
    }
    return f;
  }, [rows, filter, q]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Commerce"
        title="Inventory"
        description="Unified catalogue across both stores. Drift, gaps, stock — one view."
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="subtle" size="sm">
              <RefreshCw className="w-3.5 h-3.5" /> Sync now
            </Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Total SKUs" value={formatNumber(summary.total)} hint={`last run ${summary.last_run}`} />
        <Kpi label="Matched" value={`${summary.both_match}`} hint="prices align" />
        <Kpi label="Price drift" value={`${summary.both_price_drift}`} hint="needs review" />
        <Kpi label=".ae only" value={`${summary.shopify_only}`} hint="missing on .com" />
        <Kpi label=".com only" value={`${summary.woocommerce_only}`} hint="missing on .ae" />
        <Kpi label="Low stock" value={`${summary.low_stock}`} hint="≤ 3 units" />
      </div>

      {/* Next-run nudge */}
      <Card className="p-3 flex items-center gap-3 text-sm">
        <Dot tone="good" pulse />
        <div className="flex-1 text-ink-muted">
          Last parity run <span className="text-ink font-medium">{summary.last_run}</span> from{' '}
          <span className="text-gold">Hex</span> · next refresh {summary.next_run}
        </div>
        <Button variant="ghost" size="sm">
          View Hex project →
        </Button>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, SKU, category…"
            className="w-full h-8 pl-8 pr-3 bg-canvas-panel border border-line rounded text-xs text-ink placeholder:text-ink-dim focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(['all', 'both_match', 'both_price_drift', 'shopify_only', 'woocommerce_only', 'low_stock'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 h-8 text-2xs rounded border transition-colors',
                filter === f
                  ? 'bg-gold/10 text-gold border-gold/30'
                  : 'border-line text-ink-dim hover:text-ink hover:border-line-strong',
              )}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div>
        <SectionHeader title={`Showing ${filtered.length} of ${rows.length}`} />
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-soft">
                <th className="label px-3 py-2 text-left">Product</th>
                <th className="label px-3 py-2 text-left">Category</th>
                <th className="label px-3 py-2 text-left">Status</th>
                <th className="label px-3 py-2 text-right">.ae price</th>
                <th className="label px-3 py-2 text-right">.com price</th>
                <th className="label px-3 py-2 text-right">Drift</th>
                <th className="label px-3 py-2 text-right">.ae stock</th>
                <th className="label px-3 py-2 text-right">.com stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <CatalogRowComp key={r.id} r={r} />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-ink-dim">No SKUs match this filter.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CatalogRowComp({ r }: { r: CatalogRow }) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-canvas-inset/40">
      <td className="px-3 py-2.5">
        <div className="font-medium text-sm text-ink">{r.display_title}</div>
        <div className="text-2xs text-ink-dim font-mono mt-0.5">{r.sku}</div>
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-muted">{r.category}</td>
      <td className="px-3 py-2.5">
        <ParityChip status={r.parity_status} />
      </td>
      <td className="px-3 py-2.5 text-right text-sm numeric">
        {r.shopify_price_aed !== null ? (
          formatAED(r.shopify_price_aed)
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-sm numeric">
        {r.woocommerce_price_aed !== null ? (
          formatAED(r.woocommerce_price_aed)
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-sm">
        {r.price_delta_pct === null ? (
          <span className="text-ink-faint">—</span>
        ) : Math.abs(r.price_delta_pct) < 0.1 ? (
          <span className="text-ink-dim">flat</span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 numeric',
              Math.abs(r.price_delta_pct) > 5 ? 'text-bad' : 'text-warn',
            )}
          >
            {r.price_delta_pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(r.price_delta_pct).toFixed(1)}%
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-sm">
        <StockCell qty={r.shopify_qty} inStock={r.shopify_in_stock} />
      </td>
      <td className="px-3 py-2.5 text-right text-sm">
        <StockCell qty={r.woocommerce_qty} inStock={r.woocommerce_in_stock} />
      </td>
    </tr>
  );
}

function StockCell({ qty, inStock }: { qty: number | null; inStock: boolean | null }) {
  if (qty === null) return <span className="text-ink-faint">—</span>;
  if (qty === 0) return <span className="text-bad">out</span>;
  if (qty <= 3) return <span className="text-warn numeric">{qty} ⚠</span>;
  return <span className="text-ink numeric">{qty}</span>;
}

function ParityChip({ status }: { status: CatalogRow['parity_status'] }) {
  const map: Record<CatalogRow['parity_status'], { label: string; tone: 'good' | 'warn' | 'bad' | 'info' | 'neutral' }> = {
    both_match: { label: 'matched', tone: 'good' },
    both_price_drift: { label: 'price drift', tone: 'bad' },
    shopify_only: { label: '.ae only', tone: 'warn' },
    woocommerce_only: { label: '.com only', tone: 'warn' },
    unclassified: { label: '?', tone: 'neutral' },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
