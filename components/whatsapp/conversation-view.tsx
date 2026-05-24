'use client';

import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/lib/whatsapp/types';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, FileText, AudioLines, ShieldCheck, ShieldAlert } from 'lucide-react';

/**
 * Renders the conversation as actual chat bubbles (not a paste box).
 * Per-message language pill. RTL for Arabic. Media bubbles with
 * verification badge when payment screenshots have been checked.
 */
export function ConversationView({
  conv,
  onVerifyMedia,
}: {
  conv: Conversation;
  onVerifyMedia?: (msg: Message) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {conv.messages.map((m, i) => {
        const prev = i > 0 ? conv.messages[i - 1] : null;
        const showSender = !prev || prev.from !== m.from;
        return <Bubble key={m.id} m={m} showSender={showSender} onVerify={() => onVerifyMedia?.(m)} />;
      })}
    </div>
  );
}

function Bubble({ m, showSender, onVerify }: { m: Message; showSender: boolean; onVerify: () => void }) {
  const isAgent = m.from === 'agent';
  const isSystem = m.from === 'system';
  const rtl = m.language === 'ar';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-2xs text-ink-dim bg-canvas-inset border border-line-soft rounded-full px-3 py-1">
          {m.body}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', isAgent ? 'items-end' : 'items-start')}>
      {showSender && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-2xs uppercase tracking-widest text-ink-dim">
            {isAgent ? 'Agent' : 'Customer'}
          </span>
          <Badge tone="info">{m.language.toUpperCase()}</Badge>
          <span className="text-2xs text-ink-faint numeric">{m.at}</span>
        </div>
      )}
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className={cn(
          'max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed',
          isAgent
            ? 'bg-gold/10 text-ink border border-gold/20'
            : 'bg-canvas-inset text-ink border border-line-soft',
          rtl && 'font-serif tracking-normal',
        )}
      >
        {m.body}
      </div>
      {m.media && (
        <button
          onClick={onVerify}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border max-w-[85%] text-left transition-colors',
            isAgent ? 'bg-gold/5 border-gold/20' : 'bg-canvas-inset border-line-soft hover:bg-canvas-panel',
          )}
        >
          {m.media.kind === 'image' ? <ImageIcon className="w-3.5 h-3.5 shrink-0" /> :
            m.media.kind === 'pdf' ? <FileText className="w-3.5 h-3.5 shrink-0" /> :
              <AudioLines className="w-3.5 h-3.5 shrink-0" />}
          <span className="text-xs font-mono text-ink-muted truncate flex-1">{m.media.filename}</span>
          {m.media.verified !== undefined && (
            m.media.verified
              ? <Badge tone="good"><ShieldCheck className="w-3 h-3" /> {m.media.verification_score}%</Badge>
              : m.media.verification_score && m.media.verification_score < 50
                ? <Badge tone="bad"><ShieldAlert className="w-3 h-3" /> {m.media.verification_score}%</Badge>
                : <Badge tone="warn">verify</Badge>
          )}
        </button>
      )}
    </div>
  );
}
