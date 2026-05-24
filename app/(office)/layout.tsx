import { Sidebar } from '@/components/navigation/sidebar';
import { CommandBar } from '@/components/navigation/command-bar';
import { PulseStrip } from '@/components/navigation/pulse-strip';
import { getSession } from '@/lib/session';

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar session={session} />
      <div className="flex-1 flex flex-col min-w-0">
        <PulseStrip />
        <main className="flex-1 px-8 py-7 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
      <CommandBar />
    </div>
  );
}
