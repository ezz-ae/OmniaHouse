'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ROOMS, ROOM_GROUPS } from '@/lib/rooms';
import { Search, ArrowRight, X, ChevronDown } from 'lucide-react';

/**
 * Go button + dropdown — the ONLY way to navigate between rooms.
 * Replaces in-header room nav + search. Opens with click or ⌘K.
 * Filter at top, grouped list below, keyboard navigation.
 */
export function GoMenu({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Global ⌘K opens this same menu (kept for keyboard users)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q) return ROOMS;
    const n = q.toLowerCase();
    return ROOMS.filter(
      (r) =>
        r.name.toLowerCase().includes(n) ||
        r.slug.includes(n) ||
        r.description.toLowerCase().includes(n),
    );
  }, [q]);

  function go(slug: string) {
    setOpen(false);
    router.push(`/${slug}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); go(filtered[active].slug); }
  }

  const currentRoom = ROOMS.find((r) => pathname.startsWith(`/${r.slug}`));
  const btnHeight = size === 'sm' ? 'h-7' : 'h-8';
  const btnText = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`${btnHeight} px-3 rounded-md bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-100 ${btnText} font-medium flex items-center gap-2 transition-colors`}
      >
        <span>Go</span>
        {currentRoom && (
          <>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 truncate max-w-[140px]">{currentRoom.name}</span>
          </>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-[360px] max-h-[520px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Filter */}
          <div className="shrink-0 px-3 py-2 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={onKey}
                placeholder="Filter rooms"
                className="w-full h-8 pl-8 pr-8 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
              />
              <button onClick={() => setOpen(false)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rooms list */}
          <div className="flex-1 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-zinc-500">No room matches &ldquo;{q}&rdquo;</div>
            )}
            {ROOM_GROUPS.map((g) => {
              const items = filtered.filter((r) => r.group === g.id);
              if (items.length === 0) return null;
              return (
                <div key={g.id} className="py-1">
                  <div className="px-3 py-1 text-2xs uppercase tracking-wider text-zinc-500">{g.label}</div>
                  <ul>
                    {items.map((r) => {
                      const idx = filtered.indexOf(r);
                      const isActive = idx === active;
                      const isCurrent = currentRoom?.slug === r.slug;
                      const Icon = r.icon;
                      return (
                        <li key={r.slug}>
                          <button
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go(r.slug)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                              isActive ? 'bg-zinc-800' : ''
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm ${isCurrent ? 'text-emerald-400 font-medium' : 'text-zinc-100'} truncate`}>
                                {r.name}
                                {isCurrent && <span className="ml-2 text-2xs uppercase tracking-wider text-zinc-500">current</span>}
                              </div>
                              <div className="text-2xs text-zinc-500 truncate">{r.description}</div>
                            </div>
                            {r.badge?.count !== undefined && r.badge.count > 0 && (
                              <span className={`text-2xs font-mono numeric shrink-0 ${badgeToneClass(r.badge.tone)}`}>{r.badge.count}</span>
                            )}
                            {isActive && <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="shrink-0 px-3 py-2 border-t border-zinc-800 flex items-center justify-between text-2xs text-zinc-500">
            <span><kbd className="px-1 py-px rounded bg-zinc-800 border border-zinc-700 font-mono">↑↓</kbd> navigate · <kbd className="px-1 py-px rounded bg-zinc-800 border border-zinc-700 font-mono">↵</kbd> open</span>
            <span><kbd className="px-1 py-px rounded bg-zinc-800 border border-zinc-700 font-mono">⌘K</kbd> anywhere</span>
          </div>
        </div>
      )}
    </div>
  );
}

function badgeToneClass(tone?: 'good' | 'warn' | 'bad' | 'info' | 'gold'): string {
  if (tone === 'bad') return 'text-rose-400';
  if (tone === 'warn') return 'text-amber-400';
  if (tone === 'good') return 'text-emerald-400';
  if (tone === 'gold') return 'text-amber-300';
  return 'text-zinc-500';
}
