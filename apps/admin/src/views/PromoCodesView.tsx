import { Component, createSignal, For, Show } from 'solid-js';
import {
  getPromoCodes,
  createPromoCode,
  togglePromoCodeStatus,
  PromoCode,
} from '../services/adminApi';
import { exportToCSV } from '../services/exportUtils';

export const PromoCodesView: Component = () => {
  const [promos, setPromos] = createSignal<PromoCode[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [search, setSearch] = createSignal('');
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [creating, setCreating] = createSignal(false);
  const [notification, setNotification] = createSignal<string | null>(null);

  // Form State
  const [newCode, setNewCode] = createSignal('');
  const [newDesc, setNewDesc] = createSignal('');
  const [newType, setNewType] = createSignal<'percentage' | 'fixed_amount'>('percentage');
  const [newValue, setNewValue] = createSignal(20);
  const [newTier, setNewTier] = createSignal('all');
  const [newMax, setNewMax] = createSignal(100);
  const [newMinAmount, setNewMinAmount] = createSignal(0);
  const [newExpiryDays, setNewExpiryDays] = createSignal(60);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPromoCodes();
      setPromos(data);
    } catch (err) {
      console.error('Failed to load promo codes:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const handleToggleStatus = async (promo: PromoCode) => {
    const nextVal = !promo.isActive;
    const ok = await togglePromoCodeStatus(promo.id, nextVal);
    if (ok) {
      setPromos((curr) =>
        curr.map((p) => (p.id === promo.id ? { ...p, isActive: nextVal } : p))
      );
      showToast(`Promo "${promo.code}" is now ${nextVal ? 'ACTIVE' : 'PAUSED'}.`);
    }
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!newCode().trim()) {
      showToast('Please enter a coupon code.');
      return;
    }

    setCreating(true);
    const expiry = new Date(Date.now() + newExpiryDays() * 86400000).toISOString();
    const ok = await createPromoCode({
      code: newCode().trim(),
      description: newDesc().trim(),
      discountType: newType(),
      discountValue: Number(newValue()),
      appliesToTier: newTier(),
      maxRedemptions: Number(newMax()),
      minAmount: Number(newMinAmount()),
      expiresAt: expiry,
    });
    setCreating(false);

    if (ok) {
      setShowCreateModal(false);
      setNewCode('');
      setNewDesc('');
      showToast('New promotional coupon created successfully!');
      loadData();
    } else {
      showToast('Failed to create promo code. Make sure code is unique.');
    }
  };

  const handleExport = () => {
    exportToCSV(
      promos(),
      'byapar-promo-codes.csv',
      [
        { key: 'code', label: 'Coupon Code' },
        { key: 'discountType', label: 'Discount Type' },
        { key: 'discountValue', label: 'Discount Value' },
        { key: 'appliesToTier', label: 'Target Tier' },
        { key: 'currentRedemptions', label: 'Redemptions' },
        { key: 'maxRedemptions', label: 'Max Redemptions' },
        { key: 'isActive', label: 'Active' },
        { key: 'expiresAt', label: 'Expires At' },
      ]
    );
  };

  const filteredPromos = () => {
    return promos().filter(
      (p) =>
        p.code.toLowerCase().includes(search().toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search().toLowerCase()))
    );
  };

  const totalRedemptions = () => promos().reduce((sum, p) => sum + p.currentRedemptions, 0);
  const activeCount = () => promos().filter((p) => p.isActive).length;

  return (
    <div class="space-y-6">
      {/* Toast Notification */}
      <Show when={notification()}>
        <div class="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm animate-fade-in border border-gray-700">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{notification()}</span>
        </div>
      </Show>

      {/* Header */}
      <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              Growth & Commercial
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 2 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Coupons & Promotional Discount Engine
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Launch seasonal festival discounts, Kirana onboarding promo codes, and special subscription upgrade vouchers across Nepal.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            onClick={handleExport}
            class="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            class="px-4 py-2 text-xs font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl shadow-md transition flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Promo Code
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Campaigns</div>
          <div class="text-2xl font-black text-gray-900 mt-2 font-heading">{activeCount()}</div>
          <div class="text-[11px] text-emerald-600 font-semibold mt-1">Live in checkout</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Redemptions</div>
          <div class="text-2xl font-black text-gray-900 mt-2 font-heading">{totalRedemptions()}</div>
          <div class="text-[11px] text-gray-500 mt-1">Stores redeemed vouchers</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Max Redemptions Cap</div>
          <div class="text-2xl font-black text-gray-900 mt-2 font-heading">
            {promos().reduce((s, p) => s + p.maxRedemptions, 0)}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">Total capacity allocated</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Redemption Rate</div>
          <div class="text-2xl font-black text-[#FF4500] mt-2 font-heading">
            {promos().length > 0
              ? `${Math.round(
                  (totalRedemptions() /
                    Math.max(1, promos().reduce((s, p) => s + p.maxRedemptions, 0))) *
                    100
                )}%`
              : '0%'}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">Overall voucher conversion</div>
        </div>
      </div>

      {/* Promos Table */}
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div class="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Search coupon code or description..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              class="w-full text-xs pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
            />
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold uppercase tracking-wider text-[10px]">
                <th class="py-3 px-4">Coupon Code</th>
                <th class="py-3 px-4">Benefit</th>
                <th class="py-3 px-4">Target Plan</th>
                <th class="py-3 px-4">Redemptions</th>
                <th class="py-3 px-4">Validity</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show
                when={!loading()}
                fallback={
                  <tr>
                    <td colspan="7" class="py-8 text-center text-gray-400 animate-pulse">
                      Loading promo codes...
                    </td>
                  </tr>
                }
              >
                <For
                  each={filteredPromos()}
                  fallback={
                    <tr>
                      <td colspan="7" class="py-8 text-center text-gray-400">
                        No promo codes found.
                      </td>
                    </tr>
                  }
                >
                  {(p) => {
                    const pct = Math.min(100, Math.round((p.currentRedemptions / p.maxRedemptions) * 100));
                    return (
                      <tr class="hover:bg-gray-50/70 transition">
                        <td class="py-3.5 px-4 font-mono font-bold text-gray-900">
                          <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-lg text-xs font-black tracking-wider text-[#FF4500]">
                              {p.code}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(p.code);
                                showToast(`Copied ${p.code} to clipboard!`);
                              }}
                              class="text-gray-400 hover:text-gray-600 transition"
                              title="Copy Code"
                            >
                              📋
                            </button>
                          </div>
                          <div class="text-[11px] text-gray-500 font-normal font-sans mt-1">
                            {p.description}
                          </div>
                        </td>

                        <td class="py-3.5 px-4">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.discountType === 'percentage'
                              ? `${p.discountValue}% OFF`
                              : `NPR ${p.discountValue} FLAT`}
                          </span>
                        </td>

                        <td class="py-3.5 px-4 uppercase font-bold text-gray-700">
                          <span class="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px]">
                            {p.appliesToTier}
                          </span>
                        </td>

                        <td class="py-3.5 px-4 min-w-[140px]">
                          <div class="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                            <span class="font-bold text-gray-900">{p.currentRedemptions}</span>
                            <span class="text-gray-400">/ {p.maxRedemptions}</span>
                          </div>
                          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              class="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        <td class="py-3.5 px-4 text-gray-600">
                          {p.expiresAt ? (
                            <div>
                              <div>{new Date(p.expiresAt).toLocaleDateString()}</div>
                              <div class="text-[10px] text-gray-400">
                                {Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 86400000)} days left
                              </div>
                            </div>
                          ) : (
                            <span class="text-gray-400">Never</span>
                          )}
                        </td>

                        <td class="py-3.5 px-4">
                          <span
                            class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </td>

                        <td class="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(p)}
                            class={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              p.isActive
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                          >
                            {p.isActive ? 'Pause' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Show when={showCreateModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900 font-heading">
                Create New Promo Code
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                class="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} class="space-y-3.5 text-xs">
              <div>
                <label class="block font-semibold text-gray-700 mb-1">Coupon Code (Uppercase)</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. TIHAR2026"
                    value={newCode()}
                    onInput={(e) => setNewCode(e.currentTarget.value.toUpperCase())}
                    class="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCode('BYAPAR' + Math.floor(100 + Math.random() * 900))}
                    class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Campaign Description</label>
                <input
                  type="text"
                  placeholder="e.g. 50% off for first 100 Kirana stores"
                  value={newDesc()}
                  onInput={(e) => setNewDesc(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={newType()}
                    onChange={(e) => setNewType(e.currentTarget.value as any)}
                    class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (NPR)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-gray-700 mb-1">
                    Value ({newType() === 'percentage' ? '%' : 'NPR'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newValue()}
                    onInput={(e) => setNewValue(Number(e.currentTarget.value))}
                    class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-gray-700 mb-1">Target Plan</label>
                  <select
                    value={newTier()}
                    onChange={(e) => setNewTier(e.currentTarget.value)}
                    class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="all">All Plans</option>
                    <option value="pro">Pro Plan Only</option>
                    <option value="enterprise">Enterprise Mart</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-gray-700 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    value={newMax()}
                    onInput={(e) => setNewMax(Number(e.currentTarget.value))}
                    class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Valid For (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={newExpiryDays()}
                  onInput={(e) => setNewExpiryDays(Number(e.currentTarget.value))}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  class="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating()}
                  class="px-5 py-2 font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl transition shadow-md"
                >
                  {creating() ? 'Saving...' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
