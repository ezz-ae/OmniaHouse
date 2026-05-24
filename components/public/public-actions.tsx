'use client';

import { useState } from 'react';

/**
 * Customer-facing actions on the public wallet portal (/portal/[slug]).
 * Restyled in the OmniaHouse zinc theme — same calm density as the rest
 * of the platform, just on a lighter palette so it reads on a phone.
 */
export function PublicActions({ slug, orders }: { slug: string; orders: { id: string; created_at: string; items: any[] }[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!selectedOrder || !reason) return;
    setLoading(true);
    try {
      const res = await fetch('/api/public/request-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, orderId: selectedOrder, reason }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => { setIsModalOpen(false); setSubmitted(false); setSelectedOrder(''); setReason(''); }, 1800);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-3 rounded-md border border-zinc-300 bg-white text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Request refund
        </button>
        <button className="h-10 px-3 rounded-md border border-zinc-300 bg-white text-sm text-zinc-700 hover:bg-zinc-50">
          Track shipping
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-zinc-900 mb-1">Request a refund</h2>
            <p className="text-xs text-zinc-500 mb-5">A team member will follow up on WhatsApp within one business day.</p>

            {submitted ? (
              <div className="py-8 text-center">
                <div className="inline-block w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 text-lg">✓</div>
                <div className="text-sm text-zinc-700">Request received. Thank you.</div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-2xs uppercase tracking-wider text-zinc-500 mb-1">Order</span>
                  <select
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-md text-sm text-zinc-800 outline-none focus:border-zinc-400"
                    value={selectedOrder}
                    onChange={(e) => setSelectedOrder(e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {new Date(o.created_at).toLocaleDateString()} · {o.items.length} item{o.items.length > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-2xs uppercase tracking-wider text-zinc-500 mb-1">Reason</span>
                  <textarea
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-md text-sm h-24 resize-none text-zinc-800 outline-none focus:border-zinc-400"
                    placeholder="A short note helps us help you."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-10 text-sm text-zinc-600 hover:bg-zinc-50 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading || !selectedOrder || !reason}
                    onClick={submit}
                    className="flex-1 h-10 px-3 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {loading ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
