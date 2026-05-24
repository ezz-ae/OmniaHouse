import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'outline' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gold text-canvas hover:bg-gold-bright active:bg-gold-dim disabled:bg-gold/30 disabled:text-canvas/50',
  ghost: 'text-ink-muted hover:text-ink hover:bg-canvas-inset',
  outline:
    'border border-line text-ink hover:border-line-strong hover:bg-canvas-inset',
  subtle: 'bg-canvas-inset text-ink hover:bg-canvas-panel border border-line',
  danger:
    'bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base',
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    asChild?: boolean;
  }
>(({ className, variant = 'subtle', size = 'md', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-2xs font-mono font-medium text-ink-muted bg-canvas-inset border border-line">
      {children}
    </span>
  );
}
