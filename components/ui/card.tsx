import { cn } from '@/lib/utils';

export function Card({
  children,
  className,
  raised = false,
}: {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <div className={cn(raised ? 'panel-raised' : 'panel', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  actions,
  className,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3 border-b border-line-soft',
        className,
      )}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <h3 className="text-sm font-medium text-ink truncate">{title}</h3>
        {hint && <span className="text-2xs text-ink-dim shrink-0">{hint}</span>}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('p-4', className)}>{children}</div>;
}
