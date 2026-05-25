'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StickyNote, X, Sparkles, Send, Check, Loader2, ChevronDown, Users } from 'lucide-react';

// Mirrors the Note shape on the server (lib/operations/store.ts).
type Note = {
  id: string;
  from_id: string; from_name: string;
  to_member_ids: string[]; to_role: string | null;
  audience: 'individual' | 'role' | 'all';
  audience_label: string;
  body: string;
  kind: 'human' | 'ai_to_role' | 'ai_personal' | 'system';
  priority: 'low' | 'normal' | 'high';
  tags: string[];
  created_at: string;
  read_by: string[]; acknowledged_by: string[];
  reply_to: string | null;
  source: string;
};

const TEAM: { id: string; name: string; role: string }[] = [
  { id: 'tm_0', name: 'Mahmoud', role: 'owner' },
  { id: 'tm_1', name: 'Ez', role: 'admin' },
  { id: 'tm_2', name: 'Abdelrahman', role: 'whatsapp_manager' },
  { id: 'tm_3', name: 'Arslan', role: 'whatsapp_agent' },
  { id: 'tm_4', name: 'Abdallah', role: 'whatsapp_agent' },
  { id: 'tm_5', name: 'Ahmed', role: 'marketing' },
  { id: 'tm_6', name: 'Mohamed', role: 'whatsapp_agent' },
];

const ROLES = ['owner', 'admin', 'whatsapp_manager', 'whatsapp_agent', 'marketing', 'strategy', 'finance', 'shipping', 'inventory'];

// The current viewer — in production resolves from the session.
// Reads ?as=tm_X from the URL on first mount so the team can preview each
// inbox during the demo. Defaults to Mahmoud (owner).
function useCurrentMember() {
  const [memberId, setMemberId] = useState('tm_0');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromQuery = new URLSearchParams(window.location.search).get('as');
    const fromStorage = window.localStorage.getItem('omnia:viewer');
    const id = fromQuery || fromStorage || 'tm_0';
    setMemberId(id);
    window.localStorage.setItem('omnia:viewer', id);
  }, []);
  return [memberId, setMemberId] as const;
}

