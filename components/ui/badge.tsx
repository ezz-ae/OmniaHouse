import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'gold';

const tones: Record<Tone, string> = {
  neutral: 'bg-canvas-inset text-ink-muted border-line',
  good: 'bg-good/10 text-good border-good/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  bad: 'bg-bad/10 text-bad border-bad/30',
  info: 'bg-info/10 text-info border-info/30',
  gold: 'bg-gold/10 text-gold border-gold/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium border numeric',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = 'neutral', pulse = false }: { tone?: Tone; pulse?: boolean }) {
  const map: Record<Tone, string> = {
    neutral: 'bg-ink-dim',
    good: 'bg-good',
    warn: 'bg-warn',
    bad: 'bg-bad',
    info: 'bg-info',
    gold: 'bg-gold',
  };
  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full',
        map[tone],
        pulse && 'animate-pulse-dot',
      )}
    />
  );
}
