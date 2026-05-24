'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { GoMenu } from '@/components/navigation/go-menu';
import {
  getAgents, getAgent, getMessagesForAgent, getTasksForAgent,
  getMemoryForAgent, getNotesForAgent, getInboxForAgent, getFilesForAgent,
  getStalledTasks, mockAgentReply,
} from '@/lib/agents/mock';
import type { Agent, AgentMessage, AgentTask, AgentMemory, AgentNote, AgentFile } from '@/lib/agents/types';
import {
  Bell, Settings, Sparkles, ListTodo, Brain, MailOpen, FileText,
  Send, Loader2, AlertTriangle, Pin, ArrowRight, Crown,
} from 'lucide-react';
import { formatAED } from '@/lib/utils';

/**
 * Omnia AI Room — the agentic surface.
 *
 *   ┌─ Top bar ─────────────────────────────────────────────────────────┐
 *   ├──────────────┬─────────────────────────────────┬──────────────────┤
 *   │ AGENTS       │ CHAT WITH SELECTED AGENT        │ CONTEXT PANEL    │
 *   │              │                                 │                  │
 *   │ ✨ Omnia     │ ┌─ {agent name + skills} ────┐ │ Tabs:            │
 *   │ ─────        │ │ message bubbles            │ │   Tasks          │
 *   │ Mahmoud      │ │ + agent artifact cards     │ │   Memory         │
 *   │ Layla        │ │ (task routed, note sent…)  │ │   Notes (inbox)  │
 *   │ Omar         │ └────────────────────────────┘ │   Files          │
 *   │ Sara         │ ┌─ compose ──────────────────┐ │                  │
 *   │ Ali          │ │ textarea + Send            │ │ Content of tab   │
 *   └──────────────┴─────────────────────────────────┴──────────────────┘
 *
 * Omnia AI = the central orchestrator. One agent per team member account.
 * Tasks routed between agents, memory pinned, notes exchanged, files shared.
 * Mirrors agentic_tasks + ai_memory + notes_system + drive_files SQL.
 */

type Tab = 'tasks' | 'memory' | 'notes' | 'files';

export default function OmniaAIPage() {
  const agents = useMemo(() => getAgents(), []);
  const [activeId, setActiveId] = useState<string>('agent_omnia');
  const [tab, setTab] = useState<Tab>('tasks');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [extraMessages, setExtraMessages] = useState<Record<string, AgentMessage[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = agents.find((a) => a.id === activeId) || agents[0];
  const baseMessages = useMemo(() => getMessagesForAgent(active.id), [active.id]);
  const messages = useMemo(
    () => [...baseMessages, ...(extraMessages[active.id] || [])],
    [baseMessages, extraMessages, active.id],
  );

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
    setExtraMessages((prev) => ({
      ...prev,
      [active.id]: [...(prev[active.id] || []), userMsg],
    }));
    const userText = draft;
    setDraft('');
    setSending(true);
    await new Promise((r) => setTimeout(r, 500));
    const reply = mockAgentReply(active, userText);
    setExtraMessages((prev) => ({
      ...prev,
      [active.id]: [...(prev[active.id] || []), reply],
    }));
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
      <TopBar />

      <div className="flex-1 min-h-0 flex">
        {/* Agents sidebar */}
        <AgentsRail
          agents={agents}
          activeId={activeId}
          onSelect={setActiveId}
          stalledCount={stalled.length}
          inboxCounts={Object.fromEntries(agents.map((a) => [a.id, getInboxForAgent(a.id).filter((n) => !n.read).length]))}
        />

        {/* Conversation */}
        <main className="flex-1 min-w-0 flex flex-col border-r border-zinc-800">
          <AgentHeader agent={active} />

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-zinc-900">
            <div className="min-h-full flex flex-col justify-end px-6 py-5">
              <div className="max-w-[760px] mx-auto w-full space-y-1">
                {messages.length === 0 ? (
                  <EmptyAgentChat agent={active} />
                ) : (
                  messages.map((m, i) => {
                    const prev = i > 0 ? messages[i - 1] : null;
                    const showSender = !prev || prev.from !== m.from;
                    return <AgentBubble key={m.id} m={m} showSender={showSender} />;
                  })
                )}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2 px-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    {active.short_name} is thinking…
                  </div>
                )}
              </div>
            </div>
          </div>

          <Compose
            draft={draft}
            setDraft={setDraft}
            onSend={send}
            sending={sending}
            agent={active}
          />
        </main>

        {/* Context panel */}
        <ContextPanel
          tab={tab}
          onTabChange={setTab}
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

