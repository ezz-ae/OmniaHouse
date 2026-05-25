'use client';

import { GoMenu } from '@/components/navigation/go-menu';
import { NotesButton } from '@/components/notes/notes-button';

/**
 * Shared top bar — used by every room.
 *
 * No brand mark. The office sign on the wall already reads "House of Omnia";
 * the platform doesn't repeat itself. Controls on the right: Notes (a
 * peer-to-peer + AI-targeted message system, replaces a passive bell),
 * profile, Go menu.
 */
export function DeskTopBar() {
  return (
    <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 flex items-center">
      <div className="ml-auto flex items-center gap-2">
        <NotesButton />
        <div
          className="w-7 h-7 rounded-full bg-emerald-600 text-zinc-900 text-xs font-semibold flex items-center justify-center"
          title="Mahmoud"
        >
          M
        </div>
        <div className="w-px h-5 bg-zinc-800 mx-1" />
        <GoMenu />
      </div>
    </header>
  );
}
