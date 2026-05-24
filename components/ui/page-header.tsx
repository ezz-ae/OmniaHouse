import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex items-end justify-between gap-6 pb-6 mb-6 border-b border-line-soft',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="label mb-2 text-gold">{eyebrow}</div>
        )}
        <h1 className="text-2xl font-serif font-medium tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-ink-muted max-w-prose">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="label">{title}</h2>
        {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
