import { Component, createSignal, For, Show } from 'solid-js';
import {
  getMerchantOnboardingProgress,
  sendOnboardingNudge,
  MerchantOnboardingItem,
} from '../services/adminApi';

export const MerchantOnboardingView: Component = () => {
  const [items, setItems] = createSignal<MerchantOnboardingItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [search, setSearch] = createSignal('');
  const [nudgingId, setNudgingId] = createSignal<string | null>(null);
  const [notification, setNotification] = createSignal<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getMerchantOnboardingProgress();
      setItems(data);
    } catch (err) {
      console.error('Failed to load merchant onboarding progress:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const handleNudge = async (item: MerchantOnboardingItem) => {
    let nextStep = 'First Invoice';
    if (!item.profileCompleted) nextStep = 'Store Profile';
    else if (!item.firstItemAdded) nextStep = 'Product Inventory';
    else if (!item.firstInvoiceCreated) nextStep = 'First Sales Invoice';
    else if (!item.fonepayQrLinked) nextStep = 'FonePay Dynamic QR';
    else if (!item.mobileAppPaired) nextStep = 'Mobile App Pair';

    setNudgingId(item.businessId);
    const ok = await sendOnboardingNudge(item.businessId, nextStep);
    setNudgingId(null);

    if (ok) {
      showToast(`Sent onboarding nudge for "${nextStep}" to ${item.businessName}!`);
    } else {
      showToast('Failed to deliver nudge notification.');
    }
  };

  const filteredItems = () => {
    return items().filter(
      (m) =>
        m.businessName.toLowerCase().includes(search().toLowerCase()) ||
        (m.ownerName && m.ownerName.toLowerCase().includes(search().toLowerCase()))
    );
  };

  const completedCount = () => items().filter((i) => i.completionPercentage === 100).length;
  const avgCompletion = () => {
    if (items().length === 0) return 0;
    const sum = items().reduce((acc, i) => acc + i.completionPercentage, 0);
    return Math.round(sum / items().length);
  };

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
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
              Activation & Retention
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 2 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Merchant Onboarding & Milestone Tracker
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Track onboarding progression across 7 essential milestones to diagnose activation drop-offs and dispatch push nudges to stalled Kirana owners.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            class="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Progress
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Funnel Score</div>
          <div class="text-2xl font-black text-[#FF4500] mt-2 font-heading">{avgCompletion()}%</div>
          <div class="text-[11px] text-gray-500 mt-1">Across all registered shops</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fully Activated (100%)</div>
          <div class="text-2xl font-black text-emerald-600 mt-2 font-heading">{completedCount()}</div>
          <div class="text-[11px] text-emerald-600 font-semibold mt-1">All 7 milestones completed</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress (1-99%)</div>
          <div class="text-2xl font-black text-blue-600 mt-2 font-heading">
            {items().filter((i) => i.completionPercentage > 0 && i.completionPercentage < 100).length}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">Currently setting up store</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stalled at Step 1</div>
          <div class="text-2xl font-black text-rose-600 mt-2 font-heading">
            {items().filter((i) => i.completionPercentage <= 20).length}
          </div>
          <div class="text-[11px] text-rose-600 font-semibold mt-1">Needs admin intervention</div>
        </div>
      </div>

      {/* Funnel Checklist Legend */}
      <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          The 7 Byapar Core Milestones
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-[11px] text-gray-600">
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>1️⃣</span> Profile Setup
          </div>
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>2️⃣</span> Item Added
          </div>
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>3️⃣</span> First Invoice
          </div>
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>4️⃣</span> FonePay QR
          </div>
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>5️⃣</span> Staff Invited
          </div>
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>6️⃣</span> App Paired
          </div>
          <div class="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5 font-medium">
            <span>7️⃣</span> Realtime Sync
          </div>
        </div>
      </div>

      {/* Onboarding Table */}
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div class="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Search store name or merchant..."
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
                <th class="py-3 px-4">Merchant & Store</th>
                <th class="py-3 px-4">Progress Bar</th>
                <th class="py-3 px-4">Item</th>
                <th class="py-3 px-4">Invoice</th>
                <th class="py-3 px-4">FonePay</th>
                <th class="py-3 px-4">Mobile</th>
                <th class="py-3 px-4">Sync</th>
                <th class="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show
                when={!loading()}
                fallback={
                  <tr>
                    <td colspan="8" class="py-8 text-center text-gray-400 animate-pulse">
                      Loading onboarding funnel...
                    </td>
                  </tr>
                }
              >
                <For
                  each={filteredItems()}
                  fallback={
                    <tr>
                      <td colspan="8" class="py-8 text-center text-gray-400">
                        No onboarding records found.
                      </td>
                    </tr>
                  }
                >
                  {(m) => (
                    <tr class="hover:bg-gray-50/70 transition">
                      <td class="py-3.5 px-4">
                        <div class="font-bold text-gray-900">{m.businessName}</div>
                        <div class="text-[11px] text-gray-500">
                          {m.ownerName} • {m.phone || 'No phone'}
                        </div>
                      </td>

                      <td class="py-3.5 px-4 min-w-[150px]">
                        <div class="flex items-center justify-between text-[11px] font-bold text-gray-700 mb-1">
                          <span>{m.completionPercentage}% Complete</span>
                        </div>
                        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            class={`h-full rounded-full transition-all duration-500 ${
                              m.completionPercentage === 100
                                ? 'bg-emerald-500'
                                : m.completionPercentage >= 50
                                ? 'bg-[#FF4500]'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${m.completionPercentage}%` }}
                          />
                        </div>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] font-bold ${m.firstItemAdded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {m.firstItemAdded ? '✓' : '—'}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] font-bold ${m.firstInvoiceCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {m.firstInvoiceCreated ? '✓' : '—'}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] font-bold ${m.fonepayQrLinked ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {m.fonepayQrLinked ? '✓' : '—'}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] font-bold ${m.mobileAppPaired ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {m.mobileAppPaired ? '✓' : '—'}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] font-bold ${m.backupConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {m.backupConfigured ? '✓' : '—'}
                        </span>
                      </td>

                      <td class="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleNudge(m)}
                          disabled={nudgingId() === m.businessId || m.completionPercentage === 100}
                          class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                            m.completionPercentage === 100
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                              : 'bg-orange-50 hover:bg-[#FF4500] text-[#FF4500] hover:text-white border border-orange-200'
                          }`}
                        >
                          {m.completionPercentage === 100 ? 'Active 🎉' : 'Nudge 🔔'}
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
    </div>
  );
};
