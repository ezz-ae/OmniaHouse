import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kpi } from '@/components/ui/kpi';
import { getTasks, getNotes, getTeam, type Task, type Note } from '@/lib/mock/team';
import { Plus, Pin, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoTaskingPage() {
  const tasks = getTasks();
  const notes = getNotes();
  const team = getTeam();
  const online = team.filter((t) => t.status === 'online');

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="People"
        title="Co-Tasking"
        description="Tasks and notes — everything we owe each other, captured."
        actions={
          <>
            <Button variant="ghost" size="sm">
              <MessageSquare className="w-3.5 h-3.5" /> Note
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" /> New task
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Open" value={`${tasks.filter((t) => t.status === 'open').length}`} hint="across the team" />
        <Kpi label="In progress" value={`${tasks.filter((t) => t.status === 'in_progress').length}`} />
        <Kpi label="High priority" value={`${tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length}`} />
        <Kpi label="Online now" value={`${online.length}`} hint={`of ${team.length}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tasks */}
        <div className="lg:col-span-2">
          <SectionHeader title="Tasks" hint={`${tasks.length} total`} />
          <Card>
            <ul className="divide-y divide-line-soft">
              {tasks.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </ul>
          </Card>
        </div>

        {/* Team + notes */}
        <div className="space-y-6">
          <div>
            <SectionHeader title="Team" hint={`${online.length} online`} />
            <Card>
              <ul className="divide-y divide-line-soft">
                {team.map((m) => (
                  <li key={m.id} className="px-3 py-2.5 flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-medium text-canvas shrink-0"
                      style={{ background: m.avatar_color }}
                    >
                      {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-medium text-ink truncate">{m.name}</div>
                        <Dot tone={m.status === 'online' ? 'good' : m.status === 'away' ? 'warn' : 'neutral'} />
                      </div>
                      <div className="text-2xs text-ink-dim truncate">
                        {m.active_now || m.role.replace('_', ' ')}
                      </div>
                    </div>
                    {m.closed_today !== undefined && (
                      <Badge tone="gold">{m.closed_today} today</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div>
            <SectionHeader title="Notes" hint={`${notes.length} pinned`} />
            <Card>
              <ul className="divide-y divide-line-soft">
                {notes.map((n) => (
                  <li key={n.id} className="px-3 py-3">
                    <div className="flex items-start gap-2 mb-1">
                      {n.pinned && <Pin className="w-3 h-3 text-gold mt-0.5 shrink-0" />}
                      <div className="text-xs text-ink leading-relaxed flex-1">{n.body}</div>
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-ink-dim mt-1.5">
                      <span>{n.author}</span>
                      <span>·</span>
                      <span>{n.at}</span>
                      {n.tag && <Badge tone="neutral">{n.tag}</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ t }: { t: Task }) {
  return (
    <li className="p-3 flex items-start gap-3 hover:bg-canvas-inset/40">
      <input type="checkbox" defaultChecked={t.status === 'done'} className="mt-1 accent-gold" />
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm', t.status === 'done' ? 'text-ink-dim line-through' : 'text-ink')}>
          {t.title}
        </div>
        <div className="flex items-center gap-2 text-2xs text-ink-dim mt-1 flex-wrap">
          <span>{t.assigned_to}</span>
          <span>·</span>
          <span>due {t.due}</span>
          <Badge tone={t.priority === 'high' ? 'bad' : t.priority === 'med' ? 'warn' : 'neutral'}>
            {t.priority}
          </Badge>
          {t.status === 'in_progress' && <Badge tone="info">in progress</Badge>}
          <Link href={`/${t.room}`} className="hover:text-ink">
            → {t.room}
          </Link>
        </div>
      </div>
    </li>
  );
}
