import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kpi } from '@/components/ui/kpi';
import { getEvents, getMilestones } from '@/lib/mock/backyard';
import { Calendar, Trophy, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BackyardPage() {
  const events = getEvents();
  const milestones = getMilestones();
  const today = events.filter((e) => e.status === 'today');
  const upcoming = events.filter((e) => e.status === 'upcoming');

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="People"
        title="Backyard"
        description="Where we celebrate, schedule, and reflect. Events, milestones, meetings."
        actions={
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" /> Schedule
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Today" value={`${today.length}`} hint="happening now" />
        <Kpi label="This week" value={`${upcoming.length}`} hint="upcoming" />
        <Kpi label="Milestones" value={`${milestones.length}`} hint="2026 YTD" />
        <Kpi label="On pace" value="AED 3.1M" hint="May projection" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionHeader title="Calendar" hint="next 14 days" />
          <Card>
            <ul className="divide-y divide-line-soft">
              {events.map((e) => (
                <li key={e.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-12 shrink-0 text-center">
                    <div className="text-2xs uppercase tracking-widest text-ink-dim">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className="font-serif text-lg font-medium leading-none mt-0.5">
                      {new Date(e.date).getDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{e.title}</div>
                    <div className="flex items-center gap-2 text-2xs text-ink-dim mt-0.5">
                      <Badge tone={e.tone || 'neutral'}>{e.type}</Badge>
                      {e.with && <span>with {e.with.join(', ')}</span>}
                      {e.status === 'today' && <Dot tone="info" pulse />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          <SectionHeader title="Milestones" hint="2026" />
          <Card>
            <ul className="divide-y divide-line-soft">
              {milestones.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-gold/10 border border-gold/20 shrink-0">
                      <Trophy className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <div className="text-sm font-medium text-ink">{m.title}</div>
                        <div className="text-2xs text-ink-dim numeric">{m.at}</div>
                      </div>
                      <div className="text-2xs text-ink-muted mt-1">{m.detail}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
