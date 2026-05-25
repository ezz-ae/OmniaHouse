'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowRight, BadgeCheck, BarChart3, Brain, Building2, CalendarClock, CheckCircle2,
  ClipboardCheck, Clock3, Download, DollarSign, FileText, KeyRound, ListFilter, MessageSquare,
  MoreHorizontal, PackageCheck, Plus, RadioTower, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Store, Truck, UserCheck, UserPlus, Users, WalletCards, Workflow, X,
  type LucideIcon,
} from 'lucide-react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';

type Shortcut = { label: string; href: string; hint?: string };
type Tone = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'zinc';
type WorkMode = 'worklist' | 'approvals' | 'automation' | 'audit';

type Metric = { label: string; value: string; tone: Tone };
type RoomFilter = { id: string; label: string; predicate: string };
type RoomItemAction = {
  id: string; label: string; icon: string; tone: Tone;
  endpoint: string; method?: 'POST' | 'PATCH'; payload: Record<string, unknown>; confirm?: string;
  navigate?: boolean;
};
type WorkItem = {
  id: string; kind: string; title: string; subtitle: string; owner: string; source: string;
  due: string; value: string; status: string; priority: Tone;
  tags: string[]; checks: string[]; activity: string[]; actions: RoomItemAction[];
};
type RoomView = { id: string; label: string; hint: string; items: WorkItem[] };
type RoomAutomation = { key: string; title: string; detail: string; tone: Tone; icon: string; enabled: boolean; threshold: number | null };
type RoomPrimary = {
  label: string; endpoint: string; method?: 'POST' | 'PATCH'; payload: Record<string, unknown>;
  prompt?: { field: string; label: string; required?: boolean }[];
};
type RoomData = {
  title: string; eyebrow: string; description: string; icon: string; tone: Tone;
  primary: RoomPrimary; metrics: Metric[]; views: RoomView[]; filters: RoomFilter[];
  aiBrief: string[]; automations: RoomAutomation[]; sideSignals: Metric[];
};

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, ArrowRight, BadgeCheck, BarChart3, Brain, Building2, CalendarClock, CheckCircle2,
  ClipboardCheck, Clock3, Download, DollarSign, FileText, KeyRound, ListFilter, MessageSquare,
  MoreHorizontal, PackageCheck, Plus, RadioTower, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Store, Truck, UserCheck, UserPlus, Users, WalletCards, Workflow,
};
const I = (name: string): LucideIcon => ICONS[name] || Workflow;

