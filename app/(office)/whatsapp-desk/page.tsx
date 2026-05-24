'use client';

import { useState, useMemo, useCallback } from 'react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { DeskNav, type DeskSection } from '@/components/whatsapp/desk-nav';
import { ChatList } from '@/components/whatsapp/chat-list';
import { ConversationThread } from '@/components/whatsapp/conversation-thread';
import { MessengerCompose, type SlashAction } from '@/components/whatsapp/messenger-compose';
import { CopyablePhone } from '@/components/whatsapp/copyable-phone';
import {
  getConversations, getCustomerCard, mockExtract, mockOptimizeReply,
  mockVerifyPayment, mockMagazine, mockGeneratePaymentLink,
  getRecentOrders, getWalletLedger,
} from '@/lib/whatsapp/mock';
import { messagesToTurns, type Turn, type ProductShare } from '@/lib/whatsapp/thread';
import { SHORTCUTS } from '@/lib/whatsapp/shortcuts';
import { formatAED } from '@/lib/utils';
import { Info, Wallet } from 'lucide-react';
import type { Message, Conversation } from '@/lib/whatsapp/types';

/**
 * WhatsApp Desk — a dashboard with its own sections menu.
 * Dark gray (zinc-900), not pure black. One sans-serif. Standard sizes.
 * Phone numbers visible, click-to-copy. No KPI tiles. No empty output
 * areas — every section shows real content.
 */