export function NotesButton() {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useCurrentMember();
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'sent' | 'ai'>('inbox');
  const [generating, setGenerating] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const me = TEAM.find((m) => m.id === memberId) || TEAM[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes?for=${memberId}`);
      const json = await res.json();
      if (json.ok) {
        setNotes(json.notes || []);
        setUnread(json.unread || 0);
      }
    } finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [open, load]);

  async function markRead(noteId: string) {
    await fetch(`/api/notes/${noteId}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: memberId }) });
    await load();
  }

  async function acknowledge(noteId: string) {
    await fetch(`/api/notes/${noteId}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: memberId }) });
    await load();
  }

  async function generateAI() {
    setGenerating(true);
    try {
      await fetch('/api/notes/generate', { method: 'POST' });
      await load();
      setTab('inbox');
    } finally { setGenerating(false); }
  }

  const filteredNotes = useMemo(() => {
    if (tab === 'inbox') return notes.filter((n) => n.from_id !== memberId);
    if (tab === 'sent') return notes.filter((n) => n.from_id === memberId);
    return notes.filter((n) => n.kind === 'ai_to_role' || n.kind === 'ai_personal');
  }, [notes, tab, memberId]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center relative"
        title="Notes"
      >
        <StickyNote className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-zinc-900 text-2xs font-medium flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(false)}>
          <div className="flex-1 bg-zinc-950/60" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[440px] h-full bg-zinc-950 border-l border-zinc-800 flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-zinc-100">Notes</span>
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="h-7 px-1.5 rounded border border-zinc-800 bg-zinc-950 text-2xs text-zinc-300"
                  title="Acting as"
                >
                  {TEAM.map((m) => <option key={m.id} value={m.id}>as {m.name}</option>)}
                </select>
                <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-3 py-2 border-b border-zinc-800 flex items-center gap-1">
              {(['inbox', 'sent', 'ai'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`h-7 px-2.5 rounded text-2xs uppercase tracking-wider ${
                    tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-100'
                  }`}
                >
                  {t === 'ai' ? 'AI digest' : t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={generateAI} disabled={generating}
                  className="h-7 px-2 rounded border border-violet-500/30 bg-violet-500/10 text-2xs text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 flex items-center gap-1"
                  title="Omnia AI writes notes for the right roles based on live state"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Omnia digest
                </button>
                <button
                  onClick={() => setComposeOpen(true)}
                  className="h-7 px-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-2xs text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" /> New
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading && filteredNotes.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500"><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" /> Loading…</div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-10 text-center text-xs text-zinc-500">
                  {tab === 'inbox' ? 'No notes for you right now.' : tab === 'sent' ? 'You haven’t sent any notes yet.' : 'Tap "Omnia digest" to have AI write notes for the team.'}
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {filteredNotes.map((n) => (
                    <NoteRow
                      key={n.id} note={n} memberId={memberId}
                      onRead={() => markRead(n.id)}
                      onAcknowledge={() => acknowledge(n.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {composeOpen && (
              <ComposeBlock
                me={me}
                onClose={() => setComposeOpen(false)}
                onSent={() => { setComposeOpen(false); load(); setTab('sent'); }}
              />
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function NoteRow({ note, memberId, onRead, onAcknowledge }: { note: Note; memberId: string; onRead: () => void; onAcknowledge: () => void }) {
  const unread = !note.read_by.includes(memberId) && note.from_id !== memberId;
  const ack = note.acknowledged_by.includes(memberId);
  const created = new Date(note.created_at);
  const ago = relativeTime(created);
  return (
    <li className={`px-4 py-3 ${unread ? 'bg-zinc-900' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {note.kind === 'ai_to_role' || note.kind === 'ai_personal' ? (
            <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
          ) : (
            <Users className="w-3 h-3 text-zinc-500 shrink-0" />
          )}
          <span className="text-xs text-zinc-200 font-medium truncate">{note.from_name}</span>
          <span className="text-2xs text-zinc-500 truncate">→ {note.audience_label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {note.priority === 'high' && <span className="text-2xs px-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">high</span>}
          {unread && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          <span className="text-2xs text-zinc-500">{ago}</span>
        </div>
      </div>
      <div className="text-sm text-zinc-200 leading-relaxed">{note.body}</div>
      {note.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {note.tags.map((t) => <span key={t} className="text-2xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">#{t}</span>)}
        </div>
      )}
      {unread && (
        <div className="mt-2 flex items-center gap-2">
          <button onClick={onRead} className="h-6 px-2 rounded border border-zinc-700 text-2xs text-zinc-300 hover:bg-zinc-800">Mark read</button>
          <button onClick={onAcknowledge} className="h-6 px-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-2xs text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1">
            <Check className="w-3 h-3" /> Got it
          </button>
        </div>
      )}
      {ack && !unread && (
        <div className="mt-1.5 text-2xs text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> Acknowledged
        </div>
      )}
    </li>
  );
}

function ComposeBlock({ me, onClose, onSent }: { me: { id: string; name: string }; onClose: () => void; onSent: () => void }) {
  const [audience, setAudience] = useState<'individual' | 'role' | 'all'>('individual');
  const [toMembers, setToMembers] = useState<string[]>([]);
  const [toRole, setToRole] = useState('whatsapp_agent');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [sending, setSending] = useState(false);

  function toggleMember(id: string) {
    setToMembers((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function send() {
    if (!body.trim() || sending) return;
    if (audience === 'individual' && toMembers.length === 0) return;
    setSending(true);
    try {
      await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_id: me.id, body, audience, priority,
          to_member_ids: audience === 'individual' ? toMembers : [],
          to_role: audience === 'role' ? toRole : null,
        }),
      });
      onSent();
    } finally { setSending(false); }
  }

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-2xs uppercase tracking-wider text-zinc-500">New note · from {me.name}</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-1">
        {(['individual', 'role', 'all'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAudience(a)}
            className={`h-7 px-2 rounded text-2xs uppercase tracking-wider ${audience === a ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-200 border border-zinc-800'}`}
          >
            {a === 'individual' ? 'To people' : a === 'role' ? 'To role' : 'To everyone'}
          </button>
        ))}
      </div>
      {audience === 'individual' && (
        <div className="flex flex-wrap gap-1">
          {TEAM.filter((m) => m.id !== me.id).map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMember(m.id)}
              className={`h-6 px-2 rounded text-2xs ${toMembers.includes(m.id) ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
      {audience === 'role' && (
        <select value={toRole} onChange={(e) => setToRole(e.target.value)} className="w-full h-8 px-2 rounded border border-zinc-700 bg-zinc-950 text-xs text-zinc-200">
          {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      )}
      <textarea
        value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Write a note…"
        rows={3}
        className="w-full px-2.5 py-2 rounded border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 outline-none focus:border-zinc-600 resize-none"
      />
      <div className="flex items-center justify-between">
        <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="h-7 px-2 rounded border border-zinc-700 bg-zinc-950 text-2xs text-zinc-300">
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="high">high</option>
        </select>
        <button
          onClick={send} disabled={sending || !body.trim() || (audience === 'individual' && toMembers.length === 0)}
          className="h-8 px-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send
        </button>
      </div>
    </div>
  );
}

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
