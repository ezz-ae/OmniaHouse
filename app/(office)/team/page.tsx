'use client';

import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getTeam } from '@/lib/mock/team';
import { Users2 } from 'lucide-react';

/**
 * Team — who's in the House, what they're doing, what skills they hold.
 * Reads from the team_profiles SQL eventually. Today this is the mock roster.
 */
export default function TeamPage() {
  const team = getTeam();

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-zinc-500">
            <Users2 className="w-3.5 h-3.5" />
            Team
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-2">Who is in the House</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Real-time status, role, and current activity. Skills and performance live alongside
            the Omnia AI agent for each person — open the Omnia AI room to talk to that agent.
          </p>

          <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
            {team.map((m) => {
              const initials = m.name.slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-medium text-zinc-900 text-sm shrink-0"
                    style={{ background: m.avatar_color }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100 truncate">{m.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        m.status === 'online' ? 'bg-emerald-400' :
                        m.status === 'away' ? 'bg-amber-400' :
                        'bg-zinc-600'
                      }`} />
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {m.role.replace('_', ' ')}{m.active_now ? ` · ${m.active_now}` : ''}
                    </div>
                  </div>
                  {typeof m.closed_today === 'number' && (
                    <div className="text-right shrink-0">
                      <div className="text-sm text-zinc-100 numeric">{m.closed_today}</div>
                      <div className="text-2xs text-zinc-500 uppercase tracking-wider">closed today</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
