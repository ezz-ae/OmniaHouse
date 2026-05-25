'use client';

import type { KeyboardEvent } from 'react';
import { cn, formatAED } from '@/lib/utils';
import { Badge, Dot } from '@/components/ui/badge';
import { StoreChip } from '@/components/ui/store-chip';
import type { Product } from '@/lib/inventory/types';
import { seoScore } from '@/lib/inventory/seo';
import { Sparkles, Video, AlertTriangle, Crown, Pencil, RefreshCw } from 'lucide-react';

/**
 * Visual tile, NOT a table row.
 *
 *  ┌─────────────────────────┐
 *  │  [gradient hero image] │  ← gold-tinted gradient based on image_hint
 *  │  [LE badge if any]     │
 *  ├─────────────────────────┤
 *  │  Title (serif)          │
 *  │  SKU · category         │
 *  ├─────────────────────────┤
 *  │  .ae 1,300 │ .com 1,300 │  ← dual price strip
 *  │  drift chip · stock     │
 *  ├─────────────────────────┤
 *  │  [SEO ring] [strategy]  │  ← actions surface on hover
 *  └─────────────────────────┘
 */
export function CatalogueTile({
  p,
  active,
  onClick,
  onSEO,
  onVeo,
  onEdit,
  onSync,
}: {
  p: Product;
  active?: boolean;
  onClick?: () => void;
  onSEO?: () => void;
  onVeo?: () => void;
  onEdit?: () => void;
  onSync?: () => void;
}) {
  const score = seoScore(p);
  const driftSeverity =
    p.price_delta_pct === null
      ? null
      : Math.abs(p.price_delta_pct) < 1
        ? 'none'
        : Math.abs(p.price_delta_pct) < 5
          ? 'mild'
          : 'bad';
  const openTile = () => onClick?.();
  const onTileKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTile();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openTile}
      onKeyDown={onTileKeyDown}
      className={cn(
        'group panel cursor-pointer overflow-hidden text-left transition-all hover:border-line-strong hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        active && 'border-gold/40 ring-1 ring-gold/30',
      )}
    >
      {/* Hero — real image when present, gradient fallback otherwise. */}
      <div className="relative h-32 overflow-hidden bg-zinc-800">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt={p.display_title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <HeroGradient hint={p.image_hint} />
        )}
        {p.source === 'live' && (
          <span className="absolute bottom-1 right-1 px-1 h-3.5 rounded bg-emerald-500/90 text-zinc-900 font-mono text-2xs flex items-center">LIVE</span>
        )}
        {p.is_limited_edition && (
          <div className="absolute top-2 left-2">
            <Badge tone="gold">
              <Crown className="w-3 h-3" /> LE
            </Badge>
          </div>
        )}
        {p.metrics.high_bounce_alert && (
          <div className="absolute top-2 right-2">
            <Badge tone="bad">
              <AlertTriangle className="w-3 h-3" /> high bounce
            </Badge>
          </div>
        )}
        {/* Stock indicators */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {p.on_shopify && <StockDot store="shopify" qty={p.shopify_qty} />}
            {p.on_woocommerce && <StockDot store="woocommerce" qty={p.woocommerce_qty} />}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onSEO?.(); }}
              className="h-6 px-2 rounded bg-canvas/80 backdrop-blur border border-line text-2xs text-ink hover:bg-gold/20 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> SEO
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVeo?.(); }}
              className="h-6 px-2 rounded bg-canvas/80 backdrop-blur border border-line text-2xs text-ink hover:bg-gold/20 flex items-center gap-1"
            >
              <Video className="w-3 h-3" /> Veo
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="h-6 px-2 rounded bg-canvas/80 backdrop-blur border border-line text-2xs text-ink hover:bg-gold/20 flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSync?.(); }}
              className="h-6 px-2 rounded bg-canvas/80 backdrop-blur border border-line text-2xs text-ink hover:bg-gold/20 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* Title + SKU */}
      <div className="px-3 pt-3 pb-2">
        <h3 className="font-serif text-base text-ink leading-tight tracking-tight line-clamp-1">
          {p.display_title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-2xs text-ink-dim">
          <span className="font-mono">{p.master_sku}</span>
          <span>·</span>
          <span>{p.category}</span>
        </div>
      </div>

      {/* Dual prices */}
      <div className="px-3 pb-2 flex items-stretch gap-1">
        <PriceCell store="shopify" price={p.shopify_price_aed} active={p.on_shopify} />
        <PriceCell store="woocommerce" price={p.woocommerce_price_aed} active={p.on_woocommerce} />
      </div>

      {/* Drift + SEO score */}
      <div className="px-3 pb-3 pt-2 border-t border-line-soft flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {driftSeverity === null ? (
            <Badge tone="neutral">
              {p.on_shopify ? '.ae only' : '.com only'}
            </Badge>
          ) : driftSeverity === 'none' ? (
            <Badge tone="good">matched</Badge>
          ) : (
            <Badge tone={driftSeverity === 'bad' ? 'bad' : 'warn'}>
              drift {Math.abs(p.price_delta_pct!).toFixed(1)}%
            </Badge>
          )}
        </div>
        <SEORing score={score} />
      </div>
    </div>
  );
}

