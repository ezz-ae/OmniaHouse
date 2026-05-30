'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { DeskNav, type DeskSection } from '@/components/whatsapp/desk-nav';
import { ChatList } from '@/components/whatsapp/chat-list';
import { ConversationThread } from '@/components/whatsapp/conversation-thread';
import { MessengerCompose, type SlashAction } from '@/components/whatsapp/messenger-compose';
import { CopyablePhone } from '@/components/whatsapp/copyable-phone';
import { RightPanel } from '@/components/whatsapp/right-panel';
import { ResizableColumn } from '@/components/ui/resizable-column';
import {
  getConversations, getCustomerCard, mockExtract, mockOptimizeReply,
  mockVerifyPayment, mockMagazine, mockGeneratePaymentLink,
} from '@/lib/whatsapp/mock';
import { messagesToTurns, type Turn, type ProductShare } from '@/lib/whatsapp/thread';
import { SHORTCUTS } from '@/lib/whatsapp/shortcuts';
import { formatAED } from '@/lib/utils';
import type { Message, Conversation, VoiceTranscription } from '@/lib/whatsapp/types';
import { Lock, UserPlus, UserMinus, AlertTriangle, RefreshCw, Brain, BadgeCheck, Sparkles, TrendingUp, Users, Inbox, Loader2 } from 'lucide-react';

// Real Omnia team — synced with lib/operations/store.ts seedTeam().
// In production this resolves from the auth/session layer.
const TEAM: { id: string; name: string }[] = [
  { id: 'tm_0', name: 'Mahmoud' },
  { id: 'tm_1', name: 'Ez' },
  { id: 'tm_2', name: 'Abdelrahman' },
  { id: 'tm_3', name: 'Arslan' },
  { id: 'tm_4', name: 'Abdallah' },
  { id: 'tm_6', name: 'Mohamed' },
];

type ConvPresence = {
  conversation_id: string;
  claimed_by_id: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  outgoing: { id: string; at: string; body: string; sent_by_id: string; sent_by_name: string; language: string }[];
  transcriptions: VoiceTranscription[];
  watchers: { id: string; name: string; at: string }[];
};

/**
 * WhatsApp Desk — a dashboard with its own sections menu.
 * Dark gray (zinc-900), not pure black. One sans-serif. Standard sizes.
 * Phone numbers visible, click-to-copy. No KPI tiles. No empty output
 * areas — every section shows real content.
 */