// ─── Top bar ───────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 flex items-center gap-3">
      <div className="flex items-center gap-2 select-none">
        <div className="w-6 h-6 rounded bg-emerald-500/90 text-zinc-900 font-semibold text-xs flex items-center justify-center">
          O
        </div>
        <span className="text-sm font-medium text-zinc-100">OmniaHouse</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="w-7 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center" title="Notifications">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-7 h-7 rounded-full bg-emerald-600 text-zinc-900 text-xs font-semibold flex items-center justify-center" title="Mahmoud Ezz">ME</div>
        <div className="w-px h-5 bg-zinc-800 mx-1" />
        <GoMenu />
      </div>
    </header>
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
  const members = agents.filter((a) => a.kind === 'member');

  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Omnia AI</div>
        <div className="text-sm font-medium text-zinc-100">Agentic Office</div>
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
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-900 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-zinc-100 font-medium truncate">Omnia AI</div>
              <div className="text-2xs text-zinc-500 truncate">Central orchestrator</div>
            </div>
            {stalledCount > 0 && (
              <span className="text-2xs px-1.5 h-4 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 numeric flex items-center" title="stalled tasks">
                {stalledCount}
              </span>
            )}
          </button>
        </div>

        {/* Members */}
        <div className="px-4 py-1 text-2xs uppercase tracking-wider text-zinc-500">Team agents</div>
        <ul>
          {members.map((a) => {
            const active = activeId === a.id;
            const initials = a.short_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
            const unread = inboxCounts[a.id] || 0;
            return (
              <li key={a.id}>
                <button
                  onClick={() => onSelect(a.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${
                    active ? 'bg-zinc-800 text-zinc-100 border-l-2 border-emerald-500 -ml-px pl-[15px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-medium text-zinc-900 shrink-0" style={{ background: a.avatar_color }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-zinc-100 truncate flex items-center gap-1">
                      {a.short_name}
                      {a.for_user_role === 'owner' && <Crown className="w-3 h-3 text-amber-400" />}
                    </div>
                    <div className="text-2xs text-zinc-500 truncate">{a.status}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    {unread > 0 && (
                      <span className="text-2xs px-1 h-3.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 numeric flex items-center">
                        {unread}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

// ─── Agent header ──────────────────────────────────────────────────────────

function AgentHeader({ agent }: { agent: Agent }) {
  const initials = agent.short_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="h-14 shrink-0 border-b border-zinc-800 px-4 flex items-center gap-3 bg-zinc-900">
      <div className="w-9 h-9 rounded-full flex items-center justify-center font-medium text-zinc-900 shrink-0"
        style={{ background: agent.kind === 'omnia' ? 'linear-gradient(135deg, #34d399, #059669)' : agent.avatar_color }}>
        {agent.kind === 'omnia' ? <Sparkles className="w-4 h-4" /> : initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100">{agent.name}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${agent.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {agent.kind === 'omnia' ? (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">orchestrator</span>
          ) : (
            <span className="text-2xs text-zinc-500 uppercase tracking-wider">{agent.for_user_role?.replace('_', ' ')}</span>
          )}
        </div>
        <div className="text-2xs text-zinc-500 mt-0.5 truncate">
          {agent.status} · L{agent.level} · {agent.xp} XP · {agent.skills.slice(0, 3).join(' · ')}
        </div>
      </div>
    </div>
  );
}

// ─── Bubble ────────────────────────────────────────────────────────────────

function AgentBubble({ m, showSender }: { m: AgentMessage; showSender: boolean }) {
  const isUser = m.from === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${showSender ? 'mt-3' : 'mt-0.5'}`}>
      {showSender && (
        <div className="flex items-baseline gap-2 mb-1 px-1">
          <span className={`text-2xs uppercase tracking-wider ${isUser ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {isUser ? 'You' : 'Agent'}
          </span>
          <span className="text-2xs text-zinc-600 numeric">{m.at}</span>
        </div>
      )}
      <div className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed rounded-lg whitespace-pre-line ${
        isUser ? 'bg-emerald-900/40 text-zinc-100 border border-emerald-800/40' : 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
      }`}>
        {m.body}
      </div>
      {m.artifact && <ArtifactCard a={m.artifact} />}
    </div>
  );
}

function ArtifactCard({ a }: { a: NonNullable<AgentMessage['artifact']> }) {
  if (a.kind === 'task_routed') {
    const assignee = getAgent(a.task.assignee_agent_id);
    return (
      <div className="mt-1.5 max-w-[78%] px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04]">
        <div className="flex items-center gap-2 mb-1">
          <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs uppercase tracking-wider text-emerald-300">Task routed</span>
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
      <div className="mt-1.5 max-w-[78%] px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/[0.04]">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs uppercase tracking-wider text-blue-300">Memory saved</span>
        </div>
        <div className="text-sm text-zinc-100">{a.memory.content}</div>
        <div className="text-2xs text-zinc-500 mt-1 font-mono">{a.memory.memory_key} · importance {a.memory.importance_score}/10</div>
      </div>
    );
  }
  if (a.kind === 'note_sent') {
    return (
      <div className="mt-1.5 max-w-[78%] px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.04]">
        <div className="text-xs uppercase tracking-wider text-amber-300 mb-1">Note sent</div>
        <div className="text-sm text-zinc-300">{a.note.body}</div>
      </div>
    );
  }
  if (a.kind === 'stalled_warning') {
    return (
      <div className="mt-1.5 max-w-[78%] px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.04]">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs uppercase tracking-wider text-rose-300">Stalled</span>
        </div>
        <div className="text-sm text-zinc-100">{a.suggestion}</div>
      </div>
    );
  }
  return null;
}

function EmptyAgentChat({ agent }: { agent: Agent }) {
  return (
    <div className="py-12 text-center">
      <div className="inline-block p-3 rounded-full bg-zinc-800 mb-3">
        <Sparkles className="w-5 h-5 text-zinc-500" />
      </div>
      <h3 className="text-base font-medium text-zinc-100 mb-1">
        Talk to {agent.short_name}
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm mx-auto">
        {agent.kind === 'omnia'
          ? 'I watch across all rooms. Ask for status, route tasks, save to memory, or surface what is stuck.'
          : `${agent.short_name}'s personal agent. Ask about their tasks, leave a note, or share a file.`}
      </p>
    </div>
  );
}

// ─── Compose ───────────────────────────────────────────────────────────────

function Compose({ draft, setDraft, onSend, sending, agent }: {
  draft: string; setDraft: (s: string) => void; onSend: () => void; sending: boolean; agent: Agent;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [draft]);

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
      <div className="max-w-[760px] mx-auto flex items-end gap-2">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend(); } }}
          placeholder={agent.kind === 'omnia' ? 'Ask Omnia anything — route a task, save a memory, ask for status…' : `Message ${agent.short_name}…`}
          rows={1}
          className="flex-1 resize-none min-h-[40px] max-h-[180px] px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 outline-none"
        />
        <button
          onClick={onSend}
          disabled={!draft.trim() || sending}
          className={`h-9 px-4 shrink-0 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            draft.trim() && !sending ? 'bg-emerald-500 text-zinc-900 hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Context panel ─────────────────────────────────────────────────────────

function ContextPanel({
  tab, onTabChange, agent, tasks, memory, notes, inboxCount, files,
}: {
  tab: Tab; onTabChange: (t: Tab) => void; agent: Agent;
  tasks: AgentTask[]; memory: AgentMemory[]; notes: AgentNote[]; inboxCount: number; files: AgentFile[];
}) {
  return (
    <aside className="w-80 shrink-0 bg-zinc-900 flex flex-col">
      <div className="flex border-b border-zinc-800 shrink-0">
        <TabBtn active={tab === 'tasks'} onClick={() => onTabChange('tasks')} count={tasks.filter((t) => t.status !== 'completed').length}>
          <ListTodo className="w-3.5 h-3.5" /> Tasks
        </TabBtn>
        <TabBtn active={tab === 'memory'} onClick={() => onTabChange('memory')} count={memory.length}>
          <Brain className="w-3.5 h-3.5" /> Memory
        </TabBtn>
        <TabBtn active={tab === 'notes'} onClick={() => onTabChange('notes')} count={inboxCount} highlight={inboxCount > 0}>
          <MailOpen className="w-3.5 h-3.5" /> Notes
        </TabBtn>
        <TabBtn active={tab === 'files'} onClick={() => onTabChange('files')} count={files.length}>
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
            {stalled.length} stalled — needs attention
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
    return <div className="p-6 text-center text-sm text-zinc-500">No memory yet. Ask the agent to remember something.</div>;
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
