'use client';

import { Badge, Dot } from '@/components/ui/badge';
import { StoreChip } from '@/components/ui/store-chip';
import { cn, formatAED } from '@/lib/utils';
import { maskPhoneForLogs } from '@/lib/whatsapp/routing';
import type { CustomerCard } from '@/lib/whatsapp/types';
import { ShieldCheck, ShieldAlert, Crown, Wallet } from 'lucide-react';

/**
 * Slim, one-row header above the conversation.
 *
 * Everything fits on a single horizontal line at ~48px tall:
 *   name · matched/new · phone · country · language · wallet · labels
 *
 * Detail sections (cross-store, ghost browse, wallet ledger, warnings)
 * live in the "Customer" tab of the AI panel — they're context, not the
 * workspace. The workspace is the conversation itself.
 */
export function IdentityStrip({
  card,
  onOpenDetails,
}: {
  card: CustomerCard;
  onOpenDetails?: () => void;
}) {
  const hasWallet = card.wallet && card.wallet.balance_aed > 0;

  return (
    <button
      onClick={onOpenDetails}
      className="w-full h-14 px-4 flex items-center gap-3 hover:bg-canvas-inset/40 transition-colors text-left"
    >
      {/* Status icon */}
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border',
          card.matched
            ? card.history?.vip_flag
              ? 'bg-gold/15 border-gold/30 text-gold'
              : 'bg-good/15 border-good/30 text-good'
            : 'bg-warn/15 border-warn/30 text-warn',
        )}
      >
        {card.history?.vip_flag ? (
          <Crown className="w-4 h-4" />
        ) : card.matched ? (
          <ShieldCheck className="w-4 h-4" />
        ) : (
          <ShieldAlert className="w-4 h-4" />
        )}
      </div>

      {/* Name + phone */}
      <div className="min-w-0 shrink">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink truncate">
            {card.display_name || <span className="italic text-ink-dim">Unknown sender</span>}
          </span>
          {card.matched && card.history && (
            <span className="text-2xs text-ink-dim numeric whitespace-nowrap">
              {card.history.orders} order{card.history.orders === 1 ? '' : 's'} · {formatAED(card.history.ltv_aed, { compact: true })} LTV
            </span>
          )}
        </div>
        <div className="text-2xs text-ink-dim font-mono">
          {maskPhoneForLogs(card.phone)}
          <span className="mx-1.5">·</span>
          {card.country}
          <span className="mx-1.5">·</span>
          <span className="uppercase tracking-wider">{card.language_pref}</span>
        </div>
      </div>

      {/* Right side: wallet + labels + warning */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {hasWallet && (
          <span className="flex items-center gap-1 px-2 h-6 rounded border border-gold/30 bg-gold/10 text-gold text-2xs">
            <Wallet className="w-3 h-3" />
            <span className="numeric">{formatAED(card.wallet!.balance_aed)}</span>
            <span className="text-ink-dim">LE</span>
          </span>
        )}
        {card.history && card.history.stores.length > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from(new Set(card.history.stores)).map((s) => (
              <StoreChip key={s} store={s} />
            ))}
          </div>
        )}
        {card.labels.slice(0, 2).map((l) => (
          <Badge key={l} tone="neutral">{l}</Badge>
        ))}
        {card.warnings.length > 0 && (
          <Badge tone="bad">!{card.warnings.length}</Badge>
        )}
        <span className="text-2xs text-ink-dim ml-1 hidden lg:inline">customer →</span>
      </div>
    </button>
  );
}
