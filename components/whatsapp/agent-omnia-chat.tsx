'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, MessageSquareText, Search, Lightbulb } from 'lucide-react';
import type { Conversation, CustomerCard } from '@/lib/whatsapp/types';

/**
 * Omnia AI chat *inside* the WhatsApp Desk — for the agent on duty.
 *
 * Pinned to the active conversation: Omnia AI sees who the customer is,
 * what they wrote, what they've bought, and what they browsed without
 * buying. The agent can ask:
 *
 *   "What should I write?"     → drafts a reply in the right language
 *   "Did this customer visit?" → reads ghost browse history
 *   "Is this a returning customer?" → reads cross-store history
 *   "Suggest the next step"    → routes to /api/omnia/converse
 *
 * Suggestions are clickable so the agent doesn't have to type. Each
 * response stays in the chat history of this specific conversation.
 */

type Msg = {
  id: string;
  from: 'agent' | 'omnia';
  body: string;
  at: string;
};

export function AgentOmniaChat({
  conv,
  card,
  onUseReply,
}: {
  conv: Conversation;
  card: CustomerCard;
  /** When the agent clicks "use this reply", we push it into the compose box. */
  onUseReply?: (text: string) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset chat when the agent switches conversation
  useEffect(() => { setMessages([]); setDraft(''); }, [conv.id]);

  // Stay scrolled to latest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    const at = new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });
    const agentMsg: Msg = { id: `a_${Date.now()}`, from: 'agent', body: question, at };
    setMessages((arr) => [...arr, agentMsg]);
    setDraft('');
    setBusy(true);

    // Build a short context summary so Omnia answers about THIS chat
    const lastFew = conv.messages.slice(-6).map((m) => `${m.from}: ${m.body}`).join('\n');
    const customerLine = card.matched
      ? `Customer: ${card.display_name || 'returning'} · ${card.history?.orders ?? 0} orders · AED ${card.history?.ltv_aed ?? 0} LTV · ${card.country}`
      : `Customer: NEW (no prior orders) · ${card.country}`;
    const ghostLine = card.ghost?.pages_viewed?.length
      ? `Ghost browsed: ${card.ghost.pages_viewed.slice(0, 4).map((p) => p.title).join(' · ')}`
      : 'Ghost browse: nothing recorded.';
    const walletLine = card.wallet?.balance_aed
      ? `Wallet balance: AED ${card.wallet.balance_aed} (Limited Editions only)`
      : 'Wallet: empty';
    const context = `Active chat with ${conv.phone} (${conv.language}).\n${customerLine}\n${ghostLine}\n${walletLine}\nRecent messages:\n${lastFew}\n\nAgent asks: ${question}`;

    try {
      const res = await fetch('/api/omnia/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: context }),
      });
      const json = await res.json().catch(() => ({}));
      const body = json?.response_message || mockOmniaReply(question, conv, card);
      const reply: Msg = { id: `o_${Date.now()}`, from: 'omnia', body, at: new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false }) };
      setMessages((arr) => [...arr, reply]);
    } catch {
      const reply: Msg = { id: `o_${Date.now()}`, from: 'omnia', body: mockOmniaReply(question, conv, card), at: new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false }) };
      setMessages((arr) => [...arr, reply]);
    } finally {
      setBusy(false);
    }
  }

  const presets = buildPresets(conv, card);

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header — small, calm */}
      <div className="shrink-0 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100">Omnia AI</div>
          <div className="text-2xs text-zinc-500 truncate">Knows this customer · this chat</div>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-2xs text-zinc-500 px-1 mb-1 uppercase tracking-wider">Quick asks</div>
        )}
        {messages.length === 0 && presets.map((p) => (
          <button
            key={p.label}
            onClick={() => ask(p.question)}
            className="w-full text-left px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors flex items-start gap-2"
          >
            <p.icon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-200 leading-snug">{p.label}</div>
              <div className="text-2xs text-zinc-500 leading-snug mt-0.5">{p.hint}</div>
            </div>
          </button>
        ))}

        {messages.map((m) => (
          <Bubble key={m.id} m={m} onUseReply={onUseReply} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-2xs text-zinc-500 px-1">
            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
            Omnia AI is thinking…
          </div>
        )}
      </div>

      {/* Compose */}
      <div className="shrink-0 border-t border-zinc-800 px-3 py-2.5">
        <div className="flex items-end gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(draft); } }}
            placeholder="Ask Omnia AI about this chat…"
            rows={1}
            className="flex-1 resize-none min-h-[36px] max-h-[120px] px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
          />
          <button
            onClick={() => ask(draft)}
            disabled={!draft.trim() || busy}
            className={`h-9 w-9 shrink-0 rounded-md flex items-center justify-center ${
              draft.trim() && !busy ? 'bg-emerald-500 text-zinc-900 hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, onUseReply }: { m: Msg; onUseReply?: (text: string) => void }) {
  const isAgent = m.from === 'agent';
  // Heuristic: if Omnia returns a body with a quoted reply / phrase the agent might want to send,
  // offer a "use this reply" button. We keep it simple — any non-empty Omnia bubble can be used.
  const canUse = !isAgent && onUseReply && m.body.length > 12 && m.body.length < 800;
  return (
    <div className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
      <div className="text-2xs text-zinc-500 mb-0.5 px-1 flex items-center gap-1">
        {!isAgent && <Sparkles className="w-2.5 h-2.5 text-emerald-400" />}
        <span>{isAgent ? 'You' : 'Omnia AI'}</span>
        <span className="text-zinc-700 numeric">· {m.at}</span>
      </div>
      <div className={`max-w-[92%] px-3 py-2 text-sm leading-relaxed rounded-md whitespace-pre-line ${
        isAgent ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-emerald-500/[0.06] text-zinc-100 border border-emerald-500/20'
      }`}>
        {m.body}
      </div>
      {canUse && (
        <button
          onClick={() => onUseReply?.(m.body)}
          className="mt-1 text-2xs px-2 h-5 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
        >
          Use this reply
        </button>
      )}
    </div>
  );
}

// ─── Presets — depend on what we know about the active chat ────────────────

function buildPresets(conv: Conversation, card: CustomerCard) {
  const last = conv.messages[conv.messages.length - 1];
  const lastIsCustomer = last && last.from === 'customer';

  const list: { label: string; question: string; hint: string; icon: typeof Sparkles }[] = [];

  if (lastIsCustomer) {
    list.push({
      label: 'What should I write?',
      question: `Draft a reply in ${conv.language === 'ar' ? 'Arabic' : 'English'} for the latest customer message. Keep luxury tone.`,
      hint: 'Drafts a reply in the right language and tone.',
      icon: MessageSquareText,
    });
  }

  if (card.ghost?.pages_viewed?.length) {
    list.push({
      label: 'What did this customer browse?',
      question: 'Summarise this customer\'s ghost browse history — what they viewed and what they left in cart.',
      hint: `${card.ghost.pages_viewed.length} pages · ${card.ghost.abandoned_carts?.length || 0} abandoned`,
      icon: Search,
    });
  } else {
    list.push({
      label: 'Did this customer visit the site?',
      question: 'Did this customer (by phone) visit omniastores.ae or .com? Any browse history we can use?',
      hint: 'Pulls ghost browse from the customer profile.',
      icon: Search,
    });
  }

  list.push({
    label: 'What\'s the best next step?',
    question: 'Given this chat and what we know about the customer, what should I do next?',
    hint: 'Reads the chat + customer history and suggests an action.',
    icon: Lightbulb,
  });

  if (card.matched && (card.history?.orders ?? 0) > 0) {
    list.push({
      label: 'What did they buy before?',
      question: 'Summarise this customer\'s past orders — last items, average value, last date.',
      hint: `${card.history?.orders} prior order${card.history?.orders === 1 ? '' : 's'} · AED ${card.history?.ltv_aed || 0} LTV`,
      icon: Sparkles,
    });
  }

  return list;
}

// ─── Mock reply when /api/omnia/converse returns nothing ───────────────────

function mockOmniaReply(question: string, conv: Conversation, card: CustomerCard): string {
  const q = question.toLowerCase();
  if (q.includes('draft a reply') || q.includes('what should i write')) {
    if (conv.language === 'ar') {
      return 'مرحبًا! يسعدنا اهتمامك. أكدي لي القياس وعنوان الشحن وسأرسل لكِ الفاتورة فورًا 💎';
    }
    return 'Hello! Lovely to hear from you. Confirm your size and shipping address and I\'ll prepare the invoice right away.';
  }
  if (q.includes('browse') || q.includes('visit')) {
    if (card.ghost?.pages_viewed?.length) {
      const pages = card.ghost.pages_viewed.slice(0, 3).map((p) => p.title).join(', ');
      const carts = card.ghost.abandoned_carts?.length || 0;
      return `Yes — ${card.ghost.sessions} site sessions. Viewed: ${pages}. ${carts} cart${carts === 1 ? '' : 's'} abandoned. Lead with what they almost bought.`;
    }
    return 'No browse history under this phone. They came in cold via WhatsApp.';
  }
  if (q.includes('bought') || q.includes('past order')) {
    if (card.history && card.history.orders > 0) {
      return `${card.history.orders} prior order${card.history.orders === 1 ? '' : 's'} · total AED ${card.history.ltv_aed.toLocaleString()} · last on ${card.history.last_at}. ${card.history.vip_flag ? 'VIP — treat warmly.' : ''}`;
    }
    return 'First-time customer on this number.';
  }
  if (q.includes('next step')) {
    if (conv.vibes.fraud_risk === 'high') return 'Fraud risk is high — verify the payment proof before pushing the draft.';
    if (conv.vibes.seniority_needed === 'manager') return 'Manager queue. Loop Abdelrahman in before replying.';
    if (conv.vibes.urgency === 'high' || conv.vibes.urgency === 'critical') return 'High urgency. Reply now, run /extract once you have items + address, then push the draft.';
    return 'Ask for the missing info (size or address), run /extract, then push the draft to the right store.';
  }
  return 'I have the chat in view. Ask me what to write, what they browsed, or what to do next.';
}
