'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge, Dot } from '@/components/ui/badge';
import { IdentityCard } from '@/components/whatsapp/identity-card';
import { ConversationView } from '@/components/whatsapp/conversation-view';
import { ComposeBar } from '@/components/whatsapp/compose-bar';
import { AIPanel } from '@/components/whatsapp/ai-panel';
import { ActionBar } from '@/components/whatsapp/action-bar';
import { SmartInbox } from '@/components/whatsapp/smart-inbox';
import { getConversations, getCustomerCard, mockExtract } from '@/lib/whatsapp/mock';
import { Phone, Maximize2, Minimize2 } from 'lucide-react';
import type { Extraction } from '@/lib/whatsapp/types';

export default function WhatsAppDeskPage() {
  const conversations = getConversations();
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [language, setLanguage] = useState<'en' | 'ar' | 'both'>('both');
  const [extract, setExtract] = useState<Extraction | null>(null);
  const [focus, setFocus] = useState(false);  // hide inbox for full-width mode

  const active = useMemo(() => conversations.find((c) => c.id === activeId)!, [activeId, conversations]);
  const card = useMemo(() => getCustomerCard(active.phone, active.customer_id), [active]);

  // Auto-run extraction on conversation switch for a smoother feel.
  // (In real impl this is a cached call.)

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Desk"
        title="WhatsApp Desk"
        description={`+971 56 547 8227 · ${conversations.length} conversations · 35% of revenue lives here`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFocus(!focus)}>
              {focus ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {focus ? 'Show inbox' : 'Focus'}
            </Button>
            <Button variant="subtle" size="sm">
              <Phone className="w-3.5 h-3.5" /> Manual paste
            </Button>
          </>
        }
      />

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: focus ? '1fr 360px' : '280px 1fr 380px',
          minHeight: '78vh',
        }}
      >
        {/* Left: Smart inbox */}
        {!focus && (
          <div className="panel overflow-hidden">
            <SmartInbox conversations={conversations} activeId={activeId} onSelect={setActiveId} />
          </div>
        )}

        {/* Middle: Identity + conversation + compose */}
        <div className="space-y-3 flex flex-col min-w-0">
          <IdentityCard card={card} />

          <div className="panel flex flex-col flex-1 overflow-hidden">
            <ConversationView conv={active} />
            <ComposeBar
              language={language}
              onLanguageChange={setLanguage}
              onSend={(d) => {
                if (d.en) navigator.clipboard?.writeText(d.en);
              }}
            />
          </div>

          <ActionBar conv={active} card={card} extract={extract || mockExtract(active)} />
        </div>

        {/* Right: AI panel with tabbed agents */}
        <div className="min-w-0">
          <AIPanel conv={active} card={card} />
        </div>
      </div>
    </div>
  );
}
