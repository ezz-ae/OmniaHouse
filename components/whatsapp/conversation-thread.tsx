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
 * Conversation thread.
 *
 * Bottom-anchored — newest turns sit immediately above the compose bar
 * so the agent's eyes never travel up and down to type. Empty space,
 * when chat is short, lives ABOVE the conversation, not below it.
 * That's how every real messenger works.
 *
 * Density: tight bubble padding, 15px message text, smaller gap between
 * same-sender messages, larger gap between speaker changes.
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
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns.length]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto bg-canvas-raised/30"
    >
      {/* The trick: a wrapping flex that pushes content to bottom when short */}
      <div className="min-h-full flex flex-col justify-end">
        <div className="px-4 sm:px-6 py-4 space-y-2">
          <div className="max-w-[760px] mx-auto w-full space-y-1.5">
            {turns.map((t, i) => {
              const dismiss = () => onDismissTurn?.(i);
              const prev = i > 0 ? turns[i - 1] : null;
              switch (t.kind) {
                case 'message': {
                  const prevMsg = prev && prev.kind === 'message' ? (prev as any).data as Message : null;
                  const showSender = !prevMsg || prevMsg.from !== t.data.from;
                  const sameSender = !showSender;
                  return <Bubble key={i} m={t.data} showSender={showSender} sameSender={sameSender} onVerify={() => onVerifyMedia?.(t.data)} />;
                }
                case 'extract':
                  return (
                    <div key={i} className="pt-3">
                      <ExtractCard data={t.data} card={card} at={t.at} onDismiss={dismiss} onPush={onPushDraft} />
                    </div>
                  );
                case 'optimize':
                  return (
                    <div key={i} className="flex justify-end pt-3">
                      <OptimizeCard data={t.data} at={t.at} onDismiss={dismiss} onApply={onApplyOptimization} />
                    </div>
                  );
                case 'verify':
                  return (
                    <div key={i} className="pt-3">
                      <VerifyCard data={t.data} at={t.at} forFilename={t.for_filename} onDismiss={dismiss} />
                    </div>
                  );
                case 'magazine':
                  return (
                    <div key={i} className="pt-3">
                      <MagazineCard data={t.data} at={t.at} onDismiss={dismiss} />
                    </div>
                  );
                case 'shortcut':
                  return (
                    <div key={i} className="flex justify-end pt-3">
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
                    <div key={i} className="flex justify-center py-1">
                      <SystemNote text={t.data.text} tone={t.data.tone} at={t.at} />
                    </div>
                  );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, showSender, sameSender, onVerify }: { m: Message; showSender: boolean; sameSender: boolean; onVerify: () => void }) {
  const isAgent = m.from === 'agent';
  const rtl = m.language === 'ar';

  return (
    <div className={cn(
      'flex flex-col',
      isAgent ? 'items-end' : 'items-start',
      showSender ? 'mt-3' : 'mt-0.5',
    )}>
      {showSender && (
        <div className="flex items-baseline gap-2 mb-1 px-1 text-2xs">
          <span className={cn('uppercase tracking-widest', isAgent ? 'text-gold' : 'text-ink-dim')}>
            {isAgent ? 'You' : 'Customer'}
          </span>
          <span className="text-ink-faint">·</span>
          <span className="text-ink-dim uppercase tracking-wider">{m.language}</span>
          <span className="text-ink-faint numeric">{m.at}</span>
        </div>
      )}
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className={cn(
          'max-w-[78%] px-3 py-1.5 text-[15px] leading-snug',
          isAgent
            ? 'bg-gold/15 text-ink border border-gold/25'
            : 'bg-canvas-panel text-ink border border-line-soft',
          // bubble shape: rounded but with one sharp corner pointing back to sender
          isAgent
            ? sameSender ? 'rounded-2xl rounded-tr-md rounded-br-md' : 'rounded-2xl rounded-br-md'
            : sameSender ? 'rounded-2xl rounded-tl-md rounded-bl-md' : 'rounded-2xl rounded-bl-md',
          rtl && 'font-serif',
        )}
      >
        {m.body}
      </div>
      {m.media && (
        <button
          onClick={onVerify}
          className={cn(
            'mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border max-w-[78%] text-left transition-colors',
            isAgent ? 'bg-gold/5 border-gold/20' : 'bg-canvas-panel border-line-soft hover:bg-canvas-inset',
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
