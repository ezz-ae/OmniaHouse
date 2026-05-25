'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A column that can be:
 *   · Resized by dragging its right edge
 *   · Collapsed to a thin strip with an expand button
 *
 * Widths persist to localStorage keyed by `storageKey` so each agent's
 * layout sticks across reloads.
 *
 * Use one of these per resizable column in a flex row layout. The
 * column that should absorb remaining space (the conversation) is a
 * regular flex-1 child, not wrapped in this.
 */
export function ResizableColumn({
  children,
  storageKey,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 600,
  side = 'right',
  collapsedLabel,
  className = '',
  startCollapsed = false,
}: {
  children: React.ReactNode;
  /** localStorage key for the width and collapsed state. */
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Which edge has the drag handle. 'right' for left columns, 'left' for the right column. */
  side?: 'left' | 'right';
  /** Short rotated label shown when collapsed. Defaults to nothing. */
  collapsedLabel?: string;
  className?: string;
  startCollapsed?: boolean;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(startCollapsed);
  const [hydrated, setHydrated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection — drives auto-collapse + full-width expand behaviour.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Restore from localStorage on mount (after hydration to avoid SSR mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(storageKey);
    let hadPref = false;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.width === 'number') setWidth(clamp(parsed.width, minWidth, maxWidth));
        if (typeof parsed.collapsed === 'boolean') { setCollapsed(parsed.collapsed); hadPref = true; }
      } catch {}
    }
    // On mobile with no saved preference, start collapsed so the chat is full-width.
    if (!hadPref && window.matchMedia('(max-width: 767px)').matches) {
      setCollapsed(true);
    }
    setHydrated(true);
  }, [storageKey, minWidth, maxWidth]);

  // Persist on change (after hydration)
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify({ width, collapsed }));
  }, [width, collapsed, hydrated, storageKey]);

  // Drag handlers
  const startRef = useRef<{ x: number; w: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (collapsed) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, w: width };
    setDragging(true);
  }, [collapsed, width]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;
    const delta = e.clientX - startRef.current.x;
    const next = side === 'right' ? startRef.current.w + delta : startRef.current.w - delta;
    setWidth(clamp(next, minWidth, maxWidth));
  }, [side, minWidth, maxWidth]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (startRef.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      startRef.current = null;
      setDragging(false);
    }
  }, []);

  const onDoubleClick = useCallback(() => {
    setWidth(defaultWidth);
  }, [defaultWidth]);

  // Collapsed: thin strip with expand button (~28px)
  if (collapsed) {
    return (
      <div
        className={`shrink-0 border-zinc-800 bg-zinc-900 flex flex-col items-center justify-start pt-2 ${
          side === 'right' ? 'border-r' : 'border-l'
        } ${className}`}
        style={{ width: 28 }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="w-6 h-6 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center"
          title="Expand"
        >
          {side === 'right' ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        {collapsedLabel && (
          <div className="mt-3 text-2xs uppercase tracking-wider text-zinc-600 [writing-mode:vertical-rl] rotate-180">
            {collapsedLabel}
          </div>
        )}
      </div>
    );
  }

  // Expanded — on mobile the column takes the full viewport so the user
  // gets a single-pane view; on desktop it uses the resized width.
  return (
    <div
      ref={wrapperRef}
      className={`shrink-0 relative bg-zinc-900 ${isMobile ? 'absolute inset-0 z-30' : ''} ${className}`}
      style={{ width: isMobile ? '100vw' : width }}
    >
      {/* The actual content */}
      <div className="h-full w-full overflow-hidden">{children}</div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(true)}
        className={`absolute top-2 z-20 w-5 h-5 rounded text-zinc-600 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center ${
          side === 'right' ? 'right-2' : 'left-2'
        }`}
        title="Collapse"
      >
        {side === 'right' ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Drag handle — vertical strip on the resizing edge */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize z-30 group ${
          side === 'right' ? '-right-[3px]' : '-left-[3px]'
        }`}
        title="Drag to resize · double-click to reset"
      >
        {/* Hover/drag indicator */}
        <div
          className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors ${
            dragging ? 'bg-emerald-500' : 'bg-zinc-800 group-hover:bg-emerald-500/60'
          }`}
        />
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
