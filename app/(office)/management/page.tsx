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
  const [shopifyDrafts, setShopifyDrafts] = useState<any[]>([]);
  const [shopifyDraftStatus, setShopifyDraftStatus] = useState<'open' | 'completed'>('open');
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [fetchingOrder, setFetchingOrder] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<{ note: string; line_items: any[] }>({ note: '', line_items: [] });
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);
  const [isSyncingCustomer, setIsSyncingCustomer] = useState(false);
  const [customerWalletBalance, setCustomerWalletBalance] = useState<number | null>(null);
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
    if (isModalOpen && activeProvider === 'shopify') {
      fetchShopifyDrafts(shopifyDraftStatus);
    }
  }, [isModalOpen, activeProvider, shopifyDraftStatus]);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/bridge/wordpress/drafts');
      const data = await res.json();
      if (data.success) setDraftPosts(data.drafts || []);
    } catch (e) {
      console.error("Failed to fetch drafts", e);
    }
  };

  const fetchShopifyDrafts = async (status: string = 'open') => {
    try {
      const res = await fetch(`/api/shopify/draft-orders?status=${status}`);
      const data = await res.json();
      if (data.success) setShopifyDrafts(data.draft_orders || []);
    } catch (e) {
      console.error("Failed to fetch Shopify drafts", e);
    }
  };

  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProductSearchResults([]);
      return;
    }

    const searchProducts = async () => {
      setIsSearchingProducts(true);
      const { data } = await supabase
        .from('products')
        .select('sku, title, price_aed, metadata')
        .ilike('title', `%${productSearch}%`)
        .limit(5);
      setProductSearchResults(data || []);
      setIsSearchingProducts(false);
    };

    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [productSearch, supabase]);

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
        fetchShopifyDrafts();
      } else {
        throw new Error(data.error || 'Failed to create draft');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const handleEditShopifyDraft = async (orderId: number) => {
    setFetchingOrder(true);
    setIsEditModalOpen(true);
    setCustomerWalletBalance(null);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setEditingOrder(data.draft_order);
        setEditForm({ 
          note: data.draft_order.note || '',
          line_items: data.draft_order.line_items || []
        });
        setProductSearch('');

        // Fetch Wallet Balance for Customer Loyalty Badge
        const customerPhone = data.draft_order.customer?.phone;
        if (customerPhone) {
          const { data: wallet } = await supabase
            .from('customer_wallets')
            .select('balance_aed')
            .eq('customer_phone', customerPhone)
            .single();
          
          if (wallet) setCustomerWalletBalance(Number(wallet.balance_aed));
        }
      }
    } catch (e) {
      console.error("Failed to fetch draft order", e);
    } finally {
      setFetchingOrder(false);
    }
  };

  const handleUpdateShopifyDraft = async () => {
    if (!editingOrder) return;
    setUpdatingOrder(true);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          draft_order: { 
            note: editForm.note,
            line_items: editForm.line_items
          } 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Draft order updated');
        setIsEditModalOpen(false);
        fetchShopifyDrafts();
      }
    } catch (e) {
      console.error("Failed to update draft order", e);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleDeleteShopifyDraft = async (orderId: number) => {
    if (!confirm('Are you sure you want to permanently delete this draft order?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Draft order deleted successfully');
        setIsEditModalOpen(false);
        fetchShopifyDrafts();
      }
    } catch (e) {
      console.error("Failed to delete draft order", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendShopifyInvoice = async () => {
    if (!editingOrder) return;
    setIsSendingInvoice(true);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${editingOrder.id}/send-invoice`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Invoice sent successfully to customer email. 📧');
      } else {
        throw new Error(data.error || 'Failed to send invoice');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleCompleteShopifyOrder = async () => {
    if (!editingOrder) return;
    if (!confirm('Are you sure you want to complete this order? It will be converted into a final Shopify order.')) return;
    setIsCompletingOrder(true);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${editingOrder.id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Order completed successfully! 🏆');
        setIsEditModalOpen(false);
        fetchShopifyDrafts(shopifyDraftStatus);
      } else {
        throw new Error(data.error || 'Failed to complete order');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const handleSyncCustomer = async () => {
    if (!editingOrder) return;
    setIsSyncingCustomer(true);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${editingOrder.id}/sync-customer`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert('Customer profile synced from CRM successfully. 🧠');
        handleEditShopifyDraft(editingOrder.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingCustomer(false);
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
                          <tr className="bg-slate-50/50">
                            <td colSpan={4} className="px-6 py-2">
                              <div className="flex gap-2">
                                {(['open', 'completed'] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setShopifyDraftStatus(s)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${shopifyDraftStatus === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                          {shopifyDrafts.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs">{order.name}</td>
                              <td className="px-6 py-4 font-bold">{order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'No Customer'}</td>
                              <td className="px-6 py-4">{Number(order.total_price).toLocaleString()} AED</td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleEditShopifyDraft(order.id)}
                                  className="text-blue-600 font-bold text-[10px] uppercase hover:underline"
                                >
                                  Edit Order
                                </button>
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-5 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Draft Order</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>
            <div className="p-8">
              {fetchingOrder ? (
                <div className="py-10 text-center text-slate-400 animate-pulse">Fetching details...</div>
              ) : editingOrder ? (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Context</p>
                      <p className="font-bold truncate">{editingOrder.customer ? `${editingOrder.customer.first_name} ${editingOrder.customer.last_name}` : 'No Customer Linked'}</p>
                      <p className="text-xs text-slate-400 truncate">{editingOrder.customer?.email || editingOrder.customer?.phone || 'Missing contact info'}</p>

                      {customerWalletBalance !== null && (
                        <div className="mt-2">
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-emerald-500/30">
                            Loyalty Balance: {customerWalletBalance.toLocaleString()} AED
                          </span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={handleSyncCustomer}
                      disabled={isSyncingCustomer}
                      className="px-4 py-2 bg-white text-black rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {isSyncingCustomer ? 'Syncing...' : 'Sync CRM Profile'}
                    </button>
                  </div>

                  {editingOrder.invoice_url && (
                    <div className="p-4 border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/30 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Manual Payment Link</p>
                        <p className="text-xs font-mono text-indigo-600 truncate mt-1">{editingOrder.invoice_url}</p>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(editingOrder.invoice_url); alert('Link copied to clipboard!'); }}
                        className="ml-4 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase shrink-0 hover:bg-indigo-700 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Order Note</label>
                    <textarea 
                      className="w-full p-3 border rounded-xl text-sm focus:ring-1 focus:ring-black outline-none h-32"
                      value={editForm.note}
                      onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                      placeholder="Add a private note to this order..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Search & Add Product</label>
                    <input 
                      className="w-full p-3 border rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
                      placeholder="Type product name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    {productSearchResults.length > 0 && (
                      <div className="border rounded-xl overflow-hidden divide-y bg-white shadow-sm">
                        {productSearchResults.map((prod, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{prod.title}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{prod.sku} • {prod.price_aed} AED</p>
                            </div>
                            <button 
                              onClick={() => {
                                const newItem = {
                                  variant_id: prod.metadata?.variant_id,
                                  title: prod.title,
                                  price: prod.price_aed,
                                  quantity: 1
                                };
                                setEditForm({ ...editForm, line_items: [...editForm.line_items, newItem] });
                                setProductSearch('');
                                setProductSearchResults([]);
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workflow Actions</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSendShopifyInvoice}
                        disabled={isSendingInvoice || !editingOrder.customer?.email}
                        className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {isSendingInvoice ? 'Sending...' : 'Send Invoice'}
                      </button>
                      <button 
                        onClick={handleCompleteShopifyOrder}
                        disabled={isCompletingOrder}
                        className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                      >
                        {isCompletingOrder ? 'Completing...' : 'Complete Order'}
                      </button>
                      {integrations.find(i => i.provider === 'shopify')?.base_url && (
                        <a 
                          href={`${integrations.find(i => i.provider === 'shopify')?.base_url}/admin/draft_orders/${editingOrder.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-50 transition-colors text-center"
                        >
                          View on Shopify
                        </a>
                      )}
                    </div>
                    {!editingOrder.customer?.email && (
                      <p className="text-[8px] text-amber-600 italic">Invoice requires customer email.</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Items</p>
                    <div className="space-y-2">
                      {editForm.line_items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500 font-mono">{item.price} AED</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              className="w-16 p-1 text-center border rounded-lg text-sm bg-white"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val > 0) {
                                  const newItems = [...editForm.line_items];
                                  newItems[i].quantity = val;
                                  setEditForm({ ...editForm, line_items: newItems });
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                const newItems = editForm.line_items.filter((_, idx) => idx !== i);
                                setEditForm({ ...editForm, line_items: newItems });
                              }}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleDeleteShopifyDraft(editingOrder.id)}
                      disabled={isDeleting || updatingOrder}
                      className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-bold text-xs uppercase hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Order'}
                    </button>
                    <button 
                      onClick={handleUpdateShopifyDraft}
                      disabled={updatingOrder || isDeleting}
                      className="flex-[2] py-3 bg-black text-white rounded-xl font-bold text-xs uppercase hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {updatingOrder ? 'Saving Changes...' : 'Save Order'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}