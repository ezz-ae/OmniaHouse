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
  mockVerifyPayment, mockMagazine,
} from '@/lib/whatsapp/mock';
import { messagesToTurns, type Turn } from '@/lib/whatsapp/thread';
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

  function pushDraft(target: 'shopify' | 'woocommerce') {
    addTurn({ kind: 'system', at: now(), data: { text: `Draft pushed to ${target === 'shopify' ? 'omniastores.ae' : 'omniastores.com'}`, tone: 'good' } });
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
              onVerifyMedia={verifyMedia}
              onDismissTurn={dismissTurn}
              onPushDraft={pushDraft}
              onUseShortcut={useShortcutOutput}
              onToggleCustomer={() => setShowCustomer(!showCustomer)}
            />
          )}
          {section === 'drafts' && <DraftsSection />}
          {section === 'customers' && <CustomersSection />}
          {section === 'templates' && <TemplatesSection />}
          {section === 'activity' && <ActivitySection />}
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
        />
        <MessengerCompose
          onSend={props.onSend}
          onSlashAction={props.onSlashAction}
          onShortcutPick={props.onShortcutPick}
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

  return (
    <div className="h-14 shrink-0 border-b border-zinc-800 px-4 flex items-center gap-3 bg-zinc-900">
      <div className="w-9 h-9 rounded-full bg-zinc-700 text-zinc-100 text-sm font-medium flex items-center justify-center shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-100">{name}</div>
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

function CustomerRail({ card }: { card: ReturnType<typeof getCustomerCard> }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Identity</div>
        <div className="text-base font-medium text-zinc-100">{card.display_name || 'Unknown'}</div>
        <CopyablePhone phone={card.phone} size="sm" showIcon />
        <div className="text-sm text-zinc-400 mt-1">{card.country} · {card.language_pref.toUpperCase()}</div>
      </div>

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

      {card.wallet && card.wallet.balance_aed > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Cashback wallet
          </div>
          <div className="text-base font-semibold text-emerald-400 numeric">{formatAED(card.wallet.balance_aed)}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Limited Editions only</div>
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
    </div>
  );
}

function DraftsSection() {
  const drafts = [
    { id: 'd1', customer: 'Aisha M.', phone: '+971501234884', items: 2, total: 2600, created: 'today 14:32', target: 'shopify' as const },
    { id: 'd2', customer: 'Mariam K.', phone: '+966507733091', items: 3, total: 5400, created: 'today 13:51', target: 'shopify' as const },
  ];
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="My drafts" count={drafts.length} hint="Drafts saved from conversations, waiting to be pushed to a store." />
      <div className="px-6 pb-6">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-left font-medium py-2">Phone</th>
              <th className="text-right font-medium py-2">Items</th>
              <th className="text-right font-medium py-2">Total</th>
              <th className="text-left font-medium py-2 pl-4">Target</th>
              <th className="text-left font-medium py-2 pl-4">Created</th>
              <th className="text-right font-medium py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {drafts.map((d) => (
              <tr key={d.id} className="hover:bg-zinc-800/40">
                <td className="py-2.5 text-zinc-100">{d.customer}</td>
                <td className="py-2.5"><CopyablePhone phone={d.phone} size="sm" /></td>
                <td className="py-2.5 text-right text-zinc-300 numeric">{d.items}</td>
                <td className="py-2.5 text-right text-zinc-100 numeric">{formatAED(d.total)}</td>
                <td className="py-2.5 pl-4 text-zinc-300">{d.target === 'shopify' ? 'omniastores.ae' : 'omniastores.com'}</td>
                <td className="py-2.5 pl-4 text-zinc-400 numeric">{d.created}</td>
                <td className="py-2.5 text-right">
                  <button className="px-2 h-7 rounded bg-emerald-500 text-zinc-900 text-xs font-medium hover:bg-emerald-400">Push</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersSection() {
  const customers = [
    { id: 'cu_noura', name: 'Noura A.', phone: '+971555478217', orders: 7, ltv: 38200, last: '2026-05-19', stores: 'shopify+wa' },
    { id: 'cu_aisha', name: 'Aisha M.', phone: '+971501234884', orders: 3, ltv: 14400, last: '2026-04-12', stores: 'woo+wa' },
    { id: 'cu_mariam', name: 'Mariam K.', phone: '+966507733091', orders: 1, ltv: 3400, last: '2026-02-08', stores: 'wa' },
    { id: 'cu_reem',   name: 'Reem H.', phone: '+971566201155', orders: 4, ltv: 22100, last: '2026-05-02', stores: 'shopify+wa' },
  ];
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="Customers" count={customers.length} hint="Customers contacted on WhatsApp recently." />
      <div className="px-6 pb-6">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-left font-medium py-2">Phone</th>
              <th className="text-right font-medium py-2">Orders</th>
              <th className="text-right font-medium py-2">LTV</th>
              <th className="text-left font-medium py-2 pl-4">Last</th>
              <th className="text-left font-medium py-2 pl-4">Stores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-800/40">
                <td className="py-2.5 text-zinc-100">{c.name}</td>
                <td className="py-2.5"><CopyablePhone phone={c.phone} size="sm" /></td>
                <td className="py-2.5 text-right text-zinc-300 numeric">{c.orders}</td>
                <td className="py-2.5 text-right text-zinc-100 numeric">{formatAED(c.ltv, { compact: true })}</td>
                <td className="py-2.5 pl-4 text-zinc-400 numeric">{c.last}</td>
                <td className="py-2.5 pl-4 text-zinc-300 font-mono text-xs">{c.stores}</td>
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

function ActivitySection() {
  const events = [
    { at: '14:35', who: 'Layla', what: 'extracted chat', detail: 'Aisha M. — Crescent Ring × 2, COD AED 2,600' },
    { at: '14:31', who: 'Omar', what: 'verified payment', detail: 'Noura A. — Emirates NBD, 91%' },
    { at: '14:22', who: 'Layla', what: 'used template', detail: '/welcome' },
    { at: '14:18', who: 'Layla', what: 'pushed draft', detail: 'Aisha M. → omniastores.ae' },
    { at: '14:11', who: 'Omar', what: 'optimized reply', detail: 'Noura A. — 78% conversion' },
    { at: '13:52', who: 'Layla', what: 'flagged fraud', detail: '+971501009922 — Payment.pdf rejected' },
  ];
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead title="Activity log" count={events.length} hint="Recent agent actions and AI extractions. Append-only." />
      <div className="px-6 pb-6">
        <ul className="divide-y divide-zinc-800 border-y border-zinc-800">
          {events.map((e, i) => (
            <li key={i} className="py-2.5 flex items-baseline gap-3 text-sm">
              <span className="w-12 shrink-0 text-xs text-zinc-500 numeric">{e.at}</span>
              <span className="w-16 shrink-0 text-zinc-100 font-medium">{e.who}</span>
              <span className="w-32 shrink-0 text-zinc-400">{e.what}</span>
              <span className="text-zinc-300 flex-1 truncate">{e.detail}</span>
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
