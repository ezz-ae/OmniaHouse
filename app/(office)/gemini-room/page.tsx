'use client';

import { useState } from 'react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { Bot, Search, FileText, Database, MessageSquare, ArrowRight } from 'lucide-react';

type Corpus = 'catalogue' | 'transcripts' | 'drive' | 'orders';

const CORPORA: { id: Corpus; label: string; icon: React.ReactNode; docs: number; tokens: string }[] = [
  { id: 'catalogue',   label: 'Product catalogue',   icon: <Database className="w-3.5 h-3.5" />,     docs: 847,   tokens: '1.2M' },
  { id: 'transcripts', label: 'WhatsApp transcripts', icon: <MessageSquare className="w-3.5 h-3.5" />, docs: 4_211, tokens: '8.4M' },
  { id: 'drive',       label: 'Drive Room (Safe)',    icon: <FileText className="w-3.5 h-3.5" />,    docs: 312,   tokens: '2.1M' },
  { id: 'orders',      label: 'Order history',        icon: <Database className="w-3.5 h-3.5" />,    docs: 5_104, tokens: '3.6M' },
];

const PROMPT_TEMPLATES = [
  'Which customers asked about ring sizing in the last 30 days?',
  'Show me every COD failure in Sharjah this month with the customer comment.',
  'Find the photoshoot brief for LE Celestial — was the gold tone signed off?',
  'List products that customers returned with "smaller than expected" in the reason.',
  'Surface every line where a customer mentioned a competitor.',
];

const RECENT = [
  { q: 'Refund patterns by city this quarter', at: '14:08', citations: 23 },
  { q: 'Crescent Ring objections — what do customers say no to?', at: 'Yesterday', citations: 17 },
  { q: 'Tamara vs Tabby — which checkouts converted better?', at: 'Yesterday', citations: 9 },
];

export default function GeminiRoomPage() {
  const [corpus, setCorpus] = useState<Corpus>('transcripts');
  const [query, setQuery] = useState('');

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <Bot className="w-3.5 h-3.5" />
            Gemini Room
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Long-context retrieval</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Where Omnia decides what to do, Gemini answers what is in the data. Long-context reads over the catalogue, transcripts, Drive Room, and order history — with citations.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            {CORPORA.map((c) => (
              <button
                key={c.id}
                onClick={() => setCorpus(c.id)}
                className={`text-left border rounded-md p-3 transition-colors ${
                  corpus === c.id
                    ? 'border-zinc-700 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-zinc-400 mb-1">
                  {c.icon} {c.label}
                </div>
                <div className="text-sm text-zinc-100 tabular-nums">{c.docs.toLocaleString()}</div>
                <div className="text-2xs text-zinc-500">{c.tokens} tokens</div>
              </button>
            ))}
          </div>

          <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4 mb-6">
            <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Ask Gemini · {CORPORA.find((c) => c.id === corpus)?.label}
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a question. Gemini reads the whole corpus and returns answers with citations…"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 outline-none focus:border-zinc-700 h-24 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-2xs text-zinc-500">Reads the full corpus per call. Cites every claim.</span>
              <button
                disabled={!query.trim()}
                className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-900 text-xs font-medium disabled:opacity-50 transition-colors"
              >
                Ask
              </button>
            </div>
          </div>

          <Section title="Try one">
            <div className="grid grid-cols-1 gap-1.5">
              {PROMPT_TEMPLATES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(p)}
                  className="text-left text-sm text-zinc-300 px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-2"
                >
                  <span>{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </button>
              ))}
            </div>
          </Section>

          <Section title="Recent">
            <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
              {RECENT.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{r.q}</div>
                    <div className="text-2xs text-zinc-500">{r.citations} citations</div>
                  </div>
                  <span className="text-2xs text-zinc-500 shrink-0">{r.at}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-3">{title}</div>
      {children}
    </section>
  );
}
