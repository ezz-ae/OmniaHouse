'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { Building2, X } from 'lucide-react';

type IntegrationRow = {
  id?: string;
  provider: string;
  status?: string;
  last_sync_at?: string | null;
  base_url?: string | null;
};

type ShopifyCustomer = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

type ShopifyLineItem = {
  variant_id?: number | string;
  title: string;
  price: number | string;
  quantity: number;
};

type ShopifyDraft = {
  id: number;
  name: string;
  total_price: string | number;
  customer?: ShopifyCustomer | null;
  note?: string | null;
  line_items?: ShopifyLineItem[];
  invoice_url?: string | null;
};

type WordPressDraft = {
  ID: number | string;
  post_title?: string;
  post_type?: string;
  post_modified?: string;
};

type ProductRow = {
  sku: string;
  title: string;
  price_aed: number;
  metadata?: { variant_id?: number | string } | null;
};

export default function ManagementRoom() {
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [healthStatuses, setHealthStatuses] = useState<Record<string, string>>({});
  const [draftPosts, setDraftPosts] = useState<WordPressDraft[]>([]);
  const [shopifyDrafts, setShopifyDrafts] = useState<ShopifyDraft[]>([]);
  const [shopifyDraftStatus, setShopifyDraftStatus] = useState<'open' | 'completed'>('open');
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductRow[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShopifyDraft | null>(null);
  const [fetchingOrder, setFetchingOrder] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<{ note: string; line_items: ShopifyLineItem[] }>({ note: '', line_items: [] });
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
      setIntegrations((data as IntegrationRow[]) || []);
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
      setProductSearchResults((data as ProductRow[]) || []);
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
    const { data: updated } = await supabase.from('org_integrations').select('*').order('provider', { ascending: true });
    if (updated) setIntegrations(updated as IntegrationRow[]);
  };

  const handleCreateShopifyDraft = async () => {
    setIsCreatingDraft(true);
    try {
      const res = await fetch('/api/shopify/draft-orders', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(`Shopify draft order created: ${data.draft_order.name}`);
        fetchShopifyDrafts();
      } else {
        throw new Error(data.error || 'Failed to create draft');
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
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
        alert('Draft order deleted');
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
        alert('Invoice sent to customer email.');
      } else {
        throw new Error(data.error || 'Failed to send invoice');
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleCompleteShopifyOrder = async () => {
    if (!editingOrder) return;
    if (!confirm('Complete this order? It will be converted into a final Shopify order.')) return;
    setIsCompletingOrder(true);
    try {
      const res = await fetch(`/api/shopify/draft-orders/${editingOrder.id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Order completed.');
        setIsEditModalOpen(false);
        fetchShopifyDrafts(shopifyDraftStatus);
      } else {
        throw new Error(data.error || 'Failed to complete order');
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
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
        alert('Customer profile synced from CRM.');
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

  const statusDotClass = (provider: string, state?: IntegrationRow) => {
    const s = healthStatuses[provider] || state?.status;
    if (s === 'active') return 'bg-emerald-400';
    if (s === 'checking') return 'bg-amber-400 animate-pulse';
    if (s === 'error') return 'bg-rose-400';
    return 'bg-zinc-600';
  };

  const statusLabel = (provider: string, state?: IntegrationRow) => {
    const s = healthStatuses[provider] || state?.status;
    if (!s) return 'Not linked';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <header className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
                <Building2 className="w-3.5 h-3.5" />
                Management
              </div>
              <h1 className="text-2xl font-medium text-zinc-100 mb-1">Switchboard</h1>
              <p className="text-sm text-zinc-400">Storefronts, payment networks, and draft orders across both stores.</p>
            </div>
          </header>

          {loading ? (
            <div className="text-sm text-zinc-500">Loading integrations…</div>
          ) : (
            <div className="space-y-10">
              <Section title="Storefronts">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {storefronts.map(provider => {
                    const state = integrations.find(i => i.provider === provider);
                    return (
                      <div key={provider} className="border border-zinc-800 rounded-md bg-zinc-900/60 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusDotClass(provider, state)}`} />
                            <span className="text-sm font-medium text-zinc-100 capitalize">{provider}</span>
                          </div>
                          <span className="text-2xs uppercase tracking-wider text-zinc-500">{statusLabel(provider, state)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <Metric label="Last sync" value={state?.last_sync_at ? new Date(state.last_sync_at).toLocaleTimeString() : '—'} />
                          <Metric label="Base URL" value={state?.base_url ? hostOf(state.base_url) : '—'} mono />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLaunchManager(provider)}
                            className="flex-1 h-8 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-900 text-xs font-medium transition-colors"
                          >
                            Open manager
                          </button>
                          <button
                            onClick={() => handleCheckHealth(provider)}
                            disabled={healthStatuses[provider] === 'checking'}
                            className="flex-1 h-8 rounded-md border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-100 transition-colors disabled:opacity-50"
                          >
                            {healthStatuses[provider] === 'checking' ? 'Checking…' : 'Check health'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section title="Payments">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {payments.map(provider => {
                    const state = integrations.find(i => i.provider === provider);
                    return (
                      <div key={provider} className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass(provider, state)}`} />
                          <span className="text-2xs uppercase tracking-wider text-zinc-500">{provider}</span>
                        </div>
                        <div className="text-sm text-zinc-100 mb-1">{state?.status === 'active' ? 'Operational' : 'Paused'}</div>
                        <div className="text-2xs font-mono text-zinc-600">{state?.id?.substring(0, 8) || '—'}</div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)} title={`${activeProvider} manager`}>
          {activeProvider === 'shopify' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-1 text-xs">
                  {(['open', 'completed'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setShopifyDraftStatus(s)}
                      className={`px-3 py-1 rounded uppercase tracking-wider text-2xs transition-colors ${
                        shopifyDraftStatus === s
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateShopifyDraft}
                  disabled={isCreatingDraft}
                  className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-900 text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {isCreatingDraft ? 'Creating…' : 'New draft'}
                </button>
              </div>

              <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
                {shopifyDrafts.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs text-zinc-500">
                    No {shopifyDraftStatus} drafts.
                  </div>
                ) : shopifyDrafts.map((order) => (
                  <div key={order.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-100 font-mono">{order.name}</div>
                      <div className="text-xs text-zinc-500 truncate">
                        {order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Unnamed' : 'No customer'}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-300 mr-4 tabular-nums">
                      {Number(order.total_price).toLocaleString()} AED
                    </div>
                    <button
                      onClick={() => handleEditShopifyDraft(order.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-2xs uppercase tracking-wider text-zinc-500">WordPress drafts</div>
                <button className="text-xs text-emerald-400 hover:text-emerald-300">Manage in CMS</button>
              </div>
              <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
                {draftPosts.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs text-zinc-500">
                    No draft posts in WordPress.
                  </div>
                ) : draftPosts.map((post) => (
                  <div key={post.ID} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-100 truncate">{post.post_title || 'Untitled draft'}</div>
                      <div className="text-2xs uppercase tracking-wider text-zinc-500">
                        {post.post_type} · {post.post_modified ? new Date(post.post_modified).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <button className="text-xs text-emerald-400 hover:text-emerald-300">Review</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {isEditModalOpen && (
        <Modal onClose={() => setIsEditModalOpen(false)} title="Edit draft order" size="md">
          {fetchingOrder ? (
            <div className="py-10 text-center text-xs text-zinc-500 animate-pulse">Fetching details…</div>
          ) : editingOrder ? (
            <div className="space-y-5">
              <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">Customer</div>
                  <div className="text-sm text-zinc-100 truncate">
                    {editingOrder.customer
                      ? `${editingOrder.customer.first_name || ''} ${editingOrder.customer.last_name || ''}`.trim() || 'Unnamed'
                      : 'No customer linked'}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {editingOrder.customer?.email || editingOrder.customer?.phone || 'Missing contact info'}
                  </div>
                  {customerWalletBalance !== null && (
                    <div className="mt-2 inline-flex items-center text-2xs uppercase tracking-wider text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded px-2 py-0.5">
                      Wallet · {customerWalletBalance.toLocaleString()} AED
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSyncCustomer}
                  disabled={isSyncingCustomer}
                  className="h-8 px-3 rounded-md border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-100 disabled:opacity-50 transition-colors shrink-0"
                >
                  {isSyncingCustomer ? 'Syncing…' : 'Sync CRM'}
                </button>
              </div>

              {editingOrder.invoice_url && (
                <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">Payment link</div>
                    <div className="text-xs font-mono text-zinc-300 truncate">{editingOrder.invoice_url}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (editingOrder.invoice_url) {
                        navigator.clipboard.writeText(editingOrder.invoice_url);
                        alert('Link copied.');
                      }
                    }}
                    className="h-8 px-3 rounded-md border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-100 transition-colors shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}

              <Field label="Order note">
                <textarea
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 outline-none focus:border-zinc-700 h-24 resize-none"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Add a private note to this order…"
                />
              </Field>

              <Field label="Add product">
                <input
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 outline-none focus:border-zinc-700"
                  placeholder="Type product name…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {isSearchingProducts && (
                  <div className="mt-2 text-2xs uppercase tracking-wider text-zinc-500 animate-pulse">Searching…</div>
                )}
                {productSearchResults.length > 0 && (
                  <div className="mt-2 border border-zinc-800 rounded-md divide-y divide-zinc-800">
                    {productSearchResults.map((prod, idx) => (
                      <div key={idx} className="px-3 py-2 flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-100 truncate">{prod.title}</div>
                          <div className="text-2xs font-mono text-zinc-500">{prod.sku} · {prod.price_aed} AED</div>
                        </div>
                        <button
                          onClick={() => {
                            const newItem: ShopifyLineItem = {
                              variant_id: prod.metadata?.variant_id,
                              title: prod.title,
                              price: prod.price_aed,
                              quantity: 1
                            };
                            setEditForm({ ...editForm, line_items: [...editForm.line_items, newItem] });
                            setProductSearch('');
                            setProductSearchResults([]);
                          }}
                          className="h-7 px-2 rounded border border-zinc-800 hover:bg-zinc-800 text-2xs uppercase tracking-wider text-zinc-100 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>

              {editForm.line_items.length > 0 && (
                <Field label={`Line items · ${editForm.line_items.length}`}>
                  <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
                    {editForm.line_items.map((item, i) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-100 truncate">{item.title}</div>
                          <div className="text-2xs font-mono text-zinc-500">{item.price} AED</div>
                        </div>
                        <input
                          type="number"
                          aria-label={`Quantity for ${item.title}`}
                          className="w-14 h-7 text-center bg-zinc-900 border border-zinc-800 rounded text-sm text-zinc-100 outline-none focus:border-zinc-700 tabular-nums"
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
                          aria-label={`Remove ${item.title}`}
                          onClick={() => {
                            const newItems = editForm.line_items.filter((_, idx) => idx !== i);
                            setEditForm({ ...editForm, line_items: newItems });
                          }}
                          className="w-7 h-7 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <div className="text-2xs uppercase tracking-wider text-zinc-500">Workflow</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleSendShopifyInvoice}
                    disabled={isSendingInvoice || !editingOrder.customer?.email}
                    className="h-8 rounded-md border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-100 disabled:opacity-50 transition-colors"
                  >
                    {isSendingInvoice ? 'Sending…' : 'Send invoice'}
                  </button>
                  <button
                    onClick={handleCompleteShopifyOrder}
                    disabled={isCompletingOrder}
                    className="h-8 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-900 text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {isCompletingOrder ? 'Completing…' : 'Complete order'}
                  </button>
                  {integrations.find(i => i.provider === 'shopify')?.base_url ? (
                    <a
                      href={`${integrations.find(i => i.provider === 'shopify')?.base_url}/admin/draft_orders/${editingOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 rounded-md border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-100 transition-colors flex items-center justify-center"
                    >
                      View in Shopify
                    </a>
                  ) : (
                    <div />
                  )}
                </div>
                {!editingOrder.customer?.email && (
                  <div className="text-2xs text-amber-400">Invoice requires customer email.</div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteShopifyDraft(editingOrder.id)}
                  disabled={isDeleting || updatingOrder}
                  className="flex-1 h-9 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={handleUpdateShopifyDraft}
                  disabled={updatingOrder || isDeleting}
                  className="flex-[2] h-9 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-900 text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {updatingOrder ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-3">{title}</div>
      {children}
    </section>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-xs text-zinc-300 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  size = 'lg',
  children,
}: {
  title: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}) {
  const widthClass = size === 'md' ? 'max-w-lg' : 'max-w-3xl';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-zinc-900 border border-zinc-800 rounded-md w-full ${widthClass} max-h-[85vh] flex flex-col shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 shrink-0 px-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-100 capitalize">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
