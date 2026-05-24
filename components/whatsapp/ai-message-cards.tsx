'use client';

import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreChip } from '@/components/ui/store-chip';
import { cn, formatAED } from '@/lib/utils';
import {
  Sparkles, Zap, ShieldCheck, ShieldAlert, BookOpen, X, Copy, Check,
  ArrowRight, Link2, AlertTriangle, Crown,
} from 'lucide-react';
import { useState } from 'react';
import { routeForOrder } from '@/lib/whatsapp/routing';
import type {
  Extraction, ReplyOptimization, PaymentVerification, Magazine,
  CustomerCard,
} from '@/lib/whatsapp/types';

/**
 * AI Cards that live INSIDE the conversation thread.
 * Each one is a turn the agent can scroll through, dismiss, or act on.
 * They are sized to feel like message bubbles, not panels.
 */

// ─── Extract card ──────────────────────────────────────────────────────────

export function ExtractCard({
  data,
  card,
  at,
  onDismiss,
  onPush,
}: {
  data: Extraction;
  card: CustomerCard;
  at: string;
  onDismiss?: () => void;
  onPush?: (target: 'shopify' | 'woocommerce') => void;
}) {
  const total = data.selected_products.reduce((s, p) => s + (p.price_aed || 0) * p.qty, 0);
  const routing = data.selected_products.length > 0
    ? routeForOrder({
      country: data.country || card.country,
      history: card.history,
      product_on_shopify: data.selected_products.some((p) => p.store_source === 'shopify'),
      product_on_woocommerce: data.selected_products.some((p) => p.store_source === 'woocommerce'),
    })
    : null;
  const cashback = data.cashback_suggestion.eligible ? data.cashback_suggestion.amount_aed : 0;

  return (
    <CardShell tone="gold" icon={Sparkles} title="Extracted order" at={at} onDismiss={onDismiss}>
      {/* Intent + confidence */}
      <div className="flex items-center justify-between text-2xs text-ink-dim mb-3">
        <span><span className="text-ink">{data.intent.replace(/_/g, ' ')}</span> · confidence {Math.round(data.intent_score * 100)}%</span>
        <div className="flex items-center gap-1">
          <Pill ok={data.order_ready} label="order" />
          <Pill ok={data.shipping_ready} label="shipping" />
        </div>
      </div>

      {/* Risk flags */}
      {data.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {data.risk_flags.map((f) => <Badge key={f} tone="bad">{f.replace(/_/g, ' ')}</Badge>)}
        </div>
      )}

      {/* Items */}
      {data.selected_products.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {data.selected_products.map((it) => (
            <li key={it.sku} className="flex items-center gap-2">
              <span className="flex-1 min-w-0">
                <span className="text-sm text-ink">{it.title}</span>
                <span className="text-2xs text-ink-dim font-mono ml-1">{it.sku}{it.ring_size && ` · size ${it.ring_size}`}</span>
              </span>
              <span className="text-sm numeric text-ink shrink-0">{it.qty} × {it.price_aed ? formatAED(it.price_aed) : '?'}</span>
              {it.store_source && <StoreChip store={it.store_source} />}
            </li>
          ))}
        </ul>
      )}

      {/* Shipping */}
      {(data.area || data.building || data.emirate_or_city) && (
        <div className="mb-3 text-2xs">
          <span className="text-ink-dim">ship to </span>
          <span className="text-ink">{[data.building, data.area, data.emirate_or_city].filter(Boolean).join(', ')}</span>
          {data.preferred_delivery_window && (
            <span className="text-ink-dim"> · by <span className="text-ink">{data.preferred_delivery_window}</span></span>
          )}
        </div>
      )}

      {/* Total + cashback + actions */}
      <div className="border-t border-line-soft pt-3 mt-3 -mx-3 px-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-dim">Total</div>
          <div className="font-serif text-xl text-gold numeric">{total > 0 ? formatAED(total) : '—'}</div>
          {cashback > 0 && (
            <div className="text-2xs text-good numeric">+{formatAED(cashback)} cashback (LE)</div>
          )}
        </div>
        {routing && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onPush?.(routing.default_store as 'shopify' | 'woocommerce')}
          >
            Push to {routing.default_store === 'shopify' ? '.ae' : '.com'} <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
      {routing && (
        <div className="text-2xs text-ink-dim mt-1.5">{routing.reason}</div>
      )}
    </CardShell>
  );
}

