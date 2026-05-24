import Link from 'next/link';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { Wrench, ArrowRight } from 'lucide-react';

/**
 * Honest placeholder for rooms that are scaffolded but not yet built deep.
 * Same top bar as every other room (Go menu is the only navigation), no
 * editorial header, no dashboard tiles. Just a calm "here's what lives here
 * eventually, here's where the working version is right now."
 */
export function RoomStub({
  title,
  description,
  shortcuts,
}: {
  title: string;
  description: string;
  shortcuts?: { label: string; href: string; hint?: string }[];
}) {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-16">
          <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-zinc-500">
            <Wrench className="w-3.5 h-3.5" />
            Under construction
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 mb-3">{title}</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">{description}</p>

          {shortcuts && shortcuts.length > 0 && (
            <div className="border-t border-zinc-800 pt-6">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Use these for now</div>
              <ul className="space-y-2">
                {shortcuts.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="flex items-start gap-3 p-3 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 transition-colors">
                      <ArrowRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-100">{s.label}</div>
                        {s.hint && <div className="text-xs text-zinc-500 mt-0.5">{s.hint}</div>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
