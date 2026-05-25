'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { SHORTCUTS } from '@/lib/whatsapp/shortcuts';
import { mockWritingCheck, searchProducts } from '@/lib/whatsapp/mock';
import { Sparkles, Send, Paperclip, Loader2, X, Package, Crown } from 'lucide-react';
import type { WritingCheck } from '@/lib/whatsapp/types';
import type { ProductShare } from '@/lib/whatsapp/thread';
import { formatAED } from '@/lib/utils';

export type SlashAction =
  | 'extract' | 'optimize' | 'verify' | 'magazine'
  | 'tamara'  | 'tabby'    | 'invoice' | 'complete' | 'sync'
  | 'customer' | 'order';

/**
 * Compose — one row, real-sized input, big targets.
 * "/" types into the input or click the AI button → palette pops above.
 *
 * Below the input: inline writing assistant. Tone label always visible,
 * issue count appears only when there's a real suggestion. No parked panel.
 */
export function MessengerCompose({
  onSend,
  onSlashAction,
  onShortcutPick,
  onShareProduct,
  busy,
}: {
  onSend: (text: string) => void;
  onSlashAction: (action: SlashAction) => void;
  onShortcutPick: (trigger_key: string) => void;
  onShareProduct?: (p: ProductShare) => void;
  busy?: SlashAction | null;
}) {
  const [text, setText] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [writing, setWriting] = useState<WritingCheck | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [text]);

  // Detect typed slash commands, including product searches such as
  // "/product crescent" while the agent continues typing the query.
  useEffect(() => {
    const m = text.match(/(?:^|\s)(\/[a-z0-9_-]+(?:\s+[^\n]*)?|\/)$/i);
    if (m) {
      setPaletteOpen(true);
      setPaletteQuery(m[1].slice(1));
      setPaletteIdx(0);
    }
  }, [text]);

  // Writing assistant — debounced 600ms
  useEffect(() => {
    if (!text || text.length < 5) { setWriting(null); return; }
    const t = setTimeout(() => setWriting(mockWritingCheck(text)), 600);
    return () => clearTimeout(t);
  }, [text]);

  const SLASH_ACTIONS: { id: SlashAction; label: string; hint: string }[] = useMemo(() => [
    { id: 'extract',  label: '/extract',  hint: 'Pull a structured order from this chat' },
    { id: 'optimize', label: '/optimize', hint: 'Predict conversion + rewrite the draft' },
    { id: 'verify',   label: '/verify',   hint: 'Check the latest payment screenshot' },
    { id: 'tamara',   label: '/tamara',   hint: 'Generate a Tamara 4-installment payment link' },
    { id: 'tabby',    label: '/tabby',    hint: 'Generate a Tabby 4-installment payment link' },
    { id: 'invoice',  label: '/invoice',  hint: 'Send the Shopify draft invoice to the customer' },
    { id: 'complete', label: '/complete', hint: 'Mark the pushed Shopify draft as paid/complete' },
    { id: 'sync',     label: '/sync',     hint: 'Refresh customer cashback wallet balance' },
    { id: 'customer', label: '/customer', hint: 'Create or update the unified customer profile' },
    { id: 'order',    label: '/order',    hint: 'Place an order from the latest extraction' },
    { id: 'magazine', label: '/magazine', hint: 'Post-purchase personalized magazine' },
  ], []);

  type Row = { kind: 'action'; id: SlashAction; label: string; hint: string }
           | { kind: 'shortcut'; id: string; label: string; hint: string }
           | { kind: 'product'; id: string; product: ProductShare };

  // Product search mode — triggered by /product or /find
  const productMode = useMemo(() => {
    const m = paletteQuery.match(/^(product|find)\s*(.*)$/i);
    return m ? m[2].trim() : null;
  }, [paletteQuery]);

  // Inventory results come from the shared operations catalogue, which can be
  // populated by live store sync, manual product creation, or local operations.
  const [liveProducts, setLiveProducts] = useState<ProductShare[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSource, setLiveSource] = useState<'live' | 'local' | null>(null);
  const [liveStats, setLiveStats] = useState<{ total: number; matched: number } | null>(null);

  useEffect(() => {
    if (productMode === null) {
      setLiveProducts(null);
      setLiveSource(null);
      setLiveStats(null);
      return;
    }
    let cancelled = false;
    setLiveLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/inventory/products?q=${encodeURIComponent(productMode)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.ok && Array.isArray(json.products) && json.products.length > 0) {
          const mapped: ProductShare[] = json.products.slice(0, 12).map((p: any) => ({
            sku: p.master_sku || p.sku || p.match_key?.replace(/^(sku|title):/, ''),
            title: p.display_title,
            category: p.category,
            material: p.material,
            image_url: p.image_url || null,
            shopify_price_aed: p.shopify_price_aed,
            woocommerce_price_aed: p.woocommerce_price_aed,
            shopify_url: p.shopify_url,
            woocommerce_url: p.woocommerce_url,
            in_stock_anywhere:
              p.in_stock_anywhere ??
              Boolean((p.shopify_qty !== null && p.shopify_qty > 0) || (p.woocommerce_qty !== null && p.woocommerce_qty > 0)),
            is_limited_edition: p.is_limited_edition,
            source: p.source === 'live' ? 'live' : undefined,
          }));
          setLiveProducts(mapped);
          setLiveSource(json.products.some((p: any) => p.source === 'live') ? 'live' : 'local');
          setLiveStats({ total: json.products.length, matched: mapped.length });
        } else {
          const mock = searchProducts(productMode, 12).map((p) => ({ ...p, source: 'mock' as const }));
          setLiveProducts(mock);
          setLiveSource('local');
          setLiveStats(null);
        }
      } catch {
        if (cancelled) return;
        const mock = searchProducts(productMode, 12).map((p) => ({ ...p, source: 'mock' as const }));
        setLiveProducts(mock);
        setLiveSource('local');
        setLiveStats(null);
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [productMode]);

  const rows: Row[] = useMemo(() => {
    if (productMode !== null) {
      const products = liveProducts ?? searchProducts(productMode, 12);
      return products.map((p) => ({ kind: 'product' as const, id: p.sku, product: p }));
    }
    const q = paletteQuery.toLowerCase();
    const a: Row[] = SLASH_ACTIONS
      .filter((x) => !q || x.id.includes(q))
      .map((x) => ({ kind: 'action', id: x.id, label: x.label, hint: x.hint }));
    const productEntry: Row[] = (!q || 'product'.includes(q) || 'find'.includes(q))
      ? [{ kind: 'action' as any, id: 'product' as any, label: '/product', hint: 'Search the live catalogue (Shopify + WooCommerce)' } as Row]
      : [];
    const s: Row[] = SHORTCUTS
      .filter((sc) => !q || sc.trigger_key.includes(q) || sc.content_en.toLowerCase().includes(q))
      .slice(0, q ? 16 : 8)
      .map((sc) => ({ kind: 'shortcut', id: sc.id, label: sc.trigger_key, hint: sc.content_en }));
    return [...a, ...productEntry, ...s];
  }, [paletteQuery, productMode, liveProducts, SLASH_ACTIONS]);

  function clearSlash() { setText((prev) => prev.replace(/(\/[a-z0-9_-]*(?:\s.*)?)$/, '')); }
  function closePalette() { setPaletteOpen(false); setPaletteQuery(''); setPaletteIdx(0); }
  function enterProductMode() {
    setText((prev) => {
      const cleaned = prev.replace(/(\/[a-z0-9_-]*)$/, '');
      return cleaned + '/product ';
    });
    setPaletteOpen(true);
    setPaletteQuery('product ');
    setPaletteIdx(0);
    ref.current?.focus();
  }
  function chooseRow(r: Row) {
    if (r.kind === 'action') {
      // Special case: /product enters product-search mode rather than firing an AI action
      if ((r.id as any) === 'product') {
        enterProductMode();
        return;
      }
      clearSlash(); closePalette();
      onSlashAction(r.id);
    } else if (r.kind === 'shortcut') {
      clearSlash(); closePalette();
      onShortcutPick(r.label);
    } else if (r.kind === 'product') {
      clearSlash(); closePalette();
      onShareProduct?.(r.product);
    }
    ref.current?.focus();
  }
  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (paletteOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteIdx((i) => Math.min(rows.length - 1, i + 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setPaletteIdx((i) => Math.max(0, i - 1)); return; }
      if (e.key === 'Enter' && rows[paletteIdx]) { e.preventDefault(); chooseRow(rows[paletteIdx]); return; }
      if (e.key === 'Escape')    { e.preventDefault(); closePalette(); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); handleSend();
    }
  }
  function handleSend() {
    if (!text.trim()) return;
    onSend(text); setText(''); setWriting(null); closePalette();
  }
  function toggleAI() {
    if (paletteOpen) { closePalette(); return; }
    setPaletteOpen(true); setPaletteQuery(''); setPaletteIdx(0);
    ref.current?.focus();
  }

  const toneColor = writing?.tone_check === 'luxury' ? 'text-emerald-400'
    : writing?.tone_check === 'urgent' ? 'text-amber-400'
    : writing?.tone_check === 'casual' ? 'text-zinc-400' : 'text-zinc-500';

  return (
    <div className="relative shrink-0 border-t border-zinc-800 bg-zinc-900">
      {/* Palette anchored above */}
      {paletteOpen && rows.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 max-h-[300px] overflow-y-auto bg-zinc-900 border-t border-zinc-800 shadow-xl">
          <div className="sticky top-0 px-4 py-1.5 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              {paletteQuery ? `/${paletteQuery}` : 'AI tools & shortcuts'}
              {productMode !== null && (
                <>
                  {liveLoading ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> :
                    liveSource === 'live' ? <span className="px-1 h-3.5 rounded bg-emerald-500/90 text-zinc-900 font-mono text-2xs flex items-center">LIVE</span> :
                    liveSource === 'local' ? <span className="px-1 h-3.5 rounded bg-sky-500/80 text-zinc-900 font-mono text-2xs flex items-center">LOCAL</span> : null}
                  {liveStats && <span className="text-zinc-500 normal-case tracking-normal">· {liveStats.matched} of {liveStats.total}</span>}
                </>
              )}
            </span>
            <button onClick={closePalette} className="text-zinc-500 hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>
          </div>
          <ul>
            {rows.map((r, i) => {
              const isActive = i === paletteIdx;
              if (r.kind === 'product') {
                const p = r.product;
                return (
                  <li key={`product-${p.sku}`}>
                    <button
                      onClick={() => chooseRow(r)}
                      onMouseEnter={() => setPaletteIdx(i)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800/70'}`}
                    >
                      <Package className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-100 block truncate">{p.title}</span>
                        <span className="text-2xs text-zinc-500 font-mono">{p.sku} · {p.category}</span>
                      </span>
                      <span className="text-xs text-zinc-300 numeric shrink-0">
                        {p.shopify_price_aed ? formatAED(p.shopify_price_aed) : p.woocommerce_price_aed ? formatAED(p.woocommerce_price_aed) : '—'}
                      </span>
                      {p.is_limited_edition && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                      {!p.in_stock_anywhere && <span className="text-2xs text-rose-400 shrink-0">out</span>}
                    </button>
                  </li>
                );
              }
              const isAction = r.kind === 'action';
              return (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    onClick={() => chooseRow(r)}
                    onMouseEnter={() => setPaletteIdx(i)}
                    className={`w-full text-left px-4 py-2 flex items-start gap-3 transition-colors ${isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800/70'}`}
                  >
                    <span className={`font-mono text-sm shrink-0 w-24 ${isAction ? 'text-emerald-400' : 'text-blue-400'}`}>{r.label}</span>
                    <span className="text-xs text-zinc-400 line-clamp-2 flex-1">{r.hint}</span>
                    {isAction && <span className="text-2xs uppercase tracking-wider text-emerald-500/70 shrink-0">AI</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Compose row */}
      <div className="px-3 pt-2.5 pb-1 flex items-end gap-2">
        <button className="w-9 h-9 shrink-0 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center" title="Attach">
          <Paperclip className="w-4 h-4" />
        </button>
        <button
          onClick={toggleAI}
          className={`w-9 h-9 shrink-0 rounded-md flex items-center justify-center transition-colors ${
            paletteOpen ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title="AI tools & shortcuts (/)"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </button>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Write a message…   /  for AI tools and shortcuts"
          rows={1}
          className="flex-1 resize-none min-h-[40px] max-h-[180px] px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={`h-9 px-4 shrink-0 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            text.trim() ? 'bg-emerald-500 text-zinc-900 hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
          title="Send (⌘↵)"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>

      {/* Writing assistant — subtle, inline */}
      <div className="px-3 pb-2 h-5 flex items-center gap-3 text-xs">
        {writing ? (
          <>
            <span className="text-zinc-500">tone:</span>
            <span className={toneColor}>{writing.tone_check}</span>
            {writing.issues.length > 0 && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-amber-400">{writing.issues.length} suggestion{writing.issues.length === 1 ? '' : 's'}</span>
                <span className="text-zinc-500 truncate">
                  {writing.issues.slice(0, 1).map((i) => `${i.kind}: "${i.before}" → "${i.after}"`).join(' · ')}
                </span>
              </>
            )}
            {writing.suggested_completion && (
              <>
                <span className="text-zinc-700 ml-auto">·</span>
                <button
                  onClick={() => setText(text + writing.suggested_completion)}
                  className="text-blue-400 hover:text-blue-300 truncate max-w-[260px]"
                  title="Append suggestion"
                >
                  + {writing.suggested_completion.trim()}
                </button>
              </>
            )}
          </>
        ) : (
          <span className="text-zinc-700">⌘↵ to send · / for AI tools and templates</span>
        )}
      </div>
    </div>
  );
}
