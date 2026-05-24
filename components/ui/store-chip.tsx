import { cn } from '@/lib/utils';

type Store = 'shopify' | 'woocommerce' | 'whatsapp' | 'both';

const config: Record<Store, { label: string; className: string }> = {
  shopify: {
    label: '.ae',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  woocommerce: {
    label: '.com',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  whatsapp: {
    label: 'WA',
    className: 'bg-info/10 text-info border-info/30',
  },
  both: {
    label: 'BOTH',
    className: 'bg-gold/10 text-gold border-gold/30',
  },
};

export function StoreChip({
  store,
  className,
}: {
  store: Store;
  className?: string;
}) {
  const { label, className: tone } = config[store];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[36px] h-5 px-1.5 rounded text-2xs font-mono font-medium border',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
