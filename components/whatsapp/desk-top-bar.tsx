'use client';

import Link from 'next/link';
import { Search, Bell, Settings } from 'lucide-react';

/**
 * Top bar for the WhatsApp Desk room.
 * Brand on the left (small, click to lobby), section indicator center,
 * search + bell + profile right. Familiar pattern. ~48px tall.
 */
export function DeskTopBar({ onSearch }: { onSearch?: () => void }) {
  return (
    <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 flex items-center gap-4">
      {/* Brand */}
      <Link href="/house" className="flex items-center gap-2 text-zinc-100 hover:text-emerald-400 transition-colors">
        <div className="w-6 h-6 rounded bg-emerald-500/90 text-zinc-900 font-semibold text-xs flex items-center justify-center">
          O
        </div>
        <span className="text-sm font-medium">OmniaHouse</span>
      </Link>

      {/* Main room nav */}
      <nav className="flex items-center gap-1 ml-2">
        <NavLink href="/whatsapp-desk" active>Inbox</NavLink>
        <NavLink href="/orders">Orders</NavLink>
        <NavLink href="/inventory">Inventory</NavLink>
        <NavLink href="/customers">Customers</NavLink>
        <NavLink href="/management">Management</NavLink>
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onSearch}
          data-command-open
          className="flex items-center gap-2 h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search</span>
          <span className="ml-2 text-2xs font-mono text-zinc-500 border border-zinc-700 rounded px-1 py-px">⌘K</span>
        </button>
        <button className="w-7 h-7 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center" title="Notifications">
          <Bell className="w-4 h-4" />
        </button>
        <Link href="/settings" className="w-7 h-7 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center" title="Settings">
          <Settings className="w-4 h-4" />
        </Link>
        <div className="w-7 h-7 rounded-full bg-emerald-600 text-zinc-900 text-xs font-semibold flex items-center justify-center" title="Mahmoud Ezz">
          ME
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-2.5 h-7 rounded text-sm flex items-center transition-colors ${
        active
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
    >
      {children}
    </Link>
  );
}
