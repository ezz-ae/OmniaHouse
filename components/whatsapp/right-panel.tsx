'use client';

import { useState } from 'react';
import { User, Sparkles } from 'lucide-react';
import { AgentOmniaChat } from './agent-omnia-chat';
import { CustomerRail } from './customer-rail';
import type { Conversation, CustomerCard } from '@/lib/whatsapp/types';

/**
 * The right column of the WhatsApp Desk.
 *
 * Two tabs:
 *   · Customer  — the existing CustomerRail (identity, history, wallet)
 *   · Omnia AI  — contextual chat about this conversation
 *
 * The active tab persists across conversations so an agent who prefers
 * the AI chat stays on it as they switch chats.
 */
export function RightPanel({
  conv,
  card,
  onUseReply,
}: {
  conv: Conversation;
  card: CustomerCard;
  onUseReply?: (text: string) => void;
}) {
  const [tab, setTab] = useState<'customer' | 'omnia'>('omnia');

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Tabs */}
      <div className="shrink-0 border-b border-zinc-800 flex">
        <TabBtn active={tab === 'customer'} onClick={() => setTab('customer')}>
          <User className="w-3.5 h-3.5" />
          Customer
        </TabBtn>
        <TabBtn active={tab === 'omnia'} onClick={() => setTab('omnia')} highlight>
          <Sparkles className="w-3.5 h-3.5" />
          Omnia AI
        </TabBtn>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {tab === 'customer' ? (
          <div className="h-full overflow-y-auto">
            <CustomerRail card={card} />
          </div>
        ) : (
          <AgentOmniaChat conv={conv} card={card} onUseReply={onUseReply} />
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active, onClick, children, highlight,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active
          ? (highlight ? 'text-emerald-300 border-emerald-500' : 'text-zinc-100 border-zinc-100')
          : 'text-zinc-400 border-transparent hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}
