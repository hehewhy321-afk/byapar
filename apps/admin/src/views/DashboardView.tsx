import { Component, createSignal, For, Show } from 'solid-js';
import {
  getEnhancedOverview,
  getShopsList,
  getTopShopsByGmv,
  getRecentActivity,
  getDailyRevenueTrend,
  EnhancedOverviewMetrics,
  ShopSummary,
  ShopRanking,
  ActivityItem,
  DailyRevenue,
} from '../services/adminApi';
import { AdminTab } from '../components/layout/AdminSidebar';

interface DashboardViewProps {
  onNavigate: (tab: AdminTab) => void;
}

export const DashboardView: Component<DashboardViewProps> = (props) => {
  const [metrics, setMetrics] = createSignal<EnhancedOverviewMetrics | null>(null);
  const [recentShops, setRecentShops] = createSignal<ShopSummary[]>([]);
  const [topShops, setTopShops] = createSignal<ShopRanking[]>([]);
  const [activity, setActivity] = createSignal<ActivityItem[]>([]);
  const [trend, setTrend] = createSignal<DailyRevenue[]>([]);
  const [loading, setLoading] = createSignal(true);

  const loadData = async () => {
    try {
      const [overview, shops, top, acts, trnd] = await Promise.all([
        getEnhancedOverview(),
        getShopsList(),
        getTopShopsByGmv(5),
        getRecentActivity(8),
        getDailyRevenueTrend(7),
      ]);
      setMetrics(overview);
      setRecentShops(shops.slice(0, 5));
      setTopShops(top);
      setActivity(acts);
      setTrend(trnd);
    } catch (err) {
      console.error('DashboardView loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const formatNpr = (val: number) =>
    new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(val);

  const fmtShort = (val: number) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  const maxTrend = () => {
    const data = trend();
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.salesAmount), 1);
  };

  const activityIcon = (type: string) => {
    const map: Record<string, { emoji: string; bg: string }> = {
      signup: { emoji: '🏪', bg: 'bg-blue-50' },
      invoice: { emoji: '🧾', bg: 'bg-emerald-50' },
      subscription: { emoji: '💳', bg: 'bg-purple-50' },
      broadcast: { emoji: '📢', bg: 'bg-amber-50' },
      notification: { emoji: '🔔', bg: 'bg-orange-50' },
    };
    return map[type] || { emoji: '📋', bg: 'bg-gray-50' };
  };

  const timeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Row 1: 8 KPI Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {/* Total Merchants */}
        <div
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-orange-300 transition-colors"
          onClick={() => props.onNavigate('shops')}
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Merchants</span>
            <div class="w-7 h-7 rounded-lg bg-orange-50 text-[#FF4500] flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-gray-900">{loading() ? '...' : metrics()?.totalShops}</div>
            <p class="text-[10px] text-emerald-600 font-medium">{metrics()?.activeSubscriptions} active plans</p>
          </div>
        </div>

        {/* Platform GMV */}
        <div
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={() => props.onNavigate('analytics')}
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Platform GMV</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-gray-900">{loading() ? '...' : formatNpr(metrics()?.totalGmv || 0)}</div>
            <p class="text-[10px] text-gray-500">{metrics()?.totalInvoices} invoices</p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
          onClick={() => props.onNavigate('subscriptions')}
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Expiring ≤7d</span>
            <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-amber-600">{loading() ? '...' : metrics()?.expiringSubscriptions}</div>
            <p class="text-[10px] text-gray-500">{metrics()?.expiredSubscriptions} expired</p>
          </div>
        </div>

        {/* Alerts Dispatched */}
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Alerts Sent</span>
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-gray-900">{loading() ? '...' : metrics()?.totalNotificationsSent}</div>
            <p class="text-[10px] text-gray-500">Mobile & Web</p>
          </div>
        </div>

        {/* New This Month */}
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">New This Month</span>
            <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-indigo-600">{loading() ? '...' : metrics()?.newShopsThisMonth || 0}</div>
            <p class="text-[10px] text-gray-500">New signups</p>
          </div>
        </div>

        {/* Avg Ticket */}
        <div
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
          onClick={() => props.onNavigate('analytics')}
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Avg Ticket</span>
            <div class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-gray-900">{loading() ? '...' : formatNpr(metrics()?.avgTicketSize || 0)}</div>
            <p class="text-[10px] text-gray-500">Per invoice</p>
          </div>
        </div>

        {/* Outstanding Credit */}
        <div
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-red-300 transition-colors"
          onClick={() => props.onNavigate('khata')}
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Credit Risk</span>
            <div class="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-red-600">{loading() ? '...' : formatNpr(metrics()?.totalOutstandingCredit || 0)}</div>
            <p class="text-[10px] text-gray-500">Outstanding</p>
          </div>
        </div>

        {/* Total Profiles */}
        <div
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-cyan-300 transition-colors"
          onClick={() => props.onNavigate('users')}
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Users</span>
            <div class="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl font-bold font-heading text-gray-900">{loading() ? '...' : metrics()?.totalProfiles}</div>
            <p class="text-[10px] text-gray-500">Registered profiles</p>
          </div>
        </div>
      </div>

      {/* Row 2: Revenue Mini-Chart + Activity Feed + Leaderboard */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Mini-Chart (7 days) */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="font-heading text-sm font-bold text-gray-900">Sales This Week</h3>
              <p class="text-[10px] text-gray-500">Last 7 days trend</p>
            </div>
            <button
              type="button"
              onClick={() => props.onNavigate('analytics')}
              class="text-[10px] text-[#FF4500] hover:underline font-semibold"
            >
              Full Analytics →
            </button>
          </div>
          <div class="p-5">
            <Show when={!loading() && trend().length > 0} fallback={
              <div class="h-28 flex items-center justify-center text-gray-400 text-xs">
                {loading() ? 'Loading...' : 'No data yet'}
              </div>
            }>
              <div class="flex items-end gap-1.5 h-28">
                <For each={trend()}>
                  {(day) => {
                    const pct = () => maxTrend() > 0 ? (day.salesAmount / maxTrend()) * 100 : 0;
                    const dayLabel = () => {
                      const d = new Date(day.date);
                      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                    };
                    return (
                      <div class="flex-1 flex flex-col items-center gap-1 group" title={`${day.date}: ${formatNpr(day.salesAmount)}`}>
                        <div class="text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                          {fmtShort(day.salesAmount)}
                        </div>
                        <div
                          class="w-full rounded-t transition-all duration-300 hover:opacity-80"
                          style={{
                            height: `${Math.max(pct(), 3)}%`,
                            background: day.salesAmount > 0 ? 'linear-gradient(to top, #FF4500, #FF6B35)' : '#E5E7EB',
                            'min-height': '4px',
                          }}
                        />
                        <span class="text-[8px] text-gray-400 font-mono">{dayLabel()}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>

        {/* Activity Feed */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="font-heading text-sm font-bold text-gray-900">Recent Activity</h3>
              <p class="text-[10px] text-gray-500">Platform-wide event feed</p>
            </div>
            <button
              type="button"
              onClick={() => props.onNavigate('audit')}
              class="text-[10px] text-[#FF4500] hover:underline font-semibold"
            >
              All Logs →
            </button>
          </div>
          <div class="max-h-[248px] overflow-y-auto">
            <Show when={!loading() && activity().length > 0} fallback={
              <div class="py-10 text-center text-gray-400 text-xs">
                {loading() ? 'Loading activity...' : 'No recent activity'}
              </div>
            }>
              <div class="divide-y divide-gray-50">
                <For each={activity()}>
                  {(item) => {
                    const iconInfo = activityIcon(item.type);
                    return (
                      <div class="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div class={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${iconInfo.bg}`}>
                          {iconInfo.emoji}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-semibold text-gray-800 truncate">{item.title}</p>
                          <p class="text-[10px] text-gray-500 truncate">{item.description}</p>
                        </div>
                        <span class="text-[9px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo(item.timestamp)}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>

        {/* Top Merchants Leaderboard */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="font-heading text-sm font-bold text-gray-900">Top Merchants</h3>
              <p class="text-[10px] text-gray-500">By GMV leaderboard</p>
            </div>
            <button
              type="button"
              onClick={() => props.onNavigate('analytics')}
              class="text-[10px] text-[#FF4500] hover:underline font-semibold"
            >
              View All →
            </button>
          </div>
          <div class="p-3 space-y-1.5">
            <Show when={!loading() && topShops().length > 0} fallback={
              <div class="py-10 text-center text-gray-400 text-xs">
                {loading() ? 'Loading...' : 'No sales data yet'}
              </div>
            }>
              <For each={topShops()}>
                {(shop, idx) => (
                  <div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <span class={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      idx() < 3 ? 'bg-[#FF4500] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {idx() + 1}
                    </span>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold text-gray-800 truncate">{shop.name}</p>
                      <p class="text-[10px] text-gray-400">{shop.invoiceCount} invoices</p>
                    </div>
                    <span class="text-xs font-bold text-emerald-700 shrink-0">{formatNpr(shop.totalSales)}</span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Merchants Table + Platform Health */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Merchants Table */}
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="font-heading text-sm font-bold text-gray-900">Recently Registered</h3>
              <p class="text-xs text-gray-500">Newest Kirana stores on Byapar</p>
            </div>
            <button
              type="button"
              onClick={() => props.onNavigate('shops')}
              class="text-xs text-[#FF4500] hover:underline font-semibold"
            >
              View All →
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
                            {shop.daysRemaining !== undefined ? `${shop.daysRemaining}d left` : 'Unlimited'}
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

        {/* Platform Health + Quick Actions */}
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
              Manage Triggers →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
