import { Component, createSignal, For, Show } from 'solid-js';
import { getSubscriptionsList, updateShopSubscription, SubscriptionItem } from '../services/adminApi';

export const SubscriptionsView: Component = () => {
  const [subscriptions, setSubscriptions] = createSignal<SubscriptionItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [activeTab, setActiveTab] = createSignal<'all' | 'expiring' | 'expired' | 'active'>('expiring');
  const [actionSuccess, setActionSuccess] = createSignal<string | null>(null);

  const loadData = async () => {
    try {
      const data = await getSubscriptionsList();
      setSubscriptions(data);
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => {
    loadData();
  });

  const filteredSubs = () => {
    const list = subscriptions();
    const tab = activeTab();

    if (tab === 'expiring') {
      return list.filter((s) => s.daysRemaining !== undefined && s.daysRemaining >= 0 && s.daysRemaining <= 7);
    }
    if (tab === 'expired') {
      return list.filter((s) => s.status === 'expired' || (s.daysRemaining !== undefined && s.daysRemaining < 0));
    }
    if (tab === 'active') {
      return list.filter((s) => s.status === 'active');
    }
    return list;
  };

  const handleQuickExtend = async (sub: SubscriptionItem, days: number) => {
    const res = await updateShopSubscription(
      sub.businessId,
      (sub.planTier as any) || 'pro',
      'active',
      days
    );

    if (res.success) {
      setActionSuccess(`Extended ${sub.businessName} by +${days} days!`);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      alert(`Extension failed: ${res.error}`);
    }
  };

  return (
    <div class="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Header and Filter Tabs */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-heading text-gray-900">
            Subscription & Renewal Hub
          </h2>
          <p class="text-xs text-gray-500">
            Monitor upcoming plan expirations and extend merchant licenses
          </p>
        </div>

        {/* Filter Tabs */}
        <div class="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('expiring')}
            class={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab() === 'expiring'
                ? 'bg-white text-amber-700 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Expiring (&le; 7d)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            class={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab() === 'expired'
                ? 'bg-white text-red-700 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Expired
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            class={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab() === 'active'
                ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Active Pro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            class={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab() === 'all'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <Show when={actionSuccess()}>
        <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center justify-between">
          <span>{actionSuccess()}</span>
          <button type="button" onClick={() => setActionSuccess(null)} class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </Show>

      {/* Subscriptions Table */}
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <th class="py-3 px-5">Store Name</th>
                <th class="py-3 px-5">Tier</th>
                <th class="py-3 px-5">Status</th>
                <th class="py-3 px-5">End Date</th>
                <th class="py-3 px-5">Remaining</th>
                <th class="py-3 px-5 text-right">Quick Extend</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show
                when={!loading() && filteredSubs().length > 0}
                fallback={
                  <tr>
                    <td colspan="6" class="py-10 text-center text-gray-400">
                      {loading() ? 'Loading subscriptions...' : 'No subscriptions found in this view.'}
                    </td>
                  </tr>
                }
              >
                <For each={filteredSubs()}>
                  {(sub) => {
                    const isUrgent = () => sub.daysRemaining !== undefined && sub.daysRemaining <= 3 && sub.daysRemaining >= 0;
                    const isExpiring = () => sub.daysRemaining !== undefined && sub.daysRemaining <= 7 && sub.daysRemaining > 3;
                    const isExpired = () => sub.status === 'expired' || (sub.daysRemaining !== undefined && sub.daysRemaining < 0);

                    return (
                      <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="py-3.5 px-5 font-semibold text-gray-900">
                          <div>{sub.businessName}</div>
                          <div class="text-[10px] font-mono text-gray-400 font-normal">{sub.businessId}</div>
                        </td>
                        <td class="py-3.5 px-5">
                          <span
                            class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sub.planTier === 'pro'
                                ? 'bg-orange-50 text-[#FF4500] border border-orange-200'
                                : sub.planTier === 'enterprise'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {sub.planTier}
                          </span>
                        </td>
                        <td class="py-3.5 px-5">
                          <span
                            class={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              sub.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : sub.status === 'trialing'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td class="py-3.5 px-5 text-gray-600 font-mono">
                          {sub.currentPeriodEnd
                            ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td class="py-3.5 px-5">
                          <span
                            class={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                              isUrgent()
                                ? 'bg-red-50 text-red-600'
                                : isExpiring()
                                ? 'bg-amber-50 text-amber-700'
                                : isExpired()
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <span>●</span>
                            <span>
                              {sub.daysRemaining !== undefined
                                ? sub.daysRemaining < 0
                                  ? `Expired (${Math.abs(sub.daysRemaining)}d)`
                                  : `${sub.daysRemaining} days`
                                : 'Unlimited'}
                            </span>
                          </span>
                        </td>
                        <td class="py-3.5 px-5 text-right">
                          <div class="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickExtend(sub, 30)}
                              class="px-2 py-1 rounded bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium shadow-sm transition-all"
                            >
                              +30d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickExtend(sub, 365)}
                              class="px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 text-[#FF4500] border border-orange-200 text-xs font-semibold shadow-sm transition-all"
                            >
                              +1yr
                            </button>
                          </div>
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
    </div>
  );
};
