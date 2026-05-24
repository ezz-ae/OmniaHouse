'use client';

import { useState } from 'react';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatAED, maskPhone, timeAgo } from '@/lib/utils';
import {
  getWAConversations,
  getExtractedOrder,
  SAMPLE_CHAT,
  type WAConversation,
  type ExtractedOrder,
} from '@/lib/mock/whatsapp';
import { Sparkles, Send, Phone, FileText, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

export default function WhatsAppDeskPage() {
  const conversations = getWAConversations();
  const [activeId, setActiveId] = useState<string>(conversations[0].id);
  const [filter, setFilter] = useState<'all' | WAConversation['status']>('all');
  const active = conversations.find((c) => c.id === activeId)!;
  const filtered = filter === 'all' ? conversations : conversations.filter((c) => c.status === filter);

  const [chatText, setChatText] = useState(SAMPLE_CHAT);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedOrder | null>(null);

  async function runExtract() {
    setExtracting(true);
    await new Promise((r) => setTimeout(r, 900));
    setExtracted(getExtractedOrder());
    setExtracting(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Desk"
        title="WhatsApp Desk"
        description="Paste chats, extract structured orders, route to the right store. 35% of revenue lives here."
        actions={
          <Button variant="primary" size="sm">
            <Phone className="w-3.5 h-3.5" /> +971 56 547 8227
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-3" style={{ minHeight: '600px' }}>
        {/* Conversation list */}
        <div className="col-span-3">
          <SectionHeader title={`Queue (${filtered.length})`} />
          <div className="mb-2 flex gap-1 flex-wrap">
            {(['all', 'unclaimed', 'in_progress', 'awaiting_customer', 'ready_for_draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 h-6 text-2xs rounded border transition-colors',
                  filter === f
                    ? 'bg-gold/10 text-gold border-gold/30'
                    : 'border-line text-ink-dim hover:text-ink',
                )}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line-soft max-h-[700px] overflow-y-auto">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      'w-full text-left p-3 hover:bg-canvas-inset/60 transition-colors',
                      activeId === c.id && 'bg-canvas-inset',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-sm font-medium text-ink truncate">
                        {c.customer_name || <span className="text-ink-dim italic">unknown</span>}
                      </div>
                      <div className="text-2xs text-ink-dim shrink-0 numeric">{c.last_at}</div>
                    </div>
                    <div className="text-2xs text-ink-dim font-mono mb-1.5">{maskPhone(c.phone)}</div>
                    <div className="text-xs text-ink-muted line-clamp-2 mb-1.5">
                      {c.last_message}
                    </div>
                    <div className="flex items-center gap-1.5 text-2xs">
                      <StatusChip status={c.status} />
                      {c.unread > 0 && <Badge tone="gold">{c.unread} new</Badge>}
                      {c.customer_history && <Badge tone="info">{c.customer_history.orders} orders</Badge>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Chat */}
        <div className="col-span-5">
          <SectionHeader title="Conversation" />
          <Card className="overflow-hidden flex flex-col h-[760px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-line-soft flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink">
                  {active.customer_name || <span className="text-ink-dim italic">unknown</span>}
                </div>
                <div className="text-2xs text-ink-dim font-mono mt-0.5">{maskPhone(active.phone)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="info">{active.language.toUpperCase()}</Badge>
                <StatusChip status={active.status} />
              </div>
            </div>

            {/* History (if any) */}
            {active.customer_history && (
              <div className="px-4 py-2 border-b border-line-soft bg-canvas-inset/40 flex items-center gap-4 text-2xs">
                <span className="label">Customer</span>
                <span className="text-ink-muted">
                  <span className="text-ink font-medium">{active.customer_history.orders}</span> orders
                </span>
                <span className="text-ink-muted">
                  LTV <span className="text-gold font-medium numeric">{formatAED(active.customer_history.ltv_aed)}</span>
                </span>
                <span className="text-ink-muted">last at {active.customer_history.last_at}</span>
              </div>
            )}

            {/* Paste area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="label mb-2">Paste chat to extract</div>
              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                className="w-full h-[440px] p-3 bg-canvas border border-line rounded text-xs font-mono text-ink leading-relaxed resize-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none"
                placeholder="Paste raw WhatsApp chat here..."
              />
            </div>

            {/* Footer actions */}
            <div className="px-4 py-3 border-t border-line-soft flex items-center justify-between bg-canvas-raised/30">
              <div className="text-2xs text-ink-dim">
                <span className="text-ink font-medium">{chatText.length}</span> chars · ~
                <span className="numeric">{Math.ceil(chatText.length / 4)}</span> tokens
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setChatText('')}>
                  Clear
                </Button>
                <Button variant="primary" size="sm" onClick={runExtract} disabled={extracting || !chatText}>
                  {extracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Extract Intelligence
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Extracted preview */}
        <div className="col-span-4">
          <SectionHeader
            title="Extracted order"
            hint={extracted ? 'GPT-4o · 0.9s' : 'idle'}
            actions={
              extracted && (
                <Button variant="ghost" size="sm" onClick={runExtract}>
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run
                </Button>
              )
            }
          />
          {!extracted ? (
            <Card className="p-8 flex flex-col items-center justify-center text-center min-h-[600px]">
              <div className="w-12 h-12 rounded-full bg-canvas-inset border border-line flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-ink-dim" />
              </div>
              <div className="text-sm text-ink mb-1">Paste a chat and hit Extract</div>
              <div className="text-xs text-ink-dim max-w-xs">
                The Intelligence Engine identifies customer, items, address, and intent. Arabic and mixed-language supported.
              </div>
            </Card>
          ) : (
            <ExtractedPanel data={extracted} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: WAConversation['status'] }) {
  const map: Record<WAConversation['status'], { label: string; tone: 'good' | 'warn' | 'bad' | 'info' | 'gold' | 'neutral' }> = {
    unclaimed: { label: 'unclaimed', tone: 'bad' },
    in_progress: { label: 'in progress', tone: 'info' },
    awaiting_customer: { label: 'awaiting', tone: 'warn' },
    ready_for_draft: { label: 'ready', tone: 'gold' },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

function ExtractedPanel({ data }: { data: ExtractedOrder }) {
  return (
    <Card className="overflow-hidden">
      {/* Customer */}
      <div className="p-4 border-b border-line-soft">
        <div className="label mb-2">Customer</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-ink">{data.customer.name}</div>
            <div className="text-2xs text-ink-dim font-mono mt-0.5">{maskPhone(data.customer.phone)}</div>
          </div>
          {data.customer.matched_existing && (
            <Badge tone="good">
              <CheckCircle2 className="w-3 h-3" /> Matched
            </Badge>
          )}
        </div>
        {data.customer.matched_existing && (
          <div className="mt-2 text-2xs text-ink-dim">
            {data.customer.existing_orders} prior orders · LTV{' '}
            <span className="text-gold numeric">{formatAED(data.customer.existing_ltv_aed!)}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="p-4 border-b border-line-soft">
        <div className="label mb-2">Items</div>
        <ul className="space-y-2">
          {data.items.map((it) => (
            <li key={it.sku} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink">{it.title}</div>
                <div className="text-2xs text-ink-dim">
                  {it.variant} · <span className="font-mono">{it.sku}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm numeric text-ink">{it.qty} × {formatAED(it.price_aed)}</div>
                <Badge tone={it.matched ? 'good' : 'warn'}>
                  {it.matched ? 'matched' : 'review'} · {Math.round(it.confidence * 100)}%
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Shipping */}
      <div className="p-4 border-b border-line-soft">
        <div className="label mb-2">Shipping</div>
        <div className="text-sm text-ink">{data.shipping.address}</div>
        <div className="text-2xs text-ink-dim mt-0.5">
          {data.shipping.city} · deadline {data.shipping.deadline} ·{' '}
          <Badge tone="info">{data.shipping.method.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Flags */}
      {data.flags.length > 0 && (
        <div className="p-4 border-b border-line-soft">
          <div className="label mb-2">Flags</div>
          <ul className="space-y-1.5">
            {data.flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-2xs">
                <AlertTriangle
                  className={cn(
                    'w-3.5 h-3.5 mt-px shrink-0',
                    f.severity === 'bad' ? 'text-bad' : f.severity === 'warn' ? 'text-warn' : 'text-info',
                  )}
                />
                <span className="text-ink-muted">
                  <span className="font-medium text-ink uppercase tracking-widest">{f.type}</span> — {f.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Total */}
      <div className="p-4 bg-canvas-raised/40">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Subtotal</span>
          <span className="numeric">{formatAED(data.totals.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Shipping</span>
          <span className="numeric">{formatAED(data.totals.shipping)}</span>
        </div>
        <div className="flex items-center justify-between text-lg mt-2 pt-2 border-t border-line-soft">
          <span className="font-medium text-ink">Total</span>
          <span className="font-serif font-medium text-gold numeric">{formatAED(data.totals.total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="subtle" size="sm">
            <FileText className="w-3.5 h-3.5" /> Save draft
          </Button>
          <Button variant="primary" size="sm">
            <Send className="w-3.5 h-3.5" /> Send to Shopify
          </Button>
        </div>
      </div>
    </Card>
  );
}
