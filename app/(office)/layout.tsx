import { Sidebar } from '@/components/navigation/sidebar';
import { CommandBar } from '@/components/navigation/command-bar';
import { getUserRooms } from '@/lib/rbac';

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rooms = await getUserRooms();

  return (
    <div className="flex min-h-screen">
      <Sidebar rooms={rooms} />
      <CommandBar rooms={rooms} />
      <main className="flex-1 p-8 bg-white">{children}</main>
    </div>
  );
}