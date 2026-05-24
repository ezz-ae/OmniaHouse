'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SHORTCUTS } from '@/lib/whatsapp/shortcuts';
import { Sparkles, Send, Paperclip, Slash, Loader2, X } from 'lucide-react';

export type SlashAction = 'extract' | 'optimize' | 'verify' | 'magazine';

/**
 * Compose bar — sized for a person who lives in this bar all day.
 *
 *   - Input is a real text field (not a pill), min-height 56px so the
 *     cursor is comfortable. Rounded rect, big readable type.
 *   - "/" is a VISIBLE chip on the left edge of the input — click it
 *     OR type "/" to open the action palette.
 *   - Sparkles + Send are 40x40 with clear hover states.
 *   - Palette opens as a popover RIGHT ABOVE the input — anchored,
 *     not floating in random space.
 */
export function MessengerCompose({
  onSend,
  onSlashAction,
  onShortcutPick,
  busy,
}: {
  onSend: (text: string) => void;
  onSlashAction: (action: SlashAction) => void;
  onShortcutPick: (trigger_key: string) => void;
  busy?: SlashAction | null;
}) {
  const [text, setText] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIdx, setPaletteIdx] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [text]);

  // Detect typed "/" → opens palette
  useEffect(() => {
    const m = text.match(/(?:^|\s)(\/[a-z0-9_-]*)$/);
    if (m) {
      setPaletteOpen(true);
      setPaletteQuery(m[1].slice(1));
      setPaletteIdx(0);
    } else if (paletteOpen && !text.endsWith('/')) {
      // Keep open if user manually opened it (no `/` in text), close if `/` was removed
      if (!text.match(/\/[a-z0-9_-]*$/)) {
        // only auto-close when the user is past the slash command
        // (we leave it open for manual mode; closes via Esc/click-away)
      }
    }
  }, [text, paletteOpen]);

  const SLASH_ACTIONS: { id: SlashAction; label: string; hint: string }[] = useMemo(() => [
    { id: 'extract',  label: '/extract',  hint: 'Pull a structured order from this chat' },
    { id: 'optimize', label: '/optimize', hint: 'Predict if this draft will convert + rewrite' },
    { id: 'verify',   label: '/verify',   hint: 'Check the latest payment screenshot for fraud' },
    { id: 'magazine', label: '/magazine', hint: 'Post-purchase personalized magazine' },
  ], []);

  type Row = { kind: 'action'; id: SlashAction; label: string; hint: string }
           | { kind: 'shortcut'; id: string; label: string; hint: string };

  const rows: Row[] = useMemo(() => {
    const q = paletteQuery.toLowerCase();
    const a: Row[] = SLASH_ACTIONS
      .filter((x) => !q || x.id.includes(q))
      .map((x) => ({ kind: 'action', id: x.id, label: x.label, hint: x.hint }));
    const s: Row[] = SHORTCUTS
      .filter((sc) => {
        if (!q) return true;
        return sc.trigger_key.includes(q) || sc.content_en.toLowerCase().includes(q);
      })
      .slice(0, q ? 16 : 8)
      .map((sc) => ({ kind: 'shortcut', id: sc.id, label: sc.trigger_key, hint: sc.content_en }));
    return [...a, ...s];
  }, [paletteQuery, SLASH_ACTIONS]);

  function clearSlash() {
    setText((prev) => prev.replace(/(\/[a-z0-9_-]*)$/, ''));
  }
  function closePalette() {
    setPaletteOpen(false);
    setPaletteQuery('');
    setPaletteIdx(0);
  }
  function chooseRow(r: Row) {
    if (r.kind === 'action') {
      clearSlash();
      closePalette();
      onSlashAction(r.id);
    } else {
      clearSlash();
      closePalette();
      onShortcutPick(r.label);
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
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!text.trim()) return;
    onSend(text);
    setText('');
    closePalette();
  }

  function toggleSlash() {
    if (paletteOpen) {
      closePalette();
    } else {
      setPaletteOpen(true);
      setPaletteQuery('');
      setPaletteIdx(0);
      ref.current?.focus();
    }
  }

  return (
    <div className="relative shrink-0 border-t border-line-soft bg-canvas">
      {/* Palette — anchored ABOVE the input */}
      {paletteOpen && rows.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-0 max-h-[340px] overflow-y-auto bg-canvas-raised border-t border-line-soft shadow-2xl">
          <div className="sticky top-0 px-4 py-1.5 text-2xs uppercase tracking-widest text-ink-dim border-b border-line-soft bg-canvas-raised flex items-center justify-between">
            <span>{paletteQuery ? `/${paletteQuery}` : 'commands & shortcuts'}</span>
            <button onClick={closePalette} className="text-ink-dim hover:text-ink"><X className="w-3 h-3" /></button>
          </div>
          <ul>
            {rows.map((r, i) => {
              const isAction = r.kind === 'action';
              const isActive = i === paletteIdx;
              return (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    onClick={() => chooseRow(r)}
                    onMouseEnter={() => setPaletteIdx(i)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors',
                      isActive ? 'bg-canvas-inset' : 'hover:bg-canvas-inset/60',
                    )}
                  >
                    <span className={cn(
                      'font-mono text-sm shrink-0 w-24',
                      isAction ? 'text-gold' : 'text-info',
                    )}>{r.label}</span>
                    <span className="text-xs text-ink-muted line-clamp-2 flex-1">{r.hint}</span>
                    {isAction && <span className="text-2xs uppercase tracking-widest text-gold/60 shrink-0">AI</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Compose row */}
      <div className="px-3 py-2.5">
        <div className="max-w-[920px] mx-auto flex items-end gap-2">
          {/* Attach */}
          <button
            className="w-9 h-9 shrink-0 rounded-md text-ink-muted hover:text-ink hover:bg-canvas-inset flex items-center justify-center"
            title="Attach"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* / chip — visible affordance */}
          <button
            onClick={toggleSlash}
            className={cn(
              'h-9 shrink-0 px-2.5 rounded-md text-2xs font-medium border flex items-center gap-1.5 transition-colors',
              paletteOpen
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'border-line text-ink-muted hover:text-ink hover:border-line-strong',
            )}
            title="Commands & shortcuts"
          >
            <Slash className="w-3.5 h-3.5" />
            <span>tools</span>
          </button>

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Write a message…   /  for AI tools and shortcuts"
              rows={1}
              className="w-full resize-none min-h-[44px] max-h-[180px] px-3.5 py-2.5 bg-canvas-panel border border-line rounded-md text-[15px] leading-snug text-ink placeholder:text-ink-dim focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
            />
          </div>

          {/* AI sparkles — opens the same palette pre-positioned at AI section */}
          <button
            onClick={toggleSlash}
            className={cn(
              'w-9 h-9 shrink-0 rounded-md border flex items-center justify-center transition-colors',
              busy ? 'border-gold/40 text-gold' :
                paletteOpen ? 'bg-gold/15 border-gold/40 text-gold' :
                'border-line text-ink-muted hover:text-ink hover:border-line-strong',
            )}
            title="AI tools"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={cn(
              'h-9 px-4 shrink-0 rounded-md font-medium text-sm flex items-center gap-1.5 transition-colors',
              text.trim()
                ? 'bg-gold text-canvas hover:bg-gold-bright'
                : 'bg-canvas-inset text-ink-dim cursor-not-allowed',
            )}
            title="Send (⌘↵)"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
