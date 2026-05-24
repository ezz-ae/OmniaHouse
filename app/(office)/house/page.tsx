'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ROOMS, type Room } from '@/lib/rooms';
import { getSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/button';
import { Sparkles, Search } from 'lucide-react';

/**
 * The Lobby.
 *
 * Not a dashboard. Not eight cards of numbers. The entry point into the
 * house — every room presented as a destination you can walk into. Each
 * portal has its own colour signature, a one-line invitation, and a live
 * pulse dot when there is unclaimed work waiting inside.
 *
 * Numbers do not live here. They live inside the rooms that own them.
 */
export default function LobbyPage() {
  const session = getSession();
  const [now, setNow] = useState<string>('');
  const [greet, setGreet] = useState<string>('');

  useEffect(() => {
    function tick() {
      const d = new Date();
      setNow(d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' }) + ' GST');
      const h = d.getHours();
      setGreet(h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late night');
    }
    tick();
    const t = setInterval(tick, 1000 * 30);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[480px] h-[480px] rounded-full bg-gold/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
      </div>

      {/* Header strip — minimal */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-7">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center font-serif font-medium text-canvas">
            O
          </div>
          <div>
            <div className="text-sm font-medium text-ink leading-tight">OmniaHouse</div>
            <div className="text-2xs text-ink-dim leading-tight uppercase tracking-widest">{session.org.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-2xs text-ink-dim">
          <span className="numeric">{now}</span>
          <button data-command-open className="flex items-center gap-1.5 px-2.5 h-7 rounded border border-line-soft hover:border-line-strong hover:text-ink">
            <Search className="w-3 h-3" /> Search · <Kbd>⌘K</Kbd>
          </button>
        </div>
      </header>

      {/* Greeting */}
      <section className="relative z-10 px-8 pt-20 pb-14 max-w-5xl">
        <div className="text-2xs uppercase tracking-[0.25em] text-gold mb-3">
          {greet} · {session.user.name.split(' ')[0]}
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-medium text-ink leading-[0.95] tracking-tight max-w-3xl">
          The house is quiet.
          <br />
          <span className="text-ink-muted italic">Open a room.</span>
        </h1>
      </section>

      {/* Rooms — laid out as portals, NOT a grid card row */}
      <section className="relative z-10 px-6 md:px-8 pb-20">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-[180px]">
          {ROOMS.map((room, i) => (
            <RoomPortal key={room.slug} room={room} index={i} />
          ))}
        </div>
      </section>

      {/* Footer line */}
      <footer className="relative z-10 px-8 pb-7 pt-4 border-t border-line-soft flex items-center justify-between text-2xs text-ink-dim">
        <div className="flex items-center gap-3">
          <span>{session.user.name} · <span className="text-gold uppercase tracking-wider">{session.user.role.replace('_', ' ')}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span>omniastores.ae · omniastores.com · +971 56 547 8227</span>
        </div>
      </footer>
    </main>
  );
}

// ─── Portal ────────────────────────────────────────────────────────────────

function RoomPortal({ room, index }: { room: Room; index: number }) {
  const Icon = room.icon;
  const tone = portalTone(room.slug);

  return (
    <Link
      href={`/${room.slug}`}
      className={cn(
        'group relative panel overflow-hidden hover:border-line-strong hover:-translate-y-0.5 transition-all',
        'flex flex-col justify-between p-5',
      )}
    >
      {/* Background flourish */}
      <div
        className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none"
        style={{ background: tone.gradient }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-canvas/40 via-canvas/60 to-canvas/90 pointer-events-none" />

      {/* Top: icon + signal */}
      <div className="relative flex items-start justify-between">
        <div
          className="p-2 rounded border"
          style={{ borderColor: tone.border, background: tone.iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: tone.fg }} />
        </div>
        {room.badge && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: tone.fg }} />
            <span className="text-2xs font-medium numeric" style={{ color: tone.fg }}>
              {room.badge.count}
            </span>
          </div>
        )}
      </div>

      {/* Body: name + invitation */}
      <div className="relative">
        <h3 className="font-serif text-xl text-ink leading-tight mb-1">{room.name}</h3>
        <p className="text-xs text-ink-muted leading-snug line-clamp-2">{room.description}</p>
      </div>

      {/* Group label */}
      <div className="relative text-2xs uppercase tracking-widest text-ink-dim">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: tone.fg }}>
          enter
        </span>
        <span className="group-hover:opacity-0 transition-opacity">{room.group}</span>
      </div>
    </Link>
  );
}

function portalTone(slug: string): { gradient: string; border: string; iconBg: string; fg: string } {
  const map: Record<string, { gradient: string; fg: string }> = {
    house:                { gradient: 'radial-gradient(circle at 30% 20%, rgba(212,165,116,0.3), transparent 70%)',  fg: '#D4A574' },
    'whatsapp-desk':      { gradient: 'radial-gradient(circle at 50% 50%, rgba(122,167,217,0.35), transparent 70%)', fg: '#7AA7D9' },
    inventory:            { gradient: 'radial-gradient(circle at 70% 30%, rgba(124,184,124,0.3), transparent 70%)',  fg: '#7CB87C' },
    orders:               { gradient: 'radial-gradient(circle at 20% 80%, rgba(216,108,94,0.25), transparent 70%)',  fg: '#D86C5E' },
    customers:            { gradient: 'radial-gradient(circle at 60% 40%, rgba(217,167,91,0.28), transparent 70%)',  fg: '#D9A75B' },
    'brand-intelligence': { gradient: 'radial-gradient(circle at 40% 60%, rgba(168,85,247,0.25), transparent 70%)',  fg: '#A855F7' },
    backyard:             { gradient: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.22), transparent 70%)',   fg: '#22C55E' },
    'co-tasking':         { gradient: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.25), transparent 70%)',  fg: '#6366F1' },
    cashback:             { gradient: 'radial-gradient(circle at 50% 50%, rgba(212,165,116,0.35), transparent 70%)', fg: '#D4A574' },
    management:           { gradient: 'radial-gradient(circle at 50% 50%, rgba(168,168,166,0.2), transparent 70%)',  fg: '#A8A8A6' },
    'access-requests':    { gradient: 'radial-gradient(circle at 50% 50%, rgba(212,165,116,0.25), transparent 70%)', fg: '#D4A574' },
    settings:             { gradient: 'radial-gradient(circle at 50% 50%, rgba(110,110,107,0.18), transparent 70%)', fg: '#A8A8A6' },
  };
  const conf = map[slug] || { gradient: 'radial-gradient(circle at 50% 50%, rgba(168,168,166,0.18), transparent 70%)', fg: '#A8A8A6' };
  return {
    gradient: conf.gradient,
    fg: conf.fg,
    border: `${conf.fg}30`,
    iconBg: `${conf.fg}15`,
  };
}
