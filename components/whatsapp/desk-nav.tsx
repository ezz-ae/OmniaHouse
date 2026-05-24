'use client';

import { Inbox, AlertCircle, ShieldAlert, CheckCircle2, FileText, Users, BookOpen, Activity, Settings as SettingsIcon } from 'lucide-react';
import type { Conversation } from '@/lib/whatsapp/types';

export type DeskSection =
  | 'inbox'           // all chats
  | 'unclaimed'       // status === unclaimed
  | 'manager'         // seniority_needed === manager OR fraud_risk === high
  | 'ready'           // status === ready_for_draft
  | 'drafts'          // saved drafts (mock)
  | 'customers'       // browse customers
  | 'templates'       // CRM shortcuts library
  | 'activity'        // ai_extractions log
  | 'settings';

/**
 * WhatsApp Desk internal navigation — its own "sections menu" per
 * Mahmoud's instruction. Sits on the left, ~224px wide. Each section
 * has a count badge so you know what needs you without reading.
 */
export function DeskNav({
  section,
  conversations,
  onChange,
}: {
  section: DeskSection;
  conversations: Conversation[];
  onChange: (s: DeskSection) => void;
}) {
  const counts = {
    inbox: conversations.length,
    unclaimed: conversations.filter((c) => c.status === 'unclaimed').length,
    manager: conversations.filter((c) => c.vibes.seniority_needed === 'manager' || c.vibes.fraud_risk === 'high').length,
    ready: conversations.filter((c) => c.status === 'ready_for_draft').length,
    drafts: 2,
    customers: 7,
    templates: 13,
    activity: 42,
  };

  const groups: { label: string; items: { id: DeskSection; label: string; icon: any; count?: number; tone?: 'rose' | 'amber' | 'emerald' }[] }[] = [
    {
      label: 'Conversations',
      items: [
        { id: 'inbox', label: 'All chats', icon: Inbox, count: counts.inbox },
        { id: 'unclaimed', label: 'Unclaimed', icon: AlertCircle, count: counts.unclaimed, tone: 'rose' },
        { id: 'manager', label: 'Manager queue', icon: ShieldAlert, count: counts.manager, tone: 'amber' },
        { id: 'ready', label: 'Ready for draft', icon: CheckCircle2, count: counts.ready, tone: 'emerald' },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { id: 'drafts', label: 'My drafts', icon: FileText, count: counts.drafts },
        { id: 'customers', label: 'Customers', icon: Users, count: counts.customers },
        { id: 'templates', label: 'Templates', icon: BookOpen, count: counts.templates },
      ],
    },
    {
      label: 'Admin',
      items: [
        { id: 'activity', label: 'Activity log', icon: Activity, count: counts.activity },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-0.5">WhatsApp Desk</div>
        <div className="text-sm font-mono text-zinc-300">+971 56 547 8227</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-4 pb-1 text-2xs uppercase tracking-wider text-zinc-500">{g.label}</div>
            <ul>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = section === it.id;
                const showCount = it.count !== undefined && it.count > 0;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => onChange(it.id)}
                      className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? 'bg-zinc-800 text-zinc-100 border-l-2 border-emerald-500 -ml-px pl-[15px]'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span className="flex-1 text-left">{it.label}</span>
                      {showCount && (
                        <span className={`text-2xs font-mono numeric ${countToneClass(it.tone)}`}>
                          {it.count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function countToneClass(tone?: 'rose' | 'amber' | 'emerald'): string {
  if (tone === 'rose') return 'text-rose-400';
  if (tone === 'amber') return 'text-amber-400';
  if (tone === 'emerald') return 'text-emerald-400';
  return 'text-zinc-500';
}
