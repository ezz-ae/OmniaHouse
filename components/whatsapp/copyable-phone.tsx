'use client';

import { useState } from 'react';
import { Copy, Check, Phone as PhoneIcon } from 'lucide-react';
import { formatPhone } from '@/lib/whatsapp/routing';

/**
 * Phone displayed at a real, readable size (14-15px), monospaced,
 * with one-click copy. Mature treatment — visible and copyable, not
 * masked, not 11px on a dark glow.
 */
export function CopyablePhone({
  phone,
  size = 'sm',
  showIcon = false,
}: {
  phone: string;
  size?: 'xs' | 'sm' | 'base';
  showIcon?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display = formatPhone(phone);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const sizeClass = size === 'base' ? 'text-base' : size === 'sm' ? 'text-sm' : 'text-xs';

  return (
    <button
      onClick={copy}
      className={`group inline-flex items-center gap-1.5 ${sizeClass} font-mono text-zinc-300 hover:text-zinc-100 transition-colors`}
      title={copied ? 'Copied' : 'Click to copy'}
    >
      {showIcon && <PhoneIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />}
      <span>{display}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-zinc-500 shrink-0 transition-opacity" />
      )}
    </button>
  );
}