export default function WhatsAppDeskPage() {
  const baseConversations = useMemo(() => getConversations(), []);
  const [section, setSection] = useState<DeskSection>('inbox');
  const [activeId, setActiveId] = useState(baseConversations[0].id);
  const [extraTurns, setExtraTurns] = useState<Record<string, Turn[]>>({});
  const [busy, setBusy] = useState<SlashAction | null>(null);
  const [showCustomer, setShowCustomer] = useState(false);

  const filtered = useMemo(() => {
    switch (section) {
      case 'inbox':     return baseConversations;
      case 'unclaimed': return baseConversations.filter((c) => c.status === 'unclaimed');
      case 'manager':   return baseConversations.filter((c) => c.vibes.seniority_needed === 'manager' || c.vibes.fraud_risk === 'high');
      case 'ready':     return baseConversations.filter((c) => c.status === 'ready_for_draft');
      default:          return baseConversations;
    }
  }, [section, baseConversations]);

  const effectiveActiveId = useMemo(() => {
    if (filtered.find((c) => c.id === activeId)) return activeId;
    return filtered[0]?.id || baseConversations[0].id;
  }, [filtered, activeId, baseConversations]);

  const active = useMemo(
    () => baseConversations.find((c) => c.id === effectiveActiveId)!,
    [effectiveActiveId, baseConversations],
  );
  const card = useMemo(() => getCustomerCard(active.phone, active.customer_id), [active]);

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
    if (extraIdx < 0) return;
    setExtraTurns((prev) => {
      const arr = [...(prev[active.id] || [])];
      arr.splice(extraIdx, 1);
      return { ...prev, [active.id]: arr };
    });
  }, [active]);

  const now = () => new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });

  async function runAction(action: SlashAction) {
    setBusy(action);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);
    if (action === 'extract') {
      addTurn({ kind: 'extract', at: now(), data: mockExtract(active) });
    } else if (action === 'optimize') {
      const last = active.messages.filter((m) => m.from === 'agent').slice(-1)[0]?.body || '';
      if (!last) {
        addTurn({ kind: 'system', at: now(), data: { text: 'Type a draft, then run /optimize.', tone: 'warn' } });
      } else {
        addTurn({ kind: 'optimize', at: now(), data: mockOptimizeReply(last, 'en') });
      }
    } else if (action === 'verify') {
      const lastMedia = [...active.messages].reverse().find((m) => m.media);
      if (!lastMedia) {
        addTurn({ kind: 'system', at: now(), data: { text: 'No payment screenshot in this chat.', tone: 'warn' } });
      } else {
        addTurn({ kind: 'verify', at: now(), data: mockVerifyPayment(lastMedia.media!.filename), for_filename: lastMedia.media!.filename });
      }
    } else if (action === 'magazine') {
      addTurn({ kind: 'magazine', at: now(), data: mockMagazine(card.display_name || 'Customer') });
    } else if (action === 'tamara' || action === 'tabby') {
      // Use the latest extract's total; otherwise ask the agent to extract first
      const chatExtras = extraTurns[active.id] || [];
      const lastExtract = [...chatExtras].reverse().find((t) => t.kind === 'extract') as any;
      const total = lastExtract?.data?.totals?.total
        ?? lastExtract?.data?.selected_products?.reduce((s: number, p: any) => s + (p.price_aed || 0) * p.qty, 0)
        ?? 0;
      if (!total) {
        addTurn({ kind: 'system', at: now(), data: { text: `Run /extract first — ${action} link needs an amount.`, tone: 'warn' } });
      } else {
        addTurn({ kind: 'payment_link', at: now(), data: mockGeneratePaymentLink(action, total, active.phone) });
      }
    } else if (action === 'invoice') {
      const chatExtras = extraTurns[active.id] || [];
      const pushed = chatExtras.some((t) => t.kind === 'system' && /Draft pushed to/.test((t as any).data?.text || ''));
      if (!pushed) {
        addTurn({ kind: 'system', at: now(), data: { text: 'Push the draft first, then /invoice can email it.', tone: 'warn' } });
      } else {
        const lastExtract = [...chatExtras].reverse().find((t) => t.kind === 'extract') as any;
        const amount = lastExtract?.data?.totals?.total ?? 0;
        const amountStr = amount ? ` for ${formatAED(amount)}` : '';
        addTurn({ kind: 'system', at: now(), data: { text: `Shopify draft invoice emailed to ${card.display_name || 'customer'}${amountStr} · payment link included`, tone: 'good' } });
      }
    } else if (action === 'complete') {
      const chatExtras = extraTurns[active.id] || [];
      const invoiced = chatExtras.some((t) => t.kind === 'system' && /invoice emailed/.test((t as any).data?.text || ''));
      const pushed = chatExtras.some((t) => t.kind === 'system' && /Draft pushed to/.test((t as any).data?.text || ''));
      if (!pushed) {
        addTurn({ kind: 'system', at: now(), data: { text: 'No pushed draft to complete in this chat.', tone: 'warn' } });
      } else {
        const note = invoiced
          ? 'Shopify order marked complete · payment captured · fulfillment can begin'
          : 'Shopify order marked complete · cashback wallet updated';
        addTurn({ kind: 'system', at: now(), data: { text: note, tone: 'good' } });
      }
    } else if (action === 'sync') {
      const bal = card.wallet?.balance_aed ?? 0;
      const txt = card.matched
        ? `Wallet synced from customer_wallets · balance ${formatAED(bal)} · Limited Editions only`
        : 'Customer not yet matched — nothing to sync.';
      addTurn({ kind: 'system', at: now(), data: { text: txt, tone: card.matched ? 'info' : 'warn' } });
    }
  }

  function runShortcut(triggerKey: string) {
    const sc = SHORTCUTS.find((s) => s.trigger_key === triggerKey);
    if (!sc) return;
    addTurn({ kind: 'shortcut', at: now(), data: { trigger_key: triggerKey, en: sc.content_en, ar: sc.content_ar } });
  }

  function sendMessage(text: string) {
    const lang = /[؀-ۿ]/.test(text) ? 'ar' : 'en';
    const newMsg: Message = { id: `m_${Date.now()}`, at: now(), from: 'agent', body: text, language: lang as 'en' | 'ar' };
    addTurn({ kind: 'message', at: now(), data: newMsg });
  }

  function verifyMedia(m: Message) {
    if (!m.media) return;
    addTurn({ kind: 'verify', at: now(), data: mockVerifyPayment(m.media.filename), for_filename: m.media.filename });
  }

  function pushDraft(target: 'shopify' | 'woocommerce', meta?: { labels?: string[]; assignee_id?: string | null }) {
    const store = target === 'shopify' ? 'omniastores.ae' : 'omniastores.com';
    const metaBits = [];
    if (meta?.labels?.length) metaBits.push(`labels: ${meta.labels.join(', ')}`);
    if (meta?.assignee_id) metaBits.push(`assigned to ${meta.assignee_id}`);
    const metaStr = metaBits.length ? ` · ${metaBits.join(' · ')}` : '';
    addTurn({ kind: 'system', at: now(), data: { text: `Draft pushed to ${store} · order_submission created${metaStr}`, tone: 'good' } });

    // Auto-share to Finance Room when payment proof exists in the chat —
    // because the order_submissions row will need a payment check before
    // fulfillment. Mirrors what the Implementation Book §15 + the verify
    // prompt assume: any flagged payment surfaces to Finance automatically.
    const chatExtras = extraTurns[active.id] || [];
    const verifyTurn = chatExtras.find((t) => t.kind === 'verify') as any;
    const hasMediaInChat = active.messages.some((m) => m.media);
    if (verifyTurn || hasMediaInChat) {
      const action = verifyTurn?.data?.action as string | undefined;
      const tone: 'good' | 'warn' | 'bad' =
        action === 'reject_as_fraud' ? 'bad'
        : action === 'flag_for_finance' ? 'warn'
        : 'info' as any;
      const text = action === 'reject_as_fraud'
        ? 'Auto-flagged to Finance — payment proof rejected as fraud. Hold fulfillment.'
        : action === 'flag_for_finance'
          ? 'Auto-shared to Finance for payment review before fulfillment.'
          : action === 'approve'
            ? 'Shared to Finance — payment proof verified, ready to settle.'
            : 'Shared to Finance — payment proof in chat, needs review.';
      addTurn({ kind: 'system', at: now(), data: { text, tone: tone as any } });
    }
  }

  function shareProduct(p: ProductShare) {
    addTurn({ kind: 'product_share', at: now(), data: p });
  }

  function useShortcutOutput(lang: 'en' | 'ar' | 'both', en: string, ar: string) {
    if (lang === 'en') sendMessage(en);
    else if (lang === 'ar') sendMessage(ar);
    else { sendMessage(en); sendMessage(ar); }
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 flex">
        <DeskNav section={section} conversations={baseConversations} onChange={setSection} />

        <main className="flex-1 min-w-0 flex">
          {isChatSection(section) && (
            <ChatSection
              section={section}
              conversations={filtered}
              activeId={effectiveActiveId}
              active={active}
              card={card}
              turns={turns}
              busy={busy}
              showCustomer={showCustomer}
              onSelect={setActiveId}
              onSend={sendMessage}
              onSlashAction={runAction}
              onShortcutPick={runShortcut}
              onShareProduct={shareProduct}
              onVerifyMedia={verifyMedia}
              onDismissTurn={dismissTurn}
              onPushDraft={pushDraft}
              onUseShortcut={useShortcutOutput}
              onToggleCustomer={() => setShowCustomer(!showCustomer)}
            />
          )}
          {section === 'drafts' && (
            <DraftsSection
              onOpenChat={(convId) => { setActiveId(convId); setSection('inbox'); }}
            />
          )}
          {section === 'customers' && (
            <CustomersSection
              onOpenChat={(convId) => { setActiveId(convId); setSection('inbox'); }}
            />
          )}
          {section === 'templates' && <TemplatesSection />}
          {section === 'activity' && (
            <ActivitySection
              onOpenChat={(convId) => { setActiveId(convId); setSection('inbox'); }}
            />
          )}
          {section === 'settings' && <SettingsSection />}
        </main>
      </div>
    </div>
  );
}

