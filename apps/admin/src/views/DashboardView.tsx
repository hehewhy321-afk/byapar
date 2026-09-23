import { Component, createSignal, For, Show } from 'solid-js';
import { getAdminOverview, getShopsList, OverviewMetrics, ShopSummary } from '../services/adminApi';
import { AdminTab } from '../components/layout/AdminSidebar';

interface DashboardViewProps {
  onNavigate: (tab: AdminTab) => void;
}

export const DashboardView: Component<DashboardViewProps> = (props) => {
  const [metrics, setMetrics] = createSignal<OverviewMetrics | null>(null);
  const [recentShops, setRecentShops] = createSignal<ShopSummary[]>([]);
  const [loading, setLoading] = createSignal(true);

  const loadData = async () => {
    try {
      const [overview, shops] = await Promise.all([getAdminOverview(), getShopsList()]);
      setMetrics(overview);
      setRecentShops(shops.slice(0, 6));
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => {
    loadData();
  });

  const formatNpr = (val: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* KPI Cards Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Merchants */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Merchants
            </span>
            <div class="w-8 h-8 rounded-lg bg-orange-50 text-[#FF4500] flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : metrics()?.totalShops}
            </div>
            <p class="text-xs text-emerald-600 mt-1 font-medium">
              {metrics()?.activeSubscriptions} on Active Plans
            </p>
          </div>
        </div>

        {/* Platform Invoices & GMV */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Platform Sales Volume
            </span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : formatNpr(metrics()?.totalGmv || 0)}
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Across {metrics()?.totalInvoices} invoices
            </p>
          </div>
        </div>

        {/* Subscriptions Watchlist */}
        <div
          class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-orange-300 transition-colors"
          onClick={() => props.onNavigate('subscriptions')}
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Expiring Soon (&le; 7d)
            </span>
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-amber-600">
              {loading() ? '...' : metrics()?.expiringSubscriptions}
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {metrics()?.expiredSubscriptions} expired accounts
            </p>
          </div>
        </div>

        {/* Notifications & Sync */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Alerts Dispatched
            </span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : metrics()?.totalNotificationsSent}
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Mobile & Web Realtime
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Recent Merchants & Platform Status */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Merchants Table */}
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="font-heading text-sm font-bold text-gray-900">
                Registered Merchants
              </h3>
              <p class="text-xs text-gray-500">
                Connected Kirana stores on Byapar Retail OS
              </p>
            </div>
            <button
              type="button"
              onClick={() => props.onNavigate('shops')}
              class="text-xs text-[#FF4500] hover:underline font-semibold"
            >
              View All &rarr;
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                  <th class="py-2.5 px-5">Store Name</th>
                  <th class="py-2.5 px-5">PAN / Type</th>
                  <th class="py-2.5 px-5">Plan</th>
                  <th class="py-2.5 px-5 text-right">Validity</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <Show
                  when={!loading() && recentShops().length > 0}
                  fallback={
                    <tr>
                      <td colspan="4" class="py-8 text-center text-gray-400">
                        {loading() ? 'Loading merchants...' : 'No stores registered yet.'}
                      </td>
                    </tr>
                  }
                >
                  <For each={recentShops()}>
                    {(shop) => (
                      <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-5">
                          <div class="font-semibold text-gray-900">{shop.name}</div>
                          <div class="text-[11px] text-gray-400">{shop.address}</div>
                        </td>
                        <td class="py-3 px-5">
                          <div class="font-mono text-gray-700">{shop.panNumber}</div>
                          <div class="text-[11px] text-gray-400">{shop.businessType}</div>
                        </td>
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
                        <td class="py-3 px-5 text-right">
                          <span
                            class={`text-xs font-medium ${
                              shop.daysRemaining !== undefined && shop.daysRemaining <= 7
                                ? 'text-amber-600 font-bold'
                                : 'text-gray-600'
                            }`}
                          >
                            {shop.daysRemaining !== undefined
                              ? `${shop.daysRemaining}d left`
                              : 'Unlimited'}
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Status */}
        <div class="space-y-4">
          <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 class="font-heading text-sm font-bold text-gray-900 flex items-center justify-between">
              <span>Platform Health</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            </h3>

            <div class="space-y-2 text-xs">
              <div class="p-2.5 rounded-lg bg-gray-50 flex items-center justify-between">
                <span class="text-gray-600">Database Engine</span>
                <span class="text-emerald-600 font-semibold font-mono">Operational</span>
              </div>
              <div class="p-2.5 rounded-lg bg-gray-50 flex items-center justify-between">
                <span class="text-gray-600">Realtime Sync</span>
                <span class="text-emerald-600 font-semibold font-mono">Connected</span>
              </div>
              <div class="p-2.5 rounded-lg bg-gray-50 flex items-center justify-between">
                <span class="text-gray-600">Push Notifications</span>
                <span class="text-emerald-600 font-semibold font-mono">Firebase & Native</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-orange-100 p-5 shadow-sm bg-gradient-to-br from-orange-50/40 to-white">
            <h4 class="font-heading text-xs font-bold text-gray-900 mb-1">
              Automated Subscription Watcher
            </h4>
            <p class="text-[11px] text-gray-500 mb-3 leading-relaxed">
              Scans merchant validity daily and sends renewal reminders directly to web and mobile notification bars.
            </p>
            <button
              type="button"
              onClick={() => props.onNavigate('automations')}
              class="w-full py-2 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white font-semibold text-xs transition-colors"
            >
              Manage Triggers &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
