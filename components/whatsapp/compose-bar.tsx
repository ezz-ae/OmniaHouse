'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Kbd } from '@/components/ui/button';
import { Badge, Dot } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SHORTCUTS, expandShortcuts, searchShortcuts } from '@/lib/whatsapp/shortcuts';
import { mockWritingCheck, mockOptimizeReply } from '@/lib/whatsapp/mock';
import { Sparkles, Send, Wand2, Languages, Zap, Copy } from 'lucide-react';
import type { ReplyOptimization, WritingCheck } from '@/lib/whatsapp/types';

/**
 * The compose bar — typing surface with three superpowers:
 *  1. CRM shortcuts: type "/" to open the palette, expands EN+AR on enter.
 *  2. Live writing assistant: 600ms debounce, shows tone + grammar issues.
 *  3. Reply optimizer: predicts conversion %, suggests rewrite.
 *
 * Bilingual: agent picks EN/AR/Both for the outgoing draft.
 */
export function ComposeBar({
  language,
  onLanguageChange,
  onSend,
}: {
  language: 'en' | 'ar' | 'both';
  onLanguageChange: (l: 'en' | 'ar' | 'both') => void;
  onSend: (draft: { en: string; ar: string }) => void;
}) {
  const [draftEn, setDraftEn] = useState('');
  const [draftAr, setDraftAr] = useState('');
  const [shortcutMenu, setShortcutMenu] = useState<{ open: boolean; query: string }>({ open: false, query: '' });
  const [writingEn, setWritingEn] = useState<WritingCheck | null>(null);
  const [optimization, setOptimization] = useState<ReplyOptimization | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Live writing check (debounced 600ms)
  useEffect(() => {
    if (!draftEn) {
      setWritingEn(null);
      return;
    }
    const t = setTimeout(() => setWritingEn(mockWritingCheck(draftEn)), 600);
    return () => clearTimeout(t);
  }, [draftEn]);

  // Detect /shortcut trigger
  useEffect(() => {
    const m = draftEn.match(/(?:^|\s)(\/[a-z0-9_-]*)$/);
    setShortcutMenu({ open: !!m, query: m ? m[1].slice(1) : '' });
  }, [draftEn]);

  function applyShortcut(triggerKey: string) {
    const sc = SHORTCUTS.find((s) => s.trigger_key === triggerKey);
    if (!sc) return;
    setDraftEn((prev) => prev.replace(/(\/[a-z0-9_-]*)$/, '') + sc.content_en);
    setDraftAr((prev) => prev + (prev ? '\n' : '') + sc.content_ar);
    setShortcutMenu({ open: false, query: '' });
    inputRef.current?.focus();
  }

  async function runOptimize() {
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 500));
    const opt = mockOptimizeReply(draftEn || draftAr, language === 'ar' ? 'ar' : 'en');
    setOptimization(opt);
    setOptimizing(false);
  }

  function applyOptimization() {
    if (!optimization) return;
    setDraftEn(optimization.optimized_draft.en);
    setDraftAr(optimization.optimized_draft.ar);
    setOptimization(null);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <div className="border-t border-line-soft bg-canvas-raised/40">
      {/* Optimization card */}
      {optimization && (
        <div className={cn(
          'px-4 py-3 border-b border-line-soft',
          optimization.prediction === 'conversion_likely' ? 'bg-good/5' : 'bg-bad/5',
        )}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Zap className={cn('w-4 h-4', optimization.prediction === 'conversion_likely' ? 'text-good' : 'text-bad')} />
              <span className="text-sm font-medium text-ink">
                {optimization.prediction === 'conversion_likely' ? 'Conversion likely' : 'Risk of losing'}
              </span>
              <span className="font-serif text-base text-gold numeric">{optimization.conversion_probability}%</span>
            </div>
            <button onClick={() => setOptimization(null)} className="text-2xs text-ink-dim hover:text-ink">dismiss</button>
          </div>
          {optimization.warning && (
            <p className="text-2xs text-bad mb-2">{optimization.warning}</p>
          )}
          <p className="text-2xs text-ink-muted mb-2">{optimization.recommendation}</p>
          {optimization.changes.length > 0 && (
            <ul className="space-y-1 mb-3">
              {optimization.changes.slice(0, 3).map((c, i) => (
                <li key={i} className="text-2xs text-ink-muted">
                  <span className="text-ink-dim">·</span> <span className="font-medium text-ink">{c.reason}:</span> {c.after}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={applyOptimization}>Apply rewrite</Button>
            <Button variant="ghost" size="sm" onClick={() => copy(optimization.optimized_draft.en)}>
              <Copy className="w-3 h-3" /> Copy EN
            </Button>
            <Button variant="ghost" size="sm" onClick={() => copy(optimization.optimized_draft.ar)}>
              <Copy className="w-3 h-3" /> Copy AR
            </Button>
          </div>
        </div>
      )}

      {/* Shortcut menu */}
      {shortcutMenu.open && (
        <div className="px-4 py-2 border-b border-line-soft max-h-48 overflow-y-auto">
          <div className="label mb-2">/{shortcutMenu.query || 'shortcuts'}</div>
          <ul className="space-y-px">
            {searchShortcuts(shortcutMenu.query).slice(0, 6).map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => applyShortcut(s.trigger_key)}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-canvas-inset flex items-start gap-2"
                >
                  <span className="font-mono text-xs text-gold shrink-0">{s.trigger_key}</span>
                  <span className="text-2xs text-ink-muted truncate flex-1">{s.content_en}</span>
                  <Badge tone="neutral">{s.category}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compose surface */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onLanguageChange('en')}
            className={cn('px-2 h-6 rounded text-2xs border', language === 'en' ? 'bg-gold/10 text-gold border-gold/30' : 'border-line text-ink-dim')}
          >EN</button>
          <button
            onClick={() => onLanguageChange('ar')}
            className={cn('px-2 h-6 rounded text-2xs border', language === 'ar' ? 'bg-gold/10 text-gold border-gold/30' : 'border-line text-ink-dim')}
          >AR</button>
          <button
            onClick={() => onLanguageChange('both')}
            className={cn('px-2 h-6 rounded text-2xs border', language === 'both' ? 'bg-gold/10 text-gold border-gold/30' : 'border-line text-ink-dim')}
          >
            <Languages className="w-3 h-3 inline mr-1" />Both
          </button>
          {writingEn && (
            <div className="ml-auto flex items-center gap-1.5 text-2xs text-ink-dim">
              <Dot tone={writingEn.tone_check === 'luxury' ? 'good' : writingEn.tone_check === 'urgent' ? 'warn' : 'neutral'} />
              tone: <span className="text-ink">{writingEn.tone_check}</span>
              {writingEn.issues.length > 0 && (
                <span className="text-warn">· {writingEn.issues.length} suggestion{writingEn.issues.length === 1 ? '' : 's'}</span>
              )}
            </div>
          )}
        </div>

        <div className={cn('grid gap-2', language === 'both' ? 'grid-cols-2' : 'grid-cols-1')}>
          {(language === 'en' || language === 'both') && (
            <div>
              <textarea
                ref={inputRef}
                value={draftEn}
                onChange={(e) => setDraftEn(e.target.value)}
                placeholder="Type a reply… use /welcome, /bank-uae, /ring-size, /le-cashback to expand."
                className="w-full h-24 p-2.5 bg-canvas border border-line rounded text-sm text-ink placeholder:text-ink-dim resize-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
              />
              {writingEn?.suggested_completion && (
                <div className="text-2xs text-ink-dim mt-1 px-1">
                  <span className="text-gold">suggested:</span>{' '}
                  <button
                    onClick={() => setDraftEn(draftEn + writingEn.suggested_completion)}
                    className="text-ink-muted hover:text-ink underline decoration-dotted"
                  >
                    {writingEn.suggested_completion}
                  </button>
                </div>
              )}
            </div>
          )}
          {(language === 'ar' || language === 'both') && (
            <div>
              <textarea
                value={draftAr}
                onChange={(e) => setDraftAr(e.target.value)}
                dir="rtl"
                placeholder="اكتب الرد..."
                className="w-full h-24 p-2.5 bg-canvas border border-line rounded text-sm text-ink placeholder:text-ink-dim resize-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none font-serif"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="text-2xs text-ink-dim flex items-center gap-3">
            <span><Kbd>/</Kbd> shortcut</span>
            <span><Kbd>⌘</Kbd><Kbd>↵</Kbd> send</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={runOptimize} disabled={!draftEn || optimizing}>
              {optimizing ? <Sparkles className="w-3.5 h-3.5 animate-pulse" /> : <Wand2 className="w-3.5 h-3.5" />}
              {optimizing ? 'Predicting…' : 'Optimize reply'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => onSend({ en: draftEn, ar: draftAr })} disabled={!draftEn && !draftAr}>
              <Send className="w-3.5 h-3.5" /> Copy to WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
