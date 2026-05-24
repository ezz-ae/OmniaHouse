import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center font-serif font-medium text-canvas">
              O
            </div>
            <div>
              <div className="text-base font-medium text-ink leading-tight">House of Omnia</div>
              <div className="text-2xs text-ink-dim leading-tight uppercase tracking-widest">
                Private Management
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">
            Welcome back.
          </h1>
          <p className="text-sm text-ink-muted mb-10">
            Sign in to your OmniaStores office.
          </p>

          {searchParams.error && (
            <div className="mb-6 px-3 py-2 rounded border border-bad/30 bg-bad/10 text-bad text-xs">
              {humanizeError(searchParams.error)}
            </div>
          )}

          <form className="space-y-4">
            <label className="block">
              <div className="label mb-1.5">Email</div>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@omniastores.ae"
                className="w-full h-10 px-3 bg-canvas-panel border border-line rounded text-sm text-ink placeholder:text-ink-dim focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none transition"
              />
            </label>
            <label className="block">
              <div className="label mb-1.5">Password</div>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full h-10 px-3 bg-canvas-panel border border-line rounded text-sm text-ink placeholder:text-ink-dim focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none transition"
              />
            </label>

            <button
              type="submit"
              className="w-full h-10 mt-2 bg-gold text-canvas font-medium rounded hover:bg-gold-bright active:bg-gold-dim transition-colors inline-flex items-center justify-center gap-1.5"
            >
              Enter the house
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-line-soft text-2xs text-ink-dim">
            Trouble signing in?{' '}
            <Link href="/access-requests" className="text-gold hover:text-gold-bright">
              Request access
            </Link>
          </div>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center border-l border-line-soft bg-gradient-to-br from-canvas-raised to-canvas relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,_rgba(212,165,116,0.15),_transparent_60%)]" />
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="font-serif text-5xl text-gold mb-4 leading-tight">
            One office.
            <br />
            Two stores.
            <br />
            One pulse.
          </div>
          <p className="text-sm text-ink-muted">
            OmniaStores .com on WooCommerce. OmniaStores .ae on Shopify. WhatsApp on
            +971 56 547 8227. All seen from one room.
          </p>
        </div>
      </div>
    </main>
  );
}

function humanizeError(code: string) {
  if (code === 'account_locked') return 'Your account is locked. Contact an admin.';
  if (code === 'session_location_drift')
    return 'Session location changed. Please sign in again from the office.';
  return code;
}
