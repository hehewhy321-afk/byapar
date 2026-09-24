import { Component, createSignal, For, Show } from 'solid-js';
import { getShopsList, updateShopSubscription, getShopDetailedProfile, ShopSummary, ShopDetail } from '../services/adminApi';
import { exportToCSV, formatNprExport } from '../services/exportUtils';

export const ShopsView: Component = () => {
  const [shops, setShops] = createSignal<ShopSummary[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [tierFilter, setTierFilter] = createSignal<'all' | 'free' | 'pro' | 'enterprise'>('all');

  // Drill-down detail panel
  const [detailShop, setDetailShop] = createSignal<ShopDetail | null>(null);
  const [detailLoading, setDetailLoading] = createSignal(false);

  // Selected shop for subscription modal
  const [selectedShop, setSelectedShop] = createSignal<ShopSummary | null>(null);
  const [modalTier, setModalTier] = createSignal<'free' | 'pro' | 'enterprise'>('pro');
  const [modalStatus, setModalStatus] = createSignal<'active' | 'trialing' | 'expired'>('active');
  const [modalExtendDays, setModalExtendDays] = createSignal(30);
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [modalSuccess, setModalSuccess] = createSignal<string | null>(null);

  const loadShops = async () => {
    try {
      const data = await getShopsList();
      setShops(data);
    } catch (err) {
      console.error('loadShops error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadShops());

  const filteredShops = () => {
    const q = searchQuery().toLowerCase().trim();
    const tier = tierFilter();
    return shops().filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.panNumber && s.panNumber.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q));
      const matchTier = tier === 'all' || s.planTier === tier;
      return matchSearch && matchTier;
    });
  };

  const openPlanModal = (shop: ShopSummary, e: Event) => {
    e.stopPropagation();
    setSelectedShop(shop);
    setModalTier((shop.planTier as any) || 'pro');
    setModalStatus((shop.subscriptionStatus as any) || 'active');
    setModalExtendDays(30);
    setModalSuccess(null);
  };

  const handleSaveSubscription = async () => {
    const shop = selectedShop();
    if (!shop) return;
    setIsUpdating(true);
    setModalSuccess(null);
    const res = await updateShopSubscription(shop.id, modalTier(), modalStatus(), modalExtendDays());
    setIsUpdating(false);
    if (res.success) {
      setModalSuccess(`Updated ${shop.name} to ${modalTier().toUpperCase()} successfully!`);
      loadShops();
      setTimeout(() => setSelectedShop(null), 1500);
    } else {
      alert(`Update failed: ${res.error}`);
    }
  };

  const handleDrillDown = async (shop: ShopSummary) => {
    setDetailLoading(true);
    setDetailShop(null);
    try {
      const detail = await getShopDetailedProfile(shop.id);
      setDetailShop(detail);
    } catch (err) {
      console.error('Drill-down error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = () => {
    exportToCSV(filteredShops(), 'merchants_directory', [
      { key: 'name', label: 'Store Name' },
      { key: 'panNumber', label: 'PAN' },
      { key: 'phone', label: 'Phone' },
      { key: 'businessType', label: 'Type' },
      { key: 'planTier', label: 'Plan' },
      { key: 'subscriptionStatus', label: 'Status' },
      { key: 'daysRemaining', label: 'Days Remaining' },
    ]);
  };

  const formatNpr = (val: number) =>
    new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(val);

  return (
    <div class="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-heading text-gray-900">Merchants & Shops Directory</h2>
          <p class="text-xs text-gray-500">Overview of Kirana stores and tenant subscription tiers</p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div class="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Search store, PAN, phone..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]"
            />
            <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {/* Tier Filter Pills */}
          <div class="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
            {(['all', 'free', 'pro', 'enterprise'] as const).map((tier) => (
              <button
                type="button"
                onClick={() => setTierFilter(tier)}
                class={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                  tierFilter() === tier
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition-all shadow-sm"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Content: Table + Detail Panel */}
      <div class="flex gap-6">
        {/* Directory Table */}
        <div class={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all ${detailShop() || detailLoading() ? 'flex-1 min-w-0' : 'w-full'}`}>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-5">Store Name</th>
                  <th class="py-3 px-5">PAN / Phone</th>
                  <th class="py-3 px-5">Type</th>
                  <th class="py-3 px-5">Plan</th>
                  <th class="py-3 px-5">Validity</th>
                  <th class="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <Show
                  when={!loading() && filteredShops().length > 0}
                  fallback={
                    <tr>
                      <td colspan="6" class="py-10 text-center text-gray-400">
                        {loading() ? 'Loading merchants...' : 'No stores matched your filters.'}
                      </td>
                    </tr>
                  }
                >
                  <For each={filteredShops()}>
                    {(shop) => (
                      <tr
                        class={`transition-colors cursor-pointer ${
                          detailShop()?.id === shop.id ? 'bg-orange-50/50 border-l-2 border-[#FF4500]' : 'hover:bg-gray-50/50'
                        }`}
                        onClick={() => handleDrillDown(shop)}
                      >
                        <td class="py-3 px-5">
                          <div class="font-semibold text-gray-900">{shop.name}</div>
                          <div class="text-[11px] text-gray-400">{shop.address}</div>
                        </td>
                        <td class="py-3 px-5">
                          <div class="font-mono text-gray-700">{shop.panNumber}</div>
                          <div class="text-[11px] text-gray-400">{shop.phone}</div>
                        </td>
                        <td class="py-3 px-5 text-gray-600">{shop.businessType}</td>
                        <td class="py-3 px-5">
                          <span
                            class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              shop.planTier === 'pro'
                                ? 'bg-orange-50 text-[#FF4500] border border-orange-200'
                                : shop.planTier === 'enterprise'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {shop.planTier}
                          </span>
                        </td>
                        <td class="py-3 px-5">
                          <span
                            class={`font-medium ${
                              shop.daysRemaining !== undefined && shop.daysRemaining <= 7
                                ? 'text-amber-600 font-bold'
                                : 'text-gray-600'
                            }`}
                          >
                            {shop.daysRemaining !== undefined ? `${shop.daysRemaining}d left` : 'Unlimited'}
                          </span>
                        </td>
                        <td class="py-3 px-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => openPlanModal(shop, e)}
                            class="px-2.5 py-1 rounded bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium transition-colors shadow-sm"
                          >
                            Manage Plan
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>
        </div>

        {/* Drill-Down Detail Panel */}
        <Show when={detailShop() || detailLoading()}>
          <div class="w-[340px] min-w-[340px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden self-start sticky top-20">
            <Show when={detailLoading()} fallback={
              <Show when={detailShop()}>
                {(shop) => (
                  <>
                    {/* Panel Header */}
                    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-white">
                      <div>
                        <h3 class="font-heading text-sm font-bold text-gray-900">{shop().name}</h3>
                        <p class="text-[10px] text-gray-500">{shop().businessType || 'General Store'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailShop(null)}
                        class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Contact Info */}
                    <div class="px-5 py-3 border-b border-gray-50 space-y-2">
                      <div class="flex items-center gap-2 text-xs">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span class="text-gray-700 font-mono">{shop().phone || 'N/A'}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span class="text-gray-700">{shop().address || 'Nepal'}</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs">
                        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span class="text-gray-700">{shop().ownerName || 'N/A'}</span>
                      </div>
                      {shop().panNumber && (
                        <div class="flex items-center gap-2 text-xs">
                          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span class="text-gray-700 font-mono">{shop().panNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Subscription Info */}
                    <div class="px-5 py-3 border-b border-gray-50">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subscription</span>
                        <span class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          shop().planTier === 'pro' ? 'bg-orange-50 text-[#FF4500]' :
                          shop().planTier === 'enterprise' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {shop().planTier}
                        </span>
                      </div>
                      <div class="flex items-center justify-between text-xs text-gray-600">
                        <span>Status</span>
                        <span class={`font-semibold ${
                          shop().subscriptionStatus === 'active' ? 'text-emerald-600' :
                          shop().subscriptionStatus === 'expired' ? 'text-red-500' : 'text-amber-600'
                        }`}>
                          {shop().subscriptionStatus}
                        </span>
                      </div>
                      {shop().daysRemaining !== undefined && (
                        <div class="flex items-center justify-between text-xs text-gray-600 mt-1">
                          <span>Validity</span>
                          <span class={`font-semibold ${shop().daysRemaining! <= 7 ? 'text-amber-600' : 'text-gray-800'}`}>
                            {shop().daysRemaining}d remaining
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Business Metrics Grid */}
                    <div class="px-5 py-3 border-b border-gray-50">
                      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Business Metrics</span>
                      <div class="grid grid-cols-2 gap-2">
                        <div class="p-2.5 rounded-lg bg-emerald-50/50">
                          <div class="text-sm font-bold text-emerald-700">{formatNpr(shop().totalGmv)}</div>
                          <div class="text-[10px] text-gray-500">Total GMV</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-blue-50/50">
                          <div class="text-sm font-bold text-blue-700">{shop().totalInvoices}</div>
                          <div class="text-[10px] text-gray-500">Invoices</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-purple-50/50">
                          <div class="text-sm font-bold text-purple-700">{shop().totalProducts}</div>
                          <div class="text-[10px] text-gray-500">Products</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-amber-50/50">
                          <div class="text-sm font-bold text-amber-700">{shop().totalParties}</div>
                          <div class="text-[10px] text-gray-500">Parties</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-red-50/50">
                          <div class="text-sm font-bold text-red-600">{formatNpr(shop().totalKhataOutstanding)}</div>
                          <div class="text-[10px] text-gray-500">Credit Outstanding</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-cyan-50/50">
                          <div class="text-sm font-bold text-cyan-700">{shop().staffCount}</div>
                          <div class="text-[10px] text-gray-500">Staff Members</div>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div class="px-5 py-3 text-[10px] text-gray-400 space-y-1">
                      <div class="flex justify-between">
                        <span>Registered</span>
                        <span class="font-mono">{new Date(shop().createdAt).toLocaleDateString()}</span>
                      </div>
                      {shop().lastActivityAt && (
                        <div class="flex justify-between">
                          <span>Last Activity</span>
                          <span class="font-mono">{new Date(shop().lastActivityAt!).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Show>
            }>
              <div class="py-16 text-center text-gray-400 text-xs">
                <div class="w-6 h-6 border-2 border-gray-300 border-t-[#FF4500] rounded-full animate-spin mx-auto mb-3" />
                Loading merchant details...
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Plan Management Modal — preserved from original */}
      <Show when={selectedShop()}>
        <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="w-full max-w-md bg-white p-6 rounded-2xl border border-gray-200 shadow-xl relative">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 class="text-base font-bold font-heading text-gray-900">Update Subscription Plan</h3>
                <p class="text-xs text-gray-500">{selectedShop()?.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedShop(null)} class="p-1 rounded-lg text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <Show when={modalSuccess()}>
              <div class="my-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                {modalSuccess()}
              </div>
            </Show>

            <div class="space-y-4 my-5 text-xs">
              <div>
                <label class="block font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px]">Target Plan Tier</label>
                <div class="grid grid-cols-3 gap-2">
                  {(['free', 'pro', 'enterprise'] as const).map((tier) => (
                    <button
                      type="button"
                      onClick={() => setModalTier(tier)}
                      class={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all ${
                        modalTier() === tier ? 'bg-[#FF4500] border-[#FF4500] text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label class="block font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px]">Status</label>
                <div class="grid grid-cols-3 gap-2">
                  {(['active', 'trialing', 'expired'] as const).map((st) => (
                    <button
                      type="button"
                      onClick={() => setModalStatus(st)}
                      class={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                        modalStatus() === st ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label class="block font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px]">Extend Validity From Today</label>
                <div class="grid grid-cols-4 gap-2">
                  {[15, 30, 90, 365].map((days) => (
                    <button
                      type="button"
                      onClick={() => setModalExtendDays(days)}
                      class={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        modalExtendDays() === days ? 'bg-orange-50 border-[#FF4500] text-[#FF4500] font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      +{days}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                class="px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubscription}
                disabled={isUpdating()}
                class="px-4 py-1.5 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isUpdating() ? 'Saving...' : 'Save & Alert Merchant'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
