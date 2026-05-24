import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export function Kpi({
  label,
  value,
  delta,
  hint,
  size = 'md',
  className,
}: {
  label: string;
  value: string;
  delta?: number; // % change vs prior
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const valueClass = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div className={cn('panel p-4 flex flex-col gap-1.5', className)}>
      <div className="label">{label}</div>
      <div className={cn('font-serif font-medium numeric tracking-tight', valueClass)}>
        {value}
      </div>
      {(delta !== undefined || hint) && (
        <div className="flex items-center gap-2 mt-1 text-2xs text-ink-dim">
          {delta !== undefined && <DeltaChip value={delta} />}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}

export function DeltaChip({ value }: { value: number }) {
  const tone =
    value > 0.5 ? 'text-good' : value < -0.5 ? 'text-bad' : 'text-ink-dim';
  const Icon = value > 0.5 ? ArrowUpRight : value < -0.5 ? ArrowDownRight : Minus;
  return (
    <span className={cn('inline-flex items-center gap-0.5 numeric', tone)}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
