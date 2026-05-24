import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'panel p-10 flex flex-col items-center justify-center text-center gap-3',
        className,
      )}
    >
      {Icon && (
        <div className="p-3 rounded-full bg-canvas-inset border border-line">
          <Icon className="w-5 h-5 text-ink-dim" />
        </div>
      )}
      <div>
        <h3 className="text-base font-medium text-ink">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-ink-dim max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
