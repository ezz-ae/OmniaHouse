import { CommandBar } from '@/components/navigation/command-bar';
import { LobbyMark } from '@/components/navigation/lobby-mark';

/**
 * Office wrapper — intentionally NOT a chrome.
 *
 * omniahouse.ae is the whole domain. There is no parent app, no marketing
 * site to sit inside, no SaaS dashboard. The "office" route group only
 * exists so each room can declare its own internal layout without
 * collision. There is no persistent sidebar, no pulse strip, no top bar.
 *
 * Two universal affordances ride on top of every room:
 *   - LobbyMark — small floating brand badge top-left → back to lobby
 *   - CommandBar — summoned with ⌘K, opt-in, never parked
 *
 * Anything else (queue, pulse, search) is the room's own decision.
 */
export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LobbyMark />
      {children}
      <CommandBar />
    </>
  );
}
