'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChatList } from '@/components/whatsapp/chat-list';
import { ConversationThread } from '@/components/whatsapp/conversation-thread';
import { MessengerCompose, type SlashAction } from '@/components/whatsapp/messenger-compose';
import { CustomerDrawer } from '@/components/whatsapp/customer-drawer';
import {
  getConversations, getCustomerCard, mockExtract, mockOptimizeReply,
  mockVerifyPayment, mockMagazine,
} from '@/lib/whatsapp/mock';
import { messagesToTurns, type Turn } from '@/lib/whatsapp/thread';
import { SHORTCUTS } from '@/lib/whatsapp/shortcuts';
import { cn, formatAED } from '@/lib/utils';
import { maskPhoneForLogs } from '@/lib/whatsapp/routing';
import { Info, MoreHorizontal, Phone as PhoneIcon } from 'lucide-react';
import type { Message } from '@/lib/whatsapp/types';

/**
 * WhatsApp Desk — a real messenger.
 *
 * Two columns. Left: chat list. Right: a single conversation thread
 * filling the screen, with a slim contact header at top and the
 * compose bar pinned bottom.
 *
 * AI tools live INSIDE the conversation. /extract, /verify, /optimize,
 * /magazine, and every CRM /shortcut insert their result as a card in
 * the thread — exactly where the agent invoked them. There is no
 * permanent panel, no parked action bar, no header strip of numbers.
 *
 * Customer details (cross-store history, ghost browse, wallet) open
 * only when the contact name is clicked — slides in from the right.
 */
