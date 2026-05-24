'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button, Kbd } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SHORTCUTS, searchShortcuts } from '@/lib/whatsapp/shortcuts';
import { Sparkles, Send, Wand2, Languages, Slash, Smile, Paperclip, Loader2 } from 'lucide-react';

export type SlashAction = 'extract' | 'optimize' | 'verify' | 'magazine';

/**
 * Messenger-style compose bar.
 * - Typing "/" opens the action palette inline (slash commands + CRM shortcuts).
 * - Single textarea (EN+AR auto-detected when typing). Side toggle for explicit Both mode.
 * - Sparkles button next to send → action menu (extract/optimize/verify/magazine).
 * - No always-on reply optimizer panel. Optimizer is summoned via /optimize or the menu.
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
  const [palette, setPalette] = useState<{ open: boolean; query: string }>({ open: false, query: '' });
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Slash command detection
  useEffect(() => {
    const m = text.match(/(?:^|\s)(\/[a-z0-9_-]*)$/);
    setPalette({ open: !!m, query: m ? m[1].slice(1) : '' });
  }, [text]);

  const SLASH_ACTIONS: { id: SlashAction; label: string; hint: string }[] = [
    { id: 'extract',  label: '/extract',  hint: 'Pull a structured order from this chat' },
    { id: 'optimize', label: '/optimize', hint: 'Predict if this draft will convert + rewrite' },
    { id: 'verify',   label: '/verify',   hint: 'Check the latest payment screenshot for fraud' },
    { id: 'magazine', label: '/magazine', hint: 'Generate post-purchase personalized magazine' },
  ];

  const allShortcuts = SHORTCUTS.map((s) => ({
    id: `sc-${s.id}`,
    label: s.trigger_key,
    hint: s.content_en.slice(0, 80),
    onPick: () => { onShortcutPick(s.trigger_key); setText(text.replace(/(\/[a-z0-9_-]*)$/, '')); },
  }));
  const filteredActions = palette.query
    ? SLASH_ACTIONS.filter((a) => a.id.includes(palette.query.toLowerCase()))
    : SLASH_ACTIONS;
  const filteredShortcuts = palette.query
    ? allShortcuts.filter((s) => s.label.includes(palette.query.toLowerCase()) || s.hint.toLowerCase().includes(palette.query.toLowerCase()))
    : allShortcuts.slice(0, 6);

  function handleSend() {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="relative border-t border-line-soft bg-canvas-raised/40">
      {/* Slash palette */}
      {palette.open && (
        <div className="absolute bottom-full left-0 right-0 max-h-72 overflow-y-auto bg-canvas-raised border-t border-x border-line-strong shadow-2xl">
          <div className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-dim border-b border-line-soft">
            /{palette.query || 'commands'}
          </div>
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-2xs uppercase tracking-widest text-gold/70">AI commands</div>
              <ul>
                {filteredActions.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => { onSlashAction(a.id); setText(text.replace(/(\/[a-z0-9_-]*)$/, '')); }}
                      className="w-full text-left px-3 py-2 hover:bg-canvas-inset flex items-start gap-2"
                    >
                      <span className="font-mono text-xs text-gold shrink-0 w-20">{a.label}</span>
                      <span className="text-2xs text-ink-muted">{a.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {filteredShortcuts.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-2xs uppercase tracking-widest text-ink-dim">CRM shortcuts</div>
              <ul>
                {filteredShortcuts.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={s.onPick}
                      className="w-full text-left px-3 py-2 hover:bg-canvas-inset flex items-start gap-2"
                    >
                      <span className="font-mono text-xs text-info shrink-0 w-20">{s.label}</span>
                      <span className="text-2xs text-ink-muted truncate flex-1">{s.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action menu (when ✨ clicked) */}
      {actionMenuOpen && (
        <div className="absolute bottom-full right-3 mb-2 w-72 bg-canvas-raised border border-line shadow-2xl rounded-lg overflow-hidden">
          <div className="px-3 py-2 text-2xs uppercase tracking-widest text-gold/70 border-b border-line-soft">AI tools</div>
          <ul>
            {SLASH_ACTIONS.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => { setActionMenuOpen(false); onSlashAction(a.id); }}
                  className="w-full text-left px-3 py-2 hover:bg-canvas-inset"
                >
                  <div className="font-mono text-xs text-gold">{a.label}</div>
                  <div className="text-2xs text-ink-muted">{a.hint}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compose surface */}
      <div className="max-w-[860px] mx-auto px-4 py-3">
        <div className="flex items-end gap-2">
          <button className="p-2 rounded-full text-ink-dim hover:text-ink hover:bg-canvas-inset" title="Attach (coming)">
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Write a message…  /  for AI tools & shortcuts"
              rows={1}
              className="w-full max-h-32 min-h-[40px] px-3 py-2 bg-canvas border border-line rounded-full text-sm text-ink placeholder:text-ink-dim resize-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
            />
          </div>

          <button
            onClick={() => setActionMenuOpen(!actionMenuOpen)}
            className={cn(
              'p-2 rounded-full transition-colors',
              actionMenuOpen ? 'bg-gold/15 text-gold' : 'text-ink-dim hover:text-ink hover:bg-canvas-inset',
            )}
            title="AI tools"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin text-gold" /> : <Sparkles className="w-4 h-4" />}
          </button>

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2.5 rounded-full bg-gold text-canvas disabled:bg-canvas-inset disabled:text-ink-dim transition-colors"
            title="Send (⌘↵)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="px-2 mt-1 flex items-center gap-3 text-2xs text-ink-dim">
          <span><Kbd>/</Kbd> tools & shortcuts</span>
          <span><Kbd>⌘</Kbd><Kbd>↵</Kbd> send</span>
        </div>
      </div>
    </div>
  );
}