export function RoomWorkspace({
  title, description, shortcuts = [],
}: {
  title: string; description: string; shortcuts?: Shortcut[];
}) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [activeFilterId, setActiveFilterId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<WorkMode>('worklist');
  const [selectedId, setSelectedId] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [primaryOpen, setPrimaryOpen] = useState(false);
  const [primaryValues, setPrimaryValues] = useState<Record<string, string>>({});

  const fetchRoom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operations/rooms?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`);
      const json = await res.json();
      if (json.ok && json.room) {
        const data = json.room as RoomData;
        setRoom(data);
        if (!activeViewId && data.views[0]) setActiveViewId(data.views[0].id);
        if (!selectedId && data.views[0]?.items[0]) setSelectedId(data.views[0].items[0].id);
      } else {
        setNotice(json.error || 'Failed to load room');
      }
    } catch (err: any) {
      setNotice(err?.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [title, description, activeViewId, selectedId]);

  useEffect(() => { fetchRoom(); }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runAction(action: RoomItemAction, contextId?: string) {
    if (busy) return;
    if (action.confirm && !window.confirm(action.confirm)) return;
    if (action.navigate) {
      router.push(action.endpoint);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const payload = { ...action.payload };
      if (contextId && !payload.entity_id && action.id.includes('assign')) payload.entity_id = contextId;
      const res = await fetch(action.endpoint, {
        method: action.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        setNotice(`${action.label} · done`);
        await fetchRoom();
      } else {
        setNotice(`${action.label} · ${json.error || 'failed'}`);
      }
    } catch (err: any) {
      setNotice(`${action.label} · ${err?.message || 'failed'}`);
    } finally {
      setBusy(false);
    }
  }

  async function runPrimary() {
    if (!room || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const payload: Record<string, any> = { ...room.primary.payload, ...primaryValues };
      // Specific shaping for Orders create
      if (room.title === 'Orders' && primaryValues.sku) {
        payload.lines = [{
          sku: primaryValues.sku,
          title: primaryValues.sku,
          qty: Number(primaryValues.qty || 1),
          price_aed: Number(primaryValues.price_aed || 0),
        }];
        delete payload.sku; delete payload.qty; delete payload.price_aed;
      }
      // Lists for meetings/access
      if (typeof payload.attendees === 'string') payload.attendees = (payload.attendees as string).split(',').map((s) => s.trim()).filter(Boolean);
      if (typeof payload.scope === 'string') payload.scope = (payload.scope as string).split(',').map((s) => s.trim()).filter(Boolean);
      if (typeof payload.sensitive_scope === 'string') payload.sensitive_scope = (payload.sensitive_scope as string).split(',').map((s) => s.trim()).filter(Boolean);
      if (typeof payload.skill_needed === 'string') payload.skill_needed = (payload.skill_needed as string).split(',').map((s) => s.trim()).filter(Boolean);

      const res = await fetch(room.primary.endpoint, {
        method: room.primary.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        setNotice(`${room.primary.label} · done`);
        setPrimaryOpen(false);
        setPrimaryValues({});
        await fetchRoom();
      } else {
        setNotice(`${room.primary.label} · ${json.error || 'failed'}`);
      }
    } catch (err: any) {
      setNotice(`Primary action · ${err?.message || 'failed'}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutomation(automation: RoomAutomation) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: automation.key, enabled: !automation.enabled, actor: 'Mahmoud' }),
      });
      const json = await res.json();
      if (json.ok) {
        setNotice(`${automation.title} · ${json.automation.enabled ? 'enabled' : 'disabled'}`);
        await fetchRoom();
      } else {
        setNotice(`${automation.title} · ${json.error || 'failed'}`);
      }
    } catch (err: any) {
      setNotice(`Automation · ${err?.message || 'failed'}`);
    } finally {
      setBusy(false);
    }
  }

  async function recordToolAction(action: string, detail: string) {
    setBusy(true);
    try {
      await fetch('/api/operations/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entity: title, detail }),
      });
      setNotice(`${detail} recorded`);
    } catch {
      setNotice('Could not record action');
    } finally { setBusy(false); }
  }

  const activeView = useMemo(() => room?.views.find((v) => v.id === activeViewId) ?? room?.views[0], [room, activeViewId]);
  const filteredItems = useMemo(() => {
    if (!activeView) return [];
    let items = activeView.items;
    const filter = activeFilterId && room?.filters.find((f) => f.id === activeFilterId);
    if (filter) items = items.filter((it) => predicateMatches(it, filter.predicate));
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((it) => `${it.title} ${it.subtitle} ${it.owner} ${it.source} ${it.status} ${it.tags.join(' ')}`.toLowerCase().includes(q));
    }
    return items;
  }, [activeView, activeFilterId, room?.filters, query]);

  const selected = useMemo(() => filteredItems.find((it) => it.id === selectedId) ?? filteredItems[0] ?? activeView?.items[0], [filteredItems, selectedId, activeView]);

  if (loading && !room) {
    return (
      <div className="h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col">
        <DeskTopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-zinc-500 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading {title}…
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col">
        <DeskTopBar />
        <div className="flex-1 flex items-center justify-center text-sm text-rose-400">
          Could not load {title}. {notice}
        </div>
      </div>
    );
  }

  const Icon = I(room.icon);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 flex">
        {/* Left sidebar */}
        <aside className="hidden xl:flex w-[280px] shrink-0 border-r border-zinc-800 bg-zinc-950 flex-col">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${tonePanelClass(room.tone)}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-100 truncate">{room.title}</div>
                <div className="text-2xs uppercase tracking-wider text-zinc-500">{room.eyebrow}</div>
              </div>
            </div>
            <button
              onClick={() => setPrimaryOpen(true)}
              disabled={busy}
              className={`mt-4 h-9 w-full rounded-md border text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${tonePillClass(room.tone)}`}
            >
              <Plus className="w-3.5 h-3.5" />
              {room.primary.label}
            </button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="text-2xs uppercase tracking-wider text-zinc-500 px-2 mb-2 flex items-center justify-between">
              <span>Views</span>
              <button onClick={fetchRoom} className="text-zinc-500 hover:text-zinc-200" title="Refresh">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {room.views.map((view) => {
                const active = view.id === activeViewId;
                return (
                  <button
                    key={view.id}
                    onClick={() => {
                      setActiveViewId(view.id);
                      setSelectedId(view.items[0]?.id ?? '');
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                      active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{view.label}</span>
                      <span className={`text-2xs font-mono ${active ? toneTextClass(room.tone) : 'text-zinc-600'}`}>
                        {view.items.length}
                      </span>
                    </div>
                    <div className="mt-0.5 text-2xs text-zinc-500 truncate">{view.hint}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-2xs uppercase tracking-wider text-zinc-500 px-2 mt-5 mb-2">Filters</div>
            <div className="flex flex-wrap gap-1.5 px-1">
              <button
                onClick={() => setActiveFilterId('')}
                className={`h-7 px-2 rounded border text-2xs ${activeFilterId === '' ? tonePillClass(room.tone) : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'}`}
              >All</button>
              {room.filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilterId(filter.id === activeFilterId ? '' : filter.id)}
                  className={`h-7 px-2 rounded border text-2xs ${filter.id === activeFilterId ? tonePillClass(room.tone) : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </nav>

          {shortcuts.length > 0 && (
            <div className="border-t border-zinc-800 p-3">
              <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2">Handoffs</div>
              <div className="space-y-1.5">
                {shortcuts.slice(0, 3).map((shortcut) => (
                  <Link
                    key={`${shortcut.href}-${shortcut.label}`}
                    href={shortcut.href}
                    className="block rounded-md border border-zinc-800 bg-zinc-900/70 p-2.5 hover:bg-zinc-900 hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-zinc-200 truncate">{shortcut.label}</span>
                    </div>
                    {shortcut.hint && <div className="mt-1 text-2xs leading-4 text-zinc-500 line-clamp-2">{shortcut.hint}</div>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 flex">
          <section className="flex-1 min-w-0 flex flex-col">
            <header className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 md:px-6 py-4">
              <div className="flex flex-col 2xl:flex-row 2xl:items-end 2xl:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-5 inline-flex items-center px-2 rounded border text-2xs uppercase tracking-wider ${tonePillClass(room.tone)}`}>
                      {activeView?.label || 'View'}
                    </span>
                    <span className="text-2xs uppercase tracking-wider text-zinc-500">Operating room</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100">{room.title}</h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">{room.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 2xl:w-[480px]">
                  {room.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
                      <div className="text-2xs uppercase tracking-wider text-zinc-500 truncate">{metric.label}</div>
                      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneTextClass(metric.tone)}`}>{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col 2xl:flex-row gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Search ${room.title.toLowerCase()}`}
                    className="w-full h-10 pl-9 pr-3 rounded-md border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
                  />
                </div>

                <div className="flex rounded-md border border-zinc-800 bg-zinc-900 p-1 overflow-x-auto">
                  {(['worklist', 'approvals', 'automation', 'audit'] as WorkMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`h-8 px-3 rounded text-xs whitespace-nowrap capitalize ${mode === m ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-100'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <ToolButton icon={ListFilter} label="Filter" onClick={() => recordToolAction('room.filter_opened', `${room.title} · ${activeView?.label}`)} />
                  <ToolButton icon={SlidersHorizontal} label="Columns" onClick={() => recordToolAction('room.columns_opened', `${room.title} · ${activeView?.label}`)} />
                  <ToolButton icon={Download} label="Export" onClick={() => exportJson(room, activeView?.id || 'all', filteredItems)} />
                  <ToolButton icon={RefreshCw} label="Refresh" onClick={fetchRoom} />
                </div>
              </div>
              {notice && (
                <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 flex items-center justify-between">
                  <span>{notice}</span>
                  <button onClick={() => setNotice(null)} className="text-emerald-300/60 hover:text-emerald-200">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
              {mode === 'worklist' && (
                <Worklist
                  room={room} items={filteredItems} selectedId={selected?.id}
                  onSelect={setSelectedId} onAction={runAction} disabled={busy}
                />
              )}
              {mode === 'approvals' && (
                <Approvals room={room} items={filteredItems} onSelect={setSelectedId} onAction={runAction} disabled={busy} />
              )}
              {mode === 'automation' && (
                <Automation room={room} onToggle={toggleAutomation} disabled={busy} />
              )}
              {mode === 'audit' && (
                <AuditView room={room} />
              )}
            </div>
          </section>

          <aside className="hidden 2xl:flex w-[360px] shrink-0 border-l border-zinc-800 bg-zinc-950 flex-col">
            <Inspector room={room} item={selected} shortcuts={shortcuts} onAction={runAction} disabled={busy} />
          </aside>
        </main>
      </div>

      {primaryOpen && (
        <PrimaryModal
          room={room} values={primaryValues} setValues={setPrimaryValues}
          onSubmit={runPrimary} onClose={() => setPrimaryOpen(false)} busy={busy}
        />
      )}
    </div>
  );
}

// ─── Worklist ────────────────────────────────────────────────────────────

function Worklist({
  room, items, selectedId, onSelect, onAction, disabled,
}: {
  room: RoomData; items: WorkItem[]; selectedId?: string;
  onSelect: (id: string) => void; onAction: (action: RoomItemAction, contextId?: string) => void; disabled: boolean;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/70 overflow-hidden">
      <div className="h-10 px-3 border-b border-zinc-800 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-zinc-500" />
        <span className="text-sm font-medium text-zinc-100">{room.title} queue</span>
        <span className="text-2xs font-mono text-zinc-500">{items.length} records</span>
      </div>

      <div className="divide-y divide-zinc-800">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-3 py-3 hover:bg-zinc-900 transition-colors cursor-pointer ${item.id === selectedId ? 'bg-zinc-950' : ''}`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_130px_110px_110px] gap-3 lg:gap-4 items-start">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${toneDotClass(item.priority)}`} />
                  <span className="text-sm font-medium text-zinc-100 truncate">{item.title}</span>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-2xs ${tonePillClass(item.priority)}`}>{item.status}</span>
                </div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">{item.subtitle}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={`${item.id}-${tag}`} className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-2xs text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
                {item.actions.length > 0 && item.id === selectedId && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.actions.map((a) => {
                      const Ic = I(a.icon);
                      return (
                        <button
                          key={a.id}
                          onClick={(e) => { e.stopPropagation(); onAction(a, item.id); }}
                          disabled={disabled}
                          className={`h-8 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 ${tonePillClass(a.tone)}`}
                        >
                          <Ic className="w-3.5 h-3.5" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <MetaCell label="Owner" value={item.owner} />
              <MetaCell label="Source" value={item.source} />
              <MetaCell label={item.value ? 'Value' : 'Due'} value={item.value || item.due} />
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          No records match this search in {room.title}.
        </div>
      )}
    </div>
  );
}

// ─── Approvals ───────────────────────────────────────────────────────────

function Approvals({
  room, items, onSelect, onAction, disabled,
}: {
  room: RoomData; items: WorkItem[]; onSelect: (id: string) => void;
  onAction: (action: RoomItemAction, contextId?: string) => void; disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-zinc-800 bg-zinc-900/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-100 truncate">{item.title}</div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">{item.subtitle}</div>
            </div>
            <span className={`rounded border px-1.5 py-0.5 text-2xs ${tonePillClass(item.priority)}`}>{item.status}</span>
          </div>
          <div className="mt-3 space-y-2">
            {item.checks.map((check, idx) => (
              <div key={`${item.id}-${idx}`} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2">
                <CheckCircle2 className={`w-3.5 h-3.5 ${idx < 2 ? 'text-emerald-400' : 'text-zinc-600'}`} />
                <span className="text-xs text-zinc-300 truncate">{check}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => onSelect(item.id)} className={`h-8 flex-1 min-w-[80px] rounded-md border text-xs font-medium ${tonePillClass(room.tone)}`}>
              Review
            </button>
            {item.actions.slice(0, 2).map((a) => {
              const Ic = I(a.icon);
              return (
                <button
                  key={a.id} onClick={() => onAction(a, item.id)} disabled={disabled}
                  className={`h-8 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 ${tonePillClass(a.tone)}`}
                >
                  <Ic className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              );
            })}
            {item.actions.length > 2 && (
              <button onClick={() => onSelect(item.id)} className="h-8 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="col-span-full text-center text-sm text-zinc-500 py-10">
          No approvals in this view.
        </div>
      )}
    </div>
  );
}

// ─── Automation ──────────────────────────────────────────────────────────

function Automation({
  room, onToggle, disabled,
}: {
  room: RoomData; onToggle: (a: RoomAutomation) => void; disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      {room.automations.map((flow) => {
        const Ic = I(flow.icon);
        return (
          <div key={flow.key} className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${tonePanelClass(flow.tone)}`}>
                <Ic className="w-4 h-4" />
              </div>
              <button
                onClick={() => onToggle(flow)} disabled={disabled}
                className={`h-7 px-2.5 rounded border text-2xs font-medium disabled:opacity-50 ${flow.enabled ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}
              >
                {flow.enabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="mt-4 text-sm font-medium text-zinc-100">{flow.title}</div>
            <div className="mt-2 text-xs leading-5 text-zinc-500">{flow.detail}</div>
            <div className="mt-3 text-2xs text-zinc-600 flex items-center justify-between">
              <span className="font-mono">{flow.key}</span>
              {flow.threshold !== null && <span>threshold · {flow.threshold}</span>}
            </div>
          </div>
        );
      })}
      {room.automations.length === 0 && (
        <div className="col-span-full text-center text-sm text-zinc-500 py-10">
          This room has no configurable automations yet.
        </div>
      )}
    </div>
  );
}

// ─── Audit view (new) ────────────────────────────────────────────────────

function AuditView({ room }: { room: RoomData }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="text-sm font-medium text-zinc-100 mb-3 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-zinc-500" />
        Decisions and audit trail · {room.title}
      </div>
      <div className="space-y-2">
        {room.views.flatMap((v) => v.items).filter((i) => i.kind === 'audit' || i.kind === 'decision' || i.kind === 'access_request' || i.kind === 'meeting').slice(0, 30).map((item) => (
          <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="text-xs text-zinc-100 font-medium">{item.title}</div>
            <div className="mt-0.5 text-2xs text-zinc-500">{item.subtitle}</div>
            <div className="mt-1 text-2xs text-zinc-600 flex items-center gap-2">
              <span>{item.owner}</span> · <span>{item.source}</span> · <span>{item.due}</span>
            </div>
          </div>
        ))}
        {room.views.flatMap((v) => v.items).filter((i) => i.kind === 'audit' || i.kind === 'decision' || i.kind === 'access_request' || i.kind === 'meeting').length === 0 && (
          <div className="text-center text-sm text-zinc-500 py-8">
            No audit-style items in this room yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inspector ───────────────────────────────────────────────────────────

function Inspector({
  room, item, shortcuts, onAction, disabled,
}: {
  room: RoomData; item?: WorkItem; shortcuts: Shortcut[];
  onAction: (action: RoomItemAction, contextId?: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 border-b border-zinc-800">
        <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2">Inspector</div>
        <div className="text-sm font-semibold text-zinc-100">{item?.title ?? room.title}</div>
        {item && <div className="mt-1 text-xs leading-5 text-zinc-500">{item.subtitle}</div>}
        {item && item.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions.map((a) => {
              const Ic = I(a.icon);
              return (
                <button
                  key={a.id} onClick={() => onAction(a, item.id)} disabled={disabled}
                  className={`h-8 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 ${tonePillClass(a.tone)}`}
                >
                  <Ic className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-emerald-400" />
          <div className="text-sm font-medium text-zinc-100">Omnia read</div>
        </div>
        <div className="space-y-2">
          {room.aiBrief.map((line) => (
            <div key={line} className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs leading-5 text-zinc-400">
              {line}
            </div>
          ))}
        </div>
      </section>

      {item && (
        <section className="p-4 border-b border-zinc-800">
          <div className="text-sm font-medium text-zinc-100 mb-3">Checks</div>
          <div className="space-y-2">
            {item.checks.map((check, idx) => (
              <div key={`${item.id}-check-${idx}`} className="flex items-start gap-2 text-xs text-zinc-400">
                <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${idx < 2 ? 'text-emerald-400' : 'text-zinc-600'}`} />
                <span>{check}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="p-4 border-b border-zinc-800">
        <div className="text-sm font-medium text-zinc-100 mb-3">Signals</div>
        <div className="grid grid-cols-1 gap-2">
          {room.sideSignals.map((signal) => (
            <div key={signal.label} className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">{signal.label}</span>
              <span className={`text-xs font-medium ${toneTextClass(signal.tone)}`}>{signal.value}</span>
            </div>
          ))}
        </div>
      </section>

      {item && item.activity.length > 0 && (
        <section className="p-4 border-b border-zinc-800">
          <div className="text-sm font-medium text-zinc-100 mb-3">Activity</div>
          <div className="space-y-3">
            {item.activity.map((entry, idx) => (
              <div key={`${item.id}-act-${idx}`} className="flex gap-2 text-xs leading-5 text-zinc-500">
                <Clock3 className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
                <span>{entry}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {shortcuts.length > 0 && (
        <section className="p-4">
          <div className="text-sm font-medium text-zinc-100 mb-3">Open connected room</div>
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <Link key={`${shortcut.href}-${shortcut.label}-side`} href={shortcut.href} className="block rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-zinc-700">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-zinc-200">{shortcut.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Primary modal ───────────────────────────────────────────────────────

function PrimaryModal({
  room, values, setValues, onSubmit, onClose, busy,
}: {
  room: RoomData; values: Record<string, string>; setValues: (v: Record<string, string>) => void;
  onSubmit: () => void; onClose: () => void; busy: boolean;
}) {
  const Ic = I(room.icon);
  const fields = room.primary.prompt ?? [];
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-md border flex items-center justify-center ${tonePanelClass(room.tone)}`}>
              <Ic className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-semibold text-zinc-100">{room.primary.label}</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {fields.length === 0 && (
            <div className="text-xs text-zinc-400">
              No fields needed. This action will run with the room defaults.
            </div>
          )}
          {fields.map((field) => (
            <div key={field.field}>
              <label className="text-2xs uppercase tracking-wider text-zinc-500">
                {field.label}{field.required && <span className="text-rose-400"> *</span>}
              </label>
              <input
                value={values[field.field] || ''}
                onChange={(e) => setValues({ ...values, [field.field]: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                placeholder={field.label}
              />
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-8 px-3 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-zinc-100">
            Cancel
          </button>
          <button
            onClick={onSubmit} disabled={busy}
            className={`h-8 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 ${tonePillClass(room.tone)}`}
          >
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ───────────────────────────────────────────────────────

function ToolButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="h-10 px-3 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs flex items-center gap-2 hover:border-zinc-700 hover:text-zinc-100">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-2xs uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-1 text-xs text-zinc-300 truncate">{value || '—'}</div>
    </div>
  );
}

function predicateMatches(item: WorkItem, predicate: string): boolean {
  if (!predicate) return true;
  const blob = `${item.title} ${item.subtitle} ${item.status} ${item.tags.join(' ')} ${item.checks.join(' ')}`.toLowerCase();
  // formats: flag:foo|bar | status:foo|bar | source:x | kind:x | payment:cod | store:shopify
  if (predicate.includes(':')) {
    const [key, val] = predicate.split(':');
    const vals = val.split('|');
    if (key === 'kind') return vals.includes(item.kind);
    if (key === 'status') return vals.some((v) => item.status.toLowerCase().includes(v));
    if (key === 'flag') return vals.some((v) => blob.includes(v));
    if (key === 'source') return vals.some((v) => item.source.toLowerCase().includes(v));
    if (key === 'payment') return vals.some((v) => blob.includes(v));
    if (key === 'store') return vals.some((v) => blob.includes(v) || (v === 'shopify' && item.tags.includes('.ae')) || (v === 'woocommerce' && item.tags.includes('.com')));
    if (key === 'skill') return vals.some((v) => item.tags.includes(v));
    if (key === 'audience') return vals.some((v) => blob.includes(v));
    if (key === 'tone') return vals.some((v) => blob.includes(v));
    if (key === 'role') return vals.some((v) => blob.includes(v));
    if (key === 'window') return vals.includes('today') ? /today|now|\d+h/i.test(item.due) : true;
    if (key === 'sensitive') return vals.some((v) => blob.includes(v));
    if (key === 'priority') return vals.some((v) => (item.priority === 'rose' && v === 'high') || (item.priority === 'amber' && v === 'med') || (item.priority === 'sky' && v === 'low'));
    if (key === 'visibility') return vals.some((v) => blob.includes(v));
    if (key === 'customer') return vals.some((v) => blob.includes(v));
    if (key === 'owner') return vals.some((v) => item.owner.toLowerCase().includes(v.toLowerCase()));
    return blob.includes(val);
  }
  if (predicate === 'vip') return item.tags.map((t) => t.toLowerCase()).includes('vip') || item.status === 'VIP';
  if (predicate === 'no_consent') return blob.includes('opt-out');
  if (predicate === 'wallet') return blob.includes('wallet');
  if (predicate === 'followup_due') return /due|today|now|\dh/i.test(item.due);
  if (predicate === 'mine') return item.owner.toLowerCase().includes('mahmoud') || item.owner.toLowerCase().includes('ez');
  if (predicate === 'open') return /open|pending|review|verify|watch|ask/i.test(item.status);
  if (predicate === 'manager') return /manager|owner|escalate/i.test(blob);
  if (predicate === 'archived') return /closed|delivered|fulfilled|resolved/i.test(item.status);
  if (predicate === 'orders_count>0') return /returning|repeat/i.test(blob);
  if (predicate === 'finance_flags') return /risk|finance|hold|proof/i.test(blob);
  if (predicate === 'le_only') return /\ble\b/i.test(blob);
  if (predicate === 'portal_sent') return /portal/i.test(blob);
  if (predicate === 'no_source') return /missing|restricted/i.test(item.status) || item.priority === 'rose';
  if (predicate === 'transcript') return /drive|transcript/i.test(blob);
  if (predicate.startsWith('load>=')) return /heavy|watch/i.test(item.status);
  if (predicate === 'pinned') return false;
  if (predicate === 'gcc') return /dubai|abu dhabi|sharjah|riyadh|jeddah|doha|kuwait/i.test(blob);
  return blob.includes(predicate);
}

function exportJson(room: RoomData, viewId: string, items: WorkItem[]) {
  const blob = new Blob([JSON.stringify({ room: room.title, view: viewId, items }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${room.title.toLowerCase().replace(/\s+/g, '-')}-${viewId}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toneTextClass(tone: Tone) {
  if (tone === 'emerald') return 'text-emerald-400';
  if (tone === 'amber') return 'text-amber-400';
  if (tone === 'rose') return 'text-rose-400';
  if (tone === 'sky') return 'text-sky-400';
  if (tone === 'violet') return 'text-violet-400';
  return 'text-zinc-400';
}

function toneDotClass(tone: Tone) {
  if (tone === 'emerald') return 'bg-emerald-400';
  if (tone === 'amber') return 'bg-amber-400';
  if (tone === 'rose') return 'bg-rose-400';
  if (tone === 'sky') return 'bg-sky-400';
  if (tone === 'violet') return 'bg-violet-400';
  return 'bg-zinc-500';
}

function tonePillClass(tone: Tone) {
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  if (tone === 'sky') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  if (tone === 'violet') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  return 'border-zinc-700 bg-zinc-800 text-zinc-300';
}

function tonePanelClass(tone: Tone) {
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  if (tone === 'sky') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  if (tone === 'violet') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  return 'border-zinc-700 bg-zinc-900 text-zinc-300';
}
