import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getTasks, getTeam, type Task } from '@/lib/mock/team';
import { CheckSquare } from 'lucide-react';

export default function CoTaskingPage() {
  const tasks = getTasks();
  const team = getTeam();

  const open = tasks.filter((t) => t.status === 'open');
  const inProgress = tasks.filter((t) => t.status === 'in_progress');

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <CheckSquare className="w-3.5 h-3.5" />
            Co-Tasking
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Help requests &amp; routing</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Tasks assigned by Omnia AI or by teammates. Helper earns +50 XP on accepted completion. Backed by co_tasks SQL.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Open" value={open.length} tone="warn" />
            <Stat label="In progress" value={inProgress.length} tone="info" />
            <Stat label="Done today" value={tasks.filter((t) => t.status === 'done').length} tone="good" />
          </div>

          <Section title="Open">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {open.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-500">Nothing open.</div>
              ) : open.map((t) => <TaskRow key={t.id} t={t} />)}
            </div>
          </Section>

          <Section title="In progress">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {inProgress.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-500">Nothing in progress.</div>
              ) : inProgress.map((t) => <TaskRow key={t.id} t={t} />)}
            </div>
          </Section>

          <Section title="Helper leaderboard">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {team
                .filter((m) => typeof m.closed_today === 'number')
                .sort((a, b) => (b.closed_today || 0) - (a.closed_today || 0))
                .map((m) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-medium text-zinc-900 text-2xs shrink-0"
                      style={{ background: m.avatar_color }}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-100 truncate">{m.name}</div>
                      <div className="text-2xs text-zinc-500 uppercase tracking-wider">{m.role.replace('_', ' ')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-emerald-400 tabular-nums">{(m.closed_today || 0) * 50}</div>
                      <div className="text-2xs text-zinc-500 uppercase tracking-wider">XP today</div>
                    </div>
                  </div>
                ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-3">{title}</div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' | 'info' }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-400' :
    tone === 'warn' ? 'text-amber-400' :
    tone === 'info' ? 'text-blue-400' :
    'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function TaskRow({ t }: { t: Task }) {
  const priorityMap: Record<Task['priority'], string> = {
    high: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    med:  'bg-amber-500/10 text-amber-300 border-amber-500/30',
    low:  'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 leading-snug mb-1">{t.title}</div>
        <div className="text-2xs text-zinc-500 truncate">
          <span className="text-zinc-300">{t.assigned_to}</span> ← by {t.assigned_by} · {t.room}
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityMap[t.priority]}`}>
          {t.priority}
        </span>
        <span className="text-2xs text-zinc-500">due {t.due}</span>
      </div>
    </div>
  );
}
