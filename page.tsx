'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ManagementRoom() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [healthStatuses, setHealthStatuses] = useState<Record<string, string>>({});
  const [draftPosts, setDraftPosts] = useState<any[]>([]);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchIntegrations() {
      const { data } = await supabase
        .from('org_integrations')
        .select('*')
        .order('provider', { ascending: true });
      setIntegrations(data || []);
      setLoading(false);
    }
    fetchIntegrations();
  }, [supabase]);

  useEffect(() => {
    if (isModalOpen && activeProvider === 'woocommerce') {
      fetchDrafts();
    }
  }, [isModalOpen, activeProvider]);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/bridge/wordpress/drafts');
      const data = await res.json();
      if (data.success) setDraftPosts(data.drafts || []);
    } catch (e) {
      console.error("Failed to fetch drafts", e);
    }
  };

  const handleCheckHealth = async (provider: string) => {
    setHealthStatuses(prev => ({ ...prev, [provider]: 'checking' }));
    const res = await fetch('/api/integrations/health', { method: 'POST', body: JSON.stringify({ provider }) });
    const data = await res.json();
    setHealthStatuses(prev => ({ ...prev, [provider]: data.status }));
    // Refresh integrations to update sync time and status
    const { data: updated } = await supabase.from('org_integrations').select('*').order('provider', { ascending: true });
    if (updated) setIntegrations(updated);
  };

  const handleCreateShopifyDraft = async () => {
    setIsCreatingDraft(true);
    try {
      const res = await fetch('/api/shopify/draft-orders', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert(`Shopify Draft Order created: ${data.draft_order.name}`);
        // In production, we could refresh the list or trigger a sync
      } else {
        throw new Error(data.error || 'Failed to create draft');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const storefronts = ['shopify', 'woocommerce'];
  const payments = ['telr', 'stripe', 'tabby', 'tamara'];

  const handleLaunchManager = (provider: string) => {
    setActiveProvider(provider);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const s = healthStatuses[status] || status;
    if (s === 'active') return 'bg-emerald-500';
    if (s === 'checking') return 'bg-blue-400';
    if (s === 'error') return 'bg-red-500';
    return 'bg-slate-300';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-slate-900">Business Command Center</h1>
          <p className="text-slate-500 mt-2">Full control over storefronts, CMS bridges, and payment networks.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-black text-white px-6 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-800 transition-colors">
            Sync All Data
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Storefront Management */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">🛒 Storefront Infrastructure</h3>
          <div className="grid grid-cols-1 gap-4">
            {storefronts.map(provider => {
              const state = integrations.find(i => i.provider === provider);
              return (
                <div key={provider} className="bg-white border rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(state?.status)} animate-pulse`} />
                      <h4 className="text-2xl font-bold capitalize">{provider}</h4>
                    </div>
                    <button className="text-[10px] font-bold uppercase text-blue-600 hover:underline">Configuration</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                      <p className="font-bold text-slate-900 capitalize">{state?.status || 'Not Linked'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Last Sync</p>
                      <p className="font-bold text-slate-900">{state?.last_sync_at ? new Date(state.last_sync_at).toLocaleTimeString() : 'Never'}</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t flex gap-3">
                    <button onClick={() => handleLaunchManager(provider)} className="flex-1 py-3 bg-black text-white rounded-xl text-[10px] font-bold uppercase hover:bg-slate-800 transition-colors">Launch Manager</button>
                    <button onClick={() => handleCheckHealth(provider)} disabled={healthStatuses[provider] === 'checking'} className="flex-1 py-3 border border-slate-200 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-50 disabled:opacity-50">API Health</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment & Credit Networks */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">💳 Financial Gateways</h3>
          <div className="grid grid-cols-2 gap-4">
            {payments.map(provider => {
              const state = integrations.find(i => i.provider === provider);
              return (
                <div key={provider} className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-3xl group-hover:scale-110 transition-transform">💰</div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(state?.status)}`} />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 capitalize">{provider}</p>
                  </div>
                  <p className="text-xl font-bold">{state?.status === 'active' ? 'Operational' : 'Paused'}</p>
                  <div className="mt-6 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono">ID: {state?.id?.substring(0,8) || '####'}</span>
                    <button className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300">Logs</button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* BNPL Intelligence (Tabby/Tamara) */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] p-8 shadow-2xl">
            <h4 className="text-lg font-bold mb-2">Buy Now, Pay Later Pulse</h4>
            <p className="text-blue-100 text-sm mb-6 leading-relaxed">Tabby & Tamara account for 42% of high-ticket jewellery checkouts this month.</p>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-[42%]" />
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-10 py-6 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold capitalize">{activeProvider} Store Manager</h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Active Control Session</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>
            <div className="p-10 overflow-y-auto">
              <div className="space-y-10">
                {activeProvider === 'shopify' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-700 uppercase text-xs tracking-tighter">Draft Orders Queue</h3>
                      <button 
                        onClick={handleCreateShopifyDraft}
                        disabled={isCreatingDraft}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isCreatingDraft ? 'Creating...' : 'Create New Draft'}
                      </button>
                    </div>
                    <div className="border rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                          <tr>
                            <th className="px-6 py-3">Order Ref</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Total</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[1, 2, 3].map((i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs">#DRAFT-770{i}</td>
                              <td className="px-6 py-4 font-bold">VIP Customer {i}</td>
                              <td className="px-6 py-4">{(1500 * i).toLocaleString()} AED</td>
                              <td className="px-6 py-4 text-right">
                                <button className="text-blue-600 font-bold text-[10px] uppercase hover:underline">Edit Order</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-700 uppercase text-xs tracking-tighter">WordPress Draft Posts</h3>
                      <button className="text-blue-600 font-bold text-[10px] uppercase hover:underline">Manage in CMS</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {draftPosts.length > 0 ? draftPosts.map((post: any) => (
                        <div key={post.ID} className="p-4 bg-slate-50 border rounded-2xl flex items-center justify-between hover:bg-white transition-all">
                          <div>
                            <p className="font-bold text-slate-900">{post.post_title || 'Untitled Draft'}</p>
                            <p className="text-[10px] text-slate-400 uppercase">Type: {post.post_type} • Last Modified: {new Date(post.post_modified).toLocaleDateString()}</p>
                          </div>
                          <button className="px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold uppercase">Review Draft</button>
                        </div>
                      )) : (
                        <div className="p-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
                          No draft posts found in the WordPress CMS.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}