// ─── Reply optimizer card ──────────────────────────────────────────────────

export function OptimizeCard({
  data,
  at,
  onDismiss,
  onApply,
}: {
  data: ReplyOptimization;
  at: string;
  onDismiss?: () => void;
  onApply?: () => void;
}) {
  const tone = data.prediction === 'conversion_likely' ? 'good' : 'bad';
  return (
    <CardShell tone={tone} icon={Zap} title={data.prediction === 'conversion_likely' ? 'Conversion likely' : 'Risk of losing'} at={at} onDismiss={onDismiss}>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-2xl text-gold numeric">{data.conversion_probability}%</span>
        <span className="text-2xs text-ink-dim">predicted close</span>
      </div>
      {data.warning && <p className="text-2xs text-bad mb-2">{data.warning}</p>}
      <p className="text-2xs text-ink-muted mb-3">{data.recommendation}</p>

      {data.changes.length > 0 && (
        <ul className="space-y-1 mb-3">
          {data.changes.slice(0, 3).map((c, i) => (
            <li key={i} className="text-2xs text-ink-muted">
              <span className="text-ink font-medium">{c.reason}</span> — {c.after}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line-soft pt-3 -mx-3 px-3 flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onApply}>Use rewrite</Button>
        <CopyChip text={data.optimized_draft.en} label="EN" />
        <CopyChip text={data.optimized_draft.ar} label="AR" />
      </div>
    </CardShell>
  );
}

// ─── Payment verification card ─────────────────────────────────────────────

export function VerifyCard({
  data,
  at,
  forFilename,
  onDismiss,
}: {
  data: PaymentVerification;
  at: string;
  forFilename?: string;
  onDismiss?: () => void;
}) {
  const tone = data.is_authentic ? 'good' : 'bad';
  return (
    <CardShell tone={tone} icon={data.is_authentic ? ShieldCheck : ShieldAlert} title={data.is_authentic ? 'Payment looks authentic' : 'Possible fraud'} at={at} onDismiss={onDismiss}>
      {forFilename && (
        <div className="text-2xs font-mono text-ink-dim mb-2 truncate">re: {forFilename}</div>
      )}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-2xl text-gold numeric">{data.verification_score}<span className="text-ink-dim text-sm">%</span></span>
        <Badge tone={data.is_authentic ? 'good' : 'bad'}>{data.action.replace(/_/g, ' ')}</Badge>
        <Badge tone="info">{data.bank_detected}</Badge>
      </div>
      <p className="text-2xs text-ink-muted mb-3">{data.reasoning}</p>
      {data.discrepancies.length > 0 && (
        <ul className="space-y-1 mb-2">
          {data.discrepancies.map((d, i) => (
            <li key={i} className="text-2xs text-ink-muted flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-bad mt-0.5 shrink-0" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-3 gap-1.5 text-2xs pt-2 border-t border-line-soft -mx-3 px-3">
        <MetaDot label="Status bar" ok={data.metadata_consistency.status_bar_match} />
        <MetaDot label="Resolution" ok={data.metadata_consistency.resolution_match} />
        <MetaDot label="Timestamp" ok={data.metadata_consistency.timestamp_match} />
      </div>
    </CardShell>
  );
}

// ─── Magazine preview card ─────────────────────────────────────────────────

export function MagazineCard({
  data,
  at,
  onDismiss,
}: {
  data: Magazine;
  at: string;
  onDismiss?: () => void;
}) {
  return (
    <CardShell tone="gold" icon={BookOpen} title="Personalized magazine" at={at} onDismiss={onDismiss}>
      <h4 className="font-serif text-lg text-gold leading-tight mb-2">{data.magazine_headline}</h4>
      <p className="text-2xs text-ink-muted leading-relaxed whitespace-pre-line mb-3">{data.editorial_content}</p>
      <div className="border-t border-line-soft pt-2 -mx-3 px-3 flex items-center justify-between text-2xs">
        <span className="text-ink-dim">Featured LE</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-ink">{data.featured_limited_edition_sku}</span>
          <Badge tone="gold">code {data.cashback_code}</Badge>
        </div>
      </div>
    </CardShell>
  );
}

// ─── Shortcut expansion card ───────────────────────────────────────────────

export function ShortcutCard({
  trigger,
  en,
  ar,
  at,
  onUseEN,
  onUseAR,
  onUseBoth,
  onDismiss,
}: {
  trigger: string;
  en: string;
  ar: string;
  at: string;
  onUseEN?: () => void;
  onUseAR?: () => void;
  onUseBoth?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <CardShell tone="info" icon={Sparkles} title={`shortcut ${trigger}`} at={at} onDismiss={onDismiss}>
      <div className="space-y-2 mb-3">
        <div className="text-sm text-ink-muted leading-relaxed">{en}</div>
        <div className="text-sm text-ink-muted leading-relaxed font-serif" dir="rtl">{ar}</div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-line-soft pt-2 -mx-3 px-3">
        <Button variant="subtle" size="sm" onClick={onUseEN}>Use EN</Button>
        <Button variant="subtle" size="sm" onClick={onUseAR}>Use AR</Button>
        <Button variant="primary" size="sm" onClick={onUseBoth}>Use both</Button>
      </div>
    </CardShell>
  );
}

// ─── System note ───────────────────────────────────────────────────────────

export function SystemNote({ text, tone = 'info', at }: { text: string; tone?: 'info' | 'warn' | 'good'; at: string }) {
  const tones = {
    info: 'text-ink-dim border-line-soft',
    warn: 'text-warn border-warn/30 bg-warn/5',
    good: 'text-good border-good/30 bg-good/5',
  };
  return (
    <div className={cn('mx-auto px-3 py-1 rounded-full text-2xs border', tones[tone])}>
      <span className="opacity-70 mr-2 numeric">{at}</span>
      {text}
    </div>
  );
}

// ─── Shared shell ──────────────────────────────────────────────────────────

function CardShell({
  tone,
  icon: Icon,
  title,
  at,
  children,
  onDismiss,
}: {
  tone: 'gold' | 'good' | 'bad' | 'info' | 'warn';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  at: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const tones = {
    gold: 'border-gold/30 bg-gold/[0.04]',
    good: 'border-good/30 bg-good/[0.04]',
    bad:  'border-bad/30  bg-bad/[0.04]',
    info: 'border-info/30 bg-info/[0.04]',
    warn: 'border-warn/30 bg-warn/[0.04]',
  };
  const iconTones = {
    gold: 'text-gold',
    good: 'text-good',
    bad:  'text-bad',
    info: 'text-info',
    warn: 'text-warn',
  };
  return (
    <div className={cn('rounded-lg border px-3 py-2.5 max-w-[560px]', tones[tone])}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('w-3.5 h-3.5', iconTones[tone])} />
          <span className="text-2xs uppercase tracking-widest text-ink">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-2xs text-ink-dim numeric">{at}</span>
          {onDismiss && (
            <button onClick={onDismiss} className="text-ink-dim hover:text-ink"><X className="w-3 h-3" /></button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs border', ok ? 'border-good/30 text-good bg-good/10' : 'border-bad/30 text-bad bg-bad/10')}>
      <Dot tone={ok ? 'good' : 'bad'} /> {label}
    </span>
  );
}

function MetaDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Dot tone={ok ? 'good' : 'bad'} />
      <span className="text-ink-dim">{label}</span>
    </div>
  );
}

function CopyChip({ text, label }: { text: string; label: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setC(true); setTimeout(() => setC(false), 1200); }}
      className="flex items-center gap-1 h-6 px-2 rounded text-2xs border border-line text-ink-dim hover:text-ink"
    >
      {c ? <Check className="w-3 h-3 text-good" /> : <Copy className="w-3 h-3" />}
      {label}
    </button>
  );
}
