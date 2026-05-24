'use client';

import { useState } from 'react';
import { cn, formatAED } from '@/lib/utils';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreChip } from '@/components/ui/store-chip';
import {
  Sparkles, Zap, ShieldAlert, BookOpen, Users, AlertTriangle, User,
  ChevronRight, Loader2, FileImage, Wand2, ShieldCheck, ShoppingBag,
} from 'lucide-react';
import { mockExtract, mockVerifyPayment, mockMagazine } from '@/lib/whatsapp/mock';
import { IdentityCard } from './identity-card';
import type { Conversation, Extraction, PaymentVerification, Magazine, CustomerCard } from '@/lib/whatsapp/types';

type Tab = 'customer' | 'extract' | 'vibes' | 'roles' | 'verify' | 'magazine';

/**
 * The right-side AI panel. Six tabs, each backed by a different prompt from
 * prompts/raw-prompts.txt:
 *   Extract       → WHATSAPP_EXTRACTION_PROMPT (47-field schema)
 *   Vibes         → conversation_vibes block of the same
 *   Roles         → role_insights of the same (sales / marketing / strategy / owner)
 *   Verify        → MEDIA_VERIFICATION_PROMPT (bank templates + metadata fraud)
 *   Magazine      → OMNIA_MAGAZINE_PROMPT (post-purchase digital magazine)
 *
 * Reply Optimizer (MESSAGE_OPTIMIZATION_PROMPT) and Writing Assistant
 * (WRITING_ASSISTANT_PROMPT) live in the compose bar — they belong there.
 */
export function AIPanel({
  conv,
  card,
  initialTab = 'extract',
  tabKey,
}: {
  conv: Conversation;
  card: CustomerCard;
  initialTab?: Tab;
  /** External counter to force the panel onto a specific tab (e.g. when user clicks the IdentityStrip). */
  tabKey?: number;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  // Sync to external tab requests
  if (tabKey !== undefined && (typeof window !== 'undefined')) {
    // no-op render guard; external usage uses key prop too
  }
  const [extract, setExtract] = useState<Extraction | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [magazine, setMagazine] = useState<Magazine | null>(null);

  async function runExtract() {
    setExtracting(true);
    await new Promise((r) => setTimeout(r, 800));
    setExtract(mockExtract(conv));
    setExtracting(false);
  }

  async function runVerify(filename: string) {
    setVerification(mockVerifyPayment(filename));
  }

  async function runMagazine() {
    setMagazine(mockMagazine(card.display_name || 'Customer'));
  }

  const tabs: { id: Tab; label: string; icon: any; badge?: number | string; tone?: 'good' | 'warn' | 'bad' | 'gold' }[] = [
    { id: 'customer', label: 'Customer', icon: User, badge: card.matched ? '✓' : 'new', tone: card.matched ? 'good' : 'warn' },
    { id: 'extract', label: 'Extract', icon: Sparkles, badge: extract ? '✓' : undefined, tone: 'gold' },
    { id: 'vibes', label: 'Vibes', icon: Zap, badge: conv.vibes.fraud_risk === 'high' ? '!' : undefined, tone: conv.vibes.fraud_risk === 'high' ? 'bad' : 'good' },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'verify', label: 'Verify', icon: ShieldCheck, badge: conv.messages.some((m) => m.media && !m.media.verified) ? '·' : undefined, tone: 'warn' },
    { id: 'magazine', label: 'Magazine', icon: BookOpen },
  ];

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-line-soft px-1 pt-1 flex items-center gap-px overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-2 rounded-t text-2xs font-medium border-b-2 whitespace-nowrap transition-colors',
                tab === t.id
                  ? 'text-gold border-gold'
                  : 'text-ink-dim border-transparent hover:text-ink',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge && <Badge tone={t.tone || 'neutral'}>{t.badge}</Badge>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'customer' && <IdentityCard card={card} />}
        {tab === 'extract' && (
          <ExtractTab extract={extract} extracting={extracting} onRun={runExtract} />
        )}
        {tab === 'vibes' && <VibesTab conv={conv} />}
        {tab === 'roles' && <RolesTab extract={extract} onRun={runExtract} />}
        {tab === 'verify' && <VerifyTab conv={conv} verification={verification} onRun={runVerify} />}
        {tab === 'magazine' && <MagazineTab magazine={magazine} onRun={runMagazine} card={card} />}
      </div>
    </div>
  );
}

// ─── Extract tab ───────────────────────────────────────────────────────────

