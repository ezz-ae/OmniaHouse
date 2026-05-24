import { PublicActions } from '@/components/public/public-actions';
import { Wallet, ShoppingBag, Sparkles } from 'lucide-react';

/**
 * /portal/[slug] — the customer-facing wallet portal.
 *
 * No login. The slug is the public token from customer_wallets.public_slug
 * (encoded random bytes). Lets a customer check their cashback balance,
 * see Limited Edition products they can spend it on, request a refund,
 * and track shipping. Designed for a phone — light palette, big targets.
 *
 * Public route → middleware lets this through without auth (see
 * middleware.ts public path matchers).
 */
export default async function PortalPage({ params }: { params: { slug: string } }) {
  const data = await getPortalData(params.slug);

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center px-6 font-sans">
        <div className="max-w-sm text-center">
          <div className="text-3xl mb-3">·</div>
          <h1 className="text-lg font-medium mb-1">Link not recognised</h1>
          <p className="text-sm text-zinc-500">If this link came from us, please ask your agent to resend it.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">House of Omnia</div>
        <h1 className="text-xl font-medium tracking-tight mb-8">Your wallet</h1>

        {/* Balance card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mb-4">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-wider text-zinc-500 mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Balance · Limited Editions only
          </div>
          <div className="text-3xl font-medium tracking-tight numeric text-zinc-900">
            {formatAED(data.balance_aed)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Earned across {data.orders.length} order{data.orders.length === 1 ? '' : 's'}.</div>
        </div>

        {/* Limited Edition shelf */}
        {data.limited_editions.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 mb-4">
            <div className="flex items-center gap-2 text-2xs uppercase tracking-wider text-zinc-500 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Limited Editions you can spend on
            </div>
            <ul className="divide-y divide-zinc-100">
              {data.limited_editions.map((p) => (
                <li key={p.sku} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">{p.title}</div>
                    <div className="text-xs text-zinc-500 truncate">{p.sku}</div>
                  </div>
                  <div className="text-sm font-medium text-zinc-900 numeric shrink-0">{formatAED(p.price_aed)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Orders */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mb-4">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-wider text-zinc-500 mb-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            Your orders
          </div>
          <ul className="divide-y divide-zinc-100">
            {data.orders.map((o) => (
              <li key={o.id} className="py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-900">{new Date(o.created_at).toLocaleDateString()}</span>
                  <span className="text-zinc-500 numeric">{o.items.length} item{o.items.length === 1 ? '' : 's'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <PublicActions slug={params.slug} orders={data.orders} />

        <div className="text-2xs text-zinc-400 text-center mt-10">
          Questions? Reply to your WhatsApp thread — we&apos;ll see it.
        </div>
      </div>
    </main>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────

type PortalData = {
  balance_aed: number;
  orders: { id: string; created_at: string; items: any[] }[];
  limited_editions: { sku: string; title: string; price_aed: number }[];
};

async function getPortalData(slug: string): Promise<PortalData | null> {
  // Until Supabase is wired, the portal uses deterministic mock data so
  // the page itself can be shared as a preview. A real customer slug
  // would be looked up in customer_wallets here.
  if (!slug || slug.length < 4) return null;

  return {
    balance_aed: 800,
    orders: [
      { id: 'o1', created_at: '2026-05-21T09:14:00Z', items: [{ sku: 'OM-RING-CR-925' }] },
      { id: 'o2', created_at: '2026-04-12T13:21:00Z', items: [{ sku: 'OM-PEND-MS-925' }, { sku: 'OM-EARR-LH-925' }] },
    ],
    limited_editions: [
      { sku: 'OM-LE-CELESTIAL-01', title: 'LE Celestial — Necklace', price_aed: 4200 },
      { sku: 'OM-LE-MAYA-03', title: 'LE Maya — Earrings', price_aed: 2600 },
    ],
  };
}

function formatAED(n: number): string {
  return `AED ${n.toLocaleString('en-AE')}`;
}