function isChatSection(s: DeskSection) {
  return s === 'inbox' || s === 'unclaimed' || s === 'manager' || s === 'ready';
}

function ChatSection(props: {
  section: DeskSection;
  conversations: Conversation[];
  activeId: string;
  active: Conversation;
  card: ReturnType<typeof getCustomerCard>;
  turns: Turn[];
  busy: SlashAction | null;
  showCustomer: boolean;
  onSelect: (id: string) => void;
  onSend: (text: string) => void;
  onSlashAction: (a: SlashAction) => void;
  onShortcutPick: (t: string) => void;
  onShareProduct: (p: ProductShare) => void;
  onVerifyMedia: (m: Message) => void;
  onDismissTurn: (idx: number) => void;
  onPushDraft: (target: 'shopify' | 'woocommerce') => void;
  onUseShortcut: (lang: 'en' | 'ar' | 'both', en: string, ar: string) => void;
  onToggleCustomer: () => void;
}) {
  if (props.conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
        No conversations in this section yet.
      </div>
    );
  }

  return (
    <>
      <div className="w-80 shrink-0 border-r border-zinc-800">
        <ChatList
          conversations={props.conversations}
          activeId={props.activeId}
          onSelect={props.onSelect}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <ConvHeader
          active={props.active}
          card={props.card}
          showCustomer={props.showCustomer}
          onToggleCustomer={props.onToggleCustomer}
        />
        <ConversationThread
          turns={props.turns}
          card={props.card}
          onVerifyMedia={props.onVerifyMedia}
          onDismissTurn={props.onDismissTurn}
          onPushDraft={props.onPushDraft}
          onUseShortcut={props.onUseShortcut}
          onSendProduct={props.onSend}
        />
        <MessengerCompose
          onSend={props.onSend}
          onSlashAction={props.onSlashAction}
          onShortcutPick={props.onShortcutPick}
          onShareProduct={props.onShareProduct}
          busy={props.busy}
        />
      </div>

      {props.showCustomer && (
        <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto">
          <CustomerRail card={props.card} />
        </aside>
      )}
    </>
  );
}

