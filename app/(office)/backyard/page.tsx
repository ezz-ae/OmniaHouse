import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getEvents, getMilestones, type Event, type Milestone } from '@/lib/mock/backyard';
import { getTeam } from '@/lib/mock/team';
import { TreePine, Calendar, Trophy } from 'lucide-react';

export default function BackyardPage() {
  const events = getEvents();
  const milestones = getMilestones();
  const team = getTeam();

  const today = events.filter((e) => e.status === 'today');
  const upcoming = events.filter((e) => e.status === 'upcoming');

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <TreePine className="w-3.5 h-3.5" />
            Backyard
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">The +1 culture room</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Calendar, milestones, wellbeing pulse. Where the operating room exhales between launches.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Today" icon={<Calendar className="w-3.5 h-3.5" />}>
              <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
                {today.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-500">Nothing scheduled.</div>
                ) : today.map((e) => <EventRow key={e.id} e={e} />)}
              </div>

              <div className="text-2xs uppercase tracking-wider text-zinc-500 mt-6 mb-3">Upcoming</div>
              <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
                {upcoming.map((e) => <EventRow key={e.id} e={e} />)}
              </div>
            </Section>

            <Section title="Milestones" icon={<Trophy className="w-3.5 h-3.5" />}>
              <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
                {milestones.map((m) => <MilestoneRow key={m.id} m={m} />)}
              </div>

              <div className="text-2xs uppercase tracking-wider text-zinc-500 mt-6 mb-3">Wellbeing pulse</div>
              <div className="grid grid-cols-2 gap-3">
                <PulseStat label="Online now" value={team.filter((t) => t.status === 'online').length} of={team.length} tone="good" />
                <PulseStat label="Avg closed" value={Math.round(team.reduce((s, t) => s + (t.closed_today || 0), 0) / team.length)} suffix=" / day" />
              </div>
              <div className="text-2xs text-zinc-500 mt-3">
                Overtime sensors + mood pulses arrive with the team_profiles SQL pass.
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
        {icon} {title}
      </div>
      {children}
    </section>
  );
}

function EventRow({ e }: { e: Event }) {
  const toneMap: Record<NonNullable<Event['tone']>, string> = {
    gold: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
    good: 'border-emerald-500/30 bg-emerald-500/5',
    warn: 'border-rose-500/30 bg-rose-500/5',
  };
  const accent = e.tone ? toneMap[e.tone] : '';
  return (
    <div className={`px-4 py-3 flex items-center gap-3 ${accent}`}>
      <div className="text-2xs font-mono text-zinc-500 w-20 shrink-0">{e.date}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 truncate">{e.title}</div>
        <div className="text-2xs text-zinc-500 uppercase tracking-wider">
          {e.type}{e.with && e.with.length > 0 ? ` · ${e.with.join(', ')}` : ''}
        </div>
      </div>
    </div>
  );
}

function MilestoneRow({ m }: { m: Milestone }) {
  const catMap: Record<Milestone['category'], string> = {
    revenue: 'text-amber-300',
    product: 'text-blue-300',
    team:    'text-emerald-300',
    system:  'text-zinc-400',
  };
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-zinc-100">{m.title}</div>
        <span className={`text-2xs uppercase tracking-wider ${catMap[m.category]}`}>{m.category}</span>
      </div>
      <div className="text-xs text-zinc-400 leading-snug mb-1">{m.detail}</div>
      <div className="text-2xs font-mono text-zinc-600">{m.at}</div>
    </div>
  );
}

function PulseStat({ label, value, of, suffix, tone }: { label: string; value: number; of?: number; suffix?: string; tone?: 'good' }) {
  const toneClass = tone === 'good' ? 'text-emerald-400' : 'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-3 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>
        {value}{of !== undefined ? <span className="text-zinc-500 text-sm"> / {of}</span> : null}{suffix}
      </div>
    </div>
  );
}
