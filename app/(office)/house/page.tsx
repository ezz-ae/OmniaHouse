'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { ROOMS, ROOM_GROUPS, type Room } from '@/lib/rooms';
import { Sparkles, Send, Loader2, ArrowRight } from 'lucide-react';
import { mockAgentReply, getAgent } from '@/lib/agents/mock';

const OMNIA_AGENT_ID = 'agent_omnia';
import type { AgentMessage } from '@/lib/agents/types';

/**
 * Lobby — the entry into the platform after auth.
 *
 * Conversation with Omnia AI is the primary surface. The cool menu —
 * a horizontal pill rail of rooms with live status — sits below the
 * input, scrollable, not a wall of boxes.
 *
 * This is not a dashboard. There are no KPI tiles. There is a person
 * (Omnia) and there are doors (rooms). The middle of the page is the
 * conversation; the bottom is the menu.
 */
export default function LobbyPage() {
  const router = useRouter();
  const omnia = useMemo(() => getAgent(OMNIA_AGENT_ID)!, []);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = '0px';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [draft]);

  // Stay scrolled to latest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    if (!draft.trim() || sending) return;
    const at = new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false });
    const userMsg: AgentMessage = { id: `u_${Date.now()}`, agent_id: OMNIA_AGENT_ID, from: 'user', body: draft, at };
    setMessages((arr) => [...arr, userMsg]);
    const text = draft;
    setDraft('');
    setSending(true);
    await new Promise((r) => setTimeout(r, 500));
    const reply = mockAgentReply(omnia, text);
    setMessages((arr) => [...arr, reply]);
    setSending(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const greet = greetByHour();

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <main className="flex-1 min-h-0 flex flex-col">
        {/* Conversation area */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-12">
            {/* Greeting + Omnia status */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">{greet}</div>
              <h1 className="text-3xl font-medium text-zinc-100 mb-4 leading-tight tracking-tight">
                House of Omnia
              </h1>
              <div className="flex items-center gap-3 text-sm text-zinc-400 leading-relaxed">
                <span className="inline-flex items-center gap-2 px-2 h-6 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06]">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-2xs uppercase tracking-wider text-emerald-300">Omnia AI is Live</span>
                </span>
                <span className="text-zinc-500">Ask anything, or pick a room below.</span>
              </div>
            </div>

            {/* Messages */}
            {messages.length > 0 && (
              <div className="space-y-3 mb-6">
                {messages.map((m) => (
                  <Message key={m.id} m={m} />
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    Omnia is thinking…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Compose */}
        <div className="shrink-0 px-6 pb-3 pt-2 bg-zinc-950">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask Omnia AI"
              rows={1}
              className="flex-1 resize-none min-h-[44px] max-h-[120px] px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-md text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className={`h-11 px-4 shrink-0 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                draft.trim() && !sending ? 'bg-emerald-500 text-zinc-900 hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cool menu — horizontal rail of rooms with live status */}
        <RoomsRail onPick={(slug) => router.push(`/${slug}`)} />
      </main>
    </div>
  );
}

function Message({ m }: { m: AgentMessage }) {
  const isUser = m.from === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
        isUser
          ? 'bg-emerald-900/40 text-zinc-100 border border-emerald-800/40 rounded-br-md'
          : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-bl-md'
      }`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 text-2xs uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-3 h-3" /> Omnia AI
          </div>
        )}
        {m.body}
      </div>
    </div>
  );
}

// ─── Cool menu — rooms rail ────────────────────────────────────────────────

function RoomsRail({ onPick }: { onPick: (slug: string) => void }) {
  // Group order matters: most-used first
  const grouped = ROOM_GROUPS.flatMap((g) =>
    ROOMS.filter((r) => r.group === g.id && r.slug !== 'house').map((r) => ({ ...r, groupLabel: g.label })),
  );

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/60 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-6 py-3">
        <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
          <span>Rooms</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-600">{grouped.length} doors</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {grouped.map((r) => (
            <RoomPill key={r.slug} room={r} onClick={() => onPick(r.slug)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomPill({ room, onClick }: { room: Room & { groupLabel: string }; onClick: () => void }) {
  const Icon = room.icon;
  const badge = room.badge?.count && room.badge.count > 0 ? room.badge : null;
  const tone = badge ? (badge.tone || 'neutral') : 'neutral';
  const badgeClass =
    tone === 'bad' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
    tone === 'warn' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
    tone === 'good' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
    tone === 'gold' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' :
    'bg-zinc-800 text-zinc-300 border-zinc-700';

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-3 h-9 rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-all shrink-0"
    >
      <Icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
      <span className="text-sm text-zinc-300 group-hover:text-zinc-100 whitespace-nowrap">
        {room.name}
      </span>
      {badge && (
        <span className={`text-2xs font-mono numeric px-1.5 h-4 rounded border flex items-center ${badgeClass}`}>
          {badge.count}
        </span>
      )}
      <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function greetByHour(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}
