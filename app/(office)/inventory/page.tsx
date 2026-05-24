'use client';

import { useState, useMemo, useRef } from 'react';
import { CatalogueTile } from '@/components/inventory/catalogue-tile';
import { ParityCard, applyParityFilter, type ParityFilter } from '@/components/inventory/parity-card';
import { StrategistPanel } from '@/components/inventory/strategist-panel';
import { SEODrawer } from '@/components/inventory/seo-drawer';
import { VeoDrawer } from '@/components/inventory/veo-drawer';
import { getCatalogue, getParitySummary } from '@/lib/inventory/mock';
import { runStrategy } from '@/lib/inventory/strategy';
import type { Product } from '@/lib/inventory/types';
import { cn } from '@/lib/utils';
import { Brain, Search, Filter, X } from 'lucide-react';

/**
 * Inventory Room — a Showroom.
 *
 * Not a spreadsheet. Not a table. The room IS the catalogue wall.
 *
 * No page header. No always-on sidebar. A slim parity strip across the top.
 * Tiles fill the screen wall-to-wall. The Strategist is a slide-in drawer
 * (summoned from the right edge). Search is a summoned overlay.
 *
 * The "100 types of content" goal starts here: this room looks nothing
 * like WhatsApp Desk. They are different destinations, different worlds.
 */
export default function InventoryPage() {
  const allProducts = useMemo(() => getCatalogue(), []);
  const summary = useMemo(() => getParitySummary(), []);
  const suggestions = useMemo(() => runStrategy(allProducts), [allProducts]);

  const [filter, setFilter] = useState<ParityFilter>('all');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [activeSku, setActiveSku] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState<Product | null>(null);
  const [veoOpen, setVeoOpen] = useState<Product | null>(null);
  const [showStrategist, setShowStrategist] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(allProducts.map((p) => p.category)))],
    [allProducts],
  );

  const visible = useMemo(() => {
    let arr = applyParityFilter(allProducts, filter) as Product[];
    if (category !== 'all') arr = arr.filter((p) => p.category === category);
    if (q) {
      const n = q.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.display_title.toLowerCase().includes(n) ||
          p.master_sku.toLowerCase().includes(n) ||
          p.material.toLowerCase().includes(n),
      );
    }
    return arr;
  }, [allProducts, filter, category, q]);

  function pickSku(sku: string) {
    setActiveSku(sku);
    setFilter('all');
    setQ('');
    setShowStrategist(false);
    setTimeout(() => {
      document.getElementById(`tile-${sku}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-canvas">
      {/* Showroom — wall-to-wall tiles, generous padding from the screen edges */}
      <div className="pt-16 pb-24 px-6 md:px-10 lg:px-14">
        {/* Slim title strip — no chrome */}
        <div className="mb-10 flex items-end justify-between max-w-[1920px] mx-auto">
          <div>
            <div className="text-2xs uppercase tracking-[0.25em] text-gold mb-2">Inventory · Showroom</div>
            <h1 className="font-serif text-4xl md:text-5xl font-medium text-ink leading-none">
              {summary.total} pieces
              <span className="text-ink-muted italic ml-3 text-2xl md:text-3xl">on the wall</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-full border border-line-soft hover:border-line-strong text-ink-dim hover:text-ink text-xs"
            >
              <Search className="w-3.5 h-3.5" /> search
            </button>
            <button
              onClick={() => setShowStrategist(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-full border border-gold/30 bg-gold/5 hover:bg-gold/10 text-gold text-xs"
            >
              <Brain className="w-3.5 h-3.5" />
              Strategist
              {suggestions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gold/20 text-2xs numeric">{suggestions.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Parity strip — slim, ambient, not a panel-with-borders */}
        <div className="mb-8 max-w-[1920px] mx-auto">
          <ParityCard summary={summary} active={filter} onChange={setFilter} />
        </div>

        {/* Category strip */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto max-w-[1920px] mx-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-3 h-8 text-2xs uppercase tracking-widest rounded-full transition-colors whitespace-nowrap',
                category === c
                  ? 'bg-gold/15 text-gold'
                  : 'text-ink-dim hover:text-ink hover:bg-canvas-inset',
              )}
            >
              {c}
            </button>
          ))}
          <span className="ml-auto text-2xs text-ink-dim shrink-0">
            showing <span className="text-ink numeric">{visible.length}</span> / {summary.total}
          </span>
        </div>

        {/* The wall */}
        {visible.length === 0 ? (
          <div className="py-32 text-center text-sm text-ink-dim">
            No pieces match this filter.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-w-[1920px] mx-auto">
            {visible.map((p) => (
              <div key={p.id} id={`tile-${p.master_sku}`}>
                <CatalogueTile
                  p={p}
                  active={activeSku === p.master_sku}
                  onClick={() => setActiveSku(p.master_sku)}
                  onSEO={() => setSeoOpen(p)}
                  onVeo={() => setVeoOpen(p)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Strategist trigger when scrolled */}
      <button
        onClick={() => setShowStrategist(true)}
        className="md:hidden fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-gold text-canvas shadow-glow flex items-center justify-center"
      >
        <Brain className="w-5 h-5" />
      </button>

      {/* Strategist drawer */}
      {showStrategist && (
        <div className="fixed inset-0 z-40 flex animate-fade-in" onClick={() => setShowStrategist(false)}>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
          <aside
            className="w-[440px] max-w-[92vw] h-full bg-canvas-raised border-l border-line shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <StrategistPanel suggestions={suggestions} onPick={pickSku} onRefresh={() => {}} />
          </aside>
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center pt-[16vh] px-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-xl panel-raised overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 h-14 border-b border-line-soft">
              <Search className="w-4 h-4 text-ink-dim" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, SKU, material…"
                className="flex-1 bg-transparent outline-none text-base text-ink placeholder:text-ink-dim"
                onKeyDown={(e) => { if (e.key === 'Escape') setShowSearch(false); }}
              />
              <button onClick={() => setShowSearch(false)} className="text-ink-dim hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 text-2xs text-ink-dim">
              {q ? `${visible.length} match${visible.length === 1 ? '' : 'es'} on the wall` : 'Type to filter the wall below.'}
            </div>
          </div>
        </div>
      )}

      <SEODrawer product={seoOpen} open={!!seoOpen} onClose={() => setSeoOpen(null)} />
      <VeoDrawer product={veoOpen} open={!!veoOpen} onClose={() => setVeoOpen(null)} />
    </div>
  );
}
