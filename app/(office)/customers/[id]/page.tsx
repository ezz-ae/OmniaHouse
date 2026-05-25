'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, Brain, Building2, CalendarClock, Check, ChevronDown,
  ClipboardCheck, Clock3, DollarSign, FileText, Globe, Heart, Instagram, Layers, Loader2, Lock,
  MessageSquare, Phone, Plus, RadioTower, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Store,
  TrendingUp, Truck, UserCheck, Users, WalletCards, Workflow,
} from 'lucide-react';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { CopyablePhone } from '@/components/whatsapp/copyable-phone';
import type { UnifiedProfile, ChannelKey } from '@/lib/customers/unified-profile';

type PlatformResult = {
  configured: boolean;
  customer: any | null;
  orders: any[];
  reason?: string;
};

type ApiResponse = {
  ok: boolean;
  profile?: UnifiedProfile;
  platforms?: { shopify: PlatformResult; woocommerce: PlatformResult };
  integration_status?: { shopify_configured: boolean; woocommerce_configured: boolean };
  error?: string;
};

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(String(params?.id || ''));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(id)}/profile`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (err: any) {
      setData({ ok: false, error: err?.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runAction(label: string, endpoint: string, body: any, method: 'POST' | 'PATCH' = 'POST', confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(label); setNotice(null);
    try {
      const res = await fetch(endpoint, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setNotice(json.ok ? `${label} · done` : `${label} · ${json.error || 'failed'}`);
      if (json.ok) await load();
    } catch (err: any) {
      setNotice(`${label} · ${err?.message || 'failed'}`);
    } finally { setBusy(null); }
  }

  if (loading && !data) {
    return (
      <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col">
        <DeskTopBar />
        <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading customer 360…
        </div>
      </div>
    );
  }
  if (!data?.ok || !data.profile) {
    return (
      <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col">
        <DeskTopBar />
        <div className="flex-1 flex items-center justify-center text-sm text-rose-400">
          {data?.error || 'Customer not found'}
        </div>
      </div>
    );
  }

  const p = data.profile;
  const platforms = data.platforms;
  const integration = data.integration_status;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans">
      <DeskTopBar />

      {/* Breadcrumb + actions */}
      <div className="border-b border-zinc-800 px-6 md:px-10 py-3 flex items-center gap-2 text-xs text-zinc-400">
        <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-zinc-100">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="text-zinc-600">/</span>
        <Link href="/customers" className="hover:text-zinc-100">Customers</Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-100">{p.customer.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} className="h-8 px-3 rounded border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-zinc-100 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="px-6 md:px-10 py-6 max-w-[1640px] mx-auto space-y-4">
        {/* Identity header */}
        <Header
          profile={p}
          busy={busy}
          onToggleVip={() => runAction('VIP toggled', `/api/customers/unify`, { id: p.customer.id, vip: !p.customer.vip })}
          onToggleConsent={() => runAction('Consent toggled', `/api/customers/unify`, { id: p.customer.id, marketing_consent: !p.consent.marketing })}
          onCreateFollowUp={() => runAction('Follow-up created', '/api/customers/followup', { customer_id: p.customer.id, reason: 'Manual follow-up from Customer 360', channel: 'whatsapp' })}
          onRetarget={() => runAction('Retargeting created', '/api/marketing/retarget', { customer_id: p.customer.id, channel: 'meta', audience: 'lookalike_high_value', reason: 'From Customer 360' })}
        />

        {notice && (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 px-3 py-2">
            {notice}
          </div>
        )}

        {/* Top metrics */}
        <MetricsGrid profile={p} />

        {/* Segments + tags */}
        <Segments profile={p} />

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
          <div className="space-y-4 min-w-0">
            <ChannelsCard channels={p.channels} integration={integration} platforms={platforms} />
            <OrdersCard orders={p.orders} platforms={platforms} />
            <ConversationsCard conversations={p.conversations} customerId={p.customer.id} />
            <TimelineCard timeline={p.timeline} />
          </div>
          <div className="space-y-4 min-w-0">
            <WalletCard wallet={p.wallet} />
            <WarningsCard warnings={p.warnings} consent={p.consent} />
            <FollowupsCard followups={p.followups} customerId={p.customer.id} onUpdate={load} />
            <SignalsCard signals={p.signals} />
            <GhostCard ghost={p.ghost} />
            <TopSkusCard skus={p.metrics.top_skus} />
            <RetargetingCard rows={p.retargeting} />
            <NotesCard notes={p.notes} />
          </div>
        </div>

        <div className="text-2xs text-zinc-600 text-right">
          Profile · generated {new Date(p.generated_at).toLocaleString('en-AE', { hour12: false })}
        </div>
      </div>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────

function Header({
  profile, busy, onToggleVip, onToggleConsent, onCreateFollowUp, onRetarget,
}: {
  profile: UnifiedProfile; busy: string | null;
  onToggleVip: () => void; onToggleConsent: () => void;
  onCreateFollowUp: () => void; onRetarget: () => void;
}) {
  const name = profile.customer.name;
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col 2xl:flex-row gap-4 2xl:items-center">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-full bg-zinc-800 text-zinc-100 text-xl font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-100 truncate">{name}</h1>
              {profile.customer.vip && <span className="rounded border border-violet-500/40 bg-violet-500/10 text-violet-300 px-1.5 py-0.5 text-2xs font-medium">VIP</span>}
              {profile.consent.marketing
                ? <span className="rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 text-2xs">marketing opt-in</span>
                : <span className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 px-1.5 py-0.5 text-2xs">marketing opt-out</span>}
              {profile.warnings.some((w) => w.severity === 'bad') && (
                <span className="rounded border border-rose-500/40 bg-rose-500/15 text-rose-300 px-1.5 py-0.5 text-2xs flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> risk
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><CopyablePhone phone={profile.customer.phone} size="xs" /></span>
              {profile.customer.email && (
                <span className="flex items-center gap-1 truncate"><Globe className="w-3 h-3" /> {profile.customer.email}</span>
              )}
              <span className="text-zinc-500">{profile.customer.country} · {profile.customer.language.toUpperCase()}</span>
              {profile.customer.city && <span className="text-zinc-500">· {profile.customer.city}</span>}
              <span className="text-zinc-500">· source {profile.customer.source}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ActionButton onClick={onCreateFollowUp} busy={busy === 'Follow-up created'} icon={CalendarClock} label="Follow-up" tone="sky" />
          <ActionButton onClick={onRetarget} busy={busy === 'Retargeting created'} icon={Sparkles} label="Retarget" tone="violet" disabled={!profile.consent.marketing} />
          <ActionButton onClick={onToggleVip} busy={busy === 'VIP toggled'} icon={BadgeCheck} label={profile.customer.vip ? 'Remove VIP' : 'Mark VIP'} tone={profile.customer.vip ? 'zinc' : 'violet'} />
          <ActionButton onClick={onToggleConsent} busy={busy === 'Consent toggled'} icon={ShieldCheck} label={profile.consent.marketing ? 'Opt-out' : 'Opt-in'} tone={profile.consent.marketing ? 'rose' : 'emerald'} />
          <Link href={`/whatsapp-desk?customer=${profile.customer.id}`} className="h-8 px-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Open WhatsApp
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricsGrid({ profile }: { profile: UnifiedProfile }) {
  const m = profile.metrics;
  const stats = [
    { label: 'LTV', value: `AED ${m.ltv_aed.toLocaleString()}`, tone: 'emerald' },
    { label: 'AOV', value: `AED ${m.aov_aed.toLocaleString()}`, tone: 'sky' },
    { label: 'Orders', value: `${m.orders_count}`, sub: `${m.paid_orders} paid · ${m.refund_count} refunds`, tone: 'zinc' },
    { label: 'Upsell orders', value: `${m.upsell_orders}`, sub: `${m.objection_count} objections`, tone: 'amber' },
    { label: 'Wallet available', value: `AED ${profile.wallet.available_aed.toLocaleString()}`, sub: profile.wallet.le_only ? 'LE-only' : 'unrestricted', tone: 'violet' },
    { label: 'Happiness', value: m.happiness_avg !== null ? `${m.happiness_avg}/10` : '—', sub: `${m.message_count} msgs · ${m.agent_outgoing_count} sent`, tone: (m.happiness_avg ?? 0) >= 7 ? 'emerald' : (m.happiness_avg ?? 0) >= 5 ? 'amber' : 'rose' },
    { label: 'Ghost sessions', value: `${m.ghost_sessions}`, sub: 'site behaviour', tone: 'sky' },
    { label: 'Days since order', value: m.days_since_last_order !== null ? `${m.days_since_last_order}d` : '—', sub: m.last_touch_at ? `last touch ${new Date(m.last_touch_at).toLocaleDateString('en-AE')}` : '—', tone: 'zinc' },
    { label: 'Payment mix', value: `${m.cod_count}/${m.bnpl_count}/${m.card_count}`, sub: 'COD · BNPL · Card', tone: 'sky' },
    { label: 'Channels active', value: `${profile.channels.length}`, sub: profile.channels.map((c) => c.channel).join(' · '), tone: 'violet' },
    { label: 'Refund rate', value: m.orders_count > 0 ? `${Math.round((m.refund_count / m.orders_count) * 100)}%` : '0%', sub: `${m.refund_count} of ${m.orders_count}`, tone: m.refund_count > 1 ? 'rose' : 'emerald' },
    { label: 'First seen', value: m.first_seen_at ? new Date(m.first_seen_at).toLocaleDateString('en-AE') : '—', sub: profile.customer.source, tone: 'zinc' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
          <div className="text-2xs uppercase tracking-wider text-zinc-500 truncate">{s.label}</div>
          <div className={`mt-1 text-base font-semibold tabular-nums ${toneText(s.tone)}`}>{s.value}</div>
          {s.sub && <div className="mt-0.5 text-2xs text-zinc-500 truncate">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Segments({ profile }: { profile: UnifiedProfile }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 flex flex-wrap items-center gap-1.5">
      <span className="text-2xs uppercase tracking-wider text-zinc-500">Segments</span>
      {profile.segments.map((s) => (
        <span key={s} className="text-2xs px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-950 text-zinc-300">{s}</span>
      ))}
      {profile.customer.tags.map((t) => (
        <span key={`tag-${t}`} className="text-2xs px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-zinc-400">#{t}</span>
      ))}
      {profile.segments.length === 0 && profile.customer.tags.length === 0 && <span className="text-2xs text-zinc-500">No segments yet — created from orders, signals, wallet, and consent.</span>}
    </div>
  );
}

function ChannelsCard({
  channels, integration, platforms,
}: {
  channels: UnifiedProfile['channels'];
  integration?: { shopify_configured: boolean; woocommerce_configured: boolean };
  platforms?: { shopify: PlatformResult; woocommerce: PlatformResult };
}) {
  return (
    <Card icon={Layers} title="Channels" subtitle="Every place we've seen this customer.">
      <table className="w-full text-xs">
        <thead className="text-2xs uppercase text-zinc-500">
          <tr>
            <th className="text-left py-1">Channel</th>
            <th className="text-left py-1">Identity</th>
            <th className="text-right py-1">Interactions</th>
            <th className="text-left py-1 pl-3">Last activity</th>
            <th className="text-left py-1 pl-3">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {channels.map((c) => (
            <tr key={c.channel}>
              <td className="py-2 flex items-center gap-2 text-zinc-200"><ChannelIcon kind={c.channel} /> <span className="capitalize">{c.channel.replace('_', ' ')}</span></td>
              <td className="py-2 text-zinc-400 font-mono truncate max-w-[200px]">{c.platform_id || '—'}</td>
              <td className="py-2 text-right text-zinc-300 numeric">{c.interactions}</td>
              <td className="py-2 pl-3 text-zinc-400 numeric">{c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString('en-AE') : '—'}</td>
              <td className="py-2 pl-3 text-zinc-400 truncate">{c.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-2xs">
        <PlatformStatus label="Shopify Admin" configured={integration?.shopify_configured} platform={platforms?.shopify} />
        <PlatformStatus label="WooCommerce" configured={integration?.woocommerce_configured} platform={platforms?.woocommerce} />
      </div>
    </Card>
  );
}

function PlatformStatus({ label, configured, platform }: { label: string; configured?: boolean; platform?: PlatformResult }) {
  if (!configured) {
    return (
      <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5">
        <div className="text-amber-300 font-medium">{label} · not connected</div>
        <div className="text-zinc-500">{platform?.reason || 'Add API keys to Vercel'}</div>
      </div>
    );
  }
  if (!platform?.customer) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5">
        <div className="text-zinc-300 font-medium">{label} · connected</div>
        <div className="text-zinc-500">{platform?.reason || 'No matching customer'}</div>
      </div>
    );
  }
  return (
    <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5">
      <div className="text-emerald-300 font-medium">{label} · live</div>
      <div className="text-zinc-400">{platform.customer.orders_count} orders · AED {Math.round(platform.customer.total_spent_aed).toLocaleString()} spent · id {platform.customer.id}</div>
    </div>
  );
}

function OrdersCard({
  orders, platforms,
}: {
  orders: UnifiedProfile['orders'];
  platforms?: { shopify: PlatformResult; woocommerce: PlatformResult };
}) {
  const platformOrders = [
    ...(platforms?.shopify?.orders?.slice(0, 5) || []).map((o: any) => ({
      id: `shop-${o.id}`, target_store: 'shopify' as const, status: o.financial_status,
      payment_status: o.financial_status, payment_method: 'shopify_admin',
      total_aed: o.total_aed, lines: o.line_items?.length || 0,
      flags: [], created_at: o.created_at, assignee: null, source: 'live',
    })),
    ...(platforms?.woocommerce?.orders?.slice(0, 5) || []).map((o: any) => ({
      id: `woo-${o.id}`, target_store: 'woocommerce' as const, status: o.status,
      payment_status: o.status, payment_method: o.payment_method,
      total_aed: o.total_aed, lines: o.line_items?.length || 0,
      flags: [], created_at: o.created_at, assignee: null, source: 'live',
    })),
  ];
  const combined = [...orders.map((o) => ({ ...o, source: 'house' as const })), ...platformOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);

  return (
    <Card icon={Store} title={`Orders (${combined.length})`} subtitle="Internal + Shopify Admin + WooCommerce REST, merged.">
      {combined.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-6">No orders yet for this customer.</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-2xs uppercase text-zinc-500">
            <tr>
              <th className="text-left py-1">Order</th>
              <th className="text-left py-1">Store</th>
              <th className="text-left py-1">Payment</th>
              <th className="text-right py-1">Total</th>
              <th className="text-right py-1">Lines</th>
              <th className="text-left py-1 pl-3">Status</th>
              <th className="text-left py-1 pl-3">Date</th>
              <th className="text-right py-1">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {combined.map((o) => (
              <tr key={o.id}>
                <td className="py-2 text-zinc-200 font-mono truncate max-w-[140px]">{o.id}</td>
                <td className="py-2 text-zinc-400">{o.target_store === 'shopify' ? '.ae' : '.com'}</td>
                <td className="py-2 text-zinc-400 truncate">{o.payment_method}</td>
                <td className="py-2 text-right text-zinc-200 numeric">AED {o.total_aed.toLocaleString()}</td>
                <td className="py-2 text-right text-zinc-400 numeric">{o.lines}</td>
                <td className="py-2 pl-3"><StatusPill value={o.status} /></td>
                <td className="py-2 pl-3 text-zinc-400 numeric">{new Date(o.created_at).toLocaleDateString('en-AE')}</td>
                <td className="py-2 text-right text-2xs uppercase tracking-wider"><span className={(o as any).source === 'live' ? 'text-emerald-400' : 'text-zinc-500'}>{(o as any).source}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone =
    /paid|fulfilled|approved|won|completed/i.test(value) ? 'emerald'
    : /refund|cancel|rejected|fail/i.test(value) ? 'rose'
    : /pending|payment|draft|awaiting/i.test(value) ? 'amber'
    : 'zinc';
  return <span className={`rounded border px-1.5 py-0.5 text-2xs capitalize ${tonePill(tone)}`}>{value.replace(/_/g, ' ')}</span>;
}

function ConversationsCard({ conversations, customerId }: { conversations: UnifiedProfile['conversations']; customerId: string }) {
  return (
    <Card icon={MessageSquare} title={`Conversations (${conversations.length})`} subtitle="WhatsApp chats — claim state, happiness, response load.">
      {conversations.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-6">No WhatsApp conversations yet.</div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/whatsapp-desk?conv=${c.id}`}
              className="block rounded border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${happinessDot(c.happiness)}`} />
                <span className="font-mono text-xs text-zinc-200">{c.phone}</span>
                <span className="text-2xs text-zinc-500">· {c.language.toUpperCase()}</span>
                {c.claimed_by && <span className="text-2xs text-emerald-300">· owned by {c.claimed_by}</span>}
                {!c.claimed_by && <span className="text-2xs text-amber-400">· unclaimed</span>}
                <span className="ml-auto text-2xs text-zinc-500">{c.last_at}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-2xs text-zinc-500">
                <span>{c.message_count} msgs</span>
                <span>{c.outgoing_count} sent by team</span>
                {c.unread > 0 && <span className="text-rose-400">{c.unread} unread</span>}
                <span className="capitalize">{c.status.replace(/_/g, ' ')}</span>
                <span className="text-zinc-600">· happiness {c.happiness}/10 · urgency {c.urgency}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function TimelineCard({ timeline }: { timeline: UnifiedProfile['timeline'] }) {
  return (
    <Card icon={Clock3} title={`Activity timeline (${timeline.length})`} subtitle="Every order, signal, wallet move, follow-up, and outgoing message — newest first.">
      {timeline.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-6">No activity yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {timeline.slice(0, 40).map((e, idx) => (
            <li key={`${e.at}-${idx}`} className="flex gap-2 text-xs">
              <span className="w-20 shrink-0 text-2xs text-zinc-500 numeric">{new Date(e.at).toLocaleString('en-AE', { hour12: false, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="w-24 shrink-0 text-2xs uppercase tracking-wider text-zinc-500 flex items-center gap-1"><ChannelIcon kind={e.channel as any} small />{e.channel}</span>
              <span className="text-zinc-300 truncate flex-1">{e.action.replace(/_/g, ' ')} · <span className="text-zinc-500">{e.detail}</span></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function WalletCard({ wallet }: { wallet: UnifiedProfile['wallet'] }) {
  return (
    <Card icon={WalletCards} title="Cashback wallet" subtitle={wallet.le_only ? 'LE-redeemable balance.' : 'Unrestricted.'}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Available" value={`AED ${wallet.available_aed.toLocaleString()}`} tone="emerald" />
        <Stat label="Pending" value={`AED ${wallet.pending_aed.toLocaleString()}`} tone="amber" />
        <Stat label="Held" value={`AED ${wallet.held_aed.toLocaleString()}`} tone="rose" />
        <Stat label="Redeemed" value={`AED ${wallet.redeemed_aed.toLocaleString()}`} tone="zinc" />
      </div>
      {wallet.entries.length > 0 ? (
        <div className="mt-3 space-y-1">
          {wallet.entries.slice(0, 6).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-2xs">
              <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'available' ? 'bg-emerald-400' : e.status === 'pending' ? 'bg-amber-400' : 'bg-zinc-600'}`} />
              <span className="text-zinc-300 flex-1 truncate">{e.reason}</span>
              <span className="text-zinc-100 numeric">AED {e.amount_aed.toLocaleString()}</span>
              <span className="text-zinc-500 numeric">{new Date(e.created_at).toLocaleDateString('en-AE')}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 mt-3">No wallet entries yet.</div>
      )}
    </Card>
  );
}

function WarningsCard({ warnings, consent }: { warnings: UnifiedProfile['warnings']; consent: UnifiedProfile['consent'] }) {
  return (
    <Card icon={ShieldAlert} title="Risk & consent" subtitle="Flags that change approval, marketing, and shipping decisions.">
      <div className="space-y-1.5 text-xs">
        {warnings.length === 0 && <div className="text-zinc-500 text-center py-3">No risk flags.</div>}
        {warnings.map((w, idx) => (
          <div key={idx} className={`rounded border px-2 py-1.5 flex items-start gap-2 ${
            w.severity === 'bad' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            : w.severity === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div><div className="font-medium capitalize">{w.type.replace(/_/g, ' ')}</div><div className="text-zinc-400">{w.note}</div></div>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2">
          <div className={`rounded border px-2 py-1.5 ${consent.marketing ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'}`}>
            <div className="text-2xs uppercase tracking-wider">Marketing</div>
            <div>{consent.marketing ? 'Opt-in' : 'Opt-out'}</div>
          </div>
          <div className={`rounded border px-2 py-1.5 ${consent.whatsapp_promotional ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'}`}>
            <div className="text-2xs uppercase tracking-wider">WhatsApp promo</div>
            <div>{consent.whatsapp_promotional ? 'Allowed' : 'Blocked'}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FollowupsCard({ followups, customerId, onUpdate }: { followups: UnifiedProfile['followups']; customerId: string; onUpdate: () => void }) {
  async function setStatus(id: string, status: string) {
    await fetch('/api/customers/followup', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    onUpdate();
  }
  return (
    <Card icon={CalendarClock} title={`Follow-ups (${followups.length})`} subtitle="Open tasks tied to this customer.">
      {followups.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-3">No follow-ups.</div>
      ) : (
        <div className="space-y-1.5">
          {followups.map((f) => (
            <div key={f.id} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={`text-2xs px-1.5 py-0.5 rounded border ${f.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : f.status === 'in_progress' ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>{f.status}</span>
                <span className="text-zinc-200 flex-1 truncate">{f.reason}</span>
                <span className="text-2xs text-zinc-500">{f.channel}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-2xs text-zinc-500">
                <span>due {new Date(f.due).toLocaleDateString('en-AE')}</span>
                {f.assignee && <span>· {f.assignee}</span>}
                {f.status !== 'done' && (
                  <button onClick={() => setStatus(f.id, 'done')} className="ml-auto text-emerald-400 hover:text-emerald-300">mark done →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SignalsCard({ signals }: { signals: UnifiedProfile['signals'] }) {
  return (
    <Card icon={RadioTower} title={`Brand signals (${signals.length})`} subtitle="Ghost browse, objections, demand spikes for this customer.">
      {signals.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-3">No tied signals.</div>
      ) : (
        <div className="space-y-1.5">
          {signals.map((s) => (
            <div key={s.id} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${s.tone === 'positive' ? 'bg-emerald-400' : s.tone === 'negative' ? 'bg-rose-400' : 'bg-sky-400'}`} />
                <span className="text-zinc-200 flex-1 truncate">{s.summary}</span>
                <span className="text-2xs text-zinc-500 capitalize">{s.kind.replace('_', ' ')}</span>
              </div>
              {s.recommended_action && <div className="mt-0.5 text-2xs text-zinc-500">{s.recommended_action}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function GhostCard({ ghost }: { ghost: UnifiedProfile['ghost'] }) {
  if (!ghost) return null;
  return (
    <Card icon={Brain} title="Ghost browse" subtitle="Anonymous site behaviour tied via phone/identity match.">
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <Stat label="Sessions" value={String(ghost.sessions)} tone="sky" />
        <Stat label="SKUs viewed" value={String(ghost.pages_viewed.length)} tone="zinc" />
        <Stat label="Abandoned" value={String(ghost.abandoned_carts.length)} tone="amber" />
      </div>
      <div className="space-y-1">
        {ghost.pages_viewed.slice(0, 5).map((p) => (
          <div key={p.sku} className="flex items-center gap-2 text-2xs">
            <span className="font-mono text-emerald-400">{p.sku}</span>
            <span className="text-zinc-300 flex-1 truncate">{p.title}</span>
            <span className="text-zinc-500 numeric">{p.views} views</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TopSkusCard({ skus }: { skus: UnifiedProfile['metrics']['top_skus'] }) {
  return (
    <Card icon={TrendingUp} title="Top SKUs" subtitle="What this customer actually buys, ranked by revenue.">
      {skus.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-3">No orders to rank yet.</div>
      ) : (
        <div className="space-y-1">
          {skus.map((s) => (
            <div key={s.sku} className="flex items-center gap-2 text-2xs">
              <span className="font-mono text-emerald-400 w-20 shrink-0">{s.sku}</span>
              <span className="text-zinc-200 flex-1 truncate">{s.title}</span>
              <span className="text-zinc-500 numeric">×{s.qty}</span>
              <span className="text-zinc-100 numeric">AED {s.revenue_aed.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RetargetingCard({ rows }: { rows: UnifiedProfile['retargeting'] }) {
  return (
    <Card icon={Sparkles} title={`Retargeting (${rows.length})`} subtitle="Active audiences and reasons.">
      {rows.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-3">Not retargeted yet.</div>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.id} className="text-2xs">
              <span className="font-mono text-violet-300">{r.channel}</span>
              <span className="text-zinc-200 mx-1">· {r.audience}</span>
              <span className="text-zinc-500">— {r.reason}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NotesCard({ notes }: { notes: UnifiedProfile['notes'] }) {
  if (notes.length === 0) return null;
  return (
    <Card icon={FileText} title="Internal notes" subtitle="Notes from the team — visible only to OmniaHouse roles.">
      <div className="space-y-1.5 text-xs">
        {notes.map((n, idx) => (
          <div key={idx} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5">
            <div className="flex items-center gap-2 text-2xs text-zinc-500"><span className="font-medium text-zinc-300">{n.author}</span><span>· {new Date(n.at).toLocaleDateString('en-AE')}</span></div>
            <div className="text-zinc-200 mt-0.5">{n.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────

function Card({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-zinc-100">{title}</span>
      </div>
      <div className="text-xs text-zinc-500 mb-3">{subtitle}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded border px-2.5 py-1.5 ${toneSoft(tone)}`}>
      <div className="text-2xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold ${toneText(tone)}`}>{value}</div>
    </div>
  );
}

function ActionButton({ onClick, busy, icon: Icon, label, tone, disabled }: { onClick: () => void; busy?: boolean; icon: React.ComponentType<{ className?: string }>; label: string; tone: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`h-8 px-3 rounded text-xs font-medium border flex items-center gap-2 disabled:opacity-50 ${tonePill(tone)}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function ChannelIcon({ kind, small }: { kind: ChannelKey | 'house' | 'system'; small?: boolean }) {
  const cls = small ? 'w-3 h-3' : 'w-3.5 h-3.5';
  switch (kind) {
    case 'whatsapp': return <MessageSquare className={`${cls} text-emerald-400`} />;
    case 'shopify': return <Store className={`${cls} text-emerald-400`} />;
    case 'woocommerce': return <Store className={`${cls} text-sky-400`} />;
    case 'instagram': return <Instagram className={`${cls} text-rose-400`} />;
    case 'meta_ads': return <RadioTower className={`${cls} text-sky-400`} />;
    case 'website': return <Globe className={`${cls} text-violet-400`} />;
    case 'email': return <FileText className={`${cls} text-zinc-400`} />;
    case 'house': return <Building2 className={`${cls} text-zinc-400`} />;
    default: return <Workflow className={`${cls} text-zinc-500`} />;
  }
}

function happinessDot(level: number) {
  if (level >= 8) return 'bg-emerald-400';
  if (level >= 6) return 'bg-sky-400';
  if (level >= 4) return 'bg-amber-400';
  return 'bg-rose-400';
}

function toneText(tone: string) {
  if (tone === 'emerald') return 'text-emerald-400';
  if (tone === 'amber') return 'text-amber-400';
  if (tone === 'rose') return 'text-rose-400';
  if (tone === 'sky') return 'text-sky-400';
  if (tone === 'violet') return 'text-violet-400';
  return 'text-zinc-200';
}

function tonePill(tone: string) {
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20';
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20';
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20';
  if (tone === 'sky') return 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20';
  if (tone === 'violet') return 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20';
  return 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800';
}

function toneSoft(tone: string) {
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/5';
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/5';
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/5';
  if (tone === 'sky') return 'border-sky-500/30 bg-sky-500/5';
  if (tone === 'violet') return 'border-violet-500/30 bg-violet-500/5';
  return 'border-zinc-800 bg-zinc-950';
}
