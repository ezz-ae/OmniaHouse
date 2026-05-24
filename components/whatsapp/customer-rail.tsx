'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { CopyablePhone } from './copyable-phone';
import { getRecentOrders, getWalletLedger } from '@/lib/whatsapp/mock';
import { formatAED } from '@/lib/utils';
import type { CustomerCard } from '@/lib/whatsapp/types';

/**
 * Customer identity panel for the right column of the WhatsApp Desk.
 * Identity · cross-store history · cashback wallet + ledger · recent
 * orders · ghost-browse · labels · block/unblock.
 *
 * Extracted from the desk page so the tabbed RightPanel can mount it
 * next to the Omnia AI chat.
 */
export function CustomerRail({ card }: { card: CustomerCard }) {
  const orders = getRecentOrders(card.customer_id);
  const ledger = getWalletLedger(card.customer_id);
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="p-4 space-y-5">
      {/* Identity */}
      <div>
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Identity</div>
        <div className="text-base font-medium text-zinc-100">{card.display_name || 'Unknown'}</div>
        <CopyablePhone phone={card.phone} size="sm" showIcon />
        <div className="text-sm text-zinc-400 mt-1">{card.country} · {card.language_pref.toUpperCase()}</div>
        {blocked && (
          <div className="mt-2 px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            Blocked · cannot place new orders
          </div>
        )}
      </div>

      {/* Cross-store */}
      {card.history && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Cross-store history</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-zinc-100 font-medium numeric">{card.history.orders}</div>
              <div className="text-xs text-zinc-500">orders</div>
            </div>
            <div>
              <div className="text-zinc-100 font-medium numeric">{formatAED(card.history.ltv_aed, { compact: true })}</div>
              <div className="text-xs text-zinc-500">LTV</div>
            </div>
            <div>
              <div className="text-zinc-100 font-medium text-xs numeric">{card.history.last_at}</div>
              <div className="text-xs text-zinc-500">last</div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet + ledger */}
      {card.wallet && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Cashback wallet
          </div>
          <div className="text-base font-semibold text-emerald-400 numeric">{formatAED(card.wallet.balance_aed)}</div>
          <div className="text-xs text-zinc-500 mt-0.5 mb-2">Limited Editions only</div>
          {ledger.length > 0 && (
            <ul className="space-y-1.5 mt-2 pt-2 border-t border-zinc-800">
              {ledger.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-400 truncate flex-1">
                    <span className="text-zinc-500 numeric mr-2">{t.at}</span>
                    {t.note}
                  </span>
                  <span className={`numeric ml-2 shrink-0 ${t.type === 'accrual' ? 'text-emerald-400' : 'text-rose-300'}`}>
                    {t.type === 'accrual' ? '+' : '-'}{formatAED(t.amount_aed)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Recent orders */}
      {orders.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Recent orders</div>
          <ul className="space-y-1.5">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0 flex-1">
                  <span className="text-zinc-100 font-mono text-xs">{o.number}</span>
                  <span className="text-zinc-500 text-xs ml-2">
                    {o.store === 'shopify' ? '.ae' : o.store === 'woocommerce' ? '.com' : 'WA'}
                  </span>
                  <span className="text-zinc-500 text-xs ml-2">· {o.items_count} item{o.items_count === 1 ? '' : 's'}</span>
                </div>
                <span className={`text-xs px-1.5 h-4 rounded ${
                  o.status === 'completed' || o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : o.status === 'draft' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                } flex items-center`}>
                  {o.status.replace('_', ' ')}
                </span>
                <span className="text-zinc-300 numeric ml-3 shrink-0 w-20 text-right">{formatAED(o.total_aed, { compact: true })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ghost browse */}
      {card.ghost && card.ghost.pages_viewed.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Ghost browse</div>
          <div className="text-xs text-zinc-400 mb-1">{card.ghost.sessions} sessions since {card.ghost.first_seen_at}</div>
          <ul className="space-y-1">
            {card.ghost.pages_viewed.slice(0, 4).map((p) => (
              <li key={p.sku} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 truncate flex-1">{p.title}</span>
                <span className="text-zinc-500 numeric ml-2">{p.views}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.labels.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Labels</div>
          <div className="flex flex-wrap gap-1">
            {card.labels.map((l) => (
              <span key={l} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">{l}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions — block / unblock */}
      {card.matched && (
        <div className="pt-2 border-t border-zinc-800">
          {blocked ? (
            <button
              onClick={() => setBlocked(false)}
              className="w-full h-8 rounded border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Unblock customer
            </button>
          ) : (
            <button
              onClick={() => { if (confirm('Block this customer? They will be auto-rejected on next contact.')) setBlocked(true); }}
              className="w-full h-8 rounded border border-rose-500/30 text-sm text-rose-300 hover:bg-rose-500/10"
            >
              Block customer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
