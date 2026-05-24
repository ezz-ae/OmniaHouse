import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { Mic, FileText, CheckCircle2 } from 'lucide-react';

type Meeting = {
  id: string;
  title: string;
  date: string;
  duration_min: number;
  attendees: string[];
  status: 'transcribed' | 'analyzing' | 'recorded';
  summary?: string;
  decisions?: string[];
  follow_ups?: { task: string; assignee: string; room: string }[];
};

const meetings: Meeting[] = [
  {
    id: 'm1',
    title: 'Q3 plan · WhatsApp Desk',
    date: '2026-05-24',
    duration_min: 38,
    attendees: ['Ez', 'Abdelrahman'],
    status: 'transcribed',
    summary:
      'Agreed to keep WhatsApp Desk as the only channel for COD verification. Tamara onboarding postponed by 2 weeks pending fee renegotiation. Mohamed shadowing for the next 5 days, then takes Sharjah.',
    decisions: [
      'Tamara onboarding: pause for 2 weeks, push back to 6.5% fee',
      'Mohamed: full agent role after 5 shadow days',
      'COD high-value flag stays at AED 3,000 threshold',
    ],
    follow_ups: [
      { task: 'Email Tamara CS — request renegotiation', assignee: 'Ez',          room: 'management' },
      { task: 'Update agent_roles SQL — Mohamed → whatsapp_agent', assignee: 'Ez', room: 'team' },
      { task: 'Shadow tracker for Mohamed (5 days)', assignee: 'Abdelrahman',     room: 'whatsapp-desk' },
    ],
  },
  {
    id: 'm2',
    title: 'Inventory parity check',
    date: '2026-05-22',
    duration_min: 24,
    attendees: ['Ez', 'Arslan'],
    status: 'transcribed',
    summary:
      'Reviewed the parity drift report. 3 SKUs drifting between .ae and .com. Decided to manually correct, then add an auto-correct rule once we trust it for two weeks.',
    decisions: [
      'Manual correction this week for 3 drifting SKUs',
      'Auto-correct rule: only after 14 days of stable detection',
    ],
    follow_ups: [
      { task: 'Push corrections to .com for 3 SKUs', assignee: 'Arslan', room: 'inventory' },
    ],
  },
  {
    id: 'm3',
    title: 'LE Celestial photoshoot brief',
    date: '2026-05-28',
    duration_min: 0,
    attendees: ['Ez', 'Ahmed'],
    status: 'recorded',
  },
];

export default function MeetingRoomPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <Mic className="w-3.5 h-3.5" />
            Meeting Room
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Captured · decided · routed</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Every meeting becomes a summary, a list of decisions, and a set of agentic_tasks. Nothing said is lost.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Transcribed" value={meetings.filter((m) => m.status === 'transcribed').length} />
            <Stat label="Decisions captured" value={meetings.reduce((s, m) => s + (m.decisions?.length || 0), 0)} />
            <Stat label="Follow-ups open" value={meetings.reduce((s, m) => s + (m.follow_ups?.length || 0), 0)} tone="info" />
          </div>

          <div className="space-y-4">
            {meetings.map((m) => <MeetingCard key={m.id} m={m} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'info' }) {
  const toneClass = tone === 'info' ? 'text-blue-400' : 'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function MeetingCard({ m }: { m: Meeting }) {
  const statusMap: Record<Meeting['status'], string> = {
    transcribed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    analyzing:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
    recorded:    'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-5">
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100">{m.title}</div>
          <div className="text-2xs text-zinc-500 mt-0.5">
            {m.date} · {m.duration_min ? `${m.duration_min} min · ` : ''}{m.attendees.join(', ')}
          </div>
        </div>
        <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${statusMap[m.status]}`}>
          {m.status}
        </span>
      </div>

      {m.summary && (
        <div className="mt-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Summary
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed">{m.summary}</div>
        </div>
      )}

      {m.decisions && m.decisions.length > 0 && (
        <div className="mt-3">
          <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Decisions
          </div>
          <ul className="space-y-1">
            {m.decisions.map((d, i) => (
              <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-emerald-400 mt-1.5 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {m.follow_ups && m.follow_ups.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2">Follow-ups · routed to agentic_tasks</div>
          <div className="space-y-1.5">
            {m.follow_ups.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-300">{f.task}</span>
                <span className="text-zinc-500">→ <span className="text-zinc-300">{f.assignee}</span> ({f.room})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
