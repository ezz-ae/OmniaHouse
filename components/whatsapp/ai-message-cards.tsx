'use client';

import { useState } from 'react';
import { Sparkles, Zap, ShieldCheck, ShieldAlert, BookOpen, X, Copy, Check, ArrowRight, AlertTriangle, Package, ExternalLink, Crown, Send } from 'lucide-react';
import { routeForOrder } from '@/lib/whatsapp/routing';
import { formatAED } from '@/lib/utils';
import type { Extraction, ReplyOptimization, PaymentVerification, Magazine, CustomerCard } from '@/lib/whatsapp/types';
import type { ProductShare } from '@/lib/whatsapp/thread';

/**
 * AI cards — comfortable mature sizing, single sans-serif, no fashion.
 * Content is the subject. Decoration is absent host.
 */

// ─── Extract ───────────────────────────────────────────────────────────────

export function ExtractCard({
  data, card, at, onDismiss, onPush,
}: {
  data: Extraction; card: CustomerCard; at: string;
  onDismiss?: () => void; onPush?: (target: 'shopify' | 'woocommerce') => void;
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
    <Shell tone="emerald" icon={Sparkles} title="Extracted order" at={at} onDismiss={onDismiss}>
      {/* Intent line */}
      <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-zinc-700">
        <span className="text-zinc-300">
          <span className="text-zinc-100 font-medium capitalize">{data.intent.replace(/_/g, ' ')}</span>
          <span className="text-zinc-500"> · {Math.round(data.intent_score * 100)}% confidence</span>
        </span>
        <div className="flex items-center gap-1.5">
          <Tag ok={data.order_ready}>order ready</Tag>
          <Tag ok={data.shipping_ready}>shipping ready</Tag>
        </div>
      </div>

      {/* Risk flags */}
      {data.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.risk_flags.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {f.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Items */}
      {data.selected_products.length > 0 && (
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Items</div>
          <ul className="space-y-1.5">
            {data.selected_products.map((it) => (
              <li key={it.sku} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="text-zinc-100">{it.title}</span>
                  <span className="text-zinc-500 ml-2 font-mono text-xs">{it.sku}{it.ring_size && ` · size ${it.ring_size}`}</span>
                </span>
                <span className="text-zinc-100 numeric shrink-0">{it.qty} × {it.price_aed ? formatAED(it.price_aed) : '?'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shipping */}
      {(data.area || data.building || data.emirate_or_city) && (
        <div className="mb-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Shipping</div>
          <div className="text-zinc-100">{[data.building, data.area, data.emirate_or_city].filter(Boolean).join(', ')}</div>
          {data.preferred_delivery_window && (
            <div className="text-zinc-400 text-xs mt-0.5">by {data.preferred_delivery_window}</div>
          )}
        </div>
      )}

      {/* Total + push */}
      <div className="pt-3 border-t border-zinc-700 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-0.5">Total</div>
          <div className="text-lg font-semibold text-zinc-100 numeric">{total > 0 ? formatAED(total) : '—'}</div>
          {cashback > 0 && (
            <div className="text-xs text-emerald-400 numeric mt-0.5">+{formatAED(cashback)} cashback (LE)</div>
          )}
        </div>
        {routing && (
          <button
            onClick={() => onPush?.(routing.default_store as 'shopify' | 'woocommerce')}
            className="px-3 h-9 rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400 flex items-center gap-1.5"
          >
            Push to {routing.default_store === 'shopify' ? '.ae' : '.com'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {routing && (
        <div className="text-xs text-zinc-500 mt-2">{routing.reason}</div>
      )}
    </Shell>
  );
}

// ─── Optimize ──────────────────────────────────────────────────────────────

export function OptimizeCard({
  data, at, onDismiss, onApply,
}: {
  data: ReplyOptimization; at: string; onDismiss?: () => void; onApply?: () => void;
}) {
  const tone = data.prediction === 'conversion_likely' ? 'emerald' : 'rose';
  return (
    <Shell tone={tone} icon={Zap} title={data.prediction === 'conversion_likely' ? 'Conversion likely' : 'Risk of losing'} at={at} onDismiss={onDismiss}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-semibold text-zinc-100 numeric">{data.conversion_probability}%</span>
        <span className="text-xs text-zinc-400">predicted close</span>
      </div>
      {data.warning && <p className="text-sm text-rose-300 mb-3">{data.warning}</p>}
      <p className="text-sm text-zinc-300 mb-3">{data.recommendation}</p>
      {data.changes.length > 0 && (
        <ul className="space-y-1.5 mb-3 pb-3 border-b border-zinc-700">
          {data.changes.slice(0, 3).map((c, i) => (
            <li key={i} className="text-sm text-zinc-400">
              <span className="text-zinc-100 font-medium">{c.reason}</span> — {c.after}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <button onClick={onApply} className="px-3 h-8 rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400">Use rewrite</button>
        <CopyBtn text={data.optimized_draft.en} label="Copy EN" />
        <CopyBtn text={data.optimized_draft.ar} label="Copy AR" />
      </div>
    </Shell>
  );
}

// ─── Verify ────────────────────────────────────────────────────────────────

export function VerifyCard({
  data, at, forFilename, onDismiss,
}: {
  data: PaymentVerification; at: string; forFilename?: string; onDismiss?: () => void;
}) {
  const tone = data.is_authentic ? 'emerald' : 'rose';
  return (
    <Shell tone={tone} icon={data.is_authentic ? ShieldCheck : ShieldAlert} title={data.is_authentic ? 'Payment looks authentic' : 'Possible fraud'} at={at} onDismiss={onDismiss}>
      {forFilename && <div className="text-xs font-mono text-zinc-500 mb-2 truncate">{forFilename}</div>}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-2xl font-semibold text-zinc-100 numeric">{data.verification_score}<span className="text-base text-zinc-500">%</span></span>
        <span className={`text-xs px-2 py-0.5 rounded uppercase tracking-wider ${data.is_authentic ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>{data.action.replace(/_/g, ' ')}</span>
        <span className="text-xs text-zinc-400">{data.bank_detected}</span>
      </div>
      <p className="text-sm text-zinc-300 mb-3">{data.reasoning}</p>
      {data.discrepancies.length > 0 && (
        <ul className="space-y-1.5 mb-3 pb-3 border-b border-zinc-700">
          {data.discrepancies.map((d, i) => (
            <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Meta ok={data.metadata_consistency.status_bar_match} label="Status bar" />
        <Meta ok={data.metadata_consistency.resolution_match} label="Resolution" />
        <Meta ok={data.metadata_consistency.timestamp_match} label="Timestamp" />
      </div>
    </Shell>
  );
}

// ─── Magazine ──────────────────────────────────────────────────────────────

export function MagazineCard({ data, at, onDismiss }: { data: Magazine; at: string; onDismiss?: () => void }) {
  return (
    <Shell tone="emerald" icon={BookOpen} title="Personalized magazine" at={at} onDismiss={onDismiss}>
      <h4 className="text-base font-semibold text-zinc-100 mb-2">{data.magazine_headline}</h4>
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line mb-3 pb-3 border-b border-zinc-700">{data.editorial_content}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">Featured LE</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-100">{data.featured_limited_edition_sku}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">code {data.cashback_code}</span>
        </div>
      </div>
    </Shell>
  );
}

// ─── Shortcut ──────────────────────────────────────────────────────────────

export function ShortcutCard({
  trigger, en, ar, at, onUseEN, onUseAR, onUseBoth, onDismiss,
}: {
  trigger: string; en: string; ar: string; at: string;
  onUseEN?: () => void; onUseAR?: () => void; onUseBoth?: () => void; onDismiss?: () => void;
}) {
  return (
    <Shell tone="blue" icon={Sparkles} title={`Template ${trigger}`} at={at} onDismiss={onDismiss}>
      <div className="space-y-2 mb-3 pb-3 border-b border-zinc-700">
        <div className="text-sm text-zinc-300 leading-relaxed">{en}</div>
        <div className="text-sm text-zinc-300 leading-relaxed" dir="rtl">{ar}</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onUseEN} className="px-3 h-8 rounded-md bg-zinc-800 text-zinc-100 text-sm hover:bg-zinc-700 border border-zinc-700">Use EN</button>
        <button onClick={onUseAR} className="px-3 h-8 rounded-md bg-zinc-800 text-zinc-100 text-sm hover:bg-zinc-700 border border-zinc-700">Use AR</button>
        <button onClick={onUseBoth} className="px-3 h-8 rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400">Use both</button>
      </div>
    </Shell>
  );
}

// ─── System note ───────────────────────────────────────────────────────────

export function SystemNote({ text, tone = 'info', at }: { text: string; tone?: 'info' | 'warn' | 'good' | 'bad'; at: string }) {
  const tones = {
    info: 'text-zinc-400 bg-zinc-800/60 border-zinc-700',
    warn: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    good: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    bad:  'text-rose-300 bg-rose-500/10 border-rose-500/30',
  };
  return (
    <div className={`px-3 py-1 rounded-full text-xs border ${tones[tone]}`}>
      <span className="opacity-70 mr-2 numeric">{at}</span>
      {text}
    </div>
  );
}

// ─── Product share ─────────────────────────────────────────────────────────

export function ProductShareCard({
  data, at, onSendToCustomer, onDismiss,
}: {
  data: ProductShare;
  at: string;
  onSendToCustomer?: (text: string) => void;
  onDismiss?: () => void;
}) {
  const url = data.shopify_url || data.woocommerce_url || '';
  const lowestPrice = [data.shopify_price_aed, data.woocommerce_price_aed]
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b)[0];
  const waMessage = [data.title, lowestPrice ? formatAED(lowestPrice) : '', url].filter(Boolean).join('\n');

  return (
    <Shell tone="blue" icon={Package} title="Product" at={at} onDismiss={onDismiss}>
      <div className="flex gap-3 mb-3">
        <div className={`w-20 h-20 rounded-md shrink-0 relative overflow-hidden bg-gradient-to-br ${productGradient(data.image_hint)}`}>
          {data.is_limited_edition && (
            <span className="absolute top-1 left-1 px-1.5 h-4 rounded bg-zinc-900/80 text-amber-300 text-2xs flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" /> LE
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-zinc-100 leading-tight">{data.title}</div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">{data.sku}</div>
          <div className="text-xs text-zinc-400 mt-1">{data.category} · {data.material}</div>
          {!data.in_stock_anywhere && (
            <div className="text-xs text-rose-300 mt-1">Out of stock on both stores</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <ProdPriceCell store=".ae" price={data.shopify_price_aed} />
        <ProdPriceCell store=".com" price={data.woocommerce_price_aed} />
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-zinc-700">
        <button
          onClick={() => onSendToCustomer?.(waMessage)}
          className="flex-1 h-9 px-3 rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400 flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Send to customer
        </button>
        <CopyBtn text={waMessage} label="Copy" />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 rounded-md bg-zinc-800 text-zinc-100 text-sm hover:bg-zinc-700 border border-zinc-700 flex items-center gap-1.5"
            title="Open product page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </Shell>
  );
}

function ProdPriceCell({ store, price }: { store: string; price: number | null }) {
  if (price === null) {
    return (
      <div className="px-2.5 py-2 rounded border border-dashed border-zinc-700 text-center">
        <div className="text-xs uppercase tracking-wider text-zinc-600">{store}</div>
        <div className="text-sm text-zinc-600">—</div>
      </div>
    );
  }
  return (
    <div className="px-2.5 py-2 rounded border border-zinc-700 bg-zinc-900 text-center">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{store}</div>
      <div className="text-sm text-zinc-100 numeric">{formatAED(price)}</div>
    </div>
  );
}

function productGradient(hint?: string): string {
  const map: Record<string, string> = {
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
  return map[hint || ''] || 'from-zinc-700 via-zinc-800 to-zinc-700';
}

// ─── Shared ────────────────────────────────────────────────────────────────

function Shell({
  tone, icon: Icon, title, at, children, onDismiss,
}: {
  tone: 'emerald' | 'rose' | 'amber' | 'blue';
  icon: React.ComponentType<{ className?: string }>;
  title: string; at: string; children: React.ReactNode; onDismiss?: () => void;
}) {
  const ring = {
    emerald: 'border-emerald-500/30',
    rose:    'border-rose-500/30',
    amber:   'border-amber-500/30',
    blue:    'border-blue-500/30',
  }[tone];
  const iconColor = {
    emerald: 'text-emerald-400',
    rose:    'text-rose-400',
    amber:   'text-amber-400',
    blue:    'text-blue-400',
  }[tone];
  return (
    <div className={`rounded-lg border ${ring} bg-zinc-800/80 p-4 max-w-[600px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium text-zinc-100">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 numeric">{at}</span>
          {onDismiss && <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Tag({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${
      ok ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-zinc-600 text-zinc-500 bg-zinc-800'
    }`}>
      <span className={`w-1 h-1 rounded-full ${ok ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      {children}
    </span>
  );
}

function Meta({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      <span className="text-zinc-400">{label}</span>
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setC(true); setTimeout(() => setC(false), 1200); }}
      className="px-3 h-8 rounded-md bg-zinc-800 text-zinc-100 text-sm hover:bg-zinc-700 border border-zinc-700 flex items-center gap-1.5"
    >
      {c ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
