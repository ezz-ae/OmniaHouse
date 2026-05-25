'use client';

import { useState, useMemo, useEffect } from 'react';
import { CatalogueTile } from '@/components/inventory/catalogue-tile';
import { ParityCard, applyParityFilter, type ParityFilter } from '@/components/inventory/parity-card';
import { StrategistPanel } from '@/components/inventory/strategist-panel';
import { SEODrawer } from '@/components/inventory/seo-drawer';
import { VeoDrawer } from '@/components/inventory/veo-drawer';
import { HexEmbed } from '@/components/inventory/hex-embed';
import { getCatalogue, getParitySummary } from '@/lib/inventory/mock';
import { toProduct, paritySummaryFromLive } from '@/lib/inventory/live-adapter';
import { runStrategy } from '@/lib/inventory/strategy';
import type { Product, ParitySummary } from '@/lib/inventory/types';
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Camera,
  CheckCircle2,
  Columns,
  FileText,
  Filter,
  Loader2,
  PackagePlus,
  Percent,
  Pencil,
  RefreshCw,
  Scan,
  Search,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
import type { InventoryAnalysis } from '@/lib/inventory/analysis';
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
type InventoryView =
  | 'catalogue' | 'add' | 'edit' | 'compare'
  | 'ai_listing' | 'invoice_scan'
  | 'discounts' | 'sync' | 'analysis' | 'hex';
type CouponRow = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  applies_to: string;
  applies_value: string;
  active: boolean;
  targets: ('shopify' | 'woocommerce')[];
  sync_status: Record<'shopify' | 'woocommerce', string>;
};
type SyncJobRow = { id: string; kind: string; target: string; status: string; summary: string; created_at: string };

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
  const [view, setView] = useState<InventoryView>('catalogue');
  const [opsProducts, setOpsProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJobRow[]>([]);
  const [opsBusy, setOpsBusy] = useState<string | null>(null);
  const [opsNotice, setOpsNotice] = useState<{ tone: 'good' | 'warn' | 'bad'; text: string } | null>(null);

  // Fetch live catalogue on mount
  useEffect(() => { loadLive(false); loadOps(); }, []);

  async function loadOps() {
    const json = await fetch('/api/operations/snapshot').then((r) => r.json()).catch(() => null);
    if (!json?.ok) return;
    setOpsProducts(json.products || []);
    setCoupons(json.coupons || []);
    setSyncJobs(json.sync_jobs || []);
  }

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

  async function syncProducts(productIds?: string[], target: 'all' | 'shopify' | 'woocommerce' = 'all') {
    setOpsBusy(`sync-${target}`);
    setOpsNotice(null);
    try {
      const json = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, product_ids: productIds, kind: productIds?.length ? 'product' : 'catalogue' }),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error || 'Sync failed');
      setOpsNotice({ tone: 'good', text: json.job.summary });
      await loadOps();
    } catch (err: any) {
      setOpsNotice({ tone: 'bad', text: err?.message || 'Sync failed' });
    } finally {
      setOpsBusy(null);
    }
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

      <div className="px-4 sm:px-6 md:px-10 lg:px-14 pt-4 pb-24">
        {/* Stores room header */}
        <div className="max-w-[1920px] mx-auto mb-3 flex items-baseline justify-between gap-3">
          <div>
            <div className="text-2xs uppercase tracking-wider text-zinc-500">Stores</div>
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100">omniastores.ae · omniastores.com</h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Both stores in one room — catalogue, parity, AI listings, invoice scan, strategy.</p>
          </div>
        </div>

        {/* Grouped internal menu */}
        <div className="max-w-[1920px] mx-auto mb-4 space-y-1.5">
          <ModeGroup label="Browse">
            <InventoryModeButton active={view === 'catalogue'} onClick={() => setView('catalogue')} icon={Search}>Catalogue</InventoryModeButton>
            <InventoryModeButton active={view === 'compare'} onClick={() => setView('compare')} icon={Columns}>Compare .ae · .com</InventoryModeButton>
            <InventoryModeButton active={view === 'analysis'} onClick={() => setView('analysis')} icon={BarChart3}>Analysis</InventoryModeButton>
            <InventoryModeButton active={view === 'hex'} onClick={() => setView('hex')} icon={Brain}>Hex view</InventoryModeButton>
          </ModeGroup>
          <ModeGroup label="Edit">
            <InventoryModeButton active={view === 'add'} onClick={() => setView('add')} icon={PackagePlus}>Add product</InventoryModeButton>
            <InventoryModeButton active={view === 'edit'} onClick={() => setView('edit')} icon={Pencil}>Edit product</InventoryModeButton>
            <InventoryModeButton active={view === 'invoice_scan'} onClick={() => setView('invoice_scan')} icon={Camera}>Invoice → Product</InventoryModeButton>
            <InventoryModeButton active={view === 'ai_listing'} onClick={() => setView('ai_listing')} icon={Wand2}>AI listing editor</InventoryModeButton>
          </ModeGroup>
          <ModeGroup label="Operate">
            <InventoryModeButton active={view === 'sync'} onClick={() => setView('sync')} icon={UploadCloud}>Sync stores</InventoryModeButton>
            <InventoryModeButton active={view === 'discounts'} onClick={() => setView('discounts')} icon={Percent}>Discounts</InventoryModeButton>
          </ModeGroup>
        </div>

        {opsNotice && (
          <div className={cn(
            'max-w-[1920px] mx-auto mb-4 px-3 py-2 rounded border text-xs flex items-center gap-2',
            opsNotice.tone === 'good' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
            opsNotice.tone === 'warn' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            opsNotice.tone === 'bad' && 'border-rose-500/30 bg-rose-500/10 text-rose-300',
          )}>
            {opsNotice.tone === 'good' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {opsNotice.text}
          </div>
        )}

        {view === 'analysis' ? (
          <AnalysisPanel onJumpSku={(sku) => { setActiveSku(sku); setView('catalogue'); }} />
        ) : view === 'compare' ? (
          <ComparePanel onJumpSku={(sku) => { setActiveSku(sku); setView('catalogue'); }} />
        ) : view === 'ai_listing' ? (
          <AIListingPanel
            products={opsProducts.length ? opsProducts : products}
            activeSku={activeSku}
            onPickSku={setActiveSku}
          />
        ) : view === 'invoice_scan' ? (
          <InvoiceScanPanel
            onApplyLine={(line) => {
              setActiveSku(line.suggested_master_sku);
              setView('add');
              setOpsNotice({ tone: 'good', text: `Line "${line.description}" sent to Add Product · review and save.` });
            }}
          />
        ) : view === 'hex' ? (
          <div className="max-w-[1920px] mx-auto">
            <HexEmbed />
          </div>
        ) : view === 'add' ? (
          <AddProductPanel
            busy={opsBusy === 'add-product'}
            onCreated={(product) => {
              setProducts((arr) => [product, ...arr.filter((p) => p.master_sku !== product.master_sku)]);
              setActiveSku(product.master_sku);
              loadOps();
              setOpsNotice({ tone: 'good', text: `${product.display_title} created and queued for store sync.` });
              setView('edit');
            }}
            setBusy={setOpsBusy}
          />
        ) : view === 'edit' ? (
          <EditProductPanel
            products={opsProducts.length ? opsProducts : products}
            activeSku={activeSku}
            busy={opsBusy === 'edit-product'}
            onUpdated={(product) => {
              setProducts((arr) => arr.map((p) => (p.master_sku === product.master_sku || p.id === product.id ? product : p)));
              setActiveSku(product.master_sku);
              loadOps();
              setOpsNotice({ tone: 'good', text: `${product.display_title} updated.` });
            }}
            setBusy={setOpsBusy}
          />
        ) : view === 'sync' ? (
          <SyncPanel
            activeSku={activeSku}
            syncJobs={syncJobs}
            busy={opsBusy}
            onSync={syncProducts}
          />
        ) : view === 'discounts' ? (
          <DiscountsPanel
            coupons={coupons}
            busy={opsBusy === 'discount'}
            setBusy={setOpsBusy}
            onCreated={(coupon) => {
              setCoupons((arr) => [coupon, ...arr.filter((c) => c.id !== coupon.id)]);
              loadOps();
              setOpsNotice({ tone: 'good', text: `${coupon.code} synced to discount control.` });
            }}
          />
        ) : (
        <>
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
                    onEdit={() => { setActiveSku(p.master_sku); setView('edit'); }}
                    onSync={() => syncProducts([p.master_sku])}
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

function InventoryModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 px-3 rounded-md text-xs border transition-colors flex items-center gap-1.5',
        active
          ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
          : 'border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

function AddProductPanel({
  busy,
  setBusy,
  onCreated,
}: {
  busy: boolean;
  setBusy: (v: string | null) => void;
  onCreated: (p: Product) => void;
}) {
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('add-product');
    try {
      const fd = new FormData(event.currentTarget);
      const payload = productPayload(fd);
      const json = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error || 'Could not create product');
      await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'all', product_ids: [json.product.master_sku], kind: 'product' }),
      });
      onCreated(json.product);
      event.currentTarget.reset();
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-[980px] mx-auto rounded-md border border-zinc-800 bg-zinc-900 p-5">
      <PanelTitle icon={PackagePlus} title="Add new product" subtitle="Creates the OmniaHouse product record and syncs the product state to Shopify/WooCommerce connectors." />
      <ProductFields />
      <div className="mt-5 flex justify-end">
        <button disabled={busy} className="h-10 px-4 rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
          Create product and sync
        </button>
      </div>
    </form>
  );
}

