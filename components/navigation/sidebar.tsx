'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROOM_GROUPS, getRoomsForRole } from '@/lib/rooms';
import { Badge, Dot } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { Session } from '@/lib/session';

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const rooms = getRoomsForRole(session.user.role);

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-line-soft bg-canvas/95 backdrop-blur-md flex flex-col">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-line-soft">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center font-serif font-medium text-canvas text-sm">
            O
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink leading-tight truncate">
              OmniaHouse
            </div>
            <div className="text-2xs text-ink-dim leading-tight truncate">
              {session.org.name}
            </div>
          </div>
        </div>
      </div>

      <button
        data-command-open
        className="mx-3 mt-3 px-2.5 h-8 flex items-center gap-2 text-left bg-canvas-inset hover:bg-canvas-panel border border-line rounded text-ink-dim hover:text-ink transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs flex-1">Search · jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav className="flex-1 overflow-y-auto px-2 pt-3 pb-4 space-y-4">
        {ROOM_GROUPS.map((group) => {
          const groupRooms = rooms.filter((r) => r.group === group.id);
          if (!groupRooms.length) return null;
          return (
            <div key={group.id}>
              <div className="label px-2.5 mb-1.5">{group.label}</div>
              <ul className="space-y-px">
                {groupRooms.map((room) => {
                  const Icon = room.icon;
                  const active =
                    pathname === `/${room.slug}` ||
                    pathname.startsWith(`/${room.slug}/`);
                  return (
                    <li key={room.slug}>
                      <Link
                        href={`/${room.slug}`}
                        className={cn(
                          'group flex items-center gap-2.5 px-2.5 h-8 rounded text-sm transition-colors',
                          active
                            ? 'bg-gold/10 text-gold border border-gold/20'
                            : 'text-ink-muted hover:text-ink hover:bg-canvas-inset border border-transparent',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            active ? 'text-gold' : 'text-ink-dim group-hover:text-ink-muted',
                          )}
                        />
                        <span className="flex-1 truncate">{room.name}</span>
                        {room.badge && (
                          <Badge tone={room.badge.tone}>
                            {room.badge.count}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-line-soft">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-medium text-canvas"
            style={{ background: session.user.avatarColor }}
          >
            {session.user.name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-ink truncate">
              {session.user.name}
            </div>
            <div className="flex items-center gap-1 text-2xs text-ink-dim">
              <Dot tone="good" pulse />
              <span className="uppercase tracking-wider">{session.user.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
