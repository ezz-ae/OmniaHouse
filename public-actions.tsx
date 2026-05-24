'use client';

import { useState } from 'react';

export function PublicActions({ slug, orders }: { slug: string, orders: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    if (!selectedOrder || !reason) return;
    setLoading(true);
    try {
      const res = await fetch('/api/public/request-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, orderId: selectedOrder, reason }),
      });
      if (res.ok) {
        alert('Refund request submitted to the Finance Team. 🛡️');
        setIsModalOpen(false);
      }
    } catch (err) {
      alert('Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-50 transition-colors"
        >
          Request Refund
        </button>
        <button className="py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-50 transition-colors">
          Track Shipping
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Request a Refund</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Order</label>
                <select 
                  className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-1 focus:ring-black"
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                >
                  <option value="">Choose an order...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>{new Date(o.created_at).toLocaleDateString()} - {o.items.length} items</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reason for Refund</label>
                <textarea 
                  className="w-full p-3 bg-slate-50 border rounded-xl text-sm h-24 resize-none outline-none focus:ring-1 focus:ring-black"
                  placeholder="Tell us why you are requesting a refund..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading || !selectedOrder || !reason}
                  onClick={handleRefund}
                  className="flex-1 py-3 bg-black text-white text-[10px] font-bold uppercase rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}