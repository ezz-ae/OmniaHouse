'use client';

import { X } from 'lucide-react';
import { IdentityCard } from './identity-card';
import type { CustomerCard } from '@/lib/whatsapp/types';

/**
 * Customer detail drawer — slides in only when summoned.
 * Reuses the existing IdentityCard which already has cross-store history,
 * ghost browse, wallet ledger, labels, warnings.
 */
export function CustomerDrawer({
  card,
  open,
  onClose,
}: {
  card: CustomerCard;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <aside
        className="w-[420px] max-w-[92vw] h-full bg-canvas-raised border-l border-line shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 px-4 py-3 bg-canvas-raised/95 backdrop-blur border-b border-line-soft flex items-center justify-between">
          <h2 className="font-serif text-base text-ink">Customer</h2>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </header>
        <IdentityCard card={card} />
      </aside>
    </div>
  );
}
