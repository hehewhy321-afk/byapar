import { Component, createSignal, For, Show } from 'solid-js';
import {
  getFeatureFlags,
  toggleGlobalFeatureFlag,
  getShopFeatureOverrides,
  setShopFeatureOverride,
  getShopsList,
  FeatureFlag,
  ShopSummary,
} from '../services/adminApi';

export const FeatureFlagsView: Component = () => {
  const [flags, setFlags] = createSignal<FeatureFlag[]>([]);
  const [shops, setShops] = createSignal<ShopSummary[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [search, setSearch] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('all');
  const [savingKey, setSavingKey] = createSignal<string | null>(null);

  // Shop Override Modal State
  const [overrideModalFlag, setOverrideModalFlag] = createSignal<FeatureFlag | null>(null);
  const [selectedShopId, setSelectedShopId] = createSignal<string>('');
  const [shopOverrides, setShopOverrides] = createSignal<Record<string, boolean>>({});
  const [loadingOverrides, setLoadingOverrides] = createSignal(false);
  const [notification, setNotification] = createSignal<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [fData, sData] = await Promise.all([getFeatureFlags(), getShopsList()]);
      setFlags(fData);
      setShops(sData);
      if (sData.length > 0 && !selectedShopId()) {
        setSelectedShopId(sData[0].id);
      }
    } catch (err) {
      console.error('Failed to load feature flags data:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const handleGlobalToggle = async (flag: FeatureFlag) => {
    const nextVal = !flag.defaultEnabled;
    setSavingKey(flag.key);
    const success = await toggleGlobalFeatureFlag(flag.key, nextVal);
    setSavingKey(null);

    if (success) {
      setFlags((curr) =>
        curr.map((f) => (f.key === flag.key ? { ...f, defaultEnabled: nextVal } : f))
      );
      showToast(`Global default for "${flag.name}" set to ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
    } else {
      showToast(`Failed to update ${flag.name}.`);
    }
  };

  const openOverrideModal = async (flag: FeatureFlag) => {
    setOverrideModalFlag(flag);
    if (selectedShopId()) {
      await fetchShopOverrides(selectedShopId());
    }
  };

  const fetchShopOverrides = async (businessId: string) => {
    setLoadingOverrides(true);
    const ov = await getShopFeatureOverrides(businessId);
    setShopOverrides(ov);
    setLoadingOverrides(false);
  };

  const handleShopOverrideToggle = async (flagKey: string, currentEnabled: boolean) => {
    const nextVal = !currentEnabled;
    const shopId = selectedShopId();
    if (!shopId) return;

    const ok = await setShopFeatureOverride(shopId, flagKey, nextVal);
    if (ok) {
      setShopOverrides((curr) => ({ ...curr, [flagKey]: nextVal }));
      showToast(`Merchant override saved.`);
      // refresh overrides count
      const updatedFlags = await getFeatureFlags();
      setFlags(updatedFlags);
    }
  };

  const categories = () => {
    const set = new Set(flags().map((f) => f.category));
    return ['all', ...Array.from(set)];
  };

  const filteredFlags = () => {
    return flags().filter((f) => {
      const matchesCat = selectedCategory() === 'all' || f.category === selectedCategory();
      const matchesSearch =
        f.name.toLowerCase().includes(search().toLowerCase()) ||
        f.key.toLowerCase().includes(search().toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(search().toLowerCase()));
      return matchesCat && matchesSearch;
    });
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'ai':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'payments':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'credit':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'hardware':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'inventory':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'compliance':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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

      {/* Header & Description */}
      <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 text-[#FF4500] border border-orange-200 uppercase tracking-wider">
              Control Plane
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 2 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Enterprise Feature Flags & Rollouts
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Safely toggle platform modules, enable experimental AI vision tools, or grant targeted beta features to specific Kirana merchants before general release.
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
            Refresh Flags
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <For each={categories()}>
            {(cat) => (
              <button
                onClick={() => setSelectedCategory(cat)}
                class={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition whitespace-nowrap ${
                  selectedCategory() === cat
                    ? 'bg-[#FF4500] text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {cat === 'all' ? 'All Modules' : cat}
              </button>
            )}
          </For>
        </div>

        <div class="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search flags or keys..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
          />
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Feature Flags Grid */}
      <Show
        when={!loading()}
        fallback={
          <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-500 animate-pulse">
            Loading feature matrix...
          </div>
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <For
            each={filteredFlags()}
            fallback={
              <div class="col-span-full bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-400">
                No feature flags match your search query.
              </div>
            }
          >
            {(flag) => (
              <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getCategoryBadge(flag.category)}`}>
                          {flag.category}
                        </span>
                        <code class="text-[11px] font-mono font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {flag.key}
                        </code>
                      </div>
                      <h3 class="text-base font-bold text-gray-900 mt-2 font-heading">
                        {flag.name}
                      </h3>
                    </div>

                    {/* Global Toggle Switch */}
                    <div class="flex flex-col items-end gap-1">
                      <button
                        onClick={() => handleGlobalToggle(flag)}
                        disabled={savingKey() === flag.key}
                        class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          flag.defaultEnabled ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            flag.defaultEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span class="text-[10px] font-semibold text-gray-500">
                        {flag.defaultEnabled ? 'Global: ON' : 'Global: OFF'}
                      </span>
                    </div>
                  </div>

                  <p class="text-xs text-gray-600 leading-relaxed mb-4">
                    {flag.description || 'No description provided.'}
                  </p>
                </div>

                {/* Footer Controls */}
                <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#FF4500]" />
                    <span>
                      {flag.overridesCount || 0} Merchant Override{(flag.overridesCount || 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    onClick={() => openOverrideModal(flag)}
                    class="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
                  >
                    Configure Per-Shop ⚙️
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Shop Override Modal */}
      <Show when={overrideModalFlag()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 space-y-5">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[10px] font-bold text-[#FF4500] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                  Targeted Shop Overrides
                </span>
                <h3 class="text-lg font-bold text-gray-900 mt-1">
                  {overrideModalFlag()?.name}
                </h3>
                <p class="text-xs text-gray-500 mt-0.5">
                  Default: <strong class="text-gray-800">{overrideModalFlag()?.defaultEnabled ? 'Enabled' : 'Disabled'}</strong>
                </p>
              </div>

              <button
                onClick={() => setOverrideModalFlag(null)}
                class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Select Shop */}
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">
                Select Kirana Merchant / Store
              </label>
              <select
                value={selectedShopId()}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setSelectedShopId(val);
                  fetchShopOverrides(val);
                }}
                class="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
              >
                <For each={shops()}>
                  {(s) => (
                    <option value={s.id}>
                      {s.name} ({s.planTier.toUpperCase()} • {s.address || 'Nepal'})
                    </option>
                  )}
                </For>
              </select>
            </div>

            {/* Current Override Status for Selected Shop */}
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200/70 space-y-3">
              <Show
                when={!loadingOverrides()}
                fallback={<div class="text-xs text-gray-400 text-center py-2">Reading store config...</div>}
              >
                {(() => {
                  const flagKey = overrideModalFlag()!.key;
                  const hasExplicit = shopOverrides()[flagKey] !== undefined;
                  const isEffectiveEnabled = hasExplicit
                    ? shopOverrides()[flagKey]
                    : overrideModalFlag()!.defaultEnabled;

                  return (
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="text-xs font-bold text-gray-900">
                          Status for Selected Shop
                        </div>
                        <div class="text-[11px] text-gray-500 mt-0.5">
                          {hasExplicit ? (
                            <span class="text-blue-600 font-semibold">Custom Store Override Active</span>
                          ) : (
                            <span class="text-gray-400">Inherited from Global Default</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleShopOverrideToggle(flagKey, isEffectiveEnabled)}
                        class={`px-4 py-1.5 text-xs font-bold rounded-xl transition shadow-sm ${
                          isEffectiveEnabled
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isEffectiveEnabled ? 'ENABLED (Click to Disable)' : 'DISABLED (Click to Enable)'}
                      </button>
                    </div>
                  );
                })()}
              </Show>
            </div>

            <div class="flex justify-end pt-2">
              <button
                onClick={() => setOverrideModalFlag(null)}
                class="px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-xl hover:bg-black transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