function ConvHeader({
  active, card, showCustomer, onToggleCustomer,
}: {
  active: Conversation;
  card: ReturnType<typeof getCustomerCard>;
  showCustomer: boolean;
  onToggleCustomer: () => void;
}) {
  const name = card.display_name || 'Unknown sender';
  const initials = card.matched ? name.split(' ').map((p) => p[0]).slice(0, 2).join('') : '?';
  const v = active.vibes;
  const mood = v.happiness_level >= 8 ? '🌟' : v.happiness_level >= 6 ? '🙂' : v.happiness_level >= 4 ? '😐' : '😟';

  return (
    <div className="h-14 shrink-0 border-b border-zinc-800 px-4 flex items-center gap-3 bg-zinc-900">
      <div className="w-9 h-9 rounded-full bg-zinc-700 text-zinc-100 text-sm font-medium flex items-center justify-center shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">{name}</span>
          <span title={`Happiness ${v.happiness_level}/10`} className="text-sm leading-none">{mood}</span>
          {v.urgency === 'critical' && <VibePill tone="rose">urgent</VibePill>}
          {v.urgency === 'high'     && <VibePill tone="amber">high urgency</VibePill>}
          {v.fraud_risk === 'high'  && <VibePill tone="rose">fraud risk</VibePill>}
          {v.is_spam                && <VibePill tone="rose">spam</VibePill>}
          {v.seniority_needed === 'manager' && <VibePill tone="amber">manager needed</VibePill>}
          {v.business_blockers     && <VibePill tone="amber" title={v.business_blockers}>blocker</VibePill>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <CopyablePhone phone={card.phone} size="xs" />
          <span className="text-xs text-zinc-500">·</span>
          <span className="text-xs text-zinc-500">{card.country}</span>
          {card.history && (
            <>
              <span className="text-xs text-zinc-500">·</span>
              <span className="text-xs text-zinc-400 numeric">{card.history.orders} orders · {formatAED(card.history.ltv_aed, { compact: true })} LTV</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleCustomer}
          className={`px-2.5 h-8 rounded text-sm flex items-center gap-1.5 transition-colors ${
            showCustomer ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          Customer
        </button>
      </div>
    </div>
  );
}

function VibePill({ tone, children, title }: { tone: 'rose' | 'amber' | 'emerald'; children: React.ReactNode; title?: string }) {
  const tones = {
    rose:    'bg-rose-500/15 text-rose-300 border-rose-500/30',
    amber:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };
  return (
    <span title={title} className={`text-2xs px-1.5 py-0.5 rounded border ${tones[tone]}`}>{children}</span>
  );
}

function CustomerRail({ card }: { card: ReturnType<typeof getCustomerCard> }) {
  const orders = getRecentOrders(card.customer_id);
  const ledger = getWalletLedger(card.customer_id);
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="p-4 space-y-5">
      {/* Identity */}
      <div>
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Identity</div>
        <div className="text-base font-medium text-zinc-100">{card.display_name || 'Unknown'}</div>
        <CopyablePhone phone={card.phone} size="sm" showIcon />
        <div className="text-sm text-zinc-400 mt-1">{card.country} · {card.language_pref.toUpperCase()}</div>
        {blocked && (
          <div className="mt-2 px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            Blocked · cannot place new orders
          </div>
        )}
      </div>

      {/* Cross-store */}
      {card.history && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Cross-store history</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-zinc-100 font-medium numeric">{card.history.orders}</div>
              <div className="text-xs text-zinc-500">orders</div>
            </div>
            <div>
              <div className="text-zinc-100 font-medium numeric">{formatAED(card.history.ltv_aed, { compact: true })}</div>
              <div className="text-xs text-zinc-500">LTV</div>
            </div>
            <div>
              <div className="text-zinc-100 font-medium text-xs numeric">{card.history.last_at}</div>
              <div className="text-xs text-zinc-500">last</div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet + ledger */}
      {card.wallet && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Cashback wallet
          </div>
          <div className="text-base font-semibold text-emerald-400 numeric">{formatAED(card.wallet.balance_aed)}</div>
          <div className="text-xs text-zinc-500 mt-0.5 mb-2">Limited Editions only</div>
          {ledger.length > 0 && (
            <ul className="space-y-1.5 mt-2 pt-2 border-t border-zinc-800">
              {ledger.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-400 truncate flex-1">
                    <span className="text-zinc-500 numeric mr-2">{t.at}</span>
                    {t.note}
                  </span>
                  <span className={`numeric ml-2 shrink-0 ${t.type === 'accrual' ? 'text-emerald-400' : 'text-rose-300'}`}>
                    {t.type === 'accrual' ? '+' : '-'}{formatAED(t.amount_aed)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Recent orders */}
      {orders.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Recent orders</div>
          <ul className="space-y-1.5">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0 flex-1">
                  <span className="text-zinc-100 font-mono text-xs">{o.number}</span>
                  <span className="text-zinc-500 text-xs ml-2">
                    {o.store === 'shopify' ? '.ae' : o.store === 'woocommerce' ? '.com' : 'WA'}
                  </span>
                  <span className="text-zinc-500 text-xs ml-2">· {o.items_count} item{o.items_count === 1 ? '' : 's'}</span>
                </div>
                <span className={`text-xs px-1.5 h-4 rounded ${
                  o.status === 'completed' || o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : o.status === 'draft' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                } flex items-center`}>
                  {o.status.replace('_', ' ')}
                </span>
                <span className="text-zinc-300 numeric ml-3 shrink-0 w-20 text-right">{formatAED(o.total_aed, { compact: true })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.ghost && card.ghost.pages_viewed.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Ghost browse</div>
          <div className="text-xs text-zinc-400 mb-1">{card.ghost.sessions} sessions since {card.ghost.first_seen_at}</div>
          <ul className="space-y-1">
            {card.ghost.pages_viewed.slice(0, 4).map((p) => (
              <li key={p.sku} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 truncate flex-1">{p.title}</span>
                <span className="text-zinc-500 numeric ml-2">{p.views}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.labels.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Labels</div>
          <div className="flex flex-wrap gap-1">
            {card.labels.map((l) => (
              <span key={l} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">{l}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions — block / unblock */}
      {card.matched && (
        <div className="pt-2 border-t border-zinc-800">
          {blocked ? (
            <button
              onClick={() => setBlocked(false)}
              className="w-full h-8 rounded border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Unblock customer
            </button>
          ) : (
            <button
              onClick={() => { if (confirm('Block this customer? They will be auto-rejected on next contact.')) setBlocked(true); }}
              className="w-full h-8 rounded border border-rose-500/30 text-sm text-rose-300 hover:bg-rose-500/10"
            >
              Block customer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DraftsSection({ onOpenChat }: { onOpenChat: (convId: string) => void }) {
  const drafts = [
    { id: 'd1', conv_id: 'w1', customer: 'Aisha M.', phone: '+971501234884', items: 2, total: 2600, created: 'today 14:32', target: 'shopify' as const, labels: ['repeat', 'sister_gift'], assignee: 'Layla S.' },
    { id: 'd2', conv_id: 'w4', customer: 'Mariam K.', phone: '+966507733091', items: 3, total: 5400, created: 'today 13:51', target: 'shopify' as const, labels: ['ksa', 'bridal'], assignee: 'Layla S.' },
  ];
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="My drafts" count={drafts.length} hint="Drafts saved from conversations. Click a row to reopen the chat." />
      <div className="px-6 pb-6">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-left font-medium py-2">Phone</th>
              <th className="text-right font-medium py-2">Items</th>
              <th className="text-right font-medium py-2">Total</th>
              <th className="text-left font-medium py-2 pl-4">Target</th>
              <th className="text-left font-medium py-2 pl-4">Assignee</th>
              <th className="text-left font-medium py-2 pl-4">Labels</th>
              <th className="text-right font-medium py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {drafts.map((d) => (
              <tr key={d.id} onClick={() => onOpenChat(d.conv_id)} className="hover:bg-zinc-800/40 cursor-pointer">
                <td className="py-2.5 text-zinc-100">{d.customer}</td>
                <td className="py-2.5" onClick={(e) => e.stopPropagation()}><CopyablePhone phone={d.phone} size="sm" /></td>
                <td className="py-2.5 text-right text-zinc-300 numeric">{d.items}</td>
                <td className="py-2.5 text-right text-zinc-100 numeric">{formatAED(d.total)}</td>
                <td className="py-2.5 pl-4 text-zinc-300">{d.target === 'shopify' ? 'omniastores.ae' : 'omniastores.com'}</td>
                <td className="py-2.5 pl-4 text-zinc-400">{d.assignee}</td>
                <td className="py-2.5 pl-4">
                  <div className="flex flex-wrap gap-1">
                    {d.labels.map((l) => (
                      <span key={l} className="text-2xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{l}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onOpenChat(d.conv_id)} className="px-2 h-7 rounded border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-800">Open chat</button>
                    <button className="px-2 h-7 rounded bg-emerald-500 text-zinc-900 text-xs font-medium hover:bg-emerald-400">Push</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersSection({ onOpenChat }: { onOpenChat: (convId: string) => void }) {
  const [seg, setSeg] = useState<'all' | 'vip' | 'repeat' | 'new' | 'at_risk'>('all');
  const customers = [
    { id: 'cu_noura',  conv_id: 'w3', name: 'Noura A.', phone: '+971555478217', orders: 7, ltv: 38200, last: '2026-05-19', stores: 'shopify+wa', seg: 'vip' as const },
    { id: 'cu_aisha',  conv_id: 'w1', name: 'Aisha M.', phone: '+971501234884', orders: 3, ltv: 14400, last: '2026-04-12', stores: 'woo+wa',     seg: 'repeat' as const },
    { id: 'cu_mariam', conv_id: 'w4', name: 'Mariam K.', phone: '+966507733091', orders: 1, ltv: 3400, last: '2026-02-08', stores: 'wa',         seg: 'at_risk' as const },
    { id: 'cu_reem',   conv_id: 'w1', name: 'Reem H.',  phone: '+971566201155', orders: 4, ltv: 22100, last: '2026-05-02', stores: 'shopify+wa', seg: 'repeat' as const },
  ];
  const filtered = seg === 'all' ? customers : customers.filter((c) => c.seg === seg);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="Customers" count={filtered.length} hint="Click a row to open that customer's chat." />
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-2">
        {(['all', 'vip', 'repeat', 'new', 'at_risk'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeg(s)}
            className={`px-2.5 h-7 text-xs rounded border transition-colors ${
              seg === s ? 'bg-zinc-800 text-zinc-100 border-zinc-600' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="px-6 pb-6">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-left font-medium py-2">Phone</th>
              <th className="text-left font-medium py-2 pl-4">Segment</th>
              <th className="text-right font-medium py-2">Orders</th>
              <th className="text-right font-medium py-2">LTV</th>
              <th className="text-left font-medium py-2 pl-4">Last</th>
              <th className="text-left font-medium py-2 pl-4">Stores</th>
              <th className="text-right font-medium py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => onOpenChat(c.conv_id)} className="hover:bg-zinc-800/40 cursor-pointer">
                <td className="py-2.5 text-zinc-100">{c.name}</td>
                <td className="py-2.5" onClick={(e) => e.stopPropagation()}><CopyablePhone phone={c.phone} size="sm" /></td>
                <td className="py-2.5 pl-4">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    c.seg === 'vip' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : c.seg === 'repeat' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : c.seg === 'at_risk' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}>{c.seg.replace('_', ' ')}</span>
                </td>
                <td className="py-2.5 text-right text-zinc-300 numeric">{c.orders}</td>
                <td className="py-2.5 text-right text-zinc-100 numeric">{formatAED(c.ltv, { compact: true })}</td>
                <td className="py-2.5 pl-4 text-zinc-400 numeric">{c.last}</td>
                <td className="py-2.5 pl-4 text-zinc-300 font-mono text-xs">{c.stores}</td>
                <td className="py-2.5 text-right">
                  <span className="text-xs text-zinc-500">Open chat →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesSection() {
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="Templates" count={SHORTCUTS.length} hint="Bilingual quick replies. Type the trigger in any chat or click to insert." />
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {SHORTCUTS.map((s) => (
          <div key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-emerald-400">{s.trigger_key}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{s.category}</span>
            </div>
            <p className="text-sm text-zinc-300 leading-snug mb-1.5">{s.content_en}</p>
            <p className="text-sm text-zinc-400 leading-snug" dir="rtl">{s.content_ar}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySection({ onOpenChat }: { onOpenChat: (convId: string) => void }) {
  const events = [
    { at: '14:35', who: 'Layla', what: 'extracted chat', detail: 'Aisha M. — Crescent Ring × 2, COD AED 2,600', conv_id: 'w1' },
    { at: '14:31', who: 'Omar', what: 'verified payment', detail: 'Noura A. — Emirates NBD, 91%', conv_id: 'w3' },
    { at: '14:22', who: 'Layla', what: 'used template', detail: '/welcome', conv_id: 'w1' },
    { at: '14:18', who: 'Layla', what: 'pushed draft', detail: 'Aisha M. → omniastores.ae', conv_id: 'w1' },
    { at: '14:11', who: 'Omar', what: 'optimized reply', detail: 'Noura A. — 78% conversion', conv_id: 'w3' },
    { at: '13:52', who: 'Layla', what: 'flagged fraud', detail: '+971501009922 — Payment.pdf rejected', conv_id: 'w6' },
  ];
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="Activity log" count={events.length} hint="Recent agent actions and AI extractions. Append-only. Click a row to open the chat." />
      <div className="px-6 pb-6">
        <ul className="divide-y divide-zinc-800 border-y border-zinc-800">
          {events.map((e, i) => (
            <li
              key={i}
              onClick={() => e.conv_id && onOpenChat(e.conv_id)}
              className={`py-2.5 flex items-baseline gap-3 text-sm ${e.conv_id ? 'cursor-pointer hover:bg-zinc-800/40 px-2 -mx-2 rounded' : ''}`}
            >
              <span className="w-12 shrink-0 text-xs text-zinc-500 numeric">{e.at}</span>
              <span className="w-16 shrink-0 text-zinc-100 font-medium">{e.who}</span>
              <span className="w-32 shrink-0 text-zinc-400">{e.what}</span>
              <span className="text-zinc-300 flex-1 truncate">{e.detail}</span>
              {e.conv_id && <span className="text-xs text-zinc-500 shrink-0">open →</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="Settings" hint="WhatsApp Desk preferences." />
      <div className="px-6 pb-6 max-w-2xl space-y-4">
        <Setting label="WhatsApp Business number" value="+971 56 547 8227" />
        <Setting label="Default extraction model" value="GPT-4o" />
        <Setting label="Sort order" value="Smart (AI priority)" />
        <Setting label="Notification chime" value="On for unclaimed and manager queue" />
        <Setting label="PII masking in logs" value="Always (locked)" />
      </div>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className="text-sm text-zinc-100">{value}</span>
    </div>
  );
}

function SectionHead({ title, count, hint }: { title: string; count?: number; hint?: string }) {
  return (
    <div className="px-6 py-4 border-b border-zinc-800">
      <div className="flex items-baseline gap-2 mb-0.5">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {count !== undefined && <span className="text-sm text-zinc-500 numeric">{count}</span>}
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
