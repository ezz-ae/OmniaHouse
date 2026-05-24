'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import type { Product, SEOResult } from '@/lib/inventory/types';

/**
 * Slide-in panel for SEO optimization on a single product.
 * Shows current state vs AI-generated. Apply pushes to /api/inventory/seo-optimize
 * which would update products.seo_*.
 */
export function SEODrawer({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const [result, setResult] = useState<SEOResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!open || !product) {
      setResult(null);
      setApplied(false);
      return;
    }
    setLoading(true);
    fetch('/api/inventory/seo-optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: product.master_sku }),
    })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setResult(j.seo); })
      .finally(() => setLoading(false));
  }, [open, product]);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <aside
        className="w-[480px] max-w-[90vw] h-full bg-canvas-raised border-l border-line shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 px-5 py-4 bg-canvas-raised/95 backdrop-blur border-b border-line-soft flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg text-ink">SEO Optimizer</h2>
          </div>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Product context */}
        <div className="px-5 py-4 border-b border-line-soft">
          <div className="text-2xs text-ink-dim font-mono mb-1">{product.master_sku}</div>
          <h3 className="font-serif text-base text-ink mb-2">{product.display_title}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={product.seo_status === 'optimized' ? 'good' : 'warn'}>
              {product.seo_status}
            </Badge>
            <Badge tone={product.google_shopping_status === 'listed' ? 'good' : 'warn'}>
              Shopping: {product.google_shopping_status}
            </Badge>
          </div>
        </div>

        {/* Current state */}
        <Section title="Current">
          <Field label="Title">{product.seo_title || <em className="text-ink-dim">none</em>}</Field>
          <Field label="Description">
            {product.seo_description || <em className="text-ink-dim">none</em>}
          </Field>
        </Section>

        {/* AI-generated */}
        <Section title="Proposed by AI">
          {loading && (
            <div className="flex items-center gap-2 text-2xs text-ink-dim">
              <Loader2 className="w-3 h-3 animate-spin" /> SEO_OPTIMIZATION_PROMPT running…
            </div>
          )}
          {result && (
            <>
              <Field
                label="Title"
                hint={`${result.seo_title.length}/60`}
                hintTone={result.seo_title.length > 60 ? 'bad' : 'good'}
              >
                {result.seo_title}
                <CopyBtn text={result.seo_title} />
              </Field>
              <Field
                label="Description"
                hint={`${result.seo_description.length}/160`}
                hintTone={result.seo_description.length > 160 ? 'bad' : 'good'}
              >
                {result.seo_description}
                <CopyBtn text={result.seo_description} />
              </Field>

              {/* Shopping attributes */}
              <div className="mt-3 pt-3 border-t border-line-soft">
                <div className="label mb-2">Google Shopping</div>
                <dl className="space-y-1.5 text-2xs">
                  <Row label="Category" value={result.shopping_attributes.google_product_category} />
                  <Row label="Material" value={result.shopping_attributes.material} />
                  <Row label="Gender" value={result.shopping_attributes.gender} />
                </dl>
              </div>

              {/* Weakness audit */}
              <div className="mt-3 pt-3 border-t border-line-soft">
                <div className="label mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Weakness audit
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-serif text-2xl text-gold numeric">
                    {result.audit.weakness_score}<span className="text-ink-dim text-sm">/10</span>
                  </span>
                  <span className="text-2xs text-ink-dim">
                    {result.audit.weakness_score <= 3
                      ? 'strong'
                      : result.audit.weakness_score <= 6
                        ? 'has gaps'
                        : 'weak — fix before optimizing further'}
                  </span>
                </div>
                {result.audit.missing_details.length > 0 && (
                  <ul className="space-y-1 mb-2">
                    {result.audit.missing_details.map((m, i) => (
                      <li key={i} className="text-2xs text-ink-muted flex items-start gap-2">
                        <Dot tone="warn" />
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
                {result.audit.backlink_opportunity_keywords.length > 0 && (
                  <div className="pt-2 border-t border-line-soft">
                    <div className="text-2xs text-ink-dim mb-1">Backlink keywords</div>
                    <div className="flex flex-wrap gap-1">
                      {result.audit.backlink_opportunity_keywords.map((k) => (
                        <Badge key={k} tone="gold">{k}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Section>

        {/* Apply */}
        <div className="sticky bottom-0 px-5 py-4 bg-canvas-raised/95 backdrop-blur border-t border-line-soft">
          {applied ? (
            <div className="flex items-center justify-center gap-2 text-2xs text-good">
              <Check className="w-3.5 h-3.5" /> Applied to products.seo_title + seo_description
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="md" onClick={onClose}>
                Skip
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!result}
                onClick={() => setApplied(true)}
              >
                <Sparkles className="w-3.5 h-3.5" /> Apply to catalogue
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-line-soft">
      <div className="label mb-2">{title}</div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  hintTone = 'good',
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  hintTone?: 'good' | 'bad';
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs uppercase tracking-widest text-ink-dim">{label}</span>
        {hint && (
          <span className={cn('text-2xs numeric', hintTone === 'good' ? 'text-good' : 'text-bad')}>
            {hint}
          </span>
        )}
      </div>
      <div className="text-sm text-ink leading-relaxed bg-canvas-inset/40 border border-line-soft rounded px-3 py-2 relative">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-dim shrink-0">{label}</dt>
      <dd className="text-ink-muted text-right truncate">{value}</dd>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="absolute top-1.5 right-1.5 p-1 rounded text-ink-dim hover:text-ink hover:bg-canvas-inset"
    >
      {copied ? <Check className="w-3 h-3 text-good" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
