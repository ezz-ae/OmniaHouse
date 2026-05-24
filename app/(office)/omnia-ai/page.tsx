'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  getAgents, getAgent, getMessagesForAgent, getTasksForAgent,
  getMemoryForAgent, getNotesForAgent, getInboxForAgent, getFilesForAgent,
  getStalledTasks, mockAgentReply,
} from '@/lib/agents/mock';
import type { Agent, AgentMessage, AgentTask, AgentMemory, AgentNote, AgentFile } from '@/lib/agents/types';
import {
  Sparkles, ListTodo, Brain, MailOpen, FileText,
  Send, Loader2, AlertTriangle, Pin, ArrowRight,
} from 'lucide-react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';

/**
 * Omnia AI Room.
 *
 * Two ways to use this room:
 *   1. Talk to Omnia AI — the assistant that reads across every room.
 *      Ask "what is stuck?" or "who closed orders today?" — it answers.
 *   2. Talk to a teammate's assistant — leave a note, hand off a task,
 *      check what they are working on without interrupting them.
 *
 * Not WhatsApp. Each conversation is framed with: who you are talking to,
 * what they do, and a short transcript that names the speaker on every
 * line. The right panel holds the visible work — tasks, memory, notes,
 * files — for whoever is on screen.
 */
export default function OmniaAIPage() {
  const agents = useMemo(() => getAgents(), []);
  const [activeId, setActiveId] = useState<string>('agent_omnia');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [extra, setExtra] = useState<Record<string, AgentMessage[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const me = useMemo(() => getAgent('agent_mahmoud') || agents[1], [agents]);
  const active = agents.find((a) => a.id === activeId) || agents[0];

  const base = useMemo(() => getMessagesForAgent(active.id), [active.id]);
  const messages = useMemo(() => [...base, ...(extra[active.id] || [])], [base, extra, active.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, active.id]);

  async function send() {
    if (!draft.trim() || sending) return;
    const userMsg: AgentMessage = {
      id: `u_${Date.now()}`,
      agent_id: active.id,
      from: 'user',
      body: draft,
      at: new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    setExtra((p) => ({ ...p, [active.id]: [...(p[active.id] || []), userMsg] }));
    const text = draft;
    setDraft('');
    setSending(true);
    await new Promise((r) => setTimeout(r, 500));
    const reply = mockAgentReply(active, text);
    setExtra((p) => ({ ...p, [active.id]: [...(p[active.id] || []), reply] }));
    setSending(false);
  }

  const tasks = useMemo(() => getTasksForAgent(active.id), [active.id]);
  const memory = useMemo(() => getMemoryForAgent(active.id), [active.id]);
  const notes = useMemo(() => getNotesForAgent(active.id), [active.id]);
  const inbox = useMemo(() => getInboxForAgent(active.id).filter((n) => !n.read), [active.id]);
  const files = useMemo(() => getFilesForAgent(active.id), [active.id]);
  const stalled = useMemo(() => getStalledTasks(), []);

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 flex">
        <AgentsRail
          agents={agents}
          activeId={activeId}
          onSelect={setActiveId}
          stalledCount={stalled.length}
          inboxCounts={Object.fromEntries(agents.map((a) => [a.id, getInboxForAgent(a.id).filter((n) => !n.read).length]))}
        />

        <main className="flex-1 min-w-0 flex flex-col border-r border-zinc-800">
          <ConversationHeader me={me} other={active} />

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-zinc-900">
            <div className="min-h-full flex flex-col justify-end px-6 py-5">
              <div className="max-w-[780px] mx-auto w-full">
                {messages.length === 0 ? (
                  <EmptyConversation me={me} other={active} />
                ) : (
                  <ul className="divide-y divide-zinc-800/60 border-y border-zinc-800/60">
                    {messages.map((m) => (
                      <ConversationLine key={m.id} m={m} me={me} other={active} />
                    ))}
                  </ul>
                )}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-3 px-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    {active.short_name} is replying…
                  </div>
                )}
              </div>
            </div>
          </div>

          <Compose
            me={me}
            other={active}
            draft={draft}
            setDraft={setDraft}
            onSend={send}
            sending={sending}
          />
        </main>

        <ContextPanel
          agent={active}
          tasks={tasks}
          memory={memory}
          notes={notes}
          inboxCount={inbox.length}
          files={files}
        />
      </div>
    </div>
  );
}

