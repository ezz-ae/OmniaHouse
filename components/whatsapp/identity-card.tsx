import { Badge, Dot } from '@/components/ui/badge';
import { StoreChip } from '@/components/ui/store-chip';
import { cn, formatAED } from '@/lib/utils';
import { maskPhoneForLogs } from '@/lib/whatsapp/routing';
import type { CustomerCard } from '@/lib/whatsapp/types';
import { ShieldCheck, ShieldAlert, Sparkles, Eye, ShoppingCart, History, Wallet, MapPin, AlertTriangle } from 'lucide-react';

/**
 * Loads BEFORE the agent types. Shows cross-store unified history, ghost
 * browse data linked through crm_identity_links, cashback wallet (LE-only),
 * labels, and warnings — so the agent walks into the conversation already
 * knowing the customer.
 */
export function IdentityCard({ card }: { card: CustomerCard }) {
  return (
    <div className="panel divide-y divide-line-soft">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-ink truncate">
                {card.display_name || <span className="italic text-ink-dim">Unknown sender</span>}
              </h3>
              {card.matched ? (
                <Badge tone="good">
                  <ShieldCheck className="w-3 h-3" /> Matched
                </Badge>
              ) : (
                <Badge tone="warn">
                  <ShieldAlert className="w-3 h-3" /> New
                </Badge>
              )}
              {card.history?.vip_flag && <Badge tone="gold">VIP</Badge>}
            </div>
            <div className="text-2xs font-mono text-ink-dim mt-1">{maskPhoneForLogs(card.phone)} · {card.country}</div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge tone="info">{card.language_pref.toUpperCase()}</Badge>
            {card.labels.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1 mt-1 max-w-[160px]">
                {card.labels.map((l) => (
                  <Badge key={l} tone="neutral">{l}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      {card.history ? (
        <div className="p-4">
          <div className="label mb-2 flex items-center gap-1.5">
            <History className="w-3 h-3" /> Cross-store history
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Orders" value={`${card.history.orders}`} />
            <Stat label="LTV" value={formatAED(card.history.ltv_aed, { compact: true })} tone="gold" />
            <Stat label="Last" value={card.history.last_at} />
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs text-ink-dim">on</span>
            {[...new Set(card.history.stores)].map((s) => (
              <StoreChip key={s} store={s} />
            ))}
            {card.history.prior_returns > 0 && (
              <Badge tone="warn">{card.history.prior_returns} return{card.history.prior_returns > 1 ? 's' : ''}</Badge>
            )}
            {card.history.refund_requests > 0 && (
              <Badge tone="bad">{card.history.refund_requests} refund req</Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 text-2xs text-ink-dim">
          No prior orders on either store. New customer.
        </div>
      )}

      {/* Ghost browse (linked via crm_identity_links) */}
      {card.ghost && (card.ghost.pages_viewed.length > 0 || card.ghost.cart_adds_no_checkout.length > 0) && (
        <div className="p-4">
          <div className="label mb-2 flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Ghost browse
            <span className="text-2xs text-ink-dim normal-case tracking-normal">
              · {card.ghost.sessions} session{card.ghost.sessions === 1 ? '' : 's'} since {card.ghost.first_seen_at}
            </span>
          </div>
          {card.ghost.pages_viewed.length > 0 && (
            <ul className="space-y-1.5 mb-2">
              {card.ghost.pages_viewed.slice(0, 3).map((p) => (
                <li key={p.sku} className="flex items-center gap-2 text-2xs">
                  <Sparkles className="w-3 h-3 text-gold shrink-0" />
                  <span className="flex-1 min-w-0 text-ink-muted truncate">{p.title}</span>
                  <span className="text-ink-dim numeric shrink-0">{p.views}×</span>
                </li>
              ))}
            </ul>
          )}
          {card.ghost.cart_adds_no_checkout.length > 0 && (
            <ul className="space-y-1.5 pt-2 border-t border-line-soft">
              {card.ghost.cart_adds_no_checkout.slice(0, 2).map((c) => (
                <li key={c.sku} className="flex items-center gap-2 text-2xs">
                  <ShoppingCart className="w-3 h-3 text-warn shrink-0" />
                  <span className="flex-1 min-w-0 text-ink-muted truncate">{c.title}</span>
                  <span className="text-ink-dim shrink-0">{c.at}</span>
                </li>
              ))}
            </ul>
          )}
          {card.ghost.abandoned_carts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-line-soft flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-bad shrink-0" />
              <span className="text-2xs text-ink-muted">
                Abandoned{' '}
                <span className="text-bad numeric">
                  {formatAED(card.ghost.abandoned_carts.reduce((s, a) => s + a.value_aed, 0), { compact: true })}
                </span>{' '}
                {card.ghost.abandoned_carts[0].at}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Wallet (LE-restricted) */}
      {card.wallet && (
        <div className="p-4">
          <div className="label mb-2 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Cashback wallet
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-xl text-gold numeric">{formatAED(card.wallet.balance_aed)}</span>
            <span className="text-2xs text-ink-dim">Limited Editions only</span>
          </div>
          {card.wallet.recent.length > 0 && (
            <div className="mt-2 pt-2 border-t border-line-soft space-y-1">
              {card.wallet.recent.slice(0, 2).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-2xs">
                  <span className="text-ink-muted truncate">{t.note}</span>
                  <span className={cn('numeric shrink-0', t.type === 'accrual' ? 'text-good' : 'text-bad')}>
                    {t.type === 'accrual' ? '+' : '-'}
                    {formatAED(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {card.warnings.length > 0 && (
        <div className="p-4 bg-bad/5">
          <div className="label mb-2 flex items-center gap-1.5 text-bad">
            <AlertTriangle className="w-3 h-3" /> Watch out
          </div>
          <ul className="space-y-1.5">
            {card.warnings.map((w, i) => (
              <li key={i} className="text-2xs">
                <span className="font-medium text-ink uppercase tracking-widest">{w.type.replace(/_/g, ' ')}</span>{' '}
                — <span className="text-ink-muted">{w.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'gold' }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-ink-dim mb-0.5">{label}</div>
      <div className={cn('font-serif text-base font-medium numeric', tone === 'gold' && 'text-gold')}>{value}</div>
    </div>
  );
}
