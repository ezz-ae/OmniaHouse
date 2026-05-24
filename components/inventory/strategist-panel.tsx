'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StrategySuggestion } from '@/lib/inventory/types';
import { actionTone, actionLabel } from '@/lib/inventory/strategy';
import { Sparkles, ChevronRight, Brain } from 'lucide-react';

/**
 * Right rail showing INVENTORY_STRATEGY output, ranked by impact_score.
 * Each row is a recommended action with the reason + the signal that
 * triggered it. Click → jumps to that SKU in the grid.
 */
export function StrategistPanel({
  suggestions,
  onPick,
  onRefresh,
}: {
  suggestions: StrategySuggestion[];
  onPick?: (sku: string) => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-medium text-ink">Inventory Strategist</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <Sparkles className="w-3.5 h-3.5" /> Re-run
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-line-soft text-2xs text-ink-dim">
        {suggestions.length === 0
          ? 'No actions needed. Catalogue is healthy this week.'
          : `${suggestions.length} action${suggestions.length === 1 ? '' : 's'} ranked by impact.`}
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-line-soft">
        {suggestions.map((s, i) => (
          <li key={`${s.sku}-${s.action}-${i}`}>
            <button
              onClick={() => onPick?.(s.sku)}
              className="w-full text-left px-4 py-3 hover:bg-canvas-inset/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge tone={actionTone(s.action)}>{actionLabel(s.action)}</Badge>
                  <span className="text-2xs font-mono text-ink-dim shrink-0">{s.sku}</span>
                </div>
                <ImpactBar score={s.impact_score} />
              </div>
              <div className="text-sm text-ink mb-1 truncate">{s.master_title}</div>
              <div className="text-2xs text-ink-muted leading-relaxed mb-1.5">{s.reason}</div>
              <div className="flex items-center gap-2 text-2xs text-ink-dim">
                <Signal label="seen" value={s.signal.seen_7d} />
                <Signal label="bought" value={s.signal.bought_7d} />
                <Signal label="searched" value={s.signal.searched_7d} />
                <Signal label="bounced" value={s.signal.bounced_7d} />
                <ChevronRight className="w-3 h-3 ml-auto" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImpactBar({ score }: { score: number }) {
  const tone = score >= 70 ? 'bg-bad/70' : score >= 40 ? 'bg-warn/70' : 'bg-info/70';
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-14 h-1 rounded-full bg-canvas-inset overflow-hidden">
        <div className={cn('h-full', tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-2xs text-ink-dim numeric w-6 text-right">{score}</span>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink numeric">{value}</span>
    </span>
  );
}
