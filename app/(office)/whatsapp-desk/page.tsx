'use client';

import { useState, useMemo } from 'react';
import { IdentityCard } from '@/components/whatsapp/identity-card';
import { ConversationView } from '@/components/whatsapp/conversation-view';
import { ComposeBar } from '@/components/whatsapp/compose-bar';
import { AIPanel } from '@/components/whatsapp/ai-panel';
import { ActionBar } from '@/components/whatsapp/action-bar';
import { SmartInbox } from '@/components/whatsapp/smart-inbox';
import { getConversations, getCustomerCard, mockExtract } from '@/lib/whatsapp/mock';
import { cn } from '@/lib/utils';
import { Inbox, PanelRight, PanelRightClose } from 'lucide-react';
import type { Extraction } from '@/lib/whatsapp/types';

/**
 * WhatsApp Desk — full-screen messenger app.
 *
 * No page header. No sidebar borrowed from the platform. No numbers strip
 * stealing pixels. The room IS the screen.
 *
 *   ┌─ Inbox ─┬─ Identity ─┬─ Conversation ─┬─ AI Panel ─┐
 *   │ smart   │ + Action   │ bubbles +      │ tabs       │
 *   │ queue   │ bar below  │ compose        │ extract,   │
 *   │ sorted  │            │                │ vibes,     │
 *   │ by AI   │            │                │ verify…    │
 *   │ priority│            │                │            │
 *   └─────────┴────────────┴────────────────┴────────────┘
 *
 * Inbox and AI panel can be collapsed (Cmd+B / Cmd+/).
 * On narrow screens they slide in as drawers.
 */
export default function WhatsAppDeskPage() {
  const conversations = getConversations();
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [language, setLanguage] = useState<'en' | 'ar' | 'both'>('both');
  const [extract] = useState<Extraction | null>(null);
  const [showInbox, setShowInbox] = useState(true);
  const [showAI, setShowAI] = useState(true);

  const active = useMemo(() => conversations.find((c) => c.id === activeId)!, [activeId, conversations]);
  const card = useMemo(() => getCustomerCard(active.phone, active.customer_id), [active]);

  return (
    <div className="h-screen w-full overflow-hidden bg-canvas flex flex-col">
      {/* Slim top bar — only a thin line of meta. Lobby mark sits to the left of this. */}
      <div className="h-10 shrink-0 border-b border-line-soft px-16 flex items-center justify-between text-2xs">
        <div className="flex items-center gap-3 text-ink-dim">
          <span className="text-ink font-mono">+971 56 547 8227</span>
          <span>·</span>
          <span><span className="text-ink numeric">{conversations.length}</span> in queue</span>
          <span>·</span>
          <span><span className="text-warn numeric">{conversations.filter(c => c.status === 'unclaimed').length}</span> unclaimed</span>
          <span>·</span>
          <span><span className="text-bad numeric">{conversations.filter(c => c.vibes.fraud_risk === 'high').length}</span> fraud risk</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInbox(!showInbox)}
            className={cn('px-2 h-6 rounded text-2xs border', showInbox ? 'border-line text-ink' : 'border-line-soft text-ink-dim')}
            title="Toggle inbox"
          >
            <Inbox className="w-3 h-3 inline mr-1" />
            Inbox
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            className={cn('px-2 h-6 rounded text-2xs border', showAI ? 'border-line text-ink' : 'border-line-soft text-ink-dim')}
            title="Toggle AI panel"
          >
            {showAI ? <PanelRightClose className="w-3 h-3 inline mr-1" /> : <PanelRight className="w-3 h-3 inline mr-1" />}
            AI
          </button>
        </div>
      </div>

      {/* The room — three (or two) columns claim the rest of the screen */}
      <div
        className="flex-1 min-h-0 grid gap-px bg-line-soft"
        style={{
          gridTemplateColumns: [
            showInbox ? '320px' : null,
            '1fr',
            showAI ? '420px' : null,
          ].filter(Boolean).join(' '),
        }}
      >
        {/* Inbox */}
        {showInbox && (
          <div className="bg-canvas overflow-hidden">
            <SmartInbox conversations={conversations} activeId={activeId} onSelect={setActiveId} />
          </div>
        )}

        {/* Middle: identity → conversation → compose → action bar */}
        <div className="bg-canvas flex flex-col min-w-0 min-h-0">
          {/* Identity card pinned to top, slim */}
          <div className="shrink-0 border-b border-line-soft">
            <IdentityCard card={card} />
          </div>

          {/* Conversation fills the rest */}
          <div className="flex-1 min-h-0 flex flex-col">
            <ConversationView conv={active} />
            <ComposeBar
              language={language}
              onLanguageChange={setLanguage}
              onSend={(d) => { if (d.en) navigator.clipboard?.writeText(d.en); }}
            />
          </div>

          {/* Action bar at the bottom */}
          <div className="shrink-0 border-t border-line-soft">
            <ActionBar conv={active} card={card} extract={extract || mockExtract(active)} />
          </div>
        </div>

        {/* AI panel */}
        {showAI && (
          <div className="bg-canvas overflow-hidden">
            <AIPanel conv={active} card={card} />
          </div>
        )}
      </div>
    </div>
  );
}