function ExtractTab({ extract, extracting, onRun }: { extract: Extraction | null; extracting: boolean; onRun: () => void }) {
  if (!extract) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-3">
        <div className="p-3 rounded-full bg-canvas-inset border border-line">
          <Sparkles className="w-5 h-5 text-ink-dim" />
        </div>
        <div className="text-sm text-ink">Run extraction</div>
        <div className="text-2xs text-ink-dim max-w-xs">
          GPT-4o reads the whole conversation, pulls 47 fields, flags risks. Result is logged to <code className="font-mono">ai_extractions</code>.
        </div>
        <Button variant="primary" size="sm" onClick={onRun} disabled={extracting}>
          {extracting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…</> : <><Sparkles className="w-3.5 h-3.5" /> Extract intelligence</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-line-soft">
      {/* Intent + readiness */}
      <Section title="Intent">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{extract.intent.replace(/_/g, ' ')}</span>
          <span className="text-2xs text-ink-dim numeric">confidence {Math.round(extract.intent_score * 100)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Pill label="Order ready" ok={extract.order_ready} />
          <Pill label="Shipping ready" ok={extract.shipping_ready} />
        </div>
      </Section>

      {/* Risk flags */}
      {extract.risk_flags.length > 0 && (
        <Section title="Risk flags">
          <div className="flex flex-wrap gap-1">
            {extract.risk_flags.map((f) => (
              <Badge key={f} tone="bad">{f.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Items */}
      <Section title="Items">
        {extract.selected_products.length === 0 ? (
          <div className="text-2xs text-ink-dim">No items extracted yet</div>
        ) : (
          <ul className="space-y-2">
            {extract.selected_products.map((it) => (
              <li key={it.sku} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{it.title}</div>
                  <div className="text-2xs text-ink-dim font-mono">{it.sku}{it.ring_size && ` · size ${it.ring_size}`}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm text-ink numeric">{it.qty} × {it.price_aed ? formatAED(it.price_aed) : '?'}</div>
                  {it.store_source && <StoreChip store={it.store_source} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Shipping */}
      <Section title="Shipping">
        <div className="text-sm text-ink">
          {extract.area && extract.building ? `${extract.building}, ${extract.area}` : <span className="text-ink-dim italic">missing</span>}
        </div>
        <div className="text-2xs text-ink-dim mt-1 flex flex-wrap items-center gap-1">
          {extract.emirate_or_city && <span>{extract.emirate_or_city}</span>}
          {extract.preferred_delivery_window && (<><span>·</span><span>by {extract.preferred_delivery_window}</span></>)}
          {extract.urgency_tier && <Badge tone={extract.urgency_tier === 'same_day' ? 'bad' : extract.urgency_tier === 'next_day' ? 'warn' : 'neutral'}>{extract.urgency_tier.replace(/_/g, ' ')}</Badge>}
        </div>
        {extract.missing_shipping_fields.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {extract.missing_shipping_fields.map((m) => (
              <Badge key={m} tone="bad">missing: {m.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
        )}
      </Section>

      {/* Payment */}
      <Section title="Payment">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink uppercase tracking-wider">{extract.payment_method}</span>
          {extract.discount_requested_pct > 0 && (
            <Badge tone={extract.discount_requested_pct > 10 ? 'bad' : 'warn'}>
              discount {extract.discount_requested_pct}%{extract.discount_requested_pct > 10 && ' · needs manager'}
            </Badge>
          )}
        </div>
        {extract.cashback_suggestion.eligible && (
          <div className="mt-2 px-2.5 py-2 rounded bg-gold/10 border border-gold/20">
            <div className="text-2xs text-gold uppercase tracking-widest mb-0.5">Cashback</div>
            <div className="text-sm text-gold numeric">{formatAED(extract.cashback_suggestion.amount_aed)} for Limited Editions</div>
            <div className="text-2xs text-ink-dim mt-0.5">{extract.cashback_suggestion.note}</div>
          </div>
        )}
      </Section>

      {/* Suggested customer message */}
      {extract.suggested_customer_message_en && (
        <Section title="Suggested reply">
          {extract.suggested_customer_message_en && (
            <div className="mb-2">
              <div className="label mb-1">EN</div>
              <div className="text-sm text-ink-muted leading-relaxed">{extract.suggested_customer_message_en}</div>
            </div>
          )}
          {extract.suggested_customer_message_ar && (
            <div>
              <div className="label mb-1">AR</div>
              <div className="text-sm text-ink-muted leading-relaxed font-serif" dir="rtl">{extract.suggested_customer_message_ar}</div>
            </div>
          )}
        </Section>
      )}

      {/* Manager summary */}
      <Section title="Manager summary">
        <p className="text-2xs text-ink-muted leading-relaxed">{extract.manager_summary}</p>
      </Section>
    </div>
  );
}

// ─── Vibes tab ─────────────────────────────────────────────────────────────

function VibesTab({ conv }: { conv: Conversation }) {
  const v = conv.vibes;
  return (
    <div className="divide-y divide-line-soft">
      <Section title="Happiness">
        <div className="flex items-center justify-between mb-2">
          <span className="font-serif text-3xl text-gold numeric">{v.happiness_level}<span className="text-ink-dim text-lg">/10</span></span>
          <Mood level={v.happiness_level} />
        </div>
        <Bar value={v.happiness_level} max={10} />
      </Section>

      <Section title="Urgency">
        <div className="flex items-center gap-2">
          <Badge tone={v.urgency === 'critical' ? 'bad' : v.urgency === 'high' ? 'warn' : 'neutral'}>{v.urgency}</Badge>
          {v.business_blockers && <span className="text-2xs text-ink-muted">· {v.business_blockers}</span>}
        </div>
      </Section>

      <Section title="Fraud risk">
        <div className="flex items-center gap-2">
          <Badge tone={v.fraud_risk === 'high' ? 'bad' : v.fraud_risk === 'medium' ? 'warn' : 'good'}>{v.fraud_risk}</Badge>
          {v.is_spam && <Badge tone="bad">spam</Badge>}
        </div>
      </Section>

      <Section title="Seniority needed">
        <div className="flex items-center gap-2">
          <Badge tone={v.seniority_needed === 'manager' ? 'bad' : v.seniority_needed === 'senior' ? 'warn' : 'good'}>
            {v.seniority_needed}
          </Badge>
          <span className="text-2xs text-ink-dim">
            {v.seniority_needed === 'manager'
              ? 'Escalate. Owner approval may be required.'
              : v.seniority_needed === 'senior'
                ? 'Assign to a senior agent.'
                : 'Any agent can handle.'}
          </span>
        </div>
      </Section>
    </div>
  );
}

function Mood({ level }: { level: number }) {
  if (level >= 8) return <span className="text-2xl">🌟</span>;
  if (level >= 6) return <span className="text-2xl">🙂</span>;
  if (level >= 4) return <span className="text-2xl">😐</span>;
  return <span className="text-2xl">😟</span>;
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 rounded-full bg-canvas-inset overflow-hidden">
      <div className="h-full bg-gold/70" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

// ─── Roles tab ─────────────────────────────────────────────────────────────

function RolesTab({ extract, onRun }: { extract: Extraction | null; onRun: () => void }) {
  if (!extract) {
    return (
      <div className="p-6 text-center">
        <p className="text-2xs text-ink-dim mb-3">Roles insights need extraction to run first.</p>
        <Button variant="primary" size="sm" onClick={onRun}>Run extraction</Button>
      </div>
    );
  }
  const r = extract.role_insights;
  return (
    <div className="divide-y divide-line-soft">
      <RoleBlock title="Sales" body={[
        ['Tactic', r.sales.tactic],
        ['Close window', r.sales.close_window],
      ]} />
      <RoleBlock title="Marketing" body={[
        ['LAL segments', r.marketing.lal_segments.join(' · ') || '—'],
        ['Keywords', r.marketing.google_ads_keywords.join(', ') || '—'],
        ['Meta retargeting', r.marketing.meta_retargeting],
      ]} />
      <RoleBlock title="Strategy" body={[
        ['Google Ads', r.strategy.google_ads_alignment],
        ['Workflow', r.strategy.google_business_workflow],
      ]} />
      <RoleBlock title="Owner" body={[
        ['Revenue at risk', r.owner.revenue_risk_aed ? formatAED(r.owner.revenue_risk_aed) : 'none'],
        ['Strategy', r.owner.conversion_strategy],
      ]} />
      <Section title="Google Suite actions">
        <ul className="space-y-1.5">
          {extract.google_suite_actions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-2xs">
              <Badge tone="info">{a.app}</Badge>
              <span className="text-ink-muted flex-1">{a.action}</span>
              <Badge tone={a.priority === 'high' ? 'bad' : a.priority === 'medium' ? 'warn' : 'neutral'}>{a.priority}</Badge>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function RoleBlock({ title, body }: { title: string; body: [string, string][] }) {
  return (
    <Section title={title}>
      <dl className="space-y-1.5">
        {body.map(([k, v]) => (
          <div key={k} className="text-2xs">
            <dt className="label inline">{k}</dt>{' '}
            <dd className="text-ink-muted inline">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

// ─── Verify tab ────────────────────────────────────────────────────────────

function VerifyTab({ conv, verification, onRun }: { conv: Conversation; verification: PaymentVerification | null; onRun: (f: string) => void }) {
  const mediaMessages = conv.messages.filter((m) => m.media);
  return (
    <div className="divide-y divide-line-soft">
      <Section title="Payment proofs in this chat">
        {mediaMessages.length === 0 ? (
          <div className="text-2xs text-ink-dim">No payment screenshots or PDFs received yet.</div>
        ) : (
          <ul className="space-y-2">
            {mediaMessages.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <FileImage className="w-3.5 h-3.5 text-ink-dim" />
                <span className="text-xs font-mono text-ink-muted flex-1 truncate">{m.media!.filename}</span>
                <Button variant="ghost" size="sm" onClick={() => onRun(m.media!.filename)}>
                  <ShieldCheck className="w-3 h-3" /> Verify
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {verification && (
        <Section title={verification.is_authentic ? 'Authentic' : 'Suspicious'}>
          <div className={cn('p-3 rounded border', verification.is_authentic ? 'bg-good/5 border-good/30' : 'bg-bad/5 border-bad/30')}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl text-gold numeric">{verification.verification_score}<span className="text-ink-dim text-sm">%</span></span>
                <Badge tone={verification.is_authentic ? 'good' : 'bad'}>{verification.action.replace(/_/g, ' ')}</Badge>
              </div>
              <Badge tone="info">{verification.bank_detected}</Badge>
            </div>
            <p className="text-2xs text-ink-muted">{verification.reasoning}</p>
          </div>
          {verification.discrepancies.length > 0 && (
            <div className="mt-3">
              <div className="label mb-1.5">Discrepancies</div>
              <ul className="space-y-1">
                {verification.discrepancies.map((d, i) => (
                  <li key={i} className="text-2xs text-ink-muted flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 text-bad mt-0.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-line-soft">
            <div className="label mb-1.5">Metadata</div>
            <div className="grid grid-cols-3 gap-1.5 text-2xs">
              <MetaDot label="Status bar" ok={verification.metadata_consistency.status_bar_match} />
              <MetaDot label="Resolution" ok={verification.metadata_consistency.resolution_match} />
              <MetaDot label="Timestamp" ok={verification.metadata_consistency.timestamp_match} />
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function MetaDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Dot tone={ok ? 'good' : 'bad'} />
      <span className="text-ink-muted">{label}</span>
    </div>
  );
}

// ─── Magazine tab ──────────────────────────────────────────────────────────

function MagazineTab({ magazine, onRun, card }: { magazine: Magazine | null; onRun: () => void; card: CustomerCard }) {
  if (!magazine) {
    return (
      <div className="p-6 text-center">
        <div className="p-3 rounded-full bg-canvas-inset border border-line inline-flex mb-3">
          <BookOpen className="w-5 h-5 text-ink-dim" />
        </div>
        <div className="text-sm text-ink mb-1">Personalized magazine</div>
        <p className="text-2xs text-ink-dim mb-3 max-w-xs mx-auto">
          A post-purchase digital editorial featuring this customer&apos;s piece + a matched Limited Edition based on their browse history.
        </p>
        <Button variant="primary" size="sm" onClick={onRun}>
          <Sparkles className="w-3.5 h-3.5" /> Generate
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <div className="text-2xs uppercase tracking-widest text-gold mb-1">LE Issue 24 · {card.display_name}</div>
        <h3 className="font-serif text-xl font-medium text-ink leading-tight">{magazine.magazine_headline}</h3>
      </div>
      <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">{magazine.editorial_content}</div>
      <div className="p-3 rounded bg-gold/5 border border-gold/20">
        <div className="text-2xs text-gold uppercase tracking-widest mb-1">Featured LE</div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink font-mono">{magazine.featured_limited_edition_sku}</span>
          <Badge tone="gold">code {magazine.cashback_code}</Badge>
        </div>
      </div>
      <div className="text-2xs text-ink-dim">Generated {magazine.generated_at}</div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <div className="label mb-2">{title}</div>
      {children}
    </div>
  );
}

function Pill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-2xs border', ok ? 'bg-good/10 text-good border-good/30' : 'bg-bad/10 text-bad border-bad/30')}>
      <Dot tone={ok ? 'good' : 'bad'} />
      {label}
    </div>
  );
}
