'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, X, Copy, Check, Loader2, Music, Tag } from 'lucide-react';
import type { Product, VeoResult } from '@/lib/inventory/types';

/**
 * Slide-in panel that generates a cinematic Veo prompt for a product.
 * Backed by /api/inventory/veo-prompt (VEO_CONTENT_INTELLIGENCE_PROMPT).
 */
export function VeoDrawer({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const [result, setResult] = useState<VeoResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) {
      setResult(null);
      return;
    }
    setLoading(true);
    fetch('/api/inventory/veo-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: product.master_sku }),
    })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setResult(j.veo); })
      .finally(() => setLoading(false));
  }, [open, product]);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <aside
        className="w-[520px] max-w-[90vw] h-full bg-canvas-raised border-l border-line shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 px-5 py-4 bg-canvas-raised/95 backdrop-blur border-b border-line-soft flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg text-ink">Veo Director</h2>
          </div>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 border-b border-line-soft">
          <div className="text-2xs text-ink-dim font-mono mb-1">{product.master_sku}</div>
          <h3 className="font-serif text-base text-ink mb-1">{product.display_title}</h3>
          <div className="text-2xs text-ink-dim">
            {product.material} · {product.category} {product.is_limited_edition && '· LE'}
          </div>
        </div>

        {loading && (
          <div className="px-5 py-6 flex items-center gap-2 text-2xs text-ink-dim">
            <Loader2 className="w-3 h-3 animate-spin" /> Generating cinematic prompt…
          </div>
        )}

        {result && (
          <>
            <Section title="Video prompt" copyable text={result.video_prompt}>
              <p className="text-sm text-ink leading-relaxed">{result.video_prompt}</p>
            </Section>

            <Section title="Creative brief" copyable text={result.creative_brief}>
              <p className="text-sm text-ink-muted leading-relaxed">{result.creative_brief}</p>
            </Section>

            <Section title="Music mood">
              <div className="flex items-start gap-2">
                <Music className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                <p className="text-sm text-ink-muted leading-relaxed">{result.music_mood}</p>
              </div>
            </Section>

            <Section title="Video tags">
              <div className="flex flex-wrap gap-1">
                {result.seo_video_tags.map((t) => (
                  <Badge key={t} tone="gold">
                    <Tag className="w-3 h-3" /> {t}
                  </Badge>
                ))}
              </div>
            </Section>

            <div className="sticky bottom-0 px-5 py-4 bg-canvas-raised/95 backdrop-blur border-t border-line-soft">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" size="md" onClick={onClose}>
                  Close
                </Button>
                <Button variant="primary" size="md">
                  <Video className="w-3.5 h-3.5" /> Send to Veo
                </Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
  copyable,
  text,
}: {
  title: string;
  children: React.ReactNode;
  copyable?: boolean;
  text?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="px-5 py-4 border-b border-line-soft">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs uppercase tracking-widest text-ink-dim">{title}</span>
        {copyable && text && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="flex items-center gap-1 text-2xs text-ink-dim hover:text-ink"
          >
            {copied ? <Check className="w-3 h-3 text-good" /> : <Copy className="w-3 h-3" />}
            {copied ? 'copied' : 'copy'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