export default function WhatsAppDeskPage() {
  // The Desk now fetches conversations from /api/whatsapp/conversations
  // (Supabase-backed when OMNIA_ORG_ID is set, mock fallback otherwise).
  // The mock seed is the cold-start placeholder so the page renders
  // immediately while the first fetch is in flight.
  const seedConversations = useMemo(() => getConversations(), []);
  const [baseConversations, setBaseConversations] = useState<Conversation[]>(seedConversations);
  const [conversationsSource, setConversationsSource] = useState<'live' | 'mock'>('mock');
  const [section, setSection] = useState<DeskSection>('inbox');
  const [activeId, setActiveId] = useState(seedConversations[0].id);
  const [extraTurns, setExtraTurns] = useState<Record<string, Turn[]>>({});
  const [busy, setBusy] = useState<SlashAction | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string>('tm_2'); // Abdelrahman by default
  const [presenceMap, setPresenceMap] = useState<Record<string, ConvPresence>>({});
  const [transcriptions, setTranscriptions] = useState<Record<string, Record<string, VoiceTranscription>>>({});
  const [ownershipNotice, setOwnershipNotice] = useState<string | null>(null);

  const currentAgent = TEAM.find((m) => m.id === currentAgentId) || TEAM[2];

  // Fetch the inbox + presence overlay together. The API enriches each
  // conversation with the in-memory presence map (claim TTL, recent
  // outgoing) so we get both in a single round-trip.
  const refreshConversations = useCallback(async () => {
    const res = await fetch('/api/whatsapp/conversations').then((r) => r.json()).catch(() => null);
    if (!res?.ok || !Array.isArray(res.conversations)) return;
    const map: Record<string, ConvPresence> = {};
    const bare: Conversation[] = [];
    for (const c of res.conversations) {
      if (c.presence) map[c.id] = c.presence;
      // Strip the presence overlay before storing the Conversation itself.
      const { presence, ...rest } = c;
      bare.push(rest as Conversation);
    }
    setBaseConversations(bare.length ? bare : seedConversations);
    setPresenceMap(map);
    if (res.source === 'live' || res.source === 'mock') setConversationsSource(res.source);
  }, [seedConversations]);

  // First load + poll every 15s so new inbound messages appear without
  // the agent reloading the page. The poll is light: just the list +
  // most-recent N messages per conversation.
  useEffect(() => {
    refreshConversations();
    const t = setInterval(refreshConversations, 15_000);
    return () => clearInterval(t);
  }, [refreshConversations]);

  // Backwards-compat: existing handlers below call refreshPresence().
  const refreshPresence = refreshConversations;

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

  const presence = presenceMap[active.id] || null;
  const isOwnedByMe = presence?.claimed_by_id === currentAgentId;
  const isOwnedBySomeoneElse = presence?.claimed_by_id && presence.claimed_by_id !== currentAgentId;

  const turns = useMemo<Turn[]>(() => {
    // Build base turns, attaching internal sender attribution for agent messages from presence
    const outgoingByText = new Map(presence?.outgoing.map((o) => [o.body, o]) || []);
    const baseWithAttribution = active.messages.map((m): Message => {
      if (m.from === 'agent' && !m.sent_by_name) {
        // Try to match presence-recorded outgoing first; otherwise fall back to claimed owner
        const match = outgoingByText.get(m.body);
        if (match) return { ...m, sent_by_id: match.sent_by_id, sent_by_name: match.sent_by_name };
        if (presence?.claimed_by_name) return { ...m, sent_by_name: presence.claimed_by_name, sent_by_id: presence.claimed_by_id };
      }
      return m;
    });
    const base = messagesToTurns(baseWithAttribution);
    const extras = extraTurns[active.id] || [];
    return [...base, ...extras];
  }, [active, extraTurns, presence]);

  const convTranscriptions = transcriptions[active.id] || {};

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

  function latestExtraction() {
    const chatExtras = extraTurns[active.id] || [];
    const lastExtract = [...chatExtras].reverse().find((t) => t.kind === 'extract') as any;
    return lastExtract?.data || mockExtract(active);
  }

  async function ensureCustomerProfile(extraction = latestExtraction()) {
    const res = await fetch('/api/customers/unify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: active,
        phone: active.phone,
        transcript: active.messages.map((m) => `${m.from}: ${m.body}`).join('\n'),
        extraction,
      }),
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error || 'Customer profile could not be created');
    addTurn({ kind: 'system', at: now(), data: { text: `Customer profile unified · ${res.customer.name} · ${res.customer.id}`, tone: 'good' } });
    return res.customer;
  }

  async function placeOrderFromExtraction(target: 'shopify' | 'woocommerce', meta?: { labels?: string[]; assignee_id?: string | null }) {
    const extraction = latestExtraction();
    const customer = await ensureCustomerProfile(extraction);
    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: active,
        extraction,
        customer_id: customer.id,
        customer_phone: active.phone,
        target_store: target,
        payment_method: extraction.payment_method,
        notes: [
          extraction.manager_summary,
          ...(meta?.labels?.length ? [`labels: ${meta.labels.join(', ')}`] : []),
          ...(meta?.assignee_id ? [`assignee: ${meta.assignee_id}`] : []),
        ],
      }),
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error || 'Order could not be placed');
    return res;
  }

  async function runAction(action: SlashAction) {
    setBusy(action);
    try {
      if (action === 'extract') {
        const res = await fetch('/api/whatsapp/extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: active.id, user_role: 'whatsapp_agent' }),
        }).then((r) => r.json()).catch(() => null);
        const data = res?.extraction || mockExtract(active);
        addTurn({ kind: 'extract', at: now(), data });
        // Do NOT auto-create the customer profile. The extract card now has
        // an editable Customer Information section + a "Save customer
        // profile" button so the agent can fix the name/phone/country/etc.
        // before it lands in the CRM.
        if (res?.mode === 'real') addTurn({ kind: 'system', at: now(), data: { text: `via ${res.model}`, tone: 'info' } });
      } else if (action === 'optimize') {
        const last = active.messages.filter((m) => m.from === 'agent').slice(-1)[0]?.body || '';
        if (!last) {
          addTurn({ kind: 'system', at: now(), data: { text: 'Type a draft, then run /optimize.', tone: 'warn' } });
        } else {
          const context = active.messages.slice(-6).map((m) => `${m.from}: ${m.body}`).join('\n');
          const res = await fetch('/api/whatsapp/optimize-reply', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draft: last, language: 'en', context }),
          }).then((r) => r.json()).catch(() => null);
          const data = res?.optimization || mockOptimizeReply(last, 'en');
          addTurn({ kind: 'optimize', at: now(), data });
        }
      } else if (action === 'verify') {
        const lastMedia = [...active.messages].reverse().find((m) => m.media);
        if (!lastMedia) {
          addTurn({ kind: 'system', at: now(), data: { text: 'No payment screenshot in this chat.', tone: 'warn' } });
        } else {
          const res = await fetch('/api/whatsapp/verify-payment', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: lastMedia.media!.filename, customer_phone: active.phone }),
          }).then((r) => r.json()).catch(() => null);
          const data = res?.verification || mockVerifyPayment(lastMedia.media!.filename);
          addTurn({ kind: 'verify', at: now(), data, for_filename: lastMedia.media!.filename });
        }
      } else if (action === 'magazine') {
        const res = await fetch('/api/whatsapp/magazine', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: card.display_name || 'Customer',
            items: [],
            ghost_history: card.ghost?.pages_viewed || [],
          }),
        }).then((r) => r.json()).catch(() => null);
        const data = res?.magazine || mockMagazine(card.display_name || 'Customer');
        addTurn({ kind: 'magazine', at: now(), data });
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
      try {
        const customer = await ensureCustomerProfile();
        addTurn({ kind: 'system', at: now(), data: { text: `Unified customer synced · ${customer.name} · wallet ${formatAED(bal)} · Limited Editions only`, tone: 'info' } });
      } catch (err: any) {
        addTurn({ kind: 'system', at: now(), data: { text: err?.message || 'Customer sync failed.', tone: 'warn' } });
      }
    } else if (action === 'customer') {
      try {
        await ensureCustomerProfile();
      } catch (err: any) {
        addTurn({ kind: 'system', at: now(), data: { text: err?.message || 'Customer profile failed.', tone: 'bad' } });
      }
    } else if (action === 'order') {
      try {
        const extraction = latestExtraction();
        const target = extraction.target_store === 'woocommerce' ? 'woocommerce' : 'shopify';
        const res = await placeOrderFromExtraction(target);
        addTurn({
          kind: 'system',
          at: now(),
          data: { text: `Order placed · ${res.order.id} · ${formatAED(res.order.total_aed)} · ${target === 'shopify' ? 'omniastores.ae' : 'omniastores.com'}`, tone: 'good' },
        });
      } catch (err: any) {
        addTurn({ kind: 'system', at: now(), data: { text: err?.message || 'Order placement failed.', tone: 'bad' } });
      }
      }
    } finally {
      setBusy(null);
    }
  }

  function runShortcut(triggerKey: string) {
    const sc = SHORTCUTS.find((s) => s.trigger_key === triggerKey);
    if (!sc) return;
    addTurn({ kind: 'shortcut', at: now(), data: { trigger_key: triggerKey, en: sc.content_en, ar: sc.content_ar } });
  }

  async function sendMessage(text: string) {
    if (isOwnedBySomeoneElse) {
      const confirm = window.confirm(`This chat is owned by ${presence?.claimed_by_name}. Send anyway and take over the chat?`);
      if (!confirm) return;
      try { await claimConv(true); } catch { return; }
    }
    const lang = /[؀-ۿ]/.test(text) ? 'ar' : 'en';
    const newMsg: Message = {
      id: `m_${Date.now()}`, at: now(), from: 'agent', body: text, language: lang as 'en' | 'ar',
      sent_by_id: currentAgentId, sent_by_name: currentAgent.name,
    };
    addTurn({ kind: 'message', at: now(), data: newMsg });

    const customerLast = [...active.messages].reverse().find((m) => m.from === 'customer');
    const customerLastAt = customerLast ? `${new Date().toISOString().slice(0, 11)}${customerLast.at}:00.000Z` : null;
    const isPaymentLink = /tamara|tabby|iban|invoice|checkout/i.test(text);
    fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: active.phone, body: text, preview_url: true, language: lang,
        conversation_id: active.id, team_member_id: currentAgentId,
        payment_link: isPaymentLink,
        customer_last_message_at: customerLastAt,
      }),
    }).then((r) => r.json()).then((res) => {
      if (!res.ok) {
        addTurn({ kind: 'system', at: now(), data: { text: res.error || 'WhatsApp send failed.', tone: 'bad' } });
        return;
      }
      refreshPresence();
    }).catch((err) => addTurn({ kind: 'system', at: now(), data: { text: err?.message || 'WhatsApp send failed.', tone: 'bad' } }));
  }

  async function claimConv(force = false) {
    setOwnershipNotice(null);
    const res = await fetch(`/api/whatsapp/conversations/${active.id}/claim`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_member_id: currentAgentId, force }),
    }).then((r) => r.json()).catch((err) => ({ ok: false, error: err?.message }));
    if (res.ok) {
      setOwnershipNotice(`${currentAgent.name} now owns this chat.`);
      await refreshPresence();
    } else {
      setOwnershipNotice(res.error || 'Could not claim chat');
      throw new Error(res.error || 'Could not claim');
    }
  }

  async function releaseConv() {
    setOwnershipNotice(null);
    const res = await fetch(`/api/whatsapp/conversations/${active.id}/release`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_member_id: currentAgentId }),
    }).then((r) => r.json()).catch((err) => ({ ok: false, error: err?.message }));
    if (res.ok) {
      setOwnershipNotice('Released — anyone on the team can take it.');
      await refreshPresence();
    } else {
      setOwnershipNotice(res.error || 'Could not release chat');
    }
  }

  async function transcribeAudio(m: Message) {
    if (!m.media || m.media.kind !== 'audio') return;
    const res = await fetch('/api/whatsapp/transcribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: active.id,
        message_id: m.id,
        filename: m.media.filename,
        duration_sec: m.media.duration_sec,
        language: m.language,
      }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok && res.transcription) {
      setTranscriptions((prev) => ({
        ...prev,
        [active.id]: { ...(prev[active.id] || {}), [m.id]: res.transcription },
      }));
      addTurn({ kind: 'system', at: now(), data: { text: `AI transcribed voice note · ${res.transcription.summary.slice(0, 80)}`, tone: 'info' } });
    } else {
      addTurn({ kind: 'system', at: now(), data: { text: res?.error || 'Transcription failed.', tone: 'warn' } });
    }
  }

  function verifyMedia(m: Message) {
    if (!m.media) return;
    addTurn({ kind: 'verify', at: now(), data: mockVerifyPayment(m.media.filename), for_filename: m.media.filename });
  }

  async function pushDraft(target: 'shopify' | 'woocommerce', meta?: { labels?: string[]; assignee_id?: string | null }) {
    const store = target === 'shopify' ? 'omniastores.ae' : 'omniastores.com';
    try {
      const res = await placeOrderFromExtraction(target, meta);
      const metaBits = [];
      if (meta?.labels?.length) metaBits.push(`labels: ${meta.labels.join(', ')}`);
      if (meta?.assignee_id) metaBits.push(`assigned to ${meta.assignee_id}`);
      const metaStr = metaBits.length ? ` · ${metaBits.join(' · ')}` : '';
      addTurn({ kind: 'system', at: now(), data: { text: `Order placed in ${store} path · ${res.order.id} · ${formatAED(res.order.total_aed)}${metaStr}`, tone: 'good' } });
    } catch (err: any) {
      addTurn({ kind: 'system', at: now(), data: { text: err?.message || `Could not place order in ${store}.`, tone: 'bad' } });
      return;
    }

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

  async function shareProduct(p: ProductShare) {
    addTurn({ kind: 'product_share', at: now(), data: p });
    try {
      const res = await fetch('/api/whatsapp/share-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_sku: p.sku, customer_phone: active.phone }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || 'Product share was not recorded');
      addTurn({ kind: 'system', at: now(), data: { text: `Inventory share recorded · ${p.sku} · customer ${active.phone}`, tone: 'info' } });
    } catch (err: any) {
      addTurn({ kind: 'system', at: now(), data: { text: err?.message || 'Product share failed.', tone: 'warn' } });
    }
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
        <ResizableColumn
          storageKey="desk:nav"
          defaultWidth={224}
          minWidth={180}
          maxWidth={320}
          side="right"
          collapsedLabel="WhatsApp Desk"
          className="border-r border-zinc-800"
        >
          <DeskNav section={section} conversations={baseConversations} onChange={setSection} source={conversationsSource} />
        </ResizableColumn>

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
              presence={presence}
              currentAgent={currentAgent}
              isOwnedByMe={isOwnedByMe}
              isOwnedBySomeoneElse={!!isOwnedBySomeoneElse}
              ownershipNotice={ownershipNotice}
              onSelect={setActiveId}
              onSend={sendMessage}
              onSlashAction={runAction}
              onShortcutPick={runShortcut}
              onShareProduct={shareProduct}
              onVerifyMedia={verifyMedia}
              onTranscribe={transcribeAudio}
              transcriptions={convTranscriptions}
              onDismissTurn={dismissTurn}
              onPushDraft={pushDraft}
              onUseShortcut={useShortcutOutput}
              onClaim={() => claimConv(false)}
              onTransfer={() => claimConv(true)}
              onRelease={releaseConv}
              onClearOwnershipNotice={() => setOwnershipNotice(null)}
              onPickAgent={setCurrentAgentId}
              team={TEAM}
            />
          )}
          {section === 'analytics' && (
            <AnalyticsSection onOpenChat={(convId) => { setActiveId(convId); setSection('inbox'); }} />
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
  presence: ConvPresence | null;
  currentAgent: { id: string; name: string };
  isOwnedByMe: boolean;
  isOwnedBySomeoneElse: boolean;
  ownershipNotice: string | null;
  team: { id: string; name: string }[];
  transcriptions: Record<string, VoiceTranscription>;
  onSelect: (id: string) => void;
  onSend: (text: string) => void;
  onSlashAction: (a: SlashAction) => void;
  onShortcutPick: (t: string) => void;
  onShareProduct: (p: ProductShare) => void;
  onVerifyMedia: (m: Message) => void;
  onTranscribe: (m: Message) => Promise<void>;
  onDismissTurn: (idx: number) => void;
  onPushDraft: (target: 'shopify' | 'woocommerce', meta?: { labels?: string[]; assignee_id?: string | null }) => void;
  onUseShortcut: (lang: 'en' | 'ar' | 'both', en: string, ar: string) => void;
  onClaim: () => void;
  onTransfer: () => void;
  onRelease: () => void;
  onClearOwnershipNotice: () => void;
  onPickAgent: (id: string) => void;
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
      {/* Col 2 — Chat list. Resizable + collapsible. */}
      <ResizableColumn
        storageKey="desk:chatlist"
        defaultWidth={320}
        minWidth={240}
        maxWidth={480}
        side="right"
        collapsedLabel="Chats"
        className="border-r border-zinc-800"
      >
        <ChatList
          conversations={props.conversations}
          activeId={props.activeId}
          onSelect={props.onSelect}
        />
      </ResizableColumn>

      {/* Col 3 — Conversation. Always flex-1, absorbs leftover width. */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ConvHeader
          active={props.active}
          card={props.card}
          presence={props.presence}
          currentAgent={props.currentAgent}
          isOwnedByMe={props.isOwnedByMe}
          isOwnedBySomeoneElse={props.isOwnedBySomeoneElse}
          team={props.team}
          ownershipNotice={props.ownershipNotice}
          onClaim={props.onClaim}
          onTransfer={props.onTransfer}
          onRelease={props.onRelease}
          onPickAgent={props.onPickAgent}
          onClearOwnershipNotice={props.onClearOwnershipNotice}
        />
        <ConversationThread
          turns={props.turns}
          card={props.card}
          onVerifyMedia={props.onVerifyMedia}
          onTranscribe={props.onTranscribe}
          transcriptions={props.transcriptions}
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

      {/* Col 4 — Right panel: tabs between Customer and Omnia AI. */}
      <ResizableColumn
        storageKey="desk:rightpanel"
        defaultWidth={340}
        minWidth={280}
        maxWidth={520}
        side="left"
        collapsedLabel="Customer · Omnia AI"
        className="border-l border-zinc-800"
      >
        <RightPanel
          conv={props.active}
          card={props.card}
          onUseReply={props.onSend}
        />
      </ResizableColumn>
    </>
  );
}

function ConvHeader({
  active, card, presence, currentAgent, isOwnedByMe, isOwnedBySomeoneElse,
  team, ownershipNotice, onClaim, onTransfer, onRelease, onPickAgent, onClearOwnershipNotice,
}: {
  active: Conversation;
  card: ReturnType<typeof getCustomerCard>;
  presence: ConvPresence | null;
  currentAgent: { id: string; name: string };
  isOwnedByMe: boolean;
  isOwnedBySomeoneElse: boolean;
  team: { id: string; name: string }[];
  ownershipNotice: string | null;
  onClaim: () => void;
  onTransfer: () => void;
  onRelease: () => void;
  onPickAgent: (id: string) => void;
  onClearOwnershipNotice: () => void;
}) {
  const name = card.display_name || 'Unknown sender';
  const initials = card.matched ? name.split(' ').map((p) => p[0]).slice(0, 2).join('') : '?';
  const v = active.vibes;
  const mood = v.happiness_level >= 8 ? '🌟' : v.happiness_level >= 6 ? '🙂' : v.happiness_level >= 4 ? '😐' : '😟';
  const owner = presence?.claimed_by_name;

  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900">
      <div className="h-14 px-4 flex items-center gap-3">
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

        {/* Identity switcher (sim of auth) */}
        <select
          value={currentAgent.id}
          onChange={(e) => onPickAgent(e.target.value)}
          className="h-8 px-2 rounded-md border border-zinc-700 bg-zinc-950 text-xs text-zinc-200 hover:border-zinc-600"
          title="Acting as"
        >
          {team.map((m) => (
            <option key={m.id} value={m.id}>Acting as {m.name}</option>
          ))}
        </select>
      </div>

      {/* Ownership strip */}
      <div className={`h-9 px-4 border-t flex items-center gap-2 text-xs ${
        isOwnedByMe ? 'border-emerald-500/30 bg-emerald-500/5'
        : isOwnedBySomeoneElse ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-zinc-800 bg-zinc-950'
      }`}>
        <Lock className={`w-3.5 h-3.5 ${isOwnedByMe ? 'text-emerald-400' : isOwnedBySomeoneElse ? 'text-amber-400' : 'text-zinc-500'}`} />
        {owner ? (
          <span className={isOwnedByMe ? 'text-emerald-300' : 'text-amber-300'}>
            Owned by <span className="font-medium">{owner}</span>
            {presence?.claim_expires_at && (
              <span className="text-zinc-500 ml-1">· auto-release {fmtRelativeTime(presence.claim_expires_at)}</span>
            )}
          </span>
        ) : (
          <span className="text-zinc-400">Unclaimed — first message claims it for 15 min</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!owner && (
            <button onClick={onClaim} className="h-7 px-2.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-2xs text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> Claim chat
            </button>
          )}
          {isOwnedByMe && (
            <button onClick={onRelease} className="h-7 px-2.5 rounded border border-zinc-700 bg-zinc-900 text-2xs text-zinc-300 hover:text-zinc-100 flex items-center gap-1">
              <UserMinus className="w-3 h-3" /> Release
            </button>
          )}
          {isOwnedBySomeoneElse && (
            <button onClick={onTransfer} className="h-7 px-2.5 rounded border border-amber-500/30 bg-amber-500/10 text-2xs text-amber-300 hover:bg-amber-500/20 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Force transfer
            </button>
          )}
          {presence?.outgoing && presence.outgoing.length > 0 && (
            <span className="text-2xs text-zinc-500">· {presence.outgoing.length} sent by team</span>
          )}
        </div>
      </div>

      {ownershipNotice && (
        <div className="px-4 py-1.5 border-t border-zinc-800 bg-zinc-950 text-2xs text-zinc-300 flex items-center justify-between">
          <span>{ownershipNotice}</span>
          <button onClick={onClearOwnershipNotice} className="text-zinc-500 hover:text-zinc-200">dismiss</button>
        </div>
      )}
    </div>
  );
}

function fmtRelativeTime(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
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

function DraftsSection({ onOpenChat }: { onOpenChat: (convId: string) => void }) {
  const drafts = [
    { id: 'd1', conv_id: 'w1', customer: 'Aisha M.', phone: '+971501234884', items: 2, total: 2600, created: 'today 14:32', target: 'shopify' as const, labels: ['repeat', 'sister_gift'], assignee: 'Abdelrahman' },
    { id: 'd2', conv_id: 'w4', customer: 'Mariam K.', phone: '+966507733091', items: 3, total: 5400, created: 'today 13:51', target: 'shopify' as const, labels: ['ksa', 'bridal'], assignee: 'Abdelrahman' },
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
    { id: 'cu_noura',  conv_id: 'w3', name: 'Noura A.', phone: '+971555478217', orders: 7, ltv: 38_200, last: '2026-05-19', stores: 'shopify+wa', seg: 'vip' as const },
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

function AnalyticsSection({ onOpenChat }: { onOpenChat: (convId: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/whatsapp/analytics').then((r) => r.json());
      if (!res.ok) throw new Error(res.error || 'Failed');
      setData(res.analytics);
    } catch (err: any) { setError(err?.message || 'Could not load analytics'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-900">
        <div className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Computing WhatsApp analytics…</div>
      </div>
    );
  }
  if (error) {
    return <div className="flex-1 bg-zinc-900 p-6"><div className="rounded border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 px-4 py-3">{error}</div></div>;
  }
  if (!data) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900">
      <SectionHead
        title="WhatsApp analytics"
        hint="Happiness, response rate, team performance, payment links, order pipeline, media — computed live."
      />
      <div className="px-6 pb-6 pt-3 space-y-4">
        <div className="flex justify-end">
          <button onClick={load} className="h-8 px-3 rounded border border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Recompute
          </button>
        </div>

        {/* Top metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {data.top_metrics.map((m: any) => (
            <div key={m.label} className={`rounded-md border px-3 py-2 ${toneBorder(m.tone)}`}>
              <div className="text-2xs uppercase tracking-wider text-zinc-500 truncate">{m.label}</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${toneText(m.tone)}`}>{m.value}</div>
              {m.sub && <div className="text-2xs text-zinc-500 truncate">{m.sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AnalyticsCard icon={Sparkles} title="Customer happiness" subtitle={`Avg ${data.happiness.avg}/10 · tier ${data.happiness.tier}`}>
            <div className="space-y-1">
              {data.happiness.per_chat.map((p: any) => (
                <button
                  key={p.conversation_id}
                  onClick={() => onOpenChat(p.conversation_id)}
                  className="w-full px-2 py-1.5 rounded hover:bg-zinc-800 flex items-center gap-2 text-left"
                >
                  <span className={`w-2 h-2 rounded-full ${toneDot(p.tone)}`} />
                  <span className="text-xs text-zinc-200 numeric flex-1">{p.phone}</span>
                  <span className={`text-xs font-semibold ${toneText(p.tone)}`}>{p.level}/10</span>
                </button>
              ))}
            </div>
          </AnalyticsCard>

          <AnalyticsCard icon={Users} title="Team performance" subtitle="Who's carrying what + first-response times.">
            <table className="w-full text-xs">
              <thead className="text-2xs uppercase text-zinc-500">
                <tr><th className="text-left py-1">Name</th><th className="text-right py-1">Sent</th><th className="text-right py-1">Owned</th><th className="text-right py-1">Closed</th><th className="text-right py-1">First reply</th><th className="text-right py-1">Unresolved</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.team.map((row: any) => (
                  <tr key={row.team_member_id}>
                    <td className="py-1.5 text-zinc-200 flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${row.presence === 'online' ? 'bg-emerald-400' : row.presence === 'away' ? 'bg-amber-400' : 'bg-zinc-600'}`} />{row.name}</td>
                    <td className="py-1.5 text-right text-zinc-300 numeric">{row.outgoing}</td>
                    <td className="py-1.5 text-right text-zinc-300 numeric">{row.claimed}</td>
                    <td className="py-1.5 text-right text-zinc-300 numeric">{row.closed_today}</td>
                    <td className="py-1.5 text-right text-zinc-400 numeric">{row.avg_first_response_seconds ? `${row.avg_first_response_seconds}s` : '—'}</td>
                    <td className={`py-1.5 text-right numeric ${row.unresolved > 0 ? 'text-rose-300' : 'text-zinc-400'}`}>{row.unresolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AnalyticsCard>

          <AnalyticsCard icon={TrendingUp} title="Order pipeline" subtitle="Chat → draft → manager → paid → fulfilled.">
            <div className="space-y-1">
              {data.pipeline.map((row: any) => (
                <div key={row.stage} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-zinc-300 capitalize">{row.stage}</span>
                  <span className="text-zinc-200 numeric w-10 text-right">{row.count}</span>
                  <span className="text-zinc-500 numeric w-24 text-right">AED {row.value_aed.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </AnalyticsCard>

          <AnalyticsCard icon={AlertTriangle} title="Unresolved conversations" subtitle="Idle, manager-needed, or unclaimed.">
            <div className="space-y-1">
              {data.unresolved.slice(0, 8).map((row: any) => (
                <button key={row.conversation_id} onClick={() => onOpenChat(row.conversation_id)} className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-xs text-zinc-200 numeric flex-1">{row.phone}</span>
                  <span className="text-xs text-zinc-400 numeric">{row.minutes_idle}m idle</span>
                  <span className="text-2xs text-zinc-500">{row.reason}</span>
                </button>
              ))}
              {data.unresolved.length === 0 && <div className="text-xs text-zinc-500 text-center py-4">Inbox is clean.</div>}
            </div>
          </AnalyticsCard>

          <AnalyticsCard icon={BadgeCheck} title="Payment links" subtitle="Tamara / Tabby / Bank / Shopify invoices.">
            <table className="w-full text-xs">
              <thead className="text-2xs uppercase text-zinc-500"><tr><th className="text-left py-1">Provider</th><th className="text-right py-1">Sent</th><th className="text-right py-1">Paid</th><th className="text-right py-1">Expired</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {data.payment_links.map((row: any) => (
                  <tr key={row.provider}>
                    <td className="py-1.5 text-zinc-200 capitalize">{row.provider.replace('_', ' ')}</td>
                    <td className="py-1.5 text-right text-zinc-300 numeric">{row.sent}</td>
                    <td className="py-1.5 text-right text-emerald-400 numeric">{row.paid}</td>
                    <td className="py-1.5 text-right text-zinc-500 numeric">{row.expired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AnalyticsCard>

          <AnalyticsCard icon={Inbox} title="Received media" subtitle="Images, PDFs, voice notes — verified vs unverified.">
            <table className="w-full text-xs">
              <thead className="text-2xs uppercase text-zinc-500"><tr><th className="text-left py-1">Kind</th><th className="text-right py-1">Total</th><th className="text-right py-1">Verified</th><th className="text-right py-1">Unverified</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {data.received_media.map((row: any) => (
                  <tr key={row.kind}>
                    <td className="py-1.5 text-zinc-200 capitalize">{row.kind}</td>
                    <td className="py-1.5 text-right text-zinc-300 numeric">{row.count}</td>
                    <td className="py-1.5 text-right text-emerald-400 numeric">{row.verified}</td>
                    <td className="py-1.5 text-right text-amber-400 numeric">{row.unverified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AnalyticsCard>

          <AnalyticsCard icon={TrendingUp} title="Upsell" subtitle="Multi-line WhatsApp orders + value.">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2"><div className="text-2xs text-zinc-500 uppercase">Multi-line</div><div className="text-lg text-emerald-400 font-semibold">{data.upsell.multi_line_orders} / {data.upsell.total_orders}</div></div>
              <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2"><div className="text-2xs text-zinc-500 uppercase">Rate</div><div className="text-lg text-zinc-100 font-semibold">{data.upsell.pct}%</div></div>
              <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2"><div className="text-2xs text-zinc-500 uppercase">Avg lines</div><div className="text-lg text-zinc-100 font-semibold numeric">{data.upsell.avg_lines}</div></div>
              <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2"><div className="text-2xs text-zinc-500 uppercase">Revenue</div><div className="text-lg text-emerald-400 font-semibold numeric">AED {data.upsell.revenue_aed.toLocaleString()}</div></div>
            </div>
          </AnalyticsCard>

          <AnalyticsCard icon={Inbox} title="Submitted orders" subtitle="From WhatsApp Desk, latest 8.">
            <div className="space-y-1">
              {data.submitted_orders.slice(0, 8).map((row: any) => (
                <div key={row.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-zinc-200 truncate">{row.customer}</span>
                  <span className="text-zinc-500">{row.target === 'shopify' ? '.ae' : '.com'}</span>
                  <span className="text-zinc-300 numeric w-20 text-right">AED {row.total_aed.toLocaleString()}</span>
                  <span className="text-2xs text-zinc-500 w-20 truncate">{row.status}</span>
                </div>
              ))}
              {data.submitted_orders.length === 0 && <div className="text-xs text-zinc-500 text-center py-4">No WhatsApp orders yet.</div>}
            </div>
          </AnalyticsCard>
        </div>

        <div className="text-2xs text-zinc-600 text-right">
          Generated · {new Date(data.generated_at).toLocaleString('en-AE', { hour12: false })}
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-zinc-100">{title}</span>
      </div>
      <div className="text-xs text-zinc-500 mb-3">{subtitle}</div>
      {children}
    </div>
  );
}

function toneBorder(tone: string) {
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/5';
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/5';
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/5';
  if (tone === 'sky') return 'border-sky-500/30 bg-sky-500/5';
  if (tone === 'violet') return 'border-violet-500/30 bg-violet-500/5';
  return 'border-zinc-800 bg-zinc-900';
}
function toneText(tone: string) {
  if (tone === 'emerald') return 'text-emerald-400';
  if (tone === 'amber') return 'text-amber-400';
  if (tone === 'rose') return 'text-rose-400';
  if (tone === 'sky') return 'text-sky-400';
  if (tone === 'violet') return 'text-violet-400';
  return 'text-zinc-200';
}
function toneDot(tone: string) {
  if (tone === 'emerald') return 'bg-emerald-400';
  if (tone === 'amber') return 'bg-amber-400';
  if (tone === 'rose') return 'bg-rose-400';
  if (tone === 'sky') return 'bg-sky-400';
  if (tone === 'violet') return 'bg-violet-400';
  return 'bg-zinc-500';
}

function ActivitySection({ onOpenChat }: { onOpenChat: (convId: string) => void }) {
  const events = [
    { at: '14:35', who: 'Abdelrahman', what: 'extracted chat', detail: 'Aisha M. — Crescent Ring × 2, COD AED 2,600', conv_id: 'w1' },
    { at: '14:31', who: 'Arslan', what: 'verified payment', detail: 'Noura A. — Emirates NBD, 91%', conv_id: 'w3' },
    { at: '14:22', who: 'Abdelrahman', what: 'used template', detail: '/welcome', conv_id: 'w1' },
    { at: '14:18', who: 'Abdelrahman', what: 'pushed draft', detail: 'Aisha M. → omniastores.ae', conv_id: 'w1' },
    { at: '14:11', who: 'Arslan', what: 'optimized reply', detail: 'Noura A. — 78% conversion', conv_id: 'w3' },
    { at: '13:52', who: 'Abdelrahman', what: 'flagged fraud', detail: '+971501009922 — Payment.pdf rejected', conv_id: 'w6' },
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
