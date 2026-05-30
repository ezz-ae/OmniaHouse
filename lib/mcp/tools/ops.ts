// MCP tools · operations domain. Wraps the in-memory ops store for the
// slices that haven't moved to Postgres yet (signals, follow-ups, team,
// assignments). Keeps Omnia AI grounded in real team state without
// dumping the entire snapshot in every prompt.

import { operationsSnapshot } from '@/lib/operations/store';

export async function get_team_load() {
  const ops = await operationsSnapshot();
  return {
    ok: true,
    team: ops.team.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      online: m.status === 'online',
      load: m.load,
      closed_today: m.closed_today,
      skills: m.skills,
      active_followups: ops.followups.filter((f) => f.assignee === m.id && f.status === 'open').length,
    })),
  };
}

export async function get_open_followups(args: { assignee?: string; limit?: number }) {
  const ops = await operationsSnapshot();
  const items = ops.followups
    .filter((f) => f.status === 'open' && (!args.assignee || f.assignee === args.assignee))
    .slice(0, args.limit ?? 20)
    .map((f) => ({
      id: f.id,
      reason: f.reason,
      due: f.due,
      assignee: f.assignee,
      customer_id: f.customer_id,
      channel: f.channel,
      source_order_id: f.source_order_id,
    }));
  return { ok: true, total: items.length, followups: items };
}

export async function get_signals(args: { kind?: string; limit?: number }) {
  const ops = await operationsSnapshot();
  const items = ops.signals
    .filter((s) => s.status === 'open' && (!args.kind || s.kind === args.kind))
    .slice(0, args.limit ?? 10)
    .map((s) => ({
      id: s.id,
      kind: s.kind,
      summary: s.summary,
      tone: s.tone,
      volume: s.volume,
      recommended_action: s.recommended_action,
      created_at: s.created_at,
    }));
  return { ok: true, total: items.length, signals: items };
}

export async function get_access_requests() {
  const ops = await operationsSnapshot();
  const pending = ops.access_requests.filter((r) => r.status === 'pending');
  return {
    ok: true,
    total: pending.length,
    requests: pending.map((r) => ({
      id: r.id,
      requester_name: r.requester_name,
      requested_role: r.requested_role,
      scope: r.scope,
      sensitive_scope: r.sensitive_scope,
      reason: r.reason,
    })),
  };
}
