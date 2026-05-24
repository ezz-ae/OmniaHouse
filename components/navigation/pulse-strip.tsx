import { cn, formatAED, formatPct } from '@/lib/utils';
import { getPulse } from '@/lib/mock/pulse';
import { Dot } from '@/components/ui/badge';

/**
 * The strip across the top of every office route. The 5-second-glance of how
 * the business is doing right now. Always visible. Never lies.
 */
export function PulseStrip() {
  const pulse = getPulse();

  const items: { label: string; value: string; delta?: number; tone?: 'good' | 'warn' | 'bad' | 'gold' }[] = [
    {
      label: 'Today',
      value: formatAED(pulse.revenue_today, { compact: true }),
      delta: pulse.revenue_delta_pct,
      tone: 'gold',
    },
    {
      label: 'WhatsApp queue',
      value: `${pulse.whatsapp_queue}`,
      tone: pulse.whatsapp_queue > 5 ? 'warn' : 'good',
    },
    {
      label: 'Drafts',
      value: `${pulse.draft_orders}`,
    },
    {
      label: 'Parity drift',
      value: `${pulse.parity_drift}`,
      tone: pulse.parity_drift > 0 ? 'bad' : 'good',
    },
    {
      label: 'Low stock',
      value: `${pulse.low_stock}`,
      tone: pulse.low_stock > 0 ? 'warn' : 'good',
    },
    {
      label: '7d revenue',
      value: formatAED(pulse.revenue_7d, { compact: true }),
      delta: pulse.revenue_7d_delta_pct,
    },
  ];

  return (
    <div className="h-12 border-b border-line-soft bg-canvas-raised/60 backdrop-blur-md flex items-center px-5 gap-1">
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <Dot tone="good" pulse />
        <span className="label">Live</span>
      </div>
      <div className="flex-1 flex items-center divide-x divide-line-soft overflow-x-auto">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline gap-2 px-4 first:pl-0 last:pr-0 whitespace-nowrap"
          >
            <span className="text-2xs uppercase tracking-widest text-ink-dim">
              {item.label}
            </span>
            <span
              className={cn(
                'text-sm font-medium numeric',
                item.tone === 'good' && 'text-good',
                item.tone === 'warn' && 'text-warn',
                item.tone === 'bad' && 'text-bad',
                item.tone === 'gold' && 'text-gold',
              )}
            >
              {item.value}
            </span>
            {item.delta !== undefined && (
              <span
                className={cn(
                  'text-2xs numeric',
                  item.delta > 0 ? 'text-good' : item.delta < 0 ? 'text-bad' : 'text-ink-dim',
                )}
              >
                {formatPct(item.delta)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="text-2xs text-ink-faint shrink-0 numeric">
        Updated {pulse.updated_at}
      </div>
    </div>
  );
}