export default function WhatsAppDeskPage() {
  const baseConversations = useMemo(() => getConversations(), []);
  const [activeId, setActiveId] = useState(baseConversations[0].id);
  const [extraTurns, setExtraTurns] = useState<Record<string, Turn[]>>({});
  const [customerOpen, setCustomerOpen] = useState(false);
  const [busy, setBusy] = useState<SlashAction | null>(null);
  const [pendingDraft, setPendingDraft] = useState<string | null>(null);

  const active = useMemo(() => baseConversations.find((c) => c.id === activeId)!, [activeId, baseConversations]);
  const card = useMemo(() => getCustomerCard(active.phone, active.customer_id), [active]);

  // Compose final turn stream: base messages + AI cards in chronological order
  const turns = useMemo<Turn[]>(() => {
    const base = messagesToTurns(active.messages);
    const extras = extraTurns[active.id] || [];
    return [...base, ...extras];
  }, [active, extraTurns]);

  const addTurn = useCallback((turn: Turn) => {
    setExtraTurns((prev) => ({ ...prev, [active.id]: [...(prev[active.id] || []), turn] }));
  }, [active.id]);

  const dismissTurn = useCallback((idx: number) => {
    const baseLen = active.messages.length;
    const extraIdx = idx - baseLen;
    if (extraIdx < 0) return; // can't dismiss base messages
    setExtraTurns((prev) => {
      const arr = [...(prev[active.id] || [])];
      arr.splice(extraIdx, 1);
      return { ...prev, [active.id]: arr };
    });
  }, [active]);

  const now = () => new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });

  // ─── AI slash actions ──────────────────────────────────────────────────
  async function runAction(action: SlashAction) {
    setBusy(action);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);

    if (action === 'extract') {
      addTurn({ kind: 'extract', at: now(), data: mockExtract(active) });
      return;
    }
    if (action === 'optimize') {
      const draft = pendingDraft || active.messages.filter((m) => m.from === 'agent').slice(-1)[0]?.body || '';
      if (!draft) {
        addTurn({ kind: 'system', at: now(), data: { text: 'Type a draft message first, then run /optimize.', tone: 'warn' } });
        return;
      }
      addTurn({ kind: 'optimize', at: now(), data: mockOptimizeReply(draft, 'en') });
      return;
    }
    if (action === 'verify') {
      const lastMedia = [...active.messages].reverse().find((m) => m.media);
      if (!lastMedia) {
        addTurn({ kind: 'system', at: now(), data: { text: 'No payment screenshot in this chat to verify.', tone: 'warn' } });
        return;
      }
      addTurn({ kind: 'verify', at: now(), data: mockVerifyPayment(lastMedia.media!.filename), for_filename: lastMedia.media!.filename });
      return;
    }
    if (action === 'magazine') {
      addTurn({ kind: 'magazine', at: now(), data: mockMagazine(card.display_name || 'Customer') });
      return;
    }
  }

  function runShortcut(triggerKey: string) {
    const sc = SHORTCUTS.find((s) => s.trigger_key === triggerKey);
    if (!sc) return;
    addTurn({ kind: 'shortcut', at: now(), data: { trigger_key: triggerKey, en: sc.content_en, ar: sc.content_ar } });
  }

  function sendMessage(text: string) {
    const lang = /[؀-ۿ]/.test(text) ? 'ar' : 'en';
    const newMsg: Message = {
      id: `m_${Date.now()}`,
      at: now(),
      from: 'agent',
      body: text,
      language: lang as 'en' | 'ar',
    };
    addTurn({ kind: 'message', at: now(), data: newMsg });
    setPendingDraft(null);
  }

  function verifyMedia(m: Message) {
    if (!m.media) return;
    addTurn({ kind: 'verify', at: now(), data: mockVerifyPayment(m.media.filename), for_filename: m.media.filename });
  }

  function pushDraft(target: 'shopify' | 'woocommerce') {
    addTurn({
      kind: 'system', at: now(), tone: 'good' as const,
      data: { text: `Draft order pushed to ${target === 'shopify' ? 'omniastores.ae' : 'omniastores.com'} ✓`, tone: 'good' },
    } as Turn);
  }

  function applyOptimization() {
    addTurn({ kind: 'system', at: now(), data: { text: 'Optimization applied. Compose updated.', tone: 'info' } });
  }

  function useShortcutOutput(lang: 'en' | 'ar' | 'both', en: string, ar: string) {
    if (lang === 'en') sendMessage(en);
    else if (lang === 'ar') sendMessage(ar);
    else { sendMessage(en); sendMessage(ar); }
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full overflow-hidden bg-canvas flex">
      {/* LEFT — chat list */}
      <aside className="w-[340px] shrink-0 border-r border-line-soft bg-canvas">
        <ChatList conversations={baseConversations} activeId={activeId} onSelect={setActiveId} />
      </aside>

      {/* RIGHT — conversation */}
      <main className="flex-1 min-w-0 flex flex-col bg-canvas">
        {/* Contact header (slim, 52px) */}
        <header className="h-[52px] shrink-0 border-b border-line-soft px-4 flex items-center gap-3 bg-canvas">
          <button
            onClick={() => setCustomerOpen(true)}
            className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center font-medium text-2xs text-canvas shrink-0',
                card.matched ? 'bg-gradient-to-br from-gold to-gold-deep' : 'bg-canvas-inset border border-line text-ink-dim',
              )}
            >
              {card.matched ? (card.display_name || 'C').split(' ').map((p) => p[0]).slice(0, 2).join('') : '?'}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-medium text-ink truncate">
                {card.display_name || <span className="italic text-ink-dim">Unknown sender</span>}
              </div>
              <div className="text-2xs text-ink-dim font-mono">
                {maskPhoneForLogs(card.phone)} · {card.country}
                {card.history && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="text-ink-muted">{card.history.orders} orders · {formatAED(card.history.ltv_aed, { compact: true })} LTV</span>
                  </>
                )}
              </div>
            </div>
          </button>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              onClick={() => setCustomerOpen(true)}
              className="p-2 rounded-full text-ink-dim hover:text-ink hover:bg-canvas-inset"
              title="Customer details"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-full text-ink-dim hover:text-ink hover:bg-canvas-inset"
              title="More"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Thread — fills the room */}
        <ConversationThread
          turns={turns}
          card={card}
          onVerifyMedia={verifyMedia}
          onDismissTurn={dismissTurn}
          onPushDraft={pushDraft}
          onApplyOptimization={applyOptimization}
          onUseShortcut={useShortcutOutput}
        />

        {/* Compose — bottom */}
        <MessengerCompose
          onSend={sendMessage}
          onSlashAction={runAction}
          onShortcutPick={runShortcut}
          busy={busy}
        />
      </main>

      <CustomerDrawer card={card} open={customerOpen} onClose={() => setCustomerOpen(false)} />
    </div>
  );
}
