'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Landing / auth page.
 *
 * Single sentence. Single empty input. Whoever knows the door code gets in.
 * (Right now the door code is the office Wi-Fi password — this swaps to
 * real Supabase auth once keys are wired.)
 *
 * Motion background: three slow-moving radial-gradient blobs.
 */

const DOOR_CODE = 'dontknow@2025';

export default function LandingPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // If already signed in this session, slip past
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('oh:door') === 'open') {
      router.replace('/house');
    }
  }, [router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value === DOOR_CODE) {
      window.sessionStorage.setItem('oh:door', 'open');
      router.push('/house');
    } else {
      setWrong(true);
      setValue('');
      setTimeout(() => setWrong(false), 600);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
      <MotionBackground />

      <form onSubmit={submit} className="relative z-10 w-full max-w-lg px-8">
        <h1 className="text-2xl md:text-3xl font-medium text-zinc-100 text-center mb-10 tracking-tight">
          Welcome to the Digital House of Omnia
        </h1>

        <div className="relative">
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={`w-full h-12 px-4 bg-zinc-900/80 backdrop-blur-md border rounded-md text-base text-zinc-100 outline-none transition-all ${
              wrong
                ? 'border-rose-500/50 ring-2 ring-rose-500/20 animate-[shake_400ms_ease]'
                : 'border-zinc-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          />
        </div>
      </form>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(80px, -40px) scale(1.15); }
        }
        @keyframes drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, 70px) scale(1.1); }
        }
        @keyframes drift-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 60px) scale(0.9); }
        }
      `}</style>
    </main>
  );
}

function MotionBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Slow-moving gold blob */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(212,165,116,0.4), transparent 60%)',
          top: '-15%', left: '-10%',
          animation: 'drift-a 22s ease-in-out infinite',
        }}
      />
      {/* Emerald blob */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.35), transparent 60%)',
          bottom: '-15%', right: '-10%',
          animation: 'drift-b 28s ease-in-out infinite',
        }}
      />
      {/* Subtle indigo blob */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 60%)',
          top: '40%', right: '30%',
          animation: 'drift-c 18s ease-in-out infinite',
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-transparent to-zinc-950/60" />
    </div>
  );
}
