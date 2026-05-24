import { CommandBar } from '@/components/navigation/command-bar';

/**
 * Office wrapper — minimal.
 *
 * Every room now has its own top bar (DeskTopBar) with the Go menu — the
 * only persistent navigation across the platform. The floating LobbyMark
 * is gone; the Go button replaces it everywhere.
 *
 * CommandBar (⌘K) stays as a power-user shortcut.
 */
export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandBar />
    </>
  );
}