function EditProductPanel({
  products,
  activeSku,
  busy,
  setBusy,
  onUpdated,
}: {
  products: Product[];
  activeSku: string | null;
  busy: boolean;
  setBusy: (v: string | null) => void;
  onUpdated: (p: Product) => void;
}) {
  const [selectedSku, setSelectedSku] = useState(activeSku || products[0]?.master_sku || '');
  useEffect(() => {
    if (activeSku) setSelectedSku(activeSku);
  }, [activeSku]);
  const selected = products.find((p) => p.master_sku === selectedSku) || products[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy('edit-product');
    try {
      const fd = new FormData(event.currentTarget);
      const payload = productPayload(fd);
      const json = await fetch(`/api/inventory/products/${encodeURIComponent(selected.master_sku)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error || 'Could not update product');
      onUpdated(json.product);
    } finally {
      setBusy(null);
    }
  }

  if (!selected) {
    return <div className="max-w-[980px] mx-auto rounded-md border border-zinc-800 bg-zinc-900 p-8 text-sm text-zinc-500">No products loaded.</div>;
  }

  return (
    <form key={selected.master_sku} onSubmit={submit} className="max-w-[980px] mx-auto rounded-md border border-zinc-800 bg-zinc-900 p-5">
      <PanelTitle icon={Pencil} title="Edit current product" subtitle="Updates the master product record used by Inventory, WhatsApp sharing, order placement, discounts, and store sync." />
      <div className="mb-4">
        <label className="text-2xs uppercase tracking-wider text-zinc-500">Product</label>
        <select value={selected.master_sku} onChange={(e) => setSelectedSku(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
          {products.map((p) => <option key={p.master_sku} value={p.master_sku}>{p.master_sku} · {p.display_title}</option>)}
        </select>
      </div>
      <ProductFields product={selected} />
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={async () => {
            setBusy('edit-product');
            try {
              await fetch('/api/inventory/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: 'all', product_ids: [selected.master_sku], kind: 'product' }),
              });
            } finally {
              setBusy(null);
            }
          }}
          disabled={busy}
          className="h-10 px-4 rounded-md border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Sync selected
        </button>
        <button disabled={busy} className="h-10 px-4 rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save product
        </button>
      </div>
    </form>
  );
}

function DiscountsPanel({
  coupons,
  busy,
  setBusy,
  onCreated,
}: {
  coupons: CouponRow[];
  busy: boolean;
  setBusy: (v: string | null) => void;
  onCreated: (c: CouponRow) => void;
}) {
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('discount');
    try {
      const fd = new FormData(event.currentTarget);
      const payload = {
        code: String(fd.get('code') || ''),
        type: fd.get('type'),
        value: Number(fd.get('value') || 0),
        applies_to: fd.get('applies_to'),
        applies_value: String(fd.get('applies_value') || ''),
        active: fd.get('active') === 'on',
        targets: ['shopify', 'woocommerce'],
      };
      const json = await fetch('/api/inventory/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (!json.ok) throw new Error(json.error || 'Could not create coupon');
      onCreated(json.coupon);
      event.currentTarget.reset();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-[1180px] mx-auto grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-4">
      <form onSubmit={submit} className="rounded-md border border-zinc-800 bg-zinc-900 p-5">
        <PanelTitle icon={Percent} title="Create discount or coupon" subtitle="Creates an internal coupon and records sync state for Shopify and WooCommerce." />
        <div className="grid grid-cols-2 gap-3">
          <Field name="code" label="Code" required placeholder="OMNIA10" />
          <label className="block">
            <span className="text-2xs uppercase tracking-wider text-zinc-500">Type</span>
            <select name="type" className="mt-1 h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed AED</option>
            </select>
          </label>
          <Field name="value" label="Value" type="number" required placeholder="10" />
          <label className="block">
            <span className="text-2xs uppercase tracking-wider text-zinc-500">Applies to</span>
            <select name="applies_to" className="mt-1 h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
              <option value="all">All products</option>
              <option value="sku">SKU</option>
              <option value="category">Category</option>
              <option value="limited_edition">Limited Edition</option>
            </select>
          </label>
          <div className="col-span-2"><Field name="applies_value" label="SKU/category value" placeholder="CR-925-07 or Rings" /></div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-zinc-300">
            <input name="active" type="checkbox" defaultChecked className="accent-emerald-500" />
            Active immediately
          </label>
        </div>
        <button disabled={busy} className="mt-5 h-10 w-full rounded-md bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />}
          Create coupon and sync
        </button>
      </form>

      <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="h-10 px-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-100">Coupons</span>
          <span className="text-xs text-zinc-500">{coupons.length} records</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="px-4 py-3 grid grid-cols-[1fr_120px_120px_140px] gap-3 items-center text-sm">
              <div>
                <div className="text-zinc-100 font-mono">{coupon.code}</div>
                <div className="text-xs text-zinc-500">{coupon.applies_to} {coupon.applies_value ? `· ${coupon.applies_value}` : ''}</div>
              </div>
              <div className="text-zinc-300">{coupon.type === 'percentage' ? `${coupon.value}%` : `AED ${coupon.value}`}</div>
              <div className={coupon.active ? 'text-emerald-400' : 'text-zinc-500'}>{coupon.active ? 'active' : 'paused'}</div>
              <div className="text-xs text-zinc-400">{coupon.targets.join(' + ')}</div>
            </div>
          ))}
          {coupons.length === 0 && <div className="px-4 py-10 text-center text-sm text-zinc-500">No coupons yet.</div>}
        </div>
      </div>
    </div>
  );
}

function SyncPanel({
  activeSku,
  syncJobs,
  busy,
  onSync,
}: {
  activeSku: string | null;
  syncJobs: SyncJobRow[];
  busy: string | null;
  onSync: (productIds?: string[], target?: 'all' | 'shopify' | 'woocommerce') => Promise<void>;
}) {
  return (
    <div className="max-w-[1180px] mx-auto grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-5">
        <PanelTitle icon={UploadCloud} title="Sync control" subtitle="Pushes product and catalogue state through the same API contract used by Shopify and WooCommerce connectors." />
        <div className="space-y-2">
          <SyncButton busy={busy === 'sync-all'} onClick={() => onSync(undefined, 'all')}>Sync full catalogue</SyncButton>
          <SyncButton busy={busy === 'sync-shopify'} onClick={() => onSync(undefined, 'shopify')}>Sync Shopify only</SyncButton>
          <SyncButton busy={busy === 'sync-woocommerce'} onClick={() => onSync(undefined, 'woocommerce')}>Sync WooCommerce only</SyncButton>
          <SyncButton disabled={!activeSku} busy={busy === 'sync-all'} onClick={() => activeSku && onSync([activeSku], 'all')}>Sync selected SKU</SyncButton>
        </div>
        {activeSku && <div className="mt-3 text-xs text-zinc-500">Selected SKU: <span className="font-mono text-zinc-300">{activeSku}</span></div>}
      </div>
      <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="h-10 px-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-100">Sync jobs</span>
          <span className="text-xs text-zinc-500">{syncJobs.length} recent</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {syncJobs.map((job) => (
            <div key={job.id} className="px-4 py-3 grid grid-cols-[120px_100px_1fr_170px] gap-3 text-sm">
              <span className="text-zinc-300">{job.kind}</span>
              <span className="text-zinc-400">{job.target}</span>
              <span className={job.status === 'completed' ? 'text-emerald-300' : 'text-rose-300'}>{job.summary}</span>
              <span className="text-xs text-zinc-500 font-mono">{new Date(job.created_at).toLocaleString('en-AE', { hour12: false })}</span>
            </div>
          ))}
          {syncJobs.length === 0 && <div className="px-4 py-10 text-center text-sm text-zinc-500">No sync jobs yet.</div>}
        </div>
      </div>
    </div>
  );
}

function ProductFields({ product }: { product?: Product }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field name="master_sku" label="SKU" required defaultValue={product?.master_sku} placeholder="CR-925-07" />
      <Field name="display_title" label="Product title" required defaultValue={product?.display_title} placeholder="Crescent Ring · 925 Silver" />
      <Field name="category" label="Category" defaultValue={product?.category || 'Rings'} placeholder="Rings" />
      <Field name="material" label="Material" defaultValue={product?.material || '925 silver'} placeholder="925 silver" />
      <Field name="shopify_price_aed" label="Shopify price AED" type="number" defaultValue={product?.shopify_price_aed ?? ''} />
      <Field name="woocommerce_price_aed" label="WooCommerce price AED" type="number" defaultValue={product?.woocommerce_price_aed ?? ''} />
      <Field name="shopify_qty" label="Shopify quantity" type="number" defaultValue={product?.shopify_qty ?? ''} />
      <Field name="woocommerce_qty" label="WooCommerce quantity" type="number" defaultValue={product?.woocommerce_qty ?? ''} />
      <Field name="shopify_url" label="Shopify URL" defaultValue={product?.shopify_url ?? ''} />
      <Field name="woocommerce_url" label="WooCommerce URL" defaultValue={product?.woocommerce_url ?? ''} />
      <Field name="image_url" label="Image URL" defaultValue={product?.image_url ?? ''} />
      <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300">
        <input name="is_limited_edition" type="checkbox" defaultChecked={product?.is_limited_edition} className="accent-amber-500" />
        Limited Edition
      </label>
      <div className="md:col-span-2">
        <Field name="seo_title" label="SEO title" defaultValue={product?.seo_title ?? ''} />
      </div>
      <div className="md:col-span-2">
        <label className="block">
          <span className="text-2xs uppercase tracking-wider text-zinc-500">SEO description</span>
          <textarea name="seo_description" defaultValue={product?.seo_description ?? ''} rows={3} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600" />
        </label>
      </div>
    </div>
  );
}

function productPayload(fd: FormData) {
  return {
    master_sku: String(fd.get('master_sku') || '').trim(),
    display_title: String(fd.get('display_title') || '').trim(),
    master_title: String(fd.get('display_title') || '').trim().toLowerCase(),
    category: String(fd.get('category') || 'Rings'),
    material: String(fd.get('material') || '925 silver'),
    is_limited_edition: fd.get('is_limited_edition') === 'on',
    shopify_price_aed: emptyToNull(fd.get('shopify_price_aed')),
    woocommerce_price_aed: emptyToNull(fd.get('woocommerce_price_aed')),
    shopify_qty: emptyToNull(fd.get('shopify_qty')),
    woocommerce_qty: emptyToNull(fd.get('woocommerce_qty')),
    shopify_url: emptyStringToNull(fd.get('shopify_url')),
    woocommerce_url: emptyStringToNull(fd.get('woocommerce_url')),
    image_url: emptyStringToNull(fd.get('image_url')),
    seo_title: emptyStringToNull(fd.get('seo_title')),
    seo_description: emptyStringToNull(fd.get('seo_description')),
    on_shopify: Boolean(emptyToNull(fd.get('shopify_price_aed')) !== null || emptyStringToNull(fd.get('shopify_url'))),
    on_woocommerce: Boolean(emptyToNull(fd.get('woocommerce_price_aed')) !== null || emptyStringToNull(fd.get('woocommerce_url'))),
  };
}

function emptyToNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function emptyStringToNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  return raw || null;
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 text-zinc-100">
        <Icon className="w-4 h-4 text-emerald-400" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500 leading-6">{subtitle}</p>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-2xs uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        className="mt-1 h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
      />
    </label>
  );
}

function SyncButton({
  children,
  busy,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
      {children}
    </button>
  );
}

// ─── Analysis panel (Hex notebook output, rendered live) ──────────────────

function AnalysisPanel({ onJumpSku }: { onJumpSku: (sku: string) => void }) {
  const [data, setData] = useState<InventoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/inventory/analysis');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed');
      setData(json.analysis);
    } catch (err: any) {
      setError(err?.message || 'Could not load analysis');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return (
      <div className="max-w-[1480px] mx-auto rounded-md border border-zinc-800 bg-zinc-900 p-8 text-sm text-zinc-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Running inventory analysis…
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-[1480px] mx-auto rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
    );
  }
  if (!data) return null;

  const health = Object.fromEntries(data.inventory_health.map((m) => [m.metric, m.value]));

  return (
    <div className="max-w-[1480px] mx-auto space-y-4">
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">Inventory analysis</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Same cells as the Hex notebook, computed live from the OmniaHouse catalogue + signals + orders.</p>
        </div>
        <button onClick={load} className="h-9 px-3 rounded border border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Recompute
        </button>
      </div>

      {/* Health metrics grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <Stat label="Products" value={String(health.products_total)} tone="zinc" />
        <Stat label=".ae · .com" value={`${health.products_shopify} · ${health.products_woocommerce}`} tone="sky" />
        <Stat label="Drift" value={String(health.price_drift_count)} tone="amber" />
        <Stat label=".ae only" value={String(health.products_shopify_only)} tone="rose" />
        <Stat label=".com only" value={String(health.products_woocommerce_only)} tone="rose" />
        <Stat label="LE active" value={String(data.le_lifecycle.reduce((s, r) => s + r.in_stock, 0))} tone="violet" />
        <Stat label="Out of stock" value={String((health.out_of_stock_shopify as number) + (health.out_of_stock_woocommerce as number))} tone="rose" />
        <Stat label="Low stock" value={String((health.low_stock_shopify as number) + (health.low_stock_woocommerce as number))} tone="amber" />
        <Stat label="Avg price .ae" value={`AED ${Number(health.avg_price_aed_shopify || 0).toLocaleString()}`} tone="emerald" />
        <Stat label="Avg price .com" value={`AED ${Number(health.avg_price_aed_woocommerce || 0).toLocaleString()}`} tone="emerald" />
        <Stat label="Revenue paid" value={`AED ${Number(health.revenue_paid_aed || 0).toLocaleString()}`} tone="emerald" />
        <Stat label="AOV" value={`AED ${Number(health.avg_order_value_aed || 0).toLocaleString()}`} tone="sky" />
      </section>

      {/* Two-column grid for tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalysisTable
          title="Top movers (7d)"
          subtitle="Best conversion ratios — push, restock, share to recent inquirers."
          icon={TrendingUp}
          empty="No movers yet."
          rows={data.top_movers}
          columns={[
            { key: 'sku', label: 'SKU', cls: 'font-mono text-emerald-400 cursor-pointer' },
            { key: 'display_title', label: 'Title' },
            { key: 'bought_7d', label: 'Bought', cls: 'numeric text-right' },
            { key: 'ratio', label: 'Rate', format: (v) => `${(Number(v) * 100).toFixed(1)}%`, cls: 'numeric text-right' },
            { key: 'signal', label: 'Signal' },
          ]}
          onRowClick={(row) => onJumpSku(row.sku)}
        />
        <AnalysisTable
          title="Slow movers (7d)"
          subtitle="High views, low conversion. Audit content, SEO, or pricing."
          icon={AlertTriangle}
          empty="No slow movers."
          rows={data.slow_movers}
          columns={[
            { key: 'sku', label: 'SKU', cls: 'font-mono text-amber-400 cursor-pointer' },
            { key: 'display_title', label: 'Title' },
            { key: 'seen_7d', label: 'Seen', cls: 'numeric text-right' },
            { key: 'bounce_pct', label: 'Bounce', format: (v) => `${v}%`, cls: 'numeric text-right' },
            { key: 'reason', label: 'Reason' },
          ]}
          onRowClick={(row) => onJumpSku(row.sku)}
        />
        <AnalysisTable
          title="Restock recommendations"
          subtitle="Stock <=3 across the live catalogue."
          icon={PackagePlus}
          empty="Stock is healthy."
          rows={data.restock_recommendations}
          columns={[
            { key: 'sku', label: 'SKU', cls: 'font-mono text-rose-400 cursor-pointer' },
            { key: 'display_title', label: 'Title' },
            { key: 'remaining_qty', label: 'Left', cls: 'numeric text-right text-rose-300' },
            { key: 'price_aed', label: 'Price', format: (v) => v ? `AED ${Number(v).toLocaleString()}` : '—', cls: 'numeric text-right' },
            { key: 'reason', label: 'Reason' },
          ]}
          onRowClick={(row) => onJumpSku(row.sku)}
        />
        <AnalysisTable
          title="Demand signals"
          subtitle="Cross-reference of brand signals + WhatsApp asks + ghost browse."
          icon={Sparkles}
          empty="No active demand signals."
          rows={data.demand_signals}
          columns={[
            { key: 'sku', label: 'SKU', cls: 'font-mono text-violet-400 cursor-pointer' },
            { key: 'display_title', label: 'Title' },
            { key: 'whatsapp_asks', label: 'WA', cls: 'numeric text-right' },
            { key: 'ghost_browse', label: 'Ghost', cls: 'numeric text-right' },
            { key: 'positive_signals', label: '+', cls: 'numeric text-right text-emerald-400' },
            { key: 'negative_signals', label: '−', cls: 'numeric text-right text-rose-400' },
            { key: 'recommended_action', label: 'Action' },
          ]}
          onRowClick={(row) => onJumpSku(row.sku)}
        />
        <AnalysisTable
          title="Price drift (severity)"
          subtitle="How many products drift between .ae and .com — by severity band."
          icon={Percent}
          empty="No drift."
          rows={data.drift_severity}
          columns={[
            { key: 'severity', label: 'Severity', cls: 'capitalize' },
            { key: 'pct_range', label: 'Range' },
            { key: 'products', label: 'Count', cls: 'numeric text-right' },
          ]}
        />
        <AnalysisTable
          title="Per-store gap"
          subtitle="Which stores are missing which products."
          icon={UploadCloud}
          empty="Stores are aligned."
          rows={data.per_store_gap}
          columns={[
            { key: 'gap', label: 'Gap' },
            { key: 'products', label: 'Products', cls: 'numeric text-right' },
          ]}
        />
        <AnalysisTable
          title="Category mix"
          subtitle="Catalogue distribution by category across both stores."
          icon={Filter}
          empty="No categories."
          rows={data.category_mix.slice(0, 12)}
          columns={[
            { key: 'category', label: 'Category' },
            { key: 'shopify', label: '.ae', cls: 'numeric text-right' },
            { key: 'woocommerce', label: '.com', cls: 'numeric text-right' },
            { key: 'total', label: 'Total', cls: 'numeric text-right font-medium' },
          ]}
        />
        <AnalysisTable
          title="LE lifecycle"
          subtitle="Limited Edition presence and stock state per store."
          icon={Sparkles}
          empty="No LE products."
          rows={data.le_lifecycle}
          columns={[
            { key: 'source', label: 'Source', cls: 'capitalize' },
            { key: 'in_stock', label: 'In stock', cls: 'numeric text-right text-emerald-300' },
            { key: 'out_of_stock', label: 'Out', cls: 'numeric text-right text-rose-300' },
          ]}
        />
      </div>

      <div className="text-2xs text-zinc-600 text-right">
        Generated · {new Date(data.generated_at).toLocaleString('en-AE', { hour12: false })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'zinc' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' }) {
  const toneCls = tone === 'emerald' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-400' : tone === 'rose' ? 'text-rose-400' : tone === 'sky' ? 'text-sky-400' : tone === 'violet' ? 'text-violet-400' : 'text-zinc-200';
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 truncate">{label}</div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}

function AnalysisTable<T extends Record<string, any>>({
  title, subtitle, icon: Icon, rows, columns, empty, onRowClick,
}: {
  title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>;
  rows: T[]; empty: string;
  columns: { key: keyof T & string; label: string; cls?: string; format?: (v: any) => string }[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-100">{title}</span>
          <span className="ml-auto text-2xs text-zinc-500">{rows.length}</span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-2xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              {columns.map((c) => (<th key={c.key} className={`px-3 py-2 ${c.cls?.includes('text-right') ? 'text-right' : 'text-left'} font-medium`}>{c.label}</th>))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((row, idx) => (
              <tr key={idx} onClick={() => onRowClick?.(row)} className={onRowClick ? 'hover:bg-zinc-800/40 cursor-pointer' : ''}>
                {columns.map((c) => {
                  const raw = row[c.key];
                  const value = c.format ? c.format(raw) : raw === null || raw === undefined ? '—' : String(raw);
                  return <td key={c.key} className={`px-3 py-2 ${c.cls || 'text-zinc-300'} truncate max-w-[260px]`}>{value}</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-zinc-500">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Grouped internal menu helper ─────────────────────────────────────────

function ModeGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-2xs uppercase tracking-wider text-zinc-500 w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

// ─── Compare panel · .ae vs .com per SKU ──────────────────────────────────

type CompareRow = {
  sku: string; display_title: string; category: string; material: string;
  image_url: string | null;
  parity_status: string; price_delta_pct: number | null;
  shopify: { listed: boolean; price_aed: number | null; qty: number | null; url: string | null };
  woocommerce: { listed: boolean; price_aed: number | null; qty: number | null; url: string | null };
};
type Verdict = { sku: string; drift: string; action: string };

function ComparePanel({ onJumpSku }: { onJumpSku: (sku: string) => void }) {
  const [skusInput, setSkusInput] = useState('');
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [meta, setMeta] = useState<{ mode?: string; model?: string | null; total?: number; compared?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(skus?: string) {
    setLoading(true); setError(null);
    try {
      const url = skus ? `/api/inventory/compare?skus=${encodeURIComponent(skus)}` : '/api/inventory/compare';
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'compare failed');
      setRows(json.comparisons || []);
      const v: Record<string, Verdict> = {};
      for (const item of (json.verdicts || []) as Verdict[]) v[item.sku] = item;
      setVerdicts(v);
      setMeta({ mode: json.mode, model: json.model, total: json.total_products, compared: json.compared });
    } catch (err: any) { setError(err?.message || 'compare failed'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-[1480px] mx-auto space-y-4">
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Columns className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            value={skusInput}
            onChange={(e) => setSkusInput(e.target.value)}
            placeholder="Comma-separated SKUs · empty = widest price drifts"
            className="flex-1 h-10 px-3 rounded border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(skusInput.trim() || undefined)} disabled={loading} className="h-10 px-4 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Compare
          </button>
          {meta?.mode && (
            <span className={`h-10 px-3 rounded border text-2xs uppercase tracking-wider flex items-center ${meta.mode === 'real' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
              {meta.mode === 'real' ? `Gemini · ${meta.model}` : 'rules'}
            </span>
          )}
        </div>
      </div>
      {error && <div className="rounded border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 px-4 py-2">{error}</div>}
      {meta && (
        <div className="text-2xs text-zinc-500">
          Comparing {meta.compared} of {meta.total} products in the live catalogue.
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.sku} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-start gap-3">
              {row.image_url && <img src={row.image_url} alt="" className="w-14 h-14 rounded border border-zinc-800 object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-emerald-400 shrink-0">{row.sku}</span>
                  <span className="text-2xs text-zinc-500 truncate">{row.category} · {row.material}</span>
                </div>
                <div className="text-sm text-zinc-100 truncate">{row.display_title}</div>
                <div className="mt-1 text-2xs">
                  <span className={`rounded border px-1.5 py-0.5 ${row.parity_status === 'both_match' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : row.parity_status === 'both_price_drift' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                    {row.parity_status.replace(/_/g, ' ')}{row.price_delta_pct !== null ? ` · ${row.price_delta_pct.toFixed(1)}%` : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-2xs uppercase tracking-wider text-zinc-500">omniastores.ae</div>
                <div className="mt-0.5 text-zinc-100 numeric">{row.shopify.listed ? `AED ${row.shopify.price_aed?.toLocaleString()}` : '—'}</div>
                <div className="text-2xs text-zinc-500">{row.shopify.qty !== null ? `qty ${row.shopify.qty}` : 'qty hidden'}</div>
                {row.shopify.url && <a href={row.shopify.url} target="_blank" rel="noreferrer" className="text-2xs text-sky-400 hover:underline">Open →</a>}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-2xs uppercase tracking-wider text-zinc-500">omniastores.com</div>
                <div className="mt-0.5 text-zinc-100 numeric">{row.woocommerce.listed ? `AED ${row.woocommerce.price_aed?.toLocaleString()}` : '—'}</div>
                <div className="text-2xs text-zinc-500">{row.woocommerce.qty !== null ? `qty ${row.woocommerce.qty}` : 'qty hidden'}</div>
                {row.woocommerce.url && <a href={row.woocommerce.url} target="_blank" rel="noreferrer" className="text-2xs text-sky-400 hover:underline">Open →</a>}
              </div>
            </div>
            {verdicts[row.sku] && (
              <div className="mt-3 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">
                <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">Verdict</div>
                <div className="text-zinc-200">{verdicts[row.sku].drift}</div>
                <div className="mt-1 text-emerald-400">→ {verdicts[row.sku].action}</div>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button onClick={() => onJumpSku(row.sku)} className="text-2xs text-zinc-400 hover:text-zinc-100">Open in catalogue →</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <div className="col-span-full text-center text-sm text-zinc-500 py-10">No comparisons yet.</div>
        )}
      </div>
    </div>
  );
}

// ─── AI Listing Editor ────────────────────────────────────────────────────

type Listing = {
  seo_title?: string; seo_description?: string;
  google_shopping?: { google_product_category?: string; material?: string; gender?: string; age_group?: string };
  marketing_copy?: string;
  bullets?: string[];
  alt_text?: string;
  tags?: string[];
};

function AIListingPanel({
  products, activeSku, onPickSku,
}: {
  products: Product[]; activeSku: string | null; onPickSku: (sku: string) => void;
}) {
  const [selectedSku, setSelectedSku] = useState(activeSku || products[0]?.master_sku || '');
  const [locale, setLocale] = useState<'en' | 'ar' | 'both'>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [arabic, setArabic] = useState<Listing | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  useEffect(() => { if (activeSku) setSelectedSku(activeSku); }, [activeSku]);
  const selected = products.find((p) => p.master_sku === selectedSku) || products[0];

  async function generate() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/inventory/ai-listing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            sku: selected.master_sku, title: selected.display_title,
            category: selected.category, material: selected.material,
            is_limited_edition: selected.is_limited_edition,
            price_aed: selected.shopify_price_aed || selected.woocommerce_price_aed,
          },
          locale,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'failed');
      setListing(json.listing); setArabic(json.arabic); setMode(json.mode); setModel(json.model);
    } catch (err: any) { setError(err?.message || 'AI listing failed'); }
    finally { setBusy(false); }
  }

  async function applyToProduct() {
    if (!selected || !listing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/products/${encodeURIComponent(selected.master_sku)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seo_title: listing.seo_title,
          seo_description: listing.seo_description,
          seo_status: 'optimized',
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'apply failed');
      onPickSku(selected.master_sku);
    } catch (err: any) { setError(err?.message || 'apply failed'); }
    finally { setBusy(false); }
  }

  if (!selected) {
    return <div className="max-w-[1180px] mx-auto rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">No products loaded.</div>;
  }

  return (
    <div className="max-w-[1480px] mx-auto grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-100">AI listing editor</span>
        </div>
        <div className="text-xs text-zinc-500 mb-3">Pick a product. Gemini writes SEO title, description, Google Shopping fields, marketing copy, alt text, bullets, and tags. Optionally also in Arabic.</div>
        <label className="block">
          <span className="text-2xs uppercase tracking-wider text-zinc-500">Product</span>
          <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} className="mt-1 w-full h-10 rounded border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
            {products.slice(0, 200).map((p) => <option key={p.master_sku} value={p.master_sku}>{p.master_sku} · {p.display_title.slice(0, 40)}</option>)}
          </select>
        </label>
        <div className="mt-3 flex gap-1.5">
          {(['en', 'ar', 'both'] as const).map((l) => (
            <button key={l} onClick={() => setLocale(l)} className={`flex-1 h-8 rounded border text-2xs uppercase ${locale === l ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>{l}</button>
          ))}
        </div>
        <button onClick={generate} disabled={busy} className="mt-4 h-10 w-full rounded bg-emerald-500 text-zinc-900 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate with Gemini
        </button>
        {listing && (
          <button onClick={applyToProduct} disabled={busy} className="mt-2 h-10 w-full rounded border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Apply to product
          </button>
        )}
        {mode && (
          <div className="mt-3 text-2xs">
            <span className={mode === 'real' ? 'text-emerald-400' : 'text-amber-400'}>{mode === 'real' ? `Live · Gemini · ${model}` : 'Rule-based fallback'}</span>
          </div>
        )}
        {error && <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 px-2 py-1.5">{error}</div>}
      </div>

      <div className="space-y-3">
        {!listing && !busy && (
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500 text-center">Generate to see Gemini&apos;s draft listing.</div>
        )}
        {listing && <ListingCard title="English" listing={listing} />}
        {arabic && <ListingCard title="Arabic · العربية" listing={arabic} rtl />}
      </div>
    </div>
  );
}

function ListingCard({ title, listing, rtl }: { title: string; listing: Listing; rtl?: boolean }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2">{title}</div>
      {listing.seo_title && (
        <div className="mb-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-600">SEO title</div>
          <div className="text-sm text-zinc-100">{listing.seo_title}</div>
        </div>
      )}
      {listing.seo_description && (
        <div className="mb-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-600">Meta description</div>
          <div className="text-sm text-zinc-300">{listing.seo_description}</div>
        </div>
      )}
      {listing.marketing_copy && (
        <div className="mb-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-600">Marketing copy</div>
          <div className="text-sm text-zinc-300 leading-relaxed">{listing.marketing_copy}</div>
        </div>
      )}
      {listing.bullets && listing.bullets.length > 0 && (
        <div className="mb-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-600">Selling points</div>
          <ul className="mt-1 text-sm text-zinc-300 space-y-0.5">{listing.bullets.map((b, i) => <li key={i}>• {b}</li>)}</ul>
        </div>
      )}
      {listing.alt_text && (
        <div className="mb-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-600">Image alt</div>
          <div className="text-sm text-zinc-300 italic">{listing.alt_text}</div>
        </div>
      )}
      {listing.google_shopping && (
        <div className="mb-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-600">Google Shopping</div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(listing.google_shopping).map(([k, v]) => (
              <div key={k} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1">
                <div className="text-2xs text-zinc-500">{k.replace(/_/g, ' ')}</div>
                <div className="text-zinc-200">{v as string}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {listing.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {listing.tags.map((t) => <span key={t} className="text-2xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">{t}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Invoice → Product ────────────────────────────────────────────────────

type InvoiceLine = {
  description: string; sku: string | null; qty: number;
  unit_cost: number | null; total_cost: number | null;
  suggested_master_sku: string; suggested_category: string; suggested_material: string;
};
type Invoice = {
  supplier_name: string; invoice_number: string | null; invoice_date: string | null;
  currency: string; subtotal: number | null; tax: number | null; total: number | null;
  line_items: InvoiceLine[];
};

function InvoiceScanPanel({ onApplyLine }: { onApplyLine: (line: InvoiceLine) => void }) {
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function scan(file: File) {
    setBusy(true); setError(null);
    setPreview(URL.createObjectURL(file));
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(reader.error);
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(',')[1];
      const res = await fetch('/api/inventory/invoice-scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, mime_type: file.type || 'image/jpeg' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'scan failed');
      setInvoice(json.invoice); setMode(json.mode); setModel(json.model);
    } catch (err: any) { setError(err?.message || 'scan failed'); }
    finally { setBusy(false); }
  }

  async function loadSample() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/inventory/invoice-scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'sample failed');
      setInvoice(json.invoice); setMode(json.mode); setModel(json.model);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-[1280px] mx-auto grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-4">
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-zinc-100">Invoice → Product</span>
        </div>
        <div className="text-xs text-zinc-500 mb-4">
          Take a photo of a supplier invoice (or upload one). Gemini Vision reads the line items and prefills the Add Product form per line.
        </div>
        <label className="block rounded border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 bg-zinc-950 p-6 text-center cursor-pointer transition-colors">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f); }}
            className="hidden"
          />
          {preview ? (
            <img src={preview} alt="invoice" className="max-h-64 mx-auto rounded" />
          ) : (
            <div className="text-zinc-400 flex flex-col items-center gap-2">
              <Scan className="w-8 h-8 text-zinc-500" />
              <div className="text-sm">Tap to open camera or pick a photo</div>
              <div className="text-2xs text-zinc-600">JPG / PNG / HEIC</div>
            </div>
          )}
        </label>
        <button onClick={loadSample} disabled={busy} className="mt-3 h-9 w-full rounded border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          Load sample invoice
        </button>
        {mode && (
          <div className="mt-3 text-2xs">
            <span className={mode === 'real' ? 'text-emerald-400' : 'text-amber-400'}>{mode === 'real' ? `Gemini Vision · ${model}` : 'Sample (no API key or vision failed)'}</span>
          </div>
        )}
        {error && <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 px-2 py-1.5">{error}</div>}
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden">
        {!invoice ? (
          <div className="p-10 text-center text-sm text-zinc-500">Scan an invoice to see extracted line items.</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{invoice.supplier_name}</div>
                  <div className="text-2xs text-zinc-500">{invoice.invoice_number} · {invoice.invoice_date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-100 numeric">{invoice.currency} {invoice.total?.toLocaleString()}</div>
                  <div className="text-2xs text-zinc-500">Subtotal {invoice.subtotal?.toLocaleString()} · Tax {invoice.tax?.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="text-2xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-left py-2 px-3">Suggested SKU</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-left py-2 px-3">Material</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Unit</th>
                  <th className="text-right py-2 px-3">Total</th>
                  <th className="text-right py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {invoice.line_items.map((line, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 text-zinc-200">{line.description}</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">{line.suggested_master_sku}</td>
                    <td className="py-2 px-3 text-zinc-400">{line.suggested_category}</td>
                    <td className="py-2 px-3 text-zinc-400">{line.suggested_material}</td>
                    <td className="py-2 px-3 text-right text-zinc-300 numeric">{line.qty}</td>
                    <td className="py-2 px-3 text-right text-zinc-300 numeric">{line.unit_cost ?? '—'}</td>
                    <td className="py-2 px-3 text-right text-zinc-100 numeric">{line.total_cost ?? '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => onApplyLine(line)} className="h-7 px-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-2xs text-emerald-300 hover:bg-emerald-500/20">
                        Send to Add Product →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
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
