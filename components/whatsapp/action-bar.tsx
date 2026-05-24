'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, Dot } from '@/components/ui/badge';
import { StoreChip } from '@/components/ui/store-chip';
import { cn, formatAED } from '@/lib/utils';
import { Save, ArrowRight, Link2, Copy, UserPlus, Tag, Wallet, AlertCircle, ChevronDown } from 'lucide-react';
import type { Conversation, CustomerCard, Extraction, StoreRouting } from '@/lib/whatsapp/types';
import { routeForOrder } from '@/lib/whatsapp/routing';

/**
 * Bottom action bar — what the agent does once the conversation is structured.
 * Routes to the right store per the country rule. Generates BNPL links.
 * Marks cashback eligibility. Assigns to agent. Applies labels.
 */
export function ActionBar({
  conv,
  card,
  extract,
}: {
  conv: Conversation;
  card: CustomerCard;
  extract: Extraction | null;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'tamara' | 'tabby' | 'transfer' | 'card'>(
    (extract?.payment_method as any) || 'cod',
  );
  const [generatingLink, setGeneratingLink] = useState<'tamara' | 'tabby' | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ kind: 'tamara' | 'tabby'; url: string } | null>(null);
  const [pushing, setPushing] = useState<'shopify' | 'woocommerce' | null>(null);
  const [pushed, setPushed] = useState(false);

  const routing: StoreRouting | null = extract && extract.selected_products.length > 0
    ? routeForOrder({
      country: conv.country,
      history: card.history,
      product_on_shopify: extract.selected_products.some((p) => p.store_source === 'shopify'),
      product_on_woocommerce: extract.selected_products.some((p) => p.store_source === 'woocommerce'),
    })
    : null;

  const total = extract ? extract.selected_products.reduce((s, p) => s + (p.price_aed || 0) * p.qty, 0) : 0;
  const cashback = extract?.cashback_suggestion.eligible ? extract.cashback_suggestion.amount_aed : 0;
  const codHighValue = paymentMethod === 'cod' && total > 3000;
  const discountFlag = (extract?.discount_requested_pct || 0) > 10;
  const needsManagerApproval = codHighValue || discountFlag;

  async function generateLink(kind: 'tamara' | 'tabby') {
    setGeneratingLink(kind);
    await new Promise((r) => setTimeout(r, 700));
    setGeneratedLink({ kind, url: `https://${kind}.co/pay/oh_${Math.random().toString(36).slice(2, 10)}` });
    setGeneratingLink(null);
  }

  async function pushOrder(store: 'shopify' | 'woocommerce') {
    setPushing(store);
    await new Promise((r) => setTimeout(r, 900));
    setPushing(null);
    setPushed(true);
  }

  return (
    <div className="panel">
      {/* Routing summary */}
      {routing && (
        <div className="px-4 py-2.5 border-b border-line-soft flex items-center gap-3 bg-canvas-inset/40">
          <div className="flex items-center gap-1.5">
            <span className="label">Route</span>
            <StoreChip store={routing.default_store} />
          </div>
          <div className="text-2xs text-ink-muted flex-1">{routing.reason}</div>
          {routing.rule === 'ask_agent' && <Badge tone="warn">confirm</Badge>}
        </div>
      )}

      {/* Order summary */}
      <div className="px-4 py-3 border-b border-line-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Total</div>
            <div className="font-serif text-2xl text-gold numeric">{total > 0 ? formatAED(total) : '—'}</div>
          </div>
          {cashback > 0 && (
            <div className="text-right">
              <div className="label">Earns</div>
              <div className="text-sm text-good numeric">+{formatAED(cashback)}</div>
              <div className="text-2xs text-ink-dim">LE only</div>
            </div>
          )}
          {needsManagerApproval && (
            <Badge tone="bad">
              <AlertCircle className="w-3 h-3" /> Manager approval
            </Badge>
          )}
        </div>
      </div>

      {/* Payment method */}
      <div className="px-4 py-3 border-b border-line-soft">
        <div className="label mb-2">Payment</div>
        <div className="flex flex-wrap gap-1">
          {(['cod', 'transfer', 'tamara', 'tabby', 'card'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPaymentMethod(m)}
              className={cn(
                'px-2.5 h-7 text-2xs rounded border transition-colors uppercase tracking-wider',
                paymentMethod === m
                  ? 'bg-gold/10 text-gold border-gold/30'
                  : 'border-line text-ink-dim hover:text-ink',
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* BNPL link generation */}
        {(paymentMethod === 'tamara' || paymentMethod === 'tabby') && (
          <div className="mt-3">
            {!generatedLink || generatedLink.kind !== paymentMethod ? (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => generateLink(paymentMethod)}
                disabled={!!generatingLink || total === 0}
                className="w-full"
              >
                {generatingLink === paymentMethod ? 'Generating…' : <><Link2 className="w-3.5 h-3.5" /> Generate {paymentMethod} link · {formatAED(total / 4)} × 4</>}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-canvas-inset rounded border border-line">
                <span className="text-xs font-mono text-ink-muted flex-1 truncate">{generatedLink.url}</span>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(generatedLink.url)}>
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="px-4 py-3 border-b border-line-soft">
        <div className="label mb-2 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Labels
        </div>
        <div className="flex flex-wrap gap-1">
          {['vip', 'bridal', 'sister_gift', 'repeat', 'le_browser', 'pressure', 'ksa'].map((l) => (
            <button
              key={l}
              className={cn(
                'px-2 h-6 text-2xs rounded border transition-colors',
                conv.labels.includes(l)
                  ? 'bg-gold/10 text-gold border-gold/30'
                  : 'border-line text-ink-dim hover:text-ink',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="subtle" size="sm" disabled={!extract}>
            <Save className="w-3.5 h-3.5" /> Save draft
          </Button>
          <Button variant="ghost" size="sm" disabled={!extract}>
            <UserPlus className="w-3.5 h-3.5" /> Assign
          </Button>
        </div>

        {pushed ? (
          <div className="px-3 py-2 bg-good/10 border border-good/30 rounded text-2xs text-good text-center">
            ✓ Draft order pushed to {routing?.default_store === 'shopify' ? 'omniastores.ae' : 'omniastores.com'}
          </div>
        ) : (
          <Button
            variant="primary"
            size="md"
            className="w-full"
            disabled={!extract || !routing || needsManagerApproval || !!pushing}
            onClick={() => routing && pushOrder(routing.default_store as 'shopify' | 'woocommerce')}
          >
            {pushing ? (
              <>Pushing to {pushing === 'shopify' ? '.ae' : '.com'}…</>
            ) : (
              <>
                Push to {routing?.default_store === 'shopify' ? 'omniastores.ae' : routing?.default_store === 'woocommerce' ? 'omniastores.com' : 'store'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        )}

        {needsManagerApproval && (
          <div className="text-2xs text-bad text-center">
            {codHighValue && 'COD over AED 3,000 needs manager approval. '}
            {discountFlag && `Discount ${extract?.discount_requested_pct}% needs manager approval.`}
          </div>
        )}
      </div>
    </div>
  );
}
