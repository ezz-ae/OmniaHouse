import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Room {
  name: string;
  slug: string;
  icon: string;
}

export function Sidebar({ rooms }: { rooms: Room[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col w-64 border-r bg-slate-50 h-screen p-4">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold">OmniaHouse</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Digital Office</p>
      </div>
      <div className="space-y-1">
        {rooms.map((room) => (
          <Link
            key={room.slug}
            href={`/${room.slug}`}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              pathname.startsWith(`/${room.slug}`) 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-slate-200"
            )}
          >
            {room.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}