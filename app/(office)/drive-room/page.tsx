'use client';

import { useMemo, useState } from 'react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import {
  getDriveFiles,
  getRoomWorkflows,
  corridorLabel,
  formatBytes,
} from '@/lib/drive/mock';
import type { DriveFile, RoomWorkflow } from '@/lib/drive/types';
import {
  FileText,
  HardDrive,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Lock,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  Upload,
  X,
} from 'lucide-react';

/**
 * Drive Room (The Safe + The Corridors).
 *
 * Left rail — visibility filter (all / role / private)
 * Centre   — file grid with extraction state, corridor chip, AI summary
 * Right    — Corridor feed: pending workflow handoffs from this room to
 *            another. Each card has accept / dismiss.
 *
 * Routing: DRIVE_INTELLIGENCE_PROMPT (POST /api/drive/intelligence) reads
 * the file and returns suggested_corridor + extracted items + a draft
 * email. The Corridor feed shows the resulting room_workflows row.
 */
export default function DriveRoomPage() {
  const allFiles = useMemo(() => getDriveFiles(), []);
  const allWorkflows = useMemo(() => getRoomWorkflows(), []);
  const [visibility, setVisibility] = useState<'all' | 'role' | 'private' | 'every'>('every');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const files = useMemo(
    () => (visibility === 'every' ? allFiles : allFiles.filter((f) => f.visibility === visibility)),
    [allFiles, visibility],
  );

  const counts = {
    every: allFiles.length,
    all: allFiles.filter((f) => f.visibility === 'all').length,
    role: allFiles.filter((f) => f.visibility === 'role').length,
    private: allFiles.filter((f) => f.visibility === 'private').length,
  };

  const active = activeId ? allFiles.find((f) => f.id === activeId) : null;
  const pendingWorkflows = allWorkflows.filter((w) => w.status === 'pending');

  async function runIntelligence(file: DriveFile) {
    setBusyId(file.id);
    try {
      await fetch('/api/drive/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.mime_type,
          context: file.metadata.extracted_summary ?? null,
        }),
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 flex">
        {/* Left rail — visibility filter */}
        <VisibilityRail
          counts={counts}
          active={visibility}
          onSelect={setVisibility}
          pendingCount={pendingWorkflows.length}
        />

        {/* Center — file grid */}
        <main className="flex-1 min-w-0 flex flex-col border-r border-zinc-800">
          <SafeHeader count={files.length} />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {files.map((f) => (
                <FileTile
                  key={f.id}
                  file={f}
                  onOpen={() => setActiveId(f.id)}
                  onScan={() => runIntelligence(f)}
                  scanning={busyId === f.id}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Right — Corridor feed */}
        <CorridorFeed workflows={allWorkflows} />
      </div>

      {/* Drawer */}
      {active && <FileDrawer file={active} onClose={() => setActiveId(null)} />}
    </div>
  );
}

// ─── Visibility rail ───────────────────────────────────────────────────────

function VisibilityRail({
  counts, active, onSelect, pendingCount,
}: {
  counts: { every: number; all: number; role: number; private: number };
  active: 'every' | 'all' | 'role' | 'private';
  onSelect: (v: 'every' | 'all' | 'role' | 'private') => void;
  pendingCount: number;
}) {
  const items: { id: typeof active; label: string; icon: any; count: number; hint: string }[] = [
    { id: 'every',   label: 'Everything', icon: HardDrive, count: counts.every,   hint: 'All files you can see.' },
    { id: 'all',     label: 'All hands',  icon: Users,     count: counts.all,     hint: 'Visible to the whole team.' },
    { id: 'role',    label: 'Role only',  icon: Lock,      count: counts.role,    hint: 'Visible to a specific role.' },
    { id: 'private', label: 'Private',    icon: Eye,       count: counts.private, hint: 'Visible only to the uploader.' },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-0.5">The Safe</div>
        <div className="text-sm font-medium text-zinc-100">Drive Room</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-4 pb-1 text-2xs uppercase tracking-wider text-zinc-500">Visibility</div>
        <ul>
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <li key={it.id}>
                <button
                  onClick={() => onSelect(it.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 border-l-2 border-emerald-500 -ml-px pl-[15px]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className="flex-1 text-left">{it.label}</span>
                  {it.count > 0 && (
                    <span className="text-2xs font-mono text-zinc-500">{it.count}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-zinc-800 px-4 py-3 bg-zinc-900/80">
        <div className="flex items-center gap-2 text-2xs uppercase tracking-wider text-emerald-300 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Corridors
        </div>
        <div className="text-xs text-zinc-400 leading-snug">
          {pendingCount} pending handoff{pendingCount === 1 ? '' : 's'} from this room.
        </div>
      </div>
    </aside>
  );
}

// ─── Safe header ───────────────────────────────────────────────────────────

function SafeHeader({ count }: { count: number }) {
  return (
    <div className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 flex items-center gap-3">
      <HardDrive className="w-4 h-4 text-zinc-500" />
      <span className="text-sm text-zinc-100">The Safe</span>
      <span className="text-2xs font-mono text-zinc-500 numeric">{count} file{count === 1 ? '' : 's'}</span>
      <div className="ml-auto flex items-center gap-2">
        <button className="h-7 px-2.5 flex items-center gap-1.5 rounded border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800">
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>
    </div>
  );
}

// ─── File tile ─────────────────────────────────────────────────────────────

function FileTile({
  file, onOpen, onScan, scanning,
}: {
  file: DriveFile;
  onOpen: () => void;
  onScan: () => void;
  scanning: boolean;
}) {
  const Icon = iconForMime(file.mime_type);
  const status = file.metadata.extraction_status ?? 'pending';

  const corridor = file.metadata.suggested_corridor;
  const visibilityTone =
    file.visibility === 'all' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
    file.visibility === 'role' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
    'bg-zinc-800 text-zinc-400 border-zinc-700';

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-2.5 mb-2">
        <Icon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="text-sm font-medium text-zinc-100 truncate text-left hover:text-emerald-300 transition-colors block w-full">
            {file.name}
          </button>
          <div className="text-2xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
            <span>{formatBytes(file.size_bytes ?? 0)}</span>
            <span>·</span>
            <span className="numeric">{file.created_at.slice(5, 10)}</span>
          </div>
        </div>
      </div>

      {file.metadata.extracted_summary && (
        <p className="text-xs text-zinc-400 leading-snug line-clamp-2 mb-2">
          {file.metadata.extracted_summary}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-2xs px-1.5 py-0.5 rounded border ${visibilityTone}`}>
          {file.visibility}
        </span>
        {corridor && corridor !== 'none' && (
          <span className="text-2xs px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-300 bg-zinc-800">
            → {corridorLabel(corridor)}
          </span>
        )}
        {status === 'pending' ? (
          <button
            onClick={onScan}
            disabled={scanning}
            className="ml-auto text-2xs px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/[0.06] hover:bg-emerald-500/10 disabled:opacity-50 flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            {scanning ? 'Scanning…' : 'Scan'}
          </button>
        ) : (
          <span className="ml-auto text-2xs text-zinc-500 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            Processed
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Corridor feed ─────────────────────────────────────────────────────────

function CorridorFeed({ workflows }: { workflows: RoomWorkflow[] }) {
  return (
    <aside className="w-80 shrink-0 bg-zinc-900 flex flex-col">
      <div className="h-12 shrink-0 border-b border-zinc-800 px-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-zinc-100">Corridors</span>
        <span className="text-2xs font-mono text-zinc-500 numeric">{workflows.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {workflows.map((w) => (
          <CorridorCard key={w.id} workflow={w} />
        ))}
        {workflows.length === 0 && (
          <div className="text-xs text-zinc-500 px-2 py-4 text-center">No corridor activity.</div>
        )}
      </div>
    </aside>
  );
}

function CorridorCard({ workflow }: { workflow: RoomWorkflow }) {
  const isPending = workflow.status === 'pending';
  return (
    <div className={`rounded-md border p-3 ${
      isPending ? 'border-emerald-500/30 bg-emerald-500/[0.04]' :
      workflow.status === 'failed' ? 'border-rose-500/30 bg-rose-500/[0.04]' :
      'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex items-center gap-2 mb-1.5 text-2xs uppercase tracking-wider">
        <span className={`numeric ${isPending ? 'text-emerald-300' : 'text-zinc-500'}`}>
          {workflow.created_at.slice(11, 16) || workflow.created_at.slice(5, 10)}
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">{actionLabel(workflow.trigger_action)}</span>
        {isPending ? (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Pending
          </span>
        ) : (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            {workflow.status}
          </span>
        )}
      </div>
      <div className="text-sm text-zinc-100 mb-1 flex items-center gap-1.5">
        <span className="text-zinc-500">→</span>
        <span>{corridorLabel(workflow.target_room_slug)}</span>
      </div>
      {workflow.payload.summary && (
        <p className="text-xs text-zinc-400 leading-snug">{workflow.payload.summary}</p>
      )}
      {isPending && (
        <div className="flex items-center gap-1.5 mt-2">
          <button className="flex-1 h-7 px-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-2xs hover:bg-emerald-500/20">
            Accept
          </button>
          <button className="flex-1 h-7 px-2 rounded border border-zinc-700 text-zinc-400 text-2xs hover:bg-zinc-800">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ─── File drawer ───────────────────────────────────────────────────────────

function FileDrawer({ file, onClose }: { file: DriveFile; onClose: () => void }) {
  const Icon = iconForMime(file.mime_type);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 shrink-0 border-b border-zinc-800 px-4 flex items-center gap-3">
          <Icon className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-100 truncate flex-1">{file.name}</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Section title="Properties">
            <Row label="Size" value={formatBytes(file.size_bytes ?? 0)} />
            <Row label="Type" value={file.mime_type || 'unknown'} />
            <Row label="Visibility" value={file.visibility} />
            <Row label="Drive ID" value={<span className="font-mono text-2xs text-zinc-400">{file.drive_id}</span>} />
            <Row label="Uploaded" value={file.created_at} />
            {file.metadata.last_scanned_at && (
              <Row label="Last scan" value={file.metadata.last_scanned_at} />
            )}
          </Section>

          {file.metadata.extracted_summary && (
            <Section title="AI summary">
              <p className="text-sm text-zinc-300 leading-relaxed">{file.metadata.extracted_summary}</p>
            </Section>
          )}

          {file.metadata.suggested_corridor && file.metadata.suggested_corridor !== 'none' && (
            <Section title="Routed to">
              <button className="w-full flex items-center justify-between px-3 py-2 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-100">
                <span>{corridorLabel(file.metadata.suggested_corridor)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1.5">{title}</div>
      <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-3 py-2 flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-100 text-right truncate ml-3">{value}</span>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function iconForMime(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.includes('image')) return ImageIcon;
  if (mime.includes('spreadsheet') || mime.includes('csv') || mime.includes('excel')) return FileSpreadsheet;
  if (mime.includes('text/') || mime.includes('markdown') || mime.includes('json')) return FileCode;
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('document')) return FileText;
  return FileIcon;
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    file_uploaded: 'File uploaded',
    invoice_extracted: 'Invoice extracted',
    price_drift_detected: 'Drift detected',
    creative_brief_ready: 'Brief ready',
    campaign_ready: 'Campaign ready',
    sentiment_alert: 'Sentiment alert',
  };
  return labels[action] || action;
}
