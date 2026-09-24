import { Component, createSignal, For, Show } from 'solid-js';
import {
  getRevenueAnalytics,
  getInvoiceBreakdown,
  getPaymentModeDistribution,
  getTopShopsByGmv,
  getDailyRevenueTrend,
  RevenueMetrics,
  InvoiceBreakdown,
  PaymentModeSplit,
  ShopRanking,
  DailyRevenue,
} from '../services/adminApi';
import { exportToCSV, formatNprExport } from '../services/exportUtils';

export const AnalyticsView: Component = () => {
  const [revenue, setRevenue] = createSignal<RevenueMetrics | null>(null);
  const [breakdown, setBreakdown] = createSignal<InvoiceBreakdown[]>([]);
  const [paymentModes, setPaymentModes] = createSignal<PaymentModeSplit[]>([]);
  const [topShops, setTopShops] = createSignal<ShopRanking[]>([]);
  const [trend, setTrend] = createSignal<DailyRevenue[]>([]);
  const [loading, setLoading] = createSignal(true);

  const loadData = async () => {
    try {
      const [rev, brk, pms, shops, trnd] = await Promise.all([
        getRevenueAnalytics(),
        getInvoiceBreakdown(),
        getPaymentModeDistribution(),
        getTopShopsByGmv(10),
        getDailyRevenueTrend(14),
      ]);
      setRevenue(rev);
      setBreakdown(brk);
      setPaymentModes(pms);
      setTopShops(shops);
      setTrend(trnd);
    } catch (err) {
      console.error('AnalyticsView load error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const fmt = (val: number) =>
    new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(val);

  const fmtShort = (val: number) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      sale: 'Sales',
      purchase: 'Purchases',
      sale_return: 'Sale Returns',
      purchase_return: 'Purchase Returns',
      quotation: 'Quotations',
    };
    return map[type] || type;
  };

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      sale: 'bg-emerald-500',
      purchase: 'bg-blue-500',
      sale_return: 'bg-amber-500',
      purchase_return: 'bg-orange-500',
      quotation: 'bg-purple-500',
    };
    return map[type] || 'bg-gray-500';
  };

  const modeLabel = (mode: string) => {
    const map: Record<string, string> = {
      cash: 'Cash',
      fonepay_qr: 'FonePay QR',
      connectips: 'ConnectIPS',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      credit: 'Credit / Udharo',
    };
    return map[mode] || mode;
  };

  const modeColor = (mode: string) => {
    const map: Record<string, string> = {
      cash: '#10B981',
      fonepay_qr: '#6366F1',
      connectips: '#3B82F6',
      bank_transfer: '#06B6D4',
      cheque: '#F59E0B',
      credit: '#EF4444',
    };
    return map[mode] || '#9CA3AF';
  };

  const handleExportShops = () => {
    exportToCSV(topShops(), 'top_shops_by_gmv', [
      { key: 'name', label: 'Shop Name' },
      { key: 'invoiceCount', label: 'Invoices' },
      { key: 'totalSales', label: 'Total Sales (NPR)', format: (v) => formatNprExport(v) },
      { key: 'avgTicket', label: 'Avg Ticket (NPR)', format: (v) => formatNprExport(v) },
      { key: 'lastInvoiceDate', label: 'Last Invoice' },
    ]);
  };

  // Compute max for the revenue bar chart
  const maxTrend = () => {
    const data = trend();
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.salesAmount), 1);
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Revenue Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales GMV */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales GMV</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : fmt(revenue()?.totalSalesGmv || 0)}
            </div>
            <p class="text-xs text-gray-500 mt-1">All-time sales volume</p>
          </div>
        </div>

        {/* Purchases */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Volume</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : fmt(revenue()?.totalPurchaseVolume || 0)}
            </div>
            <p class="text-xs text-gray-500 mt-1">All-time purchase volume</p>
          </div>
        </div>

        {/* Payments Collected */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payments Collected</span>
            <div class="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : fmt(revenue()?.totalPaymentsCollected || 0)}
            </div>
            <p class="text-xs text-gray-500 mt-1">All payment modes combined</p>
          </div>
        </div>

        {/* Avg Invoice Value */}
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Invoice Value</span>
            <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">
              {loading() ? '...' : fmt(revenue()?.avgInvoiceValue || 0)}
            </div>
            <p class="text-xs text-gray-500 mt-1">Per invoice average</p>
          </div>
        </div>
      </div>

      {/* Revenue Trend Bar Chart + Payment Mode Distribution */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Daily Sales Revenue (Last 14 Days)</h3>
            <p class="text-xs text-gray-500">Sales invoice volume per day</p>
          </div>
          <div class="p-5">
            <Show when={!loading() && trend().length > 0} fallback={
              <div class="h-40 flex items-center justify-center text-gray-400 text-xs">
                {loading() ? 'Loading chart...' : 'No sales data available for this period'}
              </div>
            }>
              <div class="flex items-end gap-1 h-40">
                <For each={trend()}>
                  {(day) => {
                    const pct = () => maxTrend() > 0 ? (day.salesAmount / maxTrend()) * 100 : 0;
                    const label = () => {
                      const d = new Date(day.date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    };
                    return (
                      <div class="flex-1 flex flex-col items-center gap-1 group" title={`${day.date}: ${fmt(day.salesAmount)} (${day.invoiceCount} invoices)`}>
                        <div class="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono whitespace-nowrap">
                          {fmtShort(day.salesAmount)}
                        </div>
                        <div
                          class="w-full rounded-t transition-all duration-300 hover:opacity-80"
                          style={{
                            height: `${Math.max(pct(), 2)}%`,
                            background: day.salesAmount > 0
                              ? 'linear-gradient(to top, #FF4500, #FF6B35)'
                              : '#E5E7EB',
                            'min-height': '4px',
                          }}
                        />
                        <span class="text-[9px] text-gray-400 font-mono">{label()}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>

        {/* Payment Mode Split */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Payment Mode Split</h3>
            <p class="text-xs text-gray-500">Distribution by payment method</p>
          </div>
          <div class="p-5 space-y-3">
            <Show when={!loading() && paymentModes().length > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">
                {loading() ? 'Loading...' : 'No payment data'}
              </div>
            }>
              <For each={paymentModes()}>
                {(pm) => (
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-gray-700 font-medium">{modeLabel(pm.mode)}</span>
                      <span class="text-gray-500 font-mono">{pm.percentage}%</span>
                    </div>
                    <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pm.percentage}%`, background: modeColor(pm.mode) }}
                      />
                    </div>
                    <p class="text-[10px] text-gray-400">{fmt(pm.totalAmount)} across {pm.count} payments</p>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      {/* Invoice Breakdown by Type */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Invoice Breakdown by Type</h3>
          </div>
          <div class="p-5">
            <Show when={!loading() && breakdown().length > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">{loading() ? 'Loading...' : 'No invoice data'}</div>
            }>
              <div class="space-y-3">
                <For each={breakdown()}>
                  {(item) => {
                    const total = () => breakdown().reduce((a, b) => a + b.totalAmount, 1);
                    const pct = () => Math.round((item.totalAmount / total()) * 100);
                    return (
                      <div class="flex items-center gap-3">
                        <div class={`w-2.5 h-2.5 rounded-full shrink-0 ${typeColor(item.type)}`} />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-medium text-gray-800">{typeLabel(item.type)}</span>
                            <span class="text-gray-500">{item.count} invoices</span>
                          </div>
                          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div class={`h-full rounded-full ${typeColor(item.type)}`} style={{ width: `${pct()}%` }} />
                          </div>
                        </div>
                        <span class="text-xs font-semibold text-gray-900 w-24 text-right shrink-0">{fmt(item.totalAmount)}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>

        {/* Revenue & Expenses Summary */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Platform Financial Summary</h3>
          </div>
          <div class="p-5 space-y-3">
            <Show when={!loading() && revenue()} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">{loading() ? 'Loading...' : 'No data'}</div>
            }>
              {(() => {
                const r = revenue()!;
                const rows = [
                  { label: 'Total Sales GMV', value: r.totalSalesGmv, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Total Purchase Volume', value: r.totalPurchaseVolume, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Sale/Purchase Returns', value: r.totalSaleReturns, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Total Expenses', value: r.totalExpenses, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Outstanding Credit', value: r.totalOutstandingCredit, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Payments Collected', value: r.totalPaymentsCollected, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                ];
                return (
                  <For each={rows}>
                    {(row) => (
                      <div class={`flex items-center justify-between p-3 rounded-lg ${row.bg}`}>
                        <span class="text-xs font-medium text-gray-700">{row.label}</span>
                        <span class={`text-sm font-bold font-heading ${row.color}`}>{fmt(row.value)}</span>
                      </div>
                    )}
                  </For>
                );
              })()}
            </Show>
          </div>
        </div>
      </div>

      {/* Top Performing Shops */}
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-heading text-sm font-bold text-gray-900">Top Performing Merchants</h3>
            <p class="text-xs text-gray-500">Ranked by total sales GMV</p>
          </div>
          <button
            type="button"
            onClick={handleExportShops}
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
                <th class="py-2.5 px-5">Merchant Name</th>
                <th class="py-2.5 px-5 text-right">Total Sales</th>
                <th class="py-2.5 px-5 text-right">Invoices</th>
                <th class="py-2.5 px-5 text-right">Avg Ticket</th>
                <th class="py-2.5 px-5 text-right">Last Invoice</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show when={!loading() && topShops().length > 0} fallback={
                <tr><td colspan="6" class="py-10 text-center text-gray-400">
                  {loading() ? 'Loading top merchants...' : 'No sales data yet'}
                </td></tr>
              }>
                <For each={topShops()}>
                  {(shop, idx) => (
                    <tr class="hover:bg-gray-50/50 transition-colors">
                      <td class="py-3 px-5">
                        <span class={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx() < 3 ? 'bg-[#FF4500] text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {idx() + 1}
                        </span>
                      </td>
                      <td class="py-3 px-5 font-semibold text-gray-900">{shop.name}</td>
                      <td class="py-3 px-5 text-right font-semibold text-emerald-700">{fmt(shop.totalSales)}</td>
                      <td class="py-3 px-5 text-right text-gray-600">{shop.invoiceCount}</td>
                      <td class="py-3 px-5 text-right text-gray-600">{fmt(shop.avgTicket)}</td>
                      <td class="py-3 px-5 text-right text-gray-500 font-mono text-[11px]">
                        {shop.lastInvoiceDate ? new Date(shop.lastInvoiceDate).toLocaleDateString() : '—'}
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
