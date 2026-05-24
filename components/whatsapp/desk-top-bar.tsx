'use client';

import { GoMenu } from '@/components/navigation/go-menu';
import { Bell } from 'lucide-react';

/**
 * Shared top bar — used by every room.
 *
 * - Brand on the left (identity, not a link — clicking does nothing)
 * - Right: Bell + profile + Go menu
 *
 * No horizontal room navigation. Go menu is the only way to switch rooms.
 * No search input on the bar (Go menu has its own filter; ⌘K opens the same
 * thing as the Go button).
 *
 * Sized at 48px tall to leave maximum room for the actual work below.
 */
export function DeskTopBar() {
  return (
    <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 flex items-center gap-3">
      {/* Brand — identity, not navigation */}
      <div className="flex items-center gap-2 select-none">
        <div className="w-6 h-6 rounded bg-emerald-500/90 text-zinc-900 font-semibold text-xs flex items-center justify-center">
          O
        </div>
        <span className="text-sm font-medium text-zinc-100">The House of Omnia</span>
      </div>

      {/* Right side: bell + profile + Go */}
      <div className="ml-auto flex items-center gap-2">
        <button
          className="w-7 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>
        <div
          className="w-7 h-7 rounded-full bg-emerald-600 text-zinc-900 text-xs font-semibold flex items-center justify-center"
          title="Mahmoud Ezz"
        >
          ME
        </div>
        <div className="w-px h-5 bg-zinc-800 mx-1" />
        <GoMenu />
      </div>
    </header>
  );
}
