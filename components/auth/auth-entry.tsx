'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { createClient, isBrowserSupabaseConfigured } from '@/lib/supabase/client';

const ERROR_COPY: Record<string, string> = {
  account_locked: 'This staff account is locked.',
  auth_callback_failed: 'The sign-in callback could not be completed.',
  auth_confirmation_failed: 'The confirmation link could not be completed.',
  invalid_credentials: 'Email or password is incorrect.',
  session_location_drift: 'Session ended because the office location changed.',
};

export function AuthEntry() {
  const router = useRouter();
  const passkeyRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const supabaseConfigured = useMemo(() => isBrowserSupabaseConfigured(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passkey, setPasskey] = useState('');
  const [nextPath, setNextPath] = useState('/house');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const next = params.get('next');

    if (error) setMessage(ERROR_COPY[error] || 'Sign-in failed.');
    if (next?.startsWith('/') && !next.startsWith('//')) setNextPath(next);

    if (!supabaseConfigured && window.sessionStorage.getItem('oh:door') === 'open') {
      router.replace(next || '/house');
      return;
    }

    if (supabaseConfigured) emailRef.current?.focus();
    else passkeyRef.current?.focus();
  }, [router, supabaseConfigured]);

  async function tryPasskey(): Promise<boolean> {
    const trimmed = passkey.trim();
    if (!trimmed) return false;
    const res = await fetch('/api/auth/passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey: trimmed }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (res?.ok && json?.ok) {
      window.sessionStorage.setItem('oh:door', 'open');
      // Hard navigate so the new oh_passkey cookie is sent on the next
      // middleware request (router.replace can race with cookie set).
      window.location.href = nextPath;
      return true;
    }
    if (json?.error === 'passkey_not_configured') {
      setMessage('Passkey is not configured in this environment.');
    } else {
      setMessage('Passkey is incorrect.');
    }
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    // If the user typed a passkey, try that first regardless of whether
    // Supabase is configured. Lets the owner walk in even before any
    // auth.users rows have been provisioned in Supabase.
    if (passkey.trim()) {
      const ok = await tryPasskey();
      if (ok) return;
      setLoading(false);
      setPasskey('');
      passkeyRef.current?.focus();
      return;
    }

    if (supabaseConfigured) {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoading(false);
        setMessage(ERROR_COPY.invalid_credentials);
        setPassword('');
        emailRef.current?.focus();
        return;
      }

      router.replace(nextPath);
      router.refresh();
      return;
    }

    // No Supabase, no passkey — surface the right hint.
    setLoading(false);
    setMessage('Enter the passkey to continue.');
    passkeyRef.current?.focus();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 font-sans">
      <form
        onSubmit={submit}
        className="w-full max-w-[360px] border border-zinc-800 bg-zinc-900/70 rounded-lg px-5 py-5 shadow-2xl"
      >
        <div className="mb-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-3">
            <Lock className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-[0.18em]">Private office</span>
          </div>
          <h1 className="text-xl font-medium tracking-normal text-zinc-50">House of Omnia</h1>
        </div>

        <div className="space-y-3">
          {supabaseConfigured && (
            <>
              <label className="block">
                <span className="sr-only">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    placeholder="staff email"
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="sr-only">Password</span>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    placeholder="password"
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  />
                </div>
              </label>

              <div className="flex items-center gap-2 my-1 text-2xs uppercase tracking-wider text-zinc-500">
                <span className="h-px flex-1 bg-zinc-800" />
                <span>or use the founder passkey</span>
                <span className="h-px flex-1 bg-zinc-800" />
              </div>
            </>
          )}

          <label className="block">
            <span className="sr-only">Passkey</span>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                ref={passkeyRef}
                type="password"
                value={passkey}
                onChange={(event) => setPasskey(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
                placeholder="internal passkey"
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm tracking-widest text-zinc-100 outline-none placeholder:tracking-normal placeholder:text-zinc-600 focus:border-zinc-500"
              />
            </div>
          </label>

          {message && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {message}
            </div>
          )}

          {!supabaseConfigured && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Supabase env vars are missing; local passkey mode is active.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>
        </div>
      </form>
    </main>
  );
}