// ─── Agents rail ───────────────────────────────────────────────────────────

function AgentsRail({
  agents, activeId, onSelect, stalledCount, inboxCounts,
}: {
  agents: Agent[]; activeId: string; onSelect: (id: string) => void;
  stalledCount: number; inboxCounts: Record<string, number>;
}) {
  const omnia = agents.find((a) => a.kind === 'omnia')!;
  const me = agents.find((a) => a.id === 'agent_mahmoud');
  const others = agents.filter((a) => a.kind === 'member' && a.id !== 'agent_mahmoud');

  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-0.5">Omnia AI Room</div>
        <div className="text-sm font-medium text-zinc-100">Who would you like to talk to?</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {/* Omnia */}
        <div className="px-2 mb-3">
          <button
            onClick={() => onSelect(omnia.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors ${
              activeId === omnia.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-900 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-zinc-100 font-medium truncate">Omnia AI</div>
              <div className="text-2xs text-zinc-500 truncate">Reads every room</div>
            </div>
            {stalledCount > 0 && (
              <span className="text-2xs px-1.5 h-4 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 numeric flex items-center" title="things that need a decision">
                {stalledCount}
              </span>
            )}
          </button>
        </div>

        {/* Me */}
        {me && (
          <div className="px-2 mb-3">
            <div className="px-2 pb-1 text-2xs uppercase tracking-wider text-zinc-500">My assistant</div>
            <AgentButton agent={me} active={activeId === me.id} unread={0} onClick={() => onSelect(me.id)} />
          </div>
        )}

        {/* Team */}
        <div className="px-2 pb-1 text-2xs uppercase tracking-wider text-zinc-500">Team assistants</div>
        <ul className="px-2 space-y-0.5">
          {others.map((a) => (
            <li key={a.id}>
              <AgentButton
                agent={a}
                active={activeId === a.id}
                unread={inboxCounts[a.id] || 0}
                onClick={() => onSelect(a.id)}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-zinc-800 px-4 py-3 bg-zinc-900/80">
        <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">How this works</div>
        <p className="text-xs text-zinc-400 leading-snug">
          Talk to Omnia AI to ask anything across the rooms. Talk to a person&apos;s assistant
          to leave them a note, hand off a task, or check what they&apos;re on.
        </p>
      </div>
    </aside>
  );
}

function AgentButton({
  agent, active, unread, onClick,
}: { agent: Agent; active: boolean; unread: number; onClick: () => void }) {
  const initials = agent.short_name.slice(0, 1).toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
        active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-medium text-zinc-900 shrink-0" style={{ background: agent.avatar_color }}>
        {initials}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-zinc-100 truncate">{agent.short_name}</div>
        <div className="text-2xs text-zinc-500 truncate">{agent.status}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${agent.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
        {unread > 0 && (
          <span className="text-2xs px-1 h-3.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 numeric flex items-center">
            {unread}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Conversation header (the "who am I talking to" panel) ────────────────

function ConversationHeader({ me, other }: { me?: Agent; other: Agent }) {
  const isOmnia = other.kind === 'omnia';
  const otherInitial = other.short_name.slice(0, 1).toUpperCase();
  const meInitial = (me?.short_name || 'M').slice(0, 1).toUpperCase();
  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-5 py-3">
      <div className="max-w-[780px] mx-auto flex items-center gap-3">
        {/* Me */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-medium text-zinc-900" style={{ background: me?.avatar_color || '#C68A4E' }}>
            {meInitial}
          </div>
          <span className="text-xs text-zinc-400">{me?.short_name || 'You'}</span>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

        {/* Other */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-zinc-900 shrink-0" style={{ background: isOmnia ? undefined : other.avatar_color, backgroundImage: isOmnia ? 'linear-gradient(135deg, #34d399, #059669)' : undefined }}>
            {isOmnia ? <Sparkles className="w-3.5 h-3.5" /> : otherInitial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-zinc-100 truncate">
                {isOmnia ? 'Omnia AI' : `${other.short_name}'s assistant`}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${other.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            </div>
            <div className="text-2xs text-zinc-500 truncate">
              {other.skills.slice(0, 3).join(' · ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation line (clear sender on every line, not WhatsApp bubbles) ─

function ConversationLine({ m, me, other }: { m: AgentMessage; me?: Agent; other: Agent }) {
  const isUser = m.from === 'user';
  const speakerName = isUser ? (me?.short_name || 'You') : (other.kind === 'omnia' ? 'Omnia AI' : `${other.short_name}'s assistant`);
  const speakerColor = isUser ? (me?.avatar_color || '#C68A4E') : other.avatar_color;
  const initial = speakerName.slice(0, 1).toUpperCase();
  const isOmnia = !isUser && other.kind === 'omnia';

  return (
    <li className="py-3 flex gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-medium text-zinc-900 shrink-0" style={{ background: isOmnia ? undefined : speakerColor, backgroundImage: isOmnia ? 'linear-gradient(135deg, #34d399, #059669)' : undefined }}>
        {isOmnia ? <Sparkles className="w-3 h-3" /> : initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={`text-xs font-medium ${isUser ? 'text-amber-300' : isOmnia ? 'text-emerald-300' : 'text-zinc-100'}`}>
            {speakerName}
          </span>
          <span className="text-2xs text-zinc-600 numeric">{m.at}</span>
        </div>
        <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{m.body}</div>
        {m.artifact && <ArtifactCard a={m.artifact} />}
      </div>
    </li>
  );
}

function ArtifactCard({ a }: { a: NonNullable<AgentMessage['artifact']> }) {
  if (a.kind === 'task_routed') {
    const assignee = getAgent(a.task.assignee_agent_id);
    return (
      <div className="mt-2 px-3 py-2 rounded border border-emerald-500/30 bg-emerald-500/[0.04] max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs uppercase tracking-wider text-emerald-300">Task handed off</span>
        </div>
        <div className="text-sm text-zinc-100 font-medium">{a.task.title}</div>
        <div className="text-xs text-zinc-400 mt-1">
          → {assignee?.short_name || a.task.assignee_agent_id} · {a.task.priority}
          {a.task.deadline && ` · due ${a.task.deadline}`}
        </div>
        {a.task.ai_reasoning && <div className="text-2xs text-zinc-500 mt-1.5 italic">{a.task.ai_reasoning}</div>}
      </div>
    );
  }
  if (a.kind === 'memory_saved') {
    return (
      <div className="mt-2 px-3 py-2 rounded border border-blue-500/30 bg-blue-500/[0.04] max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs uppercase tracking-wider text-blue-300">Saved to memory</span>
        </div>
        <div className="text-sm text-zinc-100">{a.memory.content}</div>
        <div className="text-2xs text-zinc-500 mt-1 font-mono">{a.memory.memory_key}</div>
      </div>
    );
  }
  if (a.kind === 'note_sent') {
    return (
      <div className="mt-2 px-3 py-2 rounded border border-amber-500/30 bg-amber-500/[0.04] max-w-md">
        <div className="text-xs uppercase tracking-wider text-amber-300 mb-1">Note left</div>
        <div className="text-sm text-zinc-300">{a.note.body}</div>
      </div>
    );
  }
  if (a.kind === 'stalled_warning') {
    return (
      <div className="mt-2 px-3 py-2 rounded border border-rose-500/30 bg-rose-500/[0.04] max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs uppercase tracking-wider text-rose-300">Needs a decision</span>
        </div>
        <div className="text-sm text-zinc-100">{a.suggestion}</div>
      </div>
    );
  }
  return null;
}

function EmptyConversation({ me, other }: { me?: Agent; other: Agent }) {
  const isOmnia = other.kind === 'omnia';
  return (
    <div className="py-12 text-center">
      <div className="inline-block p-3 rounded-full bg-zinc-800 mb-3">
        <Sparkles className="w-5 h-5 text-zinc-500" />
      </div>
      <h3 className="text-base font-medium text-zinc-100 mb-1">
        {isOmnia ? 'Ask Omnia AI anything' : `Leave a note for ${other.short_name}`}
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm mx-auto">
        {isOmnia
          ? 'Status across rooms, a refund decision, the next campaign — whatever needs an answer.'
          : `${other.short_name}'s assistant holds their open tasks, recent notes, and shared files. Leave a message; ${other.short_name} sees it when they sign in.`}
      </p>
    </div>
  );
}

// ─── Compose ───────────────────────────────────────────────────────────────

function Compose({ me, other, draft, setDraft, onSend, sending }: {
  me?: Agent; other: Agent;
  draft: string; setDraft: (s: string) => void; onSend: () => void; sending: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [draft]);

  const placeholder = other.kind === 'omnia'
    ? 'Ask Omnia AI — "what is stuck?", "who closed most today?"…'
    : `Write to ${other.short_name}'s assistant…`;

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
      <div className="max-w-[780px] mx-auto">
        <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1.5">
          <span style={{ color: me?.avatar_color }}>{me?.short_name || 'You'}</span>
          <span className="text-zinc-700"> → </span>
          <span className="text-emerald-300">{other.kind === 'omnia' ? 'Omnia AI' : `${other.short_name}'s assistant`}</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend(); } }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none min-h-[40px] max-h-[160px] px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
          />
          <button
            onClick={onSend}
            disabled={!draft.trim() || sending}
            className={`h-10 px-4 shrink-0 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
              draft.trim() && !sending ? 'bg-emerald-500 text-zinc-900 hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Context panel (work for the active person) ────────────────────────────

type Tab = 'tasks' | 'memory' | 'notes' | 'files';

function ContextPanel({
  agent, tasks, memory, notes, inboxCount, files,
}: {
  agent: Agent;
  tasks: AgentTask[]; memory: AgentMemory[]; notes: AgentNote[]; inboxCount: number; files: AgentFile[];
}) {
  const [tab, setTab] = useState<Tab>('tasks');
  const isOmnia = agent.kind === 'omnia';

  return (
    <aside className="w-80 shrink-0 bg-zinc-900 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-0.5">Work in view</div>
        <div className="text-sm font-medium text-zinc-100">
          {isOmnia ? 'Across the rooms' : `${agent.short_name}'s plate`}
        </div>
      </div>

      <div className="flex border-b border-zinc-800 shrink-0">
        <TabBtn active={tab === 'tasks'} onClick={() => setTab('tasks')} count={tasks.filter((t) => t.status !== 'completed').length}>
          <ListTodo className="w-3.5 h-3.5" /> Tasks
        </TabBtn>
        <TabBtn active={tab === 'memory'} onClick={() => setTab('memory')} count={memory.length}>
          <Brain className="w-3.5 h-3.5" /> Memory
        </TabBtn>
        <TabBtn active={tab === 'notes'} onClick={() => setTab('notes')} count={inboxCount} highlight={inboxCount > 0}>
          <MailOpen className="w-3.5 h-3.5" /> Notes
        </TabBtn>
        <TabBtn active={tab === 'files'} onClick={() => setTab('files')} count={files.length}>
          <FileText className="w-3.5 h-3.5" /> Files
        </TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'tasks' && <TasksTab tasks={tasks} agent={agent} />}
        {tab === 'memory' && <MemoryTab memory={memory} />}
        {tab === 'notes' && <NotesTab notes={notes} agent={agent} />}
        {tab === 'files' && <FilesTab files={files} />}
      </div>
    </aside>
  );
}

function TabBtn({ active, onClick, children, count, highlight }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active ? 'text-zinc-100 border-emerald-500' : 'text-zinc-400 border-transparent hover:text-zinc-200'
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={`text-2xs px-1 rounded ${highlight ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500'} numeric`}>{count}</span>
      )}
    </button>
  );
}

function TasksTab({ tasks, agent }: { tasks: AgentTask[]; agent: Agent }) {
  if (tasks.length === 0) {
    return <div className="p-6 text-center text-sm text-zinc-500">No tasks for {agent.short_name} yet.</div>;
  }
  const open = tasks.filter((t) => t.status !== 'completed');
  const stalled = tasks.filter((t) => t.status === 'stalled');
  return (
    <div>
      {stalled.length > 0 && (
        <div className="px-4 py-2 bg-rose-500/[0.04] border-b border-rose-500/20">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            {stalled.length} need a decision
          </div>
        </div>
      )}
      <ul className="divide-y divide-zinc-800">
        {open.map((t) => (
          <li key={t.id} className="px-4 py-3">
            <div className="flex items-start gap-2 mb-1">
              <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${
                t.priority === 'critical' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                t.priority === 'high' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>{t.priority}</span>
              <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${
                t.status === 'stalled' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                t.status === 'in_progress' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>{t.status.replace('_', ' ')}</span>
            </div>
            <div className="text-sm text-zinc-100 leading-snug">{t.title}</div>
            {t.description && <div className="text-xs text-zinc-500 mt-1 leading-snug">{t.description}</div>}
            <div className="text-2xs text-zinc-500 mt-1.5 flex items-center gap-2">
              {t.deadline && <span>due {t.deadline}</span>}
              {t.reminder_count > 0 && <span className="text-amber-400">{t.reminder_count} reminder{t.reminder_count > 1 ? 's' : ''}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemoryTab({ memory }: { memory: AgentMemory[] }) {
  if (memory.length === 0) {
    return <div className="p-6 text-center text-sm text-zinc-500">Nothing kept yet. Ask to remember something and it lands here.</div>;
  }
  return (
    <ul className="divide-y divide-zinc-800">
      {memory.map((m) => (
        <li key={m.id} className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            {m.pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
            <span className="text-2xs font-mono text-zinc-500 truncate">{m.memory_key}</span>
            <span className="ml-auto text-2xs text-zinc-500 numeric">{m.importance_score}/10</span>
          </div>
          <div className="text-sm text-zinc-300 leading-snug">{m.content}</div>
          <div className="text-2xs text-zinc-600 mt-1">{m.created_at}</div>
        </li>
      ))}
    </ul>
  );
}

function NotesTab({ notes, agent }: { notes: AgentNote[]; agent: Agent }) {
  if (notes.length === 0) {
    return <div className="p-6 text-center text-sm text-zinc-500">No notes for {agent.short_name}.</div>;
  }
  return (
    <ul className="divide-y divide-zinc-800">
      {notes.map((n) => {
        const isIncoming = n.to_agent_id === agent.id;
        const other = isIncoming ? getAgent(n.from_agent_id) : getAgent(n.to_agent_id);
        return (
          <li key={n.id} className={`px-4 py-3 ${isIncoming && !n.read ? 'bg-emerald-500/[0.04]' : ''}`}>
            <div className="flex items-center gap-2 mb-1 text-2xs">
              <span className={isIncoming ? 'text-emerald-400' : 'text-zinc-500'}>
                {isIncoming ? `from ${other?.short_name}` : `to ${other?.short_name}`}
              </span>
              <span className="text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">{n.category}</span>
              <span className="ml-auto text-zinc-600 numeric">{n.at}</span>
              {isIncoming && !n.read && <span className="text-emerald-400">●</span>}
            </div>
            <div className="text-sm text-zinc-300 leading-snug">{n.body}</div>
          </li>
        );
      })}
    </ul>
  );
}

function FilesTab({ files }: { files: AgentFile[] }) {
  if (files.length === 0) {
    return <div className="p-6 text-center text-sm text-zinc-500">No files shared.</div>;
  }
  return (
    <ul className="divide-y divide-zinc-800">
      {files.map((f) => {
        const sharedBy = getAgent(f.shared_by_agent_id);
        return (
          <li key={f.id} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-100 truncate flex-1">{f.name}</span>
              <span className={`text-2xs px-1.5 py-0.5 rounded shrink-0 ${
                f.visibility === 'all' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                f.visibility === 'role' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>{f.visibility}</span>
            </div>
            <div className="text-2xs text-zinc-500 mt-1 ml-6">
              {sharedBy?.short_name} · {formatBytes(f.size_bytes)} · {f.created_at}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
