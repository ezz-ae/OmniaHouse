'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { findRoom } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/button';

/**
 * Floating brand badge → lobby.
 * Hidden on the lobby itself, on public portal routes, and on rooms
 * that have their own top nav (WhatsApp Desk).
 */
export function LobbyMark() {
  const pathname = usePathname();
  const [hover, setHover] = useState(false);

  if (
    pathname === '/' ||
    pathname === '/house' ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/whatsapp-desk')
  ) {
    return null;
  }

  const slug = pathname.split('/').filter(Boolean)[0];
  const room = slug ? findRoom(slug) : null;

  return (
    <div
      className="fixed top-4 left-4 z-40"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link
        href="/house"
        className={cn(
          'flex items-center gap-2.5 h-9 pl-1.5 pr-3 rounded-full border bg-canvas-raised/80 backdrop-blur-md transition-all',
          hover ? 'border-gold/40 shadow-glow' : 'border-line-soft',
        )}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center font-serif text-canvas text-xs font-medium">
          O
        </div>
        <span
          className={cn(
            'text-xs font-medium overflow-hidden transition-all',
            hover ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0',
          )}
        >
          <span className="text-ink-dim mr-1">in</span>
          <span className="text-gold whitespace-nowrap">{room?.name || slug}</span>
          <span className="text-ink-dim mx-2">·</span>
          <span className="text-ink-dim">leave</span>
        </span>
      </Link>

      {hover && (
        <div className="mt-2 flex items-center gap-1 pl-2 text-2xs text-ink-dim">
          <Kbd>⌘K</Kbd>
          <span>anywhere</span>
        </div>
      )}
    </div>
  );
}
