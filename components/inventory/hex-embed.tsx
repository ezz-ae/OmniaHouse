'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Loader2 } from 'lucide-react';

/**
 * Embeds the OmniaStores Inventory Hex dashboard inside the room.
 *
 * The Hex tool is the analyst's canonical view — same scrape, same
 * 1,640 dedup'd products, same 60-drift count. We embed it as a
 * sibling view so the team works inside one screen instead of
 * flipping browser tabs.
 *
 * The embed URL comes from NEXT_PUBLIC_HEX_INVENTORY_URL so it can
 * rotate without a code change. A hardcoded default points at the
 * current live notebook in case the env var isn't set.
 */

const FALLBACK_EMBED =
  'https://app.hex.tech/019c749a-278a-7557-bcc6-aa22bcdd272c/app/033Lsrfw2EIMF3vTGbVZDx/latest?embedded=true';

export function HexEmbed() {
  const url = (process.env.NEXT_PUBLIC_HEX_INVENTORY_URL as string | undefined) || FALLBACK_EMBED;
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Reset loaded state when we force a reload
  useEffect(() => { setLoaded(false); }, [nonce]);

  function reload() {
    setNonce((n) => n + 1);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header — small + calm, since the embed itself has its own header */}
      <div className="flex items-center gap-3 px-4 h-11 border-b border-zinc-800 bg-zinc-900/80">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Source</span>
        <span className="text-sm text-zinc-100">Hex · OmniaStores Inventory</span>
        <span className="text-2xs text-zinc-600">Live notebook · same scrape as the catalogue</span>
        <div className="ml-auto flex items-center gap-1.5">
          {!loaded && (
            <span className="flex items-center gap-1.5 text-2xs text-zinc-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              loading
            </span>
          )}
          <button
            onClick={reload}
            className="h-7 px-2 rounded border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5"
            title="Re-fetch the Hex view"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          <a
            href={url.replace('?embedded=true', '').replace('&embedded=true', '')}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2 rounded border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5"
            title="Open Hex in a new tab"
          >
            <ExternalLink className="w-3 h-3" />
            Open in Hex
          </a>
        </div>
      </div>

      {/* The embed */}
      <div className="relative bg-zinc-950" style={{ height: 'calc(100vh - 180px)', minHeight: 600 }}>
        <iframe
          key={nonce}
          ref={ref}
          src={url}
          title="OmniaStores Inventory · Hex"
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          allow="clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-xs text-zinc-500">First-time loads can take a few seconds…</div>
          </div>
        )}
      </div>
    </div>
  );
}
