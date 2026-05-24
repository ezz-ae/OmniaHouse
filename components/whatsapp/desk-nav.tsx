'use client';

import { Inbox, AlertCircle, ShieldAlert, CheckCircle2, FileText, Users, BookOpen, Activity, Settings as SettingsIcon, Sparkles, Flame, Clock, AlertTriangle } from 'lucide-react';
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
 * WhatsApp Desk internal navigation — its own "sections menu". Sits on
 * the left, ~224px wide. Each section has a count badge so you know
 * what needs you without reading.
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

      <nav className="flex-1 min-h-0 overflow-y-auto py-2">
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

      <IntelligenceRail conversations={conversations} />
    </aside>
  );
}

// ─── Intelligence Rail ─────────────────────────────────────────────────────

/**
 * The bottom-of-sidebar block that tells the team what to do *next*.
 * Three reminders, ranked by urgency. Omnia AI is the speaker. Each line
 * names the person, the conversation, and the reason it matters now.
 */
function IntelligenceRail({ conversations }: { conversations: Conversation[] }) {
  // Mock priority signal — in production this comes from Omnia routing logic
  // joined with vibes + customer LTV + idle time.
  const items = buildPriorities(conversations);

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80">
      <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center gap-2">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </span>
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-2xs uppercase tracking-wider text-emerald-300 font-medium">Omnia AI · do next</span>
      </div>

      <ul className="px-2 py-2 space-y-1 max-h-[180px] overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.id} className="px-2 py-1.5 rounded hover:bg-zinc-800/60 cursor-default">
              <div className="flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${it.toneClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-100 leading-snug truncate">{it.who} · {it.action}</div>
                  <div className="text-2xs text-zinc-500 leading-snug truncate">{it.detail}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Priority = {
  id: string;
  who: string;
  action: string;
  detail: string;
  icon: typeof Flame;
  toneClass: string;
};

function maskPhone(phone: string): string {
  if (!phone) return 'unknown';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return phone;
  return `${phone.slice(0, 5)}•••${phone.slice(-3)}`;
}

function buildPriorities(conversations: Conversation[]): Priority[] {
  const out: Priority[] = [];

  // Highest signal: fraud risk OR manager-needed
  const flagged = conversations.find((c) => c.vibes.fraud_risk === 'high' || c.vibes.seniority_needed === 'manager');
  if (flagged) {
    out.push({
      id: `p_${flagged.id}`,
      who: maskPhone(flagged.phone),
      action: 'needs a manager',
      detail: flagged.vibes.fraud_risk === 'high' ? 'Fraud risk flagged' : 'Manager queue · senior decision',
      icon: AlertTriangle,
      toneClass: 'text-rose-400',
    });
  }

  // Urgency: critical or high
  const hot = conversations.find((c) => (c.vibes.urgency === 'critical' || c.vibes.urgency === 'high') && c.status !== 'closed_won' && c.status !== 'closed_lost');
  if (hot && hot.id !== flagged?.id) {
    out.push({
      id: `h_${hot.id}`,
      who: maskPhone(hot.phone),
      action: 'close the chat',
      detail: `Urgency ${hot.vibes.urgency} · keep momentum`,
      icon: Flame,
      toneClass: 'text-amber-400',
    });
  }

  // Idle unclaimed
  const idle = conversations.find((c) => c.status === 'unclaimed');
  if (idle && idle.id !== flagged?.id && idle.id !== hot?.id) {
    out.push({
      id: `i_${idle.id}`,
      who: maskPhone(idle.phone),
      action: 'unclaimed',
      detail: 'Pick it up before they go cold',
      icon: Clock,
      toneClass: 'text-zinc-400',
    });
  }

  // Fallback rotations
  if (out.length < 3) {
    out.push({
      id: 'fp_eid',
      who: 'Ahmed',
      action: 'Eid creative · sign-off',
      detail: 'Pinned in Drive · awaiting review',
      icon: Sparkles,
      toneClass: 'text-emerald-400',
    });
  }
  if (out.length < 3) {
    out.push({
      id: 'fp_mhd',
      who: 'Mohamed',
      action: 'shadowing 5 chats',
      detail: 'Onboarding · on track',
      icon: Clock,
      toneClass: 'text-zinc-400',
    });
  }

  return out.slice(0, 3);
}

function countToneClass(tone?: 'rose' | 'amber' | 'emerald'): string {
  if (tone === 'rose') return 'text-rose-400';
  if (tone === 'amber') return 'text-amber-400';
  if (tone === 'emerald') return 'text-emerald-400';
  return 'text-zinc-500';
}
