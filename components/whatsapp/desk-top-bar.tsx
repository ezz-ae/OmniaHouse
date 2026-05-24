'use client';

import { GoMenu } from '@/components/navigation/go-menu';
import { Bell } from 'lucide-react';

/**
 * Shared top bar — used by every room.
 *
 * No brand mark. The office sign on the wall already reads "House of Omnia";
 * the platform doesn't repeat itself. Just controls on the right: bell,
 * profile, Go menu. The Go menu is the only navigation.
 */
export function DeskTopBar() {
  return (
    <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 flex items-center">
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