function StockDot({ store, qty }: { store: 'shopify' | 'woocommerce'; qty: number | null }) {
  if (qty === null) return null;
  const tone = qty === 0 ? 'bad' : qty <= 3 ? 'warn' : 'good';
  const bg = qty === 0 ? 'bg-bad/80' : qty <= 3 ? 'bg-warn/80' : 'bg-good/80';
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 h-5 rounded text-2xs font-mono text-canvas', bg)}>
      {store === 'shopify' ? '.ae' : '.com'} {qty}
    </span>
  );
}

function PriceCell({
  store,
  price,
  active,
}: {
  store: 'shopify' | 'woocommerce';
  price: number | null;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        'flex-1 px-2 py-1.5 rounded border text-center',
        active
          ? 'bg-canvas-inset border-line text-ink'
          : 'border-dashed border-line-soft text-ink-faint',
      )}
    >
      <div className="text-2xs uppercase tracking-widest opacity-70">
        {store === 'shopify' ? '.ae' : '.com'}
      </div>
      <div className={cn('text-sm font-medium numeric', !active && 'opacity-50')}>
        {price !== null ? formatAED(price) : '—'}
      </div>
    </div>
  );
}

function SEORing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const radius = 8;
  const c = 2 * Math.PI * radius;
  const dash = (c * pct) / 100;
  const colour = score >= 7 ? '#7CB87C' : score >= 4 ? '#D9A75B' : '#D86C5E';

  return (
    <div className="flex items-center gap-1.5">
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
        <circle cx="11" cy="11" r={radius} fill="none" stroke="#26262A" strokeWidth="2" />
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth="2"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-2xs text-ink-dim numeric">SEO {score}</span>
    </div>
  );
}

function HeroGradient({ hint }: { hint?: string }) {
  const palettes: Record<string, string> = {
    'silver-crescent': 'from-slate-400 via-zinc-300 to-slate-500',
    'rose-moonstone': 'from-rose-300 via-amber-200 to-rose-400',
    'blue-sapphire': 'from-blue-500 via-indigo-400 to-blue-700',
    'white-pearl': 'from-zinc-100 via-zinc-200 to-zinc-300',
    'green-emerald': 'from-emerald-500 via-emerald-400 to-emerald-700',
    'red-ruby': 'from-rose-500 via-red-500 to-rose-700',
    'opal-iridescent': 'from-indigo-200 via-pink-200 to-cyan-200',
    'gold-celestial': 'from-amber-300 via-yellow-500 to-amber-600',
    'bridal-gold': 'from-amber-200 via-yellow-300 to-amber-500',
    'diamond-tennis': 'from-slate-200 via-white to-blue-100',
    'silver-anklet': 'from-zinc-300 via-slate-200 to-zinc-400',
    'founder-gold': 'from-yellow-600 via-amber-700 to-yellow-900',
    'choker-platinum': 'from-slate-300 via-slate-200 to-slate-500',
    'heritage-gold': 'from-amber-500 via-amber-700 to-yellow-900',
  };
  const gradient = palettes[hint || ''] || 'from-canvas-inset via-canvas-panel to-canvas-inset';
  return (
    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', gradient)}>
      <div className="absolute inset-0 bg-gradient-to-t from-canvas/80 via-canvas/20 to-transparent" />
    </div>
  );
}
