'use client';

import { useState, useMemo, useEffect } from 'react';
import { CatalogueTile } from '@/components/inventory/catalogue-tile';
import { ParityCard, applyParityFilter, type ParityFilter } from '@/components/inventory/parity-card';
import { StrategistPanel } from '@/components/inventory/strategist-panel';
import { SEODrawer } from '@/components/inventory/seo-drawer';
import { VeoDrawer } from '@/components/inventory/veo-drawer';
import { getCatalogue, getParitySummary } from '@/lib/inventory/mock';
import { toProduct, paritySummaryFromLive } from '@/lib/inventory/live-adapter';
import { runStrategy } from '@/lib/inventory/strategy';
import type { Product, ParitySummary } from '@/lib/inventory/types';
import { Loader2, RefreshCw, Brain, Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';

/**
 * Inventory Room — Showroom over the LIVE catalogue.
 *
 * On mount: fetches /api/inventory/live (the same scrape Hex runs against
 * omniastores.ae + omniastores.com). Mock catalogue is rendered immediately
 * as a fast first paint, then replaced by live data when it arrives.
 *
 * Strategy suggestions, parity counts, filters, search — all run over
 * whichever set is current.
 */

const PAGE_SIZE = 60;
const LIVE_LIMIT = 100; // grid page size, not catalog cap

export default function InventoryPage() {
  // Local mock for fast first paint
  const mockProducts = useMemo(() => getCatalogue(), []);
  const mockSummary = useMemo(() => getParitySummary(), []);

  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [summary, setSummary] = useState<ParitySummary>(mockSummary);
  const [loadingLive, setLoadingLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [source, setSource] = useState<'mock' | 'live'>('mock');

  // Fetch live catalogue on mount
  useEffect(() => { loadLive(false); }, []);

  async function loadLive(force: boolean) {
    if (force) setRefreshing(true); else setLoadingLive(true);
    setLiveError(null);
    try {
      const res = await fetch(`/api/inventory/live?limit=${LIVE_LIMIT * 50}`, {
        method: force ? 'POST' : 'GET',
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'live fetch failed');
      if (Array.isArray(json.products) && json.products.length > 0) {
        const mapped = json.products.map(toProduct);
        setProducts(mapped);
        setSummary(paritySummaryFromLive(json.products, {
          age_sec: json.age_sec ?? 0,
          total: json.stats?.total ?? mapped.length,
        }));
        setSource('live');
      }
    } catch (err: any) {
      setLiveError(err?.message || 'Could not reach the live catalogue. Showing mock data.');
      setSource('mock');
    } finally {
      setLoadingLive(false);
      setRefreshing(false);
    }
  }

  const suggestions = useMemo(() => runStrategy(products), [products]);

  const [filter, setFilter] = useState<ParityFilter>('all');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [activeSku, setActiveSku] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState<Product | null>(null);
  const [veoOpen, setVeoOpen] = useState<Product | null>(null);
  const [showStrategist, setShowStrategist] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const all = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    all.sort();
    return ['all', ...all.slice(0, 20)]; // cap to keep the row scannable
  }, [products]);

  // Extra filters
  const [material, setMaterial] = useState<string>('all');
  const [stock, setStock] = useState<'all' | 'in_stock' | 'out'>('all');
  const [priceRange, setPriceRange] = useState<'all' | 'under_1k' | '1k_5k' | '5k_plus'>('all');
  const [leOnly, setLeOnly] = useState(false);

  // Materials list, computed from the live products
  const materials = useMemo(() => {
    const all = Array.from(new Set(products.map((p) => p.material).filter(Boolean)));
    all.sort();
    return ['all', ...all];
  }, [products]);

  // Reset paging when any filter changes
  useEffect(() => { setPage(1); }, [filter, category, q, material, stock, priceRange, leOnly]);

  const activeFilterCount = useMemo(
    () => [filter !== 'all', category !== 'all', material !== 'all', stock !== 'all', priceRange !== 'all', leOnly, !!q].filter(Boolean).length,
    [filter, category, material, stock, priceRange, leOnly, q],
  );

  function resetFilters() {
    setFilter('all'); setCategory('all'); setQ(''); setMaterial('all');
    setStock('all'); setPriceRange('all'); setLeOnly(false);
  }

  const filteredAll = useMemo(() => {
    let arr = applyParityFilter(products, filter) as Product[];
    if (category !== 'all') arr = arr.filter((p) => p.category === category);
    if (material !== 'all') arr = arr.filter((p) => p.material === material);
    if (leOnly) arr = arr.filter((p) => p.is_limited_edition);
    if (stock === 'in_stock') {
      arr = arr.filter((p) =>
        (p.shopify_qty !== null && p.shopify_qty > 0) ||
        (p.woocommerce_qty !== null && p.woocommerce_qty > 0) ||
        // Shopify public API hides qty; trust the `available` flag from the scrape via parity_status
        (p.on_shopify && p.shopify_qty === null && p.parity_status !== 'shopify_only' ? false : p.on_shopify && p.shopify_qty === null)
      );
    } else if (stock === 'out') {
      arr = arr.filter((p) =>
        (p.shopify_qty === 0 || p.woocommerce_qty === 0) &&
        !(p.shopify_qty && p.shopify_qty > 0) &&
        !(p.woocommerce_qty && p.woocommerce_qty > 0)
      );
    }
    if (priceRange !== 'all') {
      const min = priceRange === 'under_1k' ? 0 : priceRange === '1k_5k' ? 1000 : 5000;
      const max = priceRange === 'under_1k' ? 1000 : priceRange === '1k_5k' ? 5000 : Infinity;
      arr = arr.filter((p) => {
        const price = p.shopify_price_aed || p.woocommerce_price_aed || 0;
        return price >= min && price < max;
      });
    }
    if (q) {
      const n = q.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.display_title.toLowerCase().includes(n) ||
          p.master_sku.toLowerCase().includes(n) ||
          (p.material && p.material.toLowerCase().includes(n)),
      );
    }
    return arr;
  }, [products, filter, category, material, stock, priceRange, leOnly, q]);

  const visible = useMemo(() => filteredAll.slice(0, page * PAGE_SIZE), [filteredAll, page]);
  const canLoadMore = visible.length < filteredAll.length;

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
    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-900 text-zinc-100 font-sans">
      <DeskTopBar />

      <div className="px-6 md:px-10 lg:px-14 pt-6 pb-24">
        {/* PROMINENT SEARCH BAR — big and always visible, with status + actions */}
        <div className="max-w-[1920px] mx-auto mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the catalogue · title, SKU, material…"
                className="w-full h-11 pl-10 pr-10 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-zinc-800 bg-zinc-900 text-xs shrink-0">
              {loadingLive ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> <span className="text-zinc-400">Loading live…</span></>
              ) : source === 'live' ? (
                <>
                  <span className="px-1.5 h-4 rounded bg-emerald-500/90 text-zinc-900 font-mono text-2xs flex items-center">LIVE</span>
                  <span className="text-zinc-300 numeric">{filteredAll.length.toLocaleString()}</span>
                  <span className="text-zinc-500">of {summary.total.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <span className="px-1.5 h-4 rounded bg-amber-500/80 text-zinc-900 font-mono text-2xs flex items-center">MOCK</span>
                  <span className="text-zinc-300 numeric">{filteredAll.length}</span>
                </>
              )}
              <button
                onClick={() => loadLive(true)}
                disabled={refreshing}
                className="ml-1 p-1 rounded text-zinc-500 hover:text-zinc-100 disabled:opacity-50"
                title={`Refresh · ${summary.last_run}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => setShowStrategist(true)}
              className="h-11 px-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-sm font-medium flex items-center gap-2 shrink-0"
            >
              <Brain className="w-4 h-4" />
              Strategist
              {suggestions.length > 0 && (
                <span className="px-1.5 h-4 rounded bg-emerald-500/30 text-2xs numeric flex items-center">{suggestions.length}</span>
              )}
            </button>
          </div>

          {liveError && (
            <div className="mt-3 px-3 py-2 rounded border border-amber-500/30 bg-amber-500/5 text-xs text-amber-300">
              {liveError}
            </div>
          )}
        </div>

        {/* FILTER STRIP — material / store / stock / price / LE — always visible */}
        <div className="max-w-[1920px] mx-auto mb-4 space-y-2">
          <FilterRow label="Material">
            {materials.slice(0, 10).map((m) => (
              <FilterChip key={m} active={material === m} onClick={() => setMaterial(m)}>{m}</FilterChip>
            ))}
          </FilterRow>

          <FilterRow label="Category">
            {categories.slice(0, 12).map((c) => (
              <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterChip>
            ))}
          </FilterRow>

          <FilterRow label="Price">
            <FilterChip active={priceRange === 'all'} onClick={() => setPriceRange('all')}>all</FilterChip>
            <FilterChip active={priceRange === 'under_1k'} onClick={() => setPriceRange('under_1k')}>under AED 1K</FilterChip>
            <FilterChip active={priceRange === '1k_5k'} onClick={() => setPriceRange('1k_5k')}>AED 1K – 5K</FilterChip>
            <FilterChip active={priceRange === '5k_plus'} onClick={() => setPriceRange('5k_plus')}>AED 5K+</FilterChip>
          </FilterRow>

          <FilterRow label="More">
            <FilterChip active={leOnly} onClick={() => setLeOnly(!leOnly)} tone="gold">Limited editions only</FilterChip>
            <FilterChip active={stock === 'in_stock'} onClick={() => setStock(stock === 'in_stock' ? 'all' : 'in_stock')}>In stock</FilterChip>
            <FilterChip active={stock === 'out'} onClick={() => setStock(stock === 'out' ? 'all' : 'out')} tone="rose">Out of stock</FilterChip>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="ml-2 text-2xs text-zinc-400 hover:text-zinc-100 underline-offset-2 hover:underline"
              >
                Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
              </button>
            )}
          </FilterRow>
        </div>

        {/* Parity strip */}
        <div className="mb-6 max-w-[1920px] mx-auto">
          <ParityCard summary={summary} active={filter} onChange={setFilter} />
        </div>

        {/* Count line */}
        <div className="mb-4 flex items-center justify-between max-w-[1920px] mx-auto text-xs">
          <span className="text-zinc-500">
            Showing <span className="text-zinc-100 numeric">{visible.length}</span> of <span className="text-zinc-100 numeric">{filteredAll.length}</span>
            {filteredAll.length !== summary.total && <span className="ml-1">(filtered from {summary.total.toLocaleString()})</span>}
          </span>
        </div>

        {/* The wall */}
        {visible.length === 0 ? (
          <div className="py-32 text-center text-sm text-ink-dim">
            No pieces match this filter.
          </div>
        ) : (
          <>
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
            {canLoadMore && (
              <div className="mt-8 flex justify-center max-w-[1920px] mx-auto">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-5 h-10 rounded-full border border-line text-sm text-ink hover:border-line-strong"
                >
                  Show {Math.min(PAGE_SIZE, filteredAll.length - visible.length)} more · {filteredAll.length - visible.length} hidden
                </button>
              </div>
            )}
          </>
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

      {/* Legacy search overlay — kept for backwards compat but no longer triggered */}
      {false && showSearch && (
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

// ─── Filter primitives ─────────────────────────────────────────────────────

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-2xs uppercase tracking-wider text-zinc-500 w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-wrap">{children}</div>
    </div>
  );
}

function FilterChip({
  active, onClick, children, tone = 'default',
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  tone?: 'default' | 'gold' | 'rose';
}) {
  const tones = {
    default: active ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
    gold:    active ? 'bg-amber-500/30 text-amber-200 border-amber-500/50' : 'border-amber-500/30 text-amber-300/80 hover:text-amber-200 hover:border-amber-500/50',
    rose:    active ? 'bg-rose-500/30 text-rose-200 border-rose-500/50' : 'border-rose-500/30 text-rose-300/80 hover:text-rose-200 hover:border-rose-500/50',
  };
  return (
    <button
      onClick={onClick}
      className={`px-2.5 h-7 text-xs rounded-md border transition-colors whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
