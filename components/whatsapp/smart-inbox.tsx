'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge, Dot } from '@/components/ui/badge';
import { maskPhoneForLogs } from '@/lib/whatsapp/routing';
import type { Conversation, ConvStatus } from '@/lib/whatsapp/types';
import { Filter, Search, AlertTriangle, Sparkles } from 'lucide-react';

/**
 * Smart inbox: sorted by AI-computed priority, not by recency.
 *  - Critical fraud → top
 *  - High urgency + business_blockers → next
 *  - ready_for_draft → next
 *  - Manager-seniority cases → next
 *  - Then normal queue
 */
type SortMode = 'smart' | 'recent' | 'unread';
type StatusFilter = 'all' | ConvStatus;

export function SmartInbox({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortMode>('smart');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let arr = conversations;
    if (statusFilter !== 'all') arr = arr.filter((c) => c.status === statusFilter);
    if (q) {
      const n = q.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.phone.includes(n) ||
          c.messages.some((m) => m.body.toLowerCase().includes(n)) ||
          c.labels.some((l) => l.includes(n)),
      );
    }
    if (sort === 'smart') {
      arr = [...arr].sort((a, b) => priorityScore(b) - priorityScore(a));
    } else if (sort === 'unread') {
      arr = [...arr].sort((a, b) => b.unread - a.unread);
    }
    return arr;
  }, [conversations, statusFilter, q, sort]);

  const counts = useMemo(() => ({
    unclaimed: conversations.filter((c) => c.status === 'unclaimed').length,
    ready: conversations.filter((c) => c.status === 'ready_for_draft').length,
    fraud: conversations.filter((c) => c.vibes.fraud_risk === 'high').length,
    manager: conversations.filter((c) => c.vibes.seniority_needed === 'manager').length,
  }), [conversations]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + filters */}
      <div className="p-3 border-b border-line-soft space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search phone, message, label…"
            className="w-full h-8 pl-8 pr-3 bg-canvas-panel border border-line rounded text-xs text-ink placeholder:text-ink-dim focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['smart', 'recent', 'unread'] as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setSort(m)}
              className={cn(
                'flex-1 px-2 h-6 text-2xs rounded border transition-colors',
                sort === m ? 'bg-gold/10 text-gold border-gold/30' : 'border-line text-ink-dim hover:text-ink',
              )}
            >
              {m === 'smart' && <Sparkles className="w-3 h-3 inline mr-0.5" />}
              {m}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-2 h-6 rounded border',
              showFilters ? 'bg-canvas-inset text-ink border-line-strong' : 'border-line text-ink-dim',
            )}
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-1 pt-1">
            {(['all', 'unclaimed', 'in_progress', 'awaiting_customer', 'ready_for_draft'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-2 h-6 text-2xs rounded border transition-colors',
                  statusFilter === s ? 'bg-gold/10 text-gold border-gold/30' : 'border-line text-ink-dim',
                )}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick counters */}
      <div className="px-3 py-2 border-b border-line-soft grid grid-cols-4 gap-2 text-center">
        <Counter label="Unclaimed" value={counts.unclaimed} tone={counts.unclaimed > 0 ? 'warn' : 'neutral'} />
        <Counter label="Ready" value={counts.ready} tone={counts.ready > 0 ? 'gold' : 'neutral'} />
        <Counter label="Fraud" value={counts.fraud} tone={counts.fraud > 0 ? 'bad' : 'neutral'} />
        <Counter label="Manager" value={counts.manager} tone={counts.manager > 0 ? 'bad' : 'neutral'} />
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto divide-y divide-line-soft">
        {filtered.length === 0 && (
          <li className="p-6 text-center text-2xs text-ink-dim">No conversations match this filter.</li>
        )}
        {filtered.map((c) => {
          const active = c.id === activeId;
          const last = c.messages[c.messages.length - 1];
          const highPriority = c.vibes.fraud_risk === 'high' || c.vibes.urgency === 'critical' || c.vibes.seniority_needed === 'manager';
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className={cn(
                  'w-full text-left p-3 hover:bg-canvas-inset/60 transition-colors',
                  active && 'bg-canvas-inset',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {highPriority && <AlertTriangle className="w-3 h-3 text-bad shrink-0" />}
                    <span className="text-sm font-medium text-ink truncate">
                      {c.customer_id ? c.customer_id.replace('cu_', '').replace(/^./, (s) => s.toUpperCase()) + '.' : <span className="text-ink-dim italic">unknown</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.unread > 0 && <Badge tone="gold">{c.unread}</Badge>}
                    <span className="text-2xs text-ink-dim numeric">{c.last_at}</span>
                  </div>
                </div>
                <div className="text-2xs text-ink-dim font-mono mb-1">
                  {maskPhoneForLogs(c.phone)} · {c.country}
                </div>
                <div className="text-xs text-ink-muted line-clamp-2 mb-1.5" dir={c.language === 'ar' ? 'rtl' : 'ltr'}>
                  {last?.body}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-2xs">
                  <StatusChip status={c.status} />
                  {c.vibes.seniority_needed === 'manager' && <Badge tone="bad">manager</Badge>}
                  {c.vibes.seniority_needed === 'senior' && <Badge tone="warn">senior</Badge>}
                  {c.vibes.fraud_risk === 'high' && <Badge tone="bad">fraud risk</Badge>}
                  {c.vibes.urgency === 'critical' && <Badge tone="bad">urgent</Badge>}
                  {c.labels.slice(0, 2).map((l) => (
                    <Badge key={l} tone="neutral">{l}</Badge>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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

function Counter({ label, value, tone }: { label: string; value: number; tone: 'good' | 'warn' | 'bad' | 'gold' | 'neutral' }) {
  return (
    <div>
      <div className={cn(
        'font-serif text-base numeric',
        tone === 'bad' && 'text-bad',
        tone === 'warn' && 'text-warn',
        tone === 'gold' && 'text-gold',
        tone === 'good' && 'text-good',
        tone === 'neutral' && 'text-ink',
      )}>
        {value}
      </div>
      <div className="text-2xs text-ink-dim leading-none">{label}</div>
    </div>
  );
}

function StatusChip({ status }: { status: ConvStatus }) {
  const map: Record<ConvStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'info' | 'gold' | 'neutral' }> = {
    unclaimed: { label: 'unclaimed', tone: 'bad' },
    in_progress: { label: 'in progress', tone: 'info' },
    awaiting_customer: { label: 'awaiting', tone: 'warn' },
    ready_for_draft: { label: 'ready', tone: 'gold' },
    closed_won: { label: 'won', tone: 'good' },
    closed_lost: { label: 'lost', tone: 'neutral' },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
