'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/lib/whatsapp/types';
import { maskPhoneForLogs } from '@/lib/whatsapp/routing';
import { Search, AlertTriangle, Sparkles, Phone } from 'lucide-react';

/**
 * Chat list — sized and toned to feel like a messenger sidebar, not a
 * data table. Gold pulled out of the chrome; reserved for the active
 * row indicator + unread badge.
 */
export function ChatList({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [smart, setSmart] = useState(true);

  const list = useMemo(() => {
    let arr = conversations;
    if (q) {
      const n = q.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.phone.includes(n) ||
          c.messages.some((m) => m.body.toLowerCase().includes(n)) ||
          c.labels.some((l) => l.includes(n)),
      );
    }
    if (smart) arr = [...arr].sort((a, b) => priorityScore(b) - priorityScore(a));
    return arr;
  }, [conversations, q, smart]);

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header — slim */}
      <div className="px-3 pt-3 pb-2 border-b border-line-soft">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <span className="text-xs font-medium text-ink truncate font-mono">+971 56 547 8227</span>
          </div>
          <button
            onClick={() => setSmart(!smart)}
            className={cn(
              'flex items-center gap-1 px-1.5 h-5 rounded text-2xs border transition-colors',
              smart ? 'bg-gold/10 text-gold border-gold/30' : 'border-line text-ink-dim hover:text-ink',
            )}
            title="Sort by AI priority"
          >
            <Sparkles className="w-2.5 h-2.5" />
            {smart ? 'smart' : 'recent'}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            className="w-full h-8 pl-8 pr-3 bg-canvas-panel border border-line-soft rounded-md text-xs text-ink placeholder:text-ink-dim focus:border-line-strong outline-none"
          />
        </div>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <li className="p-6 text-center text-2xs text-ink-dim">No chats match this filter.</li>
        )}
        {list.map((c) => {
          const active = c.id === activeId;
          const last = c.messages[c.messages.length - 1];
          const highPriority = c.vibes.fraud_risk === 'high' || c.vibes.urgency === 'critical' || c.vibes.seniority_needed === 'manager';
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-canvas-inset/60 transition-colors border-l-2',
                  active ? 'bg-canvas-inset border-l-gold' : 'border-l-transparent',
                )}
              >
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center font-medium text-xs shrink-0',
                      c.customer_id
                        ? 'bg-gradient-to-br from-gold to-gold-deep text-canvas'
                        : 'bg-canvas-panel border border-line text-ink-dim',
                    )}
                  >
                    {c.customer_id
                      ? c.customer_id.replace('cu_', '').slice(0, 2).toUpperCase()
                      : '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                        {highPriority && <AlertTriangle className="w-3 h-3 text-bad shrink-0" />}
                        {c.customer_id ? c.customer_id.replace('cu_', '').replace(/^./, (s) => s.toUpperCase()) + '.' : <span className="italic text-ink-dim font-mono text-xs">{maskPhoneForLogs(c.phone)}</span>}
                      </span>
                      <span className="text-2xs text-ink-dim numeric shrink-0">{c.last_at}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs text-ink-muted truncate flex-1 leading-snug"
                        dir={c.language === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {last?.body}
                      </span>
                      {c.unread > 0 && (
                        <span className="px-1.5 h-4 rounded-full bg-gold text-canvas text-2xs font-semibold numeric shrink-0 flex items-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    {(c.status === 'unclaimed' || c.status === 'ready_for_draft' || highPriority) && (
                      <div className="flex items-center gap-1 mt-1 text-2xs">
                        {c.status === 'unclaimed' && <Chip tone="bad">unclaimed</Chip>}
                        {c.status === 'ready_for_draft' && <Chip tone="gold">ready</Chip>}
                        {c.vibes.seniority_needed === 'manager' && <Chip tone="bad">manager</Chip>}
                        {c.vibes.fraud_risk === 'high' && <Chip tone="bad">fraud</Chip>}
                        {c.vibes.urgency === 'critical' && <Chip tone="warn">urgent</Chip>}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chip({ tone, children }: { tone: 'gold' | 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
  const tones = {
    gold: 'text-gold bg-gold/10 border-gold/25',
    good: 'text-good bg-good/10 border-good/25',
    warn: 'text-warn bg-warn/10 border-warn/25',
    bad:  'text-bad  bg-bad/10  border-bad/25',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 h-4 rounded text-2xs font-medium border', tones[tone])}>
      {children}
    </span>
  );
}

function priorityScore(c: Conversation): number {
  let s = 0;
  if (c.vibes.fraud_risk === 'high') s += 100;
  if (c.vibes.urgency === 'critical') s += 80;
  if (c.vibes.seniority_needed === 'manager') s += 60;
  if (c.status === 'ready_for_draft') s += 40;
  if (c.status === 'unclaimed') s += 20;
  s += c.unread * 3;
  if (c.vibes.business_blockers) s += 30;
  return s;
}
