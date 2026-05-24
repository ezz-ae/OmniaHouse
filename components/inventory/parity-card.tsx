'use client';

import { cn } from '@/lib/utils';
import { Dot } from '@/components/ui/badge';
import type { ParitySummary } from '@/lib/inventory/types';
import { RefreshCw, Database } from 'lucide-react';

export type ParityFilter =
  | 'all'
  | 'both_match'
  | 'both_price_drift'
  | 'shopify_only'
  | 'woocommerce_only'
  | 'low_stock'
  | 'limited_editions'
  | 'needs_seo';

const FILTERS: { id: ParityFilter; label: string; key: keyof ParitySummary | 'total' | 'all'; tone: string }[] = [
  { id: 'all',                label: 'All',          key: 'total',              tone: 'text-ink' },
  { id: 'both_match',         label: 'Matched',      key: 'both_match',         tone: 'text-good' },
  { id: 'both_price_drift',   label: 'Price drift',  key: 'both_price_drift',   tone: 'text-bad' },
  { id: 'shopify_only',       label: '.ae only',     key: 'shopify_only',       tone: 'text-warn' },
  { id: 'woocommerce_only',   label: '.com only',    key: 'woocommerce_only',   tone: 'text-warn' },
  { id: 'low_stock',          label: 'Low stock',    key: 'low_stock',          tone: 'text-warn' },
  { id: 'limited_editions',   label: 'Limited',      key: 'limited_editions',   tone: 'text-gold' },
  { id: 'needs_seo',          label: 'Needs SEO',    key: 'needs_seo',          tone: 'text-info' },
];

export function ParityCard({
  summary,
  active,
  onChange,
}: {
  summary: ParitySummary;
  active: ParityFilter;
  onChange: (f: ParityFilter) => void;
}) {
  return (
    <div className="panel">
      {/* Status strip */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line-soft text-2xs">
        <Database className="w-3.5 h-3.5 text-gold shrink-0" />
        <span className="text-ink-muted">
          Parity from <span className="text-gold">Hex</span> · last run{' '}
          <span className="text-ink numeric">{summary.last_run}</span> · next{' '}
          <span className="text-ink numeric">{summary.next_run}</span>
        </span>
        <Dot tone="good" pulse />
        <button className="ml-auto flex items-center gap-1 text-ink-dim hover:text-ink">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="grid grid-cols-4 md:grid-cols-8 divide-x divide-line-soft">
        {FILTERS.map((f) => {
          const value = f.key === 'all' ? summary.total : (summary as any)[f.key] ?? 0;
          const isActive = active === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              className={cn(
                'px-3 py-3 text-left transition-colors',
                isActive ? 'bg-gold/10' : 'hover:bg-canvas-inset/40',
              )}
            >
              <div className={cn('font-serif text-xl numeric', f.tone, !isActive && 'opacity-90')}>{value}</div>
              <div className={cn(
                'text-2xs uppercase tracking-widest mt-0.5',
                isActive ? 'text-gold' : 'text-ink-dim',
              )}>
                {f.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function applyParityFilter(rows: any[], f: ParityFilter): any[] {
  switch (f) {
    case 'all': return rows;
    case 'both_match':
    case 'both_price_drift':
    case 'shopify_only':
    case 'woocommerce_only':
      return rows.filter((r) => r.parity_status === f);
    case 'low_stock':
      return rows.filter(
        (r) =>
          (r.shopify_qty !== null && r.shopify_qty <= 3) ||
          (r.woocommerce_qty !== null && r.woocommerce_qty <= 3),
      );
    case 'limited_editions':
      return rows.filter((r) => r.is_limited_edition);
    case 'needs_seo':
      return rows.filter((r) => r.seo_status === 'pending');
    default:
      return rows;
  }
}
