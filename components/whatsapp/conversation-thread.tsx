'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, FileText, AudioLines, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  ExtractCard, OptimizeCard, VerifyCard, MagazineCard, ShortcutCard, SystemNote,
} from './ai-message-cards';
import type { Message } from '@/lib/whatsapp/types';
import type { Turn } from '@/lib/whatsapp/thread';
import type { CustomerCard } from '@/lib/whatsapp/types';

/**
 * The conversation thread — pure scrolling stream of turns.
 * Each turn is either a message bubble OR an AI card.
 * Auto-scrolls to bottom on new turns.
 */
export function ConversationThread({
  turns,
  card,
  onVerifyMedia,
  onDismissTurn,
  onPushDraft,
  onApplyOptimization,
  onUseShortcut,
}: {
  turns: Turn[];
  card: CustomerCard;
  onVerifyMedia?: (m: Message) => void;
  onDismissTurn?: (idx: number) => void;
  onPushDraft?: (target: 'shopify' | 'woocommerce') => void;
  onApplyOptimization?: () => void;
  onUseShortcut?: (lang: 'en' | 'ar' | 'both', en: string, ar: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-canvas">
      <div className="max-w-[860px] mx-auto space-y-4">
        {turns.map((t, i) => {
          const dismiss = () => onDismissTurn?.(i);
          switch (t.kind) {
            case 'message': {
              const prev = i > 0 && turns[i - 1].kind === 'message' ? (turns[i - 1] as any).data as Message : null;
              const showSender = !prev || prev.from !== t.data.from;
              return <Bubble key={i} m={t.data} showSender={showSender} onVerify={() => onVerifyMedia?.(t.data)} />;
            }
            case 'extract':
              return (
                <div key={i} className="flex justify-center">
                  <ExtractCard data={t.data} card={card} at={t.at} onDismiss={dismiss} onPush={onPushDraft} />
                </div>
              );
            case 'optimize':
              return (
                <div key={i} className="flex justify-end">
                  <OptimizeCard data={t.data} at={t.at} onDismiss={dismiss} onApply={onApplyOptimization} />
                </div>
              );
            case 'verify':
              return (
                <div key={i} className="flex justify-center">
                  <VerifyCard data={t.data} at={t.at} forFilename={t.for_filename} onDismiss={dismiss} />
                </div>
              );
            case 'magazine':
              return (
                <div key={i} className="flex justify-center">
                  <MagazineCard data={t.data} at={t.at} onDismiss={dismiss} />
                </div>
              );
            case 'shortcut':
              return (
                <div key={i} className="flex justify-end">
                  <ShortcutCard
                    trigger={t.data.trigger_key}
                    en={t.data.en}
                    ar={t.data.ar}
                    at={t.at}
                    onUseEN={() => onUseShortcut?.('en', t.data.en, t.data.ar)}
                    onUseAR={() => onUseShortcut?.('ar', t.data.en, t.data.ar)}
                    onUseBoth={() => onUseShortcut?.('both', t.data.en, t.data.ar)}
                    onDismiss={dismiss}
                  />
                </div>
              );
            case 'system':
              return (
                <div key={i} className="flex justify-center">
                  <SystemNote text={t.data.text} tone={t.data.tone} at={t.at} />
                </div>
              );
          }
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function Bubble({ m, showSender, onVerify }: { m: Message; showSender: boolean; onVerify: () => void }) {
  const isAgent = m.from === 'agent';
  const rtl = m.language === 'ar';

  return (
    <div className={cn('flex flex-col gap-1', isAgent ? 'items-end' : 'items-start')}>
      {showSender && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-2xs uppercase tracking-widest text-ink-dim">{isAgent ? 'You' : 'Customer'}</span>
          <Badge tone="info">{m.language.toUpperCase()}</Badge>
          <span className="text-2xs text-ink-faint numeric">{m.at}</span>
        </div>
      )}
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className={cn(
          'max-w-[680px] px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
          isAgent
            ? 'bg-gold/12 text-ink border border-gold/20 rounded-br-sm'
            : 'bg-canvas-inset text-ink border border-line-soft rounded-bl-sm',
          rtl && 'font-serif',
        )}
      >
        {m.body}
      </div>
      {m.media && (
        <button
          onClick={onVerify}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border max-w-[420px] text-left transition-colors',
            isAgent ? 'bg-gold/5 border-gold/20' : 'bg-canvas-inset border-line-soft hover:bg-canvas-panel',
          )}
        >
          {m.media.kind === 'image' ? <ImageIcon className="w-3.5 h-3.5 shrink-0" /> :
            m.media.kind === 'pdf' ? <FileText className="w-3.5 h-3.5 shrink-0" /> :
              <AudioLines className="w-3.5 h-3.5 shrink-0" />}
          <span className="text-xs font-mono text-ink-muted truncate flex-1">{m.media.filename}</span>
          {m.media.verified !== undefined ? (
            m.media.verified
              ? <Badge tone="good"><ShieldCheck className="w-3 h-3" /> {m.media.verification_score}%</Badge>
              : m.media.verification_score && m.media.verification_score < 50
                ? <Badge tone="bad"><ShieldAlert className="w-3 h-3" /> {m.media.verification_score}%</Badge>
                : <Badge tone="warn">verify</Badge>
          ) : <Badge tone="warn">verify</Badge>}
        </button>
      )}
    </div>
  );
}
