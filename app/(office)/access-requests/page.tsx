import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { KeyRound, Check, X, Eye } from 'lucide-react';

type Request = {
  id: string;
  name: string;
  email: string;
  requested_role: string;
  requested_at: string;
  introduced_by?: string;
  reason: string;
  context: { closed_chats?: number; vouched_by?: string; history?: string };
};

const pending: Request[] = [
  {
    id: 'r1',
    name: 'Mohamed',
    email: 'mohamed@omnia-internal.ae',
    requested_role: 'whatsapp_agent',
    requested_at: '2026-05-22',
    introduced_by: 'Abdelrahman',
    reason: 'Picked up from the Sharjah lane during last week\'s overflow. Has been shadowing 5 days.',
    context: { closed_chats: 28, vouched_by: 'Abdelrahman, Arslan' },
  },
  {
    id: 'r2',
    name: 'Hassan Al-Marri',
    email: 'hassan@hk-advisors.ae',
    requested_role: 'finance',
    requested_at: '2026-05-21',
    introduced_by: 'Ez',
    reason: 'External accountant. Needs read-only on orders_unified and write on reconciliation_notes.',
    context: { history: 'External · scoped to finance tables only · NDA on file' },
  },
];

const recent: { name: string; role: string; decision: 'approved' | 'denied'; at: string; by: string }[] = [
  { name: 'Arslan',     role: 'whatsapp_agent',   decision: 'approved', at: '2026-05-18', by: 'Ez' },
  { name: 'Ahmed',      role: 'marketing',        decision: 'approved', at: '2026-05-12', by: 'Ez' },
  { name: 'X (vendor)', role: 'integrations_dev', decision: 'denied',   at: '2026-05-09', by: 'Ez' },
];

export default function AccessRequestsPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <KeyRound className="w-3.5 h-3.5" />
            Access Requests
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Who wants in</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Pending team approvals. Every decision is logged to audit_logs with the reason. Approvals grant the role inside RLS the same day.
          </p>

          <Section title={`Pending · ${pending.length}`}>
            <div className="space-y-3">
              {pending.map((r) => <RequestCard key={r.id} r={r} />)}
            </div>
          </Section>

          <Section title="Recent decisions">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {recent.map((d, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{d.name}</div>
                    <div className="text-2xs text-zinc-500">{d.role.replace('_', ' ')} · by {d.by}</div>
                  </div>
                  <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                    d.decision === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    {d.decision}
                  </span>
                  <span className="text-2xs font-mono text-zinc-500 shrink-0">{d.at}</span>
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

function RequestCard({ r }: { r: Request }) {
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100">{r.name}</div>
          <div className="text-2xs font-mono text-zinc-500 truncate">{r.email}</div>
        </div>
        <span className="text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-300 border-blue-500/30 shrink-0">
          {r.requested_role.replace('_', ' ')}
        </span>
      </div>
      <div className="text-sm text-zinc-300 leading-relaxed mb-3">{r.reason}</div>
      <div className="text-2xs text-zinc-500 mb-4 space-y-0.5">
        <div>Requested {r.requested_at}{r.introduced_by ? ` · introduced by ${r.introduced_by}` : ''}</div>
        {r.context.closed_chats && <div>Closed {r.context.closed_chats} chats during shadow period.</div>}
        {r.context.vouched_by && <div>Vouched by: {r.context.vouched_by}</div>}
        {r.context.history && <div>{r.context.history}</div>}
      </div>
      <div className="flex gap-2">
        <button className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-900 text-xs font-medium flex items-center gap-1.5 transition-colors">
          <Check className="w-3.5 h-3.5" /> Approve
        </button>
        <button className="h-8 px-3 rounded-md border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors">
          <Eye className="w-3.5 h-3.5" /> Audit history
        </button>
        <button className="h-8 px-3 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1.5 transition-colors ml-auto">
          <X className="w-3.5 h-3.5" /> Deny
        </button>
      </div>
    </div>
  );
}
