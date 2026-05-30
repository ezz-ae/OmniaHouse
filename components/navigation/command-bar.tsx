'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ROOMS } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/button';
import { Search, ArrowRight, Hash, Sparkles, X, LogOut } from 'lucide-react';

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void | Promise<void>;
  icon?: React.ComponentType<{ className?: string }>;
};

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest('[data-command-open]');
      if (t) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const rooms = ROOMS.map<Item>((r) => ({
      id: `room:${r.slug}`,
      group: 'Jump to',
      label: r.name,
      hint: r.description,
      href: `/${r.slug}`,
      icon: r.icon,
    }));
    const actions: Item[] = [
      {
        id: 'action:new-draft',
        group: 'Actions',
        label: 'New draft order',
        hint: 'Cross-store draft from a customer profile',
        href: '/orders?new=1',
        icon: Hash,
      },
      {
        id: 'action:extract',
        group: 'Actions',
        label: 'Extract WhatsApp chat',
        hint: 'Paste chat → structured order',
        href: '/whatsapp-desk?extract=1',
        icon: Sparkles,
      },
      {
        id: 'action:product',
        group: 'Actions',
        label: 'Find a product',
        hint: 'Across both stores',
        href: '/inventory',
        icon: Search,
      },
      {
        id: 'action:sign-out',
        group: 'Account',
        label: 'Sign out',
        hint: 'End this office session',
        action: async () => {
          await fetch('/auth/signout', { method: 'POST' }).catch(() => null);
          window.sessionStorage.removeItem('oh:door');
          router.replace('/login');
          router.refresh();
        },
        icon: LogOut,
      },
    ];
    return [...actions, ...rooms];
  }, []);

  const filtered = useMemo(() => {
    if (!q) return items;
    const n = q.toLowerCase();
    return items.filter(
      (i) => i.label.toLowerCase().includes(n) || i.hint?.toLowerCase().includes(n),
    );
  }, [q, items]);

  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    filtered.forEach((i) => {
      g[i.group] = g[i.group] || [];
      g[i.group].push(i);
    });
    return g;
  }, [filtered]);

  async function go(item: Item) {
    if (item.href) router.push(item.href);
    if (item.action) await item.action();
    setOpen(false);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) go(filtered[active]);
    }
  }

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl panel-raised shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-line-soft">
          <Search className="w-4 h-4 text-ink-dim" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKey}
            placeholder="Search rooms, products, customers, actions…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-dim text-ink"
          />
          <button onClick={() => setOpen(false)} className="text-ink-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {Object.keys(grouped).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-dim">
              No matches for &ldquo;{q}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="label px-4 py-1.5">{group}</div>
                {list.map((item) => {
                  runningIdx++;
                  const isActive = runningIdx === active;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(runningIdx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 h-10 text-left transition-colors',
                        isActive
                          ? 'bg-gold/10 text-ink'
                          : 'text-ink-muted hover:bg-canvas-inset',
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            isActive ? 'text-gold' : 'text-ink-dim',
                          )}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{item.label}</div>
                        {item.hint && (
                          <div className="text-2xs text-ink-dim truncate">{item.hint}</div>
                        )}
                      </div>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-gold shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 h-9 border-t border-line-soft text-2xs text-ink-dim">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> close
            </span>
          </div>
          <span className="font-medium text-gold">House of Omnia</span>
        </div>
      </div>
    </div>
  );
}
