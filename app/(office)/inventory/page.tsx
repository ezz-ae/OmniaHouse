'use client';

import { useState, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { CatalogueTile } from '@/components/inventory/catalogue-tile';
import { ParityCard, applyParityFilter, type ParityFilter } from '@/components/inventory/parity-card';
import { StrategistPanel } from '@/components/inventory/strategist-panel';
import { SEODrawer } from '@/components/inventory/seo-drawer';
import { VeoDrawer } from '@/components/inventory/veo-drawer';
import { getCatalogue, getParitySummary } from '@/lib/inventory/mock';
import { runStrategy } from '@/lib/inventory/strategy';
import type { Product } from '@/lib/inventory/types';
import { Search, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const gridRef = useRef<HTMLDivElement | null>(null);

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
    setTimeout(() => {
      const el = document.getElementById(`tile-${sku}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Commerce"
        title="Inventory"
        description="Every piece, both stores, one room. The AI strategist surfaces what to fix first."
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="subtle" size="sm">
              <ExternalLink className="w-3.5 h-3.5" /> Open Hex
            </Button>
          </>
        }
      />

      {/* Parity card + filter chips */}
      <ParityCard summary={summary} active={filter} onChange={setFilter} />

      {/* Search + categories */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, SKU, material…"
            className="w-full h-8 pl-8 pr-3 bg-canvas-panel border border-line rounded text-xs text-ink placeholder:text-ink-dim focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-2.5 h-8 text-2xs rounded border transition-colors whitespace-nowrap',
                category === c
                  ? 'bg-gold/10 text-gold border-gold/30'
                  : 'border-line text-ink-dim hover:text-ink',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid + strategist */}
      <div className="grid grid-cols-12 gap-3" style={{ minHeight: '60vh' }}>
        <div className="col-span-12 lg:col-span-8 xl:col-span-9" ref={gridRef}>
          {visible.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-ink-dim">
              No products match this filter.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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

        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="sticky top-16">
            <StrategistPanel suggestions={suggestions} onPick={pickSku} />
          </div>
        </div>
      </div>

      <SEODrawer product={seoOpen} open={!!seoOpen} onClose={() => setSeoOpen(null)} />
      <VeoDrawer product={veoOpen} open={!!veoOpen} onClose={() => setVeoOpen(null)} />
    </div>
  );
}
