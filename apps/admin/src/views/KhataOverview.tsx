import { Component, createSignal, For, Show } from 'solid-js';
import {
  getPlatformCreditSummary,
  getTopDebtors,
  getKhataAgingBuckets,
  CreditRiskSummary,
  DebtorInfo,
  AgingBucket,
} from '../services/adminApi';
import { exportToCSV, formatNprExport } from '../services/exportUtils';

export const KhataOverview: Component = () => {
  const [summary, setSummary] = createSignal<CreditRiskSummary | null>(null);
  const [debtors, setDebtors] = createSignal<DebtorInfo[]>([]);
  const [aging, setAging] = createSignal<AgingBucket[]>([]);
  const [loading, setLoading] = createSignal(true);

  const loadData = async () => {
    try {
      const [s, d, a] = await Promise.all([
        getPlatformCreditSummary(),
        getTopDebtors(15),
        getKhataAgingBuckets(),
      ]);
      setSummary(s);
      setDebtors(d);
      setAging(a);
    } catch (err) {
      console.error('KhataOverview load error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const fmt = (val: number) =>
    new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(val);

  const handleExportDebtors = () => {
    exportToCSV(debtors(), 'platform_top_debtors', [
      { key: 'partyName', label: 'Party Name' },
      { key: 'shopName', label: 'Shop' },
      { key: 'outstandingAmount', label: 'Outstanding (NPR)', format: (v: number) => formatNprExport(v) },
      { key: 'partyPhone', label: 'Phone' },
    ]);
  };

  const totalAgingAmount = () => aging().reduce((a, b) => a + b.totalAmount, 0);

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 class="text-xl font-bold font-heading text-gray-900 flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </span>
          Khata & Credit Risk Monitor
        </h2>
        <p class="text-xs text-gray-500 mt-1">
          Platform-wide outstanding credit exposure, aging analysis, and top debtors across all shops
        </p>
      </div>

      {/* Credit Risk Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Outstanding */}
        <div class="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border border-red-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-red-500 uppercase tracking-wider">Total Outstanding Credit</span>
            <div class="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-red-700">
              {loading() ? '...' : fmt(summary()?.totalOutstandingCredit || 0)}
            </div>
            <p class="text-xs text-red-400 mt-1">Across all merchant Khata ledgers</p>
          </div>
        </div>

        {/* Total Parties with Balance */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parties with Due Balance</span>
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : summary()?.totalPartiesWithBalance || 0}
            </div>
            <p class="text-xs text-gray-500 mt-1">Customers/suppliers with outstanding balance</p>
          </div>
        </div>

        {/* Highest Exposure Shop */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Highest Exposure Shop</span>
            <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-lg font-bold font-heading text-gray-900 truncate">
              {loading() ? '...' : summary()?.topExposureShops?.[0]?.shopName || 'N/A'}
            </div>
            <p class="text-xs text-orange-600 mt-1 font-semibold">
              {summary()?.topExposureShops?.[0] ? fmt(summary()!.topExposureShops[0].outstanding) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Aging Analysis + Top Exposure Shops */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Breakdown */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Khata Aging Analysis</h3>
            <p class="text-xs text-gray-500">Outstanding credit entries grouped by age</p>
          </div>
          <div class="p-5 space-y-4">
            <Show when={!loading() && aging().length > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">{loading() ? 'Loading...' : 'No khata entries found'}</div>
            }>
              <For each={aging()}>
                {(bucket) => {
                  const pct = () => totalAgingAmount() > 0 ? Math.round((bucket.totalAmount / totalAgingAmount()) * 100) : 0;
                  return (
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-3 h-3 rounded-sm" style={{ background: bucket.color }} />
                          <span class="font-medium text-gray-800">{bucket.label}</span>
                        </div>
                        <div class="flex items-center gap-3">
                          <span class="text-gray-500">{bucket.count} entries</span>
                          <span class="font-semibold text-gray-900">{fmt(bucket.totalAmount)}</span>
                        </div>
                      </div>
                      <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(pct(), 1)}%`, background: bucket.color }}
                        />
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>

        {/* Top Exposure Shops */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Top 5 Shops by Credit Exposure</h3>
            <p class="text-xs text-gray-500">Merchants with highest outstanding credit across their customers</p>
          </div>
          <div class="p-5 space-y-3">
            <Show when={!loading() && (summary()?.topExposureShops?.length || 0) > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">{loading() ? 'Loading...' : 'No credit data'}</div>
            }>
              <For each={summary()?.topExposureShops || []}>
                {(shop, idx) => {
                  const maxVal = () => summary()?.topExposureShops?.[0]?.outstanding || 1;
                  const pct = () => Math.round((shop.outstanding / maxVal()) * 100);
                  return (
                    <div class="flex items-center gap-3">
                      <span class={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        idx() === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {idx() + 1}
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between text-xs mb-1">
                          <span class="font-medium text-gray-800 truncate">{shop.shopName}</span>
                          <span class="font-bold text-red-600 shrink-0 ml-2">{fmt(shop.outstanding)}</span>
                        </div>
                        <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full bg-red-400" style={{ width: `${pct()}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>

      {/* Top Debtors Table */}
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-heading text-sm font-bold text-gray-900">Platform Top Debtors</h3>
            <p class="text-xs text-gray-500">Parties with the highest outstanding credit balances across all shops</p>
          </div>
          <button
            type="button"
            onClick={handleExportDebtors}
            class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition-all"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <th class="py-2.5 px-5 w-8">#</th>
                <th class="py-2.5 px-5">Party Name</th>
                <th class="py-2.5 px-5">Merchant</th>
                <th class="py-2.5 px-5">Phone</th>
                <th class="py-2.5 px-5 text-right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show when={!loading() && debtors().length > 0} fallback={
                <tr><td colspan="5" class="py-10 text-center text-gray-400">
                  {loading() ? 'Loading debtors...' : 'No outstanding credit entries'}
                </td></tr>
              }>
                <For each={debtors()}>
                  {(d, idx) => (
                    <tr class="hover:bg-gray-50/50 transition-colors">
                      <td class="py-3 px-5 text-gray-400">{idx() + 1}</td>
                      <td class="py-3 px-5 font-semibold text-gray-900">{d.partyName}</td>
                      <td class="py-3 px-5 text-gray-600">{d.shopName}</td>
                      <td class="py-3 px-5 text-gray-500 font-mono">{d.partyPhone || '—'}</td>
                      <td class="py-3 px-5 text-right">
                        <span class="font-bold text-red-600">{fmt(d.outstandingAmount)}</span>
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
