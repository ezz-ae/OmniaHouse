'use client';

import { useEffect, useRef } from 'react';
import { Image as ImageIcon, FileText, AudioLines, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  ExtractCard, OptimizeCard, VerifyCard, MagazineCard, ShortcutCard, SystemNote,
  ProductShareCard,
} from './ai-message-cards';
import type { Message } from '@/lib/whatsapp/types';
import type { Turn } from '@/lib/whatsapp/thread';
import type { CustomerCard } from '@/lib/whatsapp/types';

/**
 * Conversation thread — comfortable, not beautiful.
 * Single sans-serif. 14px body. Standard chat-app density.
 * Bottom-anchored so newest sits just above the compose.
 */
export function ConversationThread({
  turns,
  card,
  onVerifyMedia,
  onDismissTurn,
  onPushDraft,
  onApplyOptimization,
  onUseShortcut,
  onSendProduct,
}: {
  turns: Turn[];
  card: CustomerCard;
  onVerifyMedia?: (m: Message) => void;
  onDismissTurn?: (idx: number) => void;
  onPushDraft?: (target: 'shopify' | 'woocommerce') => void;
  onApplyOptimization?: () => void;
  onUseShortcut?: (lang: 'en' | 'ar' | 'both', en: string, ar: string) => void;
  onSendProduct?: (text: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns.length]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-zinc-900">
      <div className="min-h-full flex flex-col justify-end">
        <div className="px-6 py-5">
          <div className="max-w-[780px] mx-auto space-y-1">
            {turns.map((t, i) => {
              const dismiss = () => onDismissTurn?.(i);
              const prev = i > 0 ? turns[i - 1] : null;
              switch (t.kind) {
                case 'message': {
                  const prevMsg = prev && prev.kind === 'message' ? (prev as any).data as Message : null;
                  const showSender = !prevMsg || prevMsg.from !== t.data.from;
                  return <Bubble key={i} m={t.data} showSender={showSender} onVerify={() => onVerifyMedia?.(t.data)} />;
                }
                case 'extract':
                  return (
                    <div key={i} className="pt-4">
                      <ExtractCard data={t.data} card={card} at={t.at} onDismiss={dismiss} onPush={onPushDraft} />
                    </div>
                  );
                case 'optimize':
                  return (
                    <div key={i} className="flex justify-end pt-4">
                      <OptimizeCard data={t.data} at={t.at} onDismiss={dismiss} onApply={onApplyOptimization} />
                    </div>
                  );
                case 'verify':
                  return (
                    <div key={i} className="pt-4">
                      <VerifyCard data={t.data} at={t.at} forFilename={t.for_filename} onDismiss={dismiss} />
                    </div>
                  );
                case 'magazine':
                  return (
                    <div key={i} className="pt-4">
                      <MagazineCard data={t.data} at={t.at} onDismiss={dismiss} />
                    </div>
                  );
                case 'product_share':
                  return (
                    <div key={i} className="pt-4">
                      <ProductShareCard data={t.data} at={t.at} onDismiss={dismiss} onSendToCustomer={onSendProduct} />
                    </div>
                  );
                case 'shortcut':
                  return (
                    <div key={i} className="flex justify-end pt-4">
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
                    <div key={i} className="flex justify-center py-2">
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

function Bubble({ m, showSender, onVerify }: { m: Message; showSender: boolean; onVerify: () => void }) {
  const isAgent = m.from === 'agent';
  const rtl = m.language === 'ar';

  return (
    <div className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'} ${showSender ? 'mt-3' : 'mt-0.5'}`}>
      {showSender && (
        <div className="flex items-baseline gap-2 mb-1 px-1">
          <span className={`text-2xs uppercase tracking-wider ${isAgent ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {isAgent ? 'You' : 'Customer'}
          </span>
          <span className="text-2xs text-zinc-600 uppercase">{m.language}</span>
          <span className="text-2xs text-zinc-600 numeric">{m.at}</span>
        </div>
      )}
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed rounded-lg ${
          isAgent
            ? 'bg-emerald-900/40 text-zinc-100 border border-emerald-800/40'
            : 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
        }`}
      >
        {m.body}
      </div>
      {m.media && (
        <button
          onClick={onVerify}
          className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-md border max-w-[78%] text-left transition-colors ${
            isAgent ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700/70'
          }`}
        >
          {m.media.kind === 'image' ? <ImageIcon className="w-4 h-4 shrink-0 text-zinc-400" /> :
            m.media.kind === 'pdf' ? <FileText className="w-4 h-4 shrink-0 text-zinc-400" /> :
              <AudioLines className="w-4 h-4 shrink-0 text-zinc-400" />}
          <span className="text-xs font-mono text-zinc-300 truncate flex-1">{m.media.filename}</span>
          {m.media.verified !== undefined ? (
            m.media.verified
              ? <span className="text-2xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />{m.media.verification_score}%</span>
              : m.media.verification_score && m.media.verification_score < 50
                ? <span className="text-2xs px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{m.media.verification_score}%</span>
                : <span className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">verify</span>
          ) : <span className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">verify</span>}
        </button>
      )}
    </div>
  );
}
