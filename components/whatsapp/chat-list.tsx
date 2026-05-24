'use client';

import { useState, useMemo } from 'react';
import type { Conversation } from '@/lib/whatsapp/types';
import { formatPhone } from '@/lib/whatsapp/routing';
import { Search } from 'lucide-react';

/**
 * Chat list — mature internal-tool sizing.
 * Customer names readable. Phones in 13-14px monospace, visible.
 * No big counter blocks. No status chips on every row (only when it
 * matters). Active row clearly marked.
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

  const list = useMemo(() => {
    if (!q) return conversations;
    const n = q.toLowerCase();
    return conversations.filter(
      (c) =>
        c.phone.includes(n) ||
        c.messages.some((m) => m.body.toLowerCase().includes(n)) ||
        c.labels.some((l) => l.includes(n)),
    );
  }, [conversations, q]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="shrink-0 px-3 py-2.5 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            className="w-full h-8 pl-8 pr-3 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <li className="p-6 text-center text-sm text-zinc-500">No chats match.</li>
        )}
        {list.map((c) => {
          const active = c.id === activeId;
          const last = c.messages[c.messages.length - 1];
          const name = c.customer_id
            ? c.customer_id.replace('cu_', '').replace(/^./, (s) => s.toUpperCase()) + '.'
            : 'Unknown';
          const initials = c.customer_id
            ? c.customer_id.replace('cu_', '').slice(0, 2).toUpperCase()
            : '?';
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-3 border-l-2 transition-colors ${
                  active
                    ? 'bg-zinc-800/80 border-l-emerald-500'
                    : 'border-l-transparent hover:bg-zinc-800/40'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-700 text-zinc-200 text-sm font-medium flex items-center justify-center shrink-0">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-zinc-100 truncate">{name}</span>
                    <span className="text-xs text-zinc-500 numeric shrink-0">{c.last_at}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400 mb-1">{formatPhone(c.phone)}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs text-zinc-400 truncate flex-1 leading-snug"
                      dir={c.language === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {last?.body}
                    </span>
                    {c.unread > 0 && (
                      <span className="shrink-0 px-1.5 h-4 rounded-full bg-emerald-500 text-zinc-900 text-2xs font-semibold numeric flex items-center">
                        {c.unread}
                      </span>
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
