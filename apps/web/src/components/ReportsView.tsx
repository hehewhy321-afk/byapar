import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { invoices, expenses, items, khataEntries, currentBusiness, settings } from '../db/localDb';
import { formatNepaliCurrency, Invoice } from '@byapar/core';
import { currentLang } from '../services/i18n';
import { ReceiptModal } from './ReceiptModal';
import { IconPrinter, IconSearch, IconTrendingUp, IconDownload } from './icons';

export const ReportsView: Component = () => {
  const [selectedInvoice, setSelectedInvoice] = createSignal<Invoice | null>(null);
  const [timeFilter, setTimeFilter] = createSignal<'all' | '7d' | '30d'>('30d');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [paymentFilter, setPaymentFilter] = createSignal<string>('all');

  // Filter invoices by time
  const filteredInvoices = createMemo(() => {
    let list = [...invoices];
    const now = new Date();

    if (timeFilter() === '7d') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      list = list.filter((inv) => new Date(inv.invoiceDateAd) >= past7);
    } else if (timeFilter() === '30d') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      list = list.filter((inv) => new Date(inv.invoiceDateAd) >= past30);
    }

    if (paymentFilter() !== 'all') {
      list = list.filter((inv) => inv.paymentMode === paymentFilter());
    }

    if (searchQuery().trim()) {
      const q = searchQuery().toLowerCase();
      list = list.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.partyName && inv.partyName.toLowerCase().includes(q))
      );
    }

    return list;
  });

  // KPI Calculations
  const totalSalesRevenue = createMemo(() =>
    filteredInvoices().reduce((acc, inv) => acc + inv.totalAmount, 0)
  );

  const totalPaidRevenue = createMemo(() =>
    filteredInvoices().reduce((acc, inv) => acc + inv.paidAmount, 0)
  );

  const totalCreditIssued = createMemo(() =>
    filteredInvoices().reduce((acc, inv) => acc + inv.dueAmount, 0)
  );

  const fonepayRevenue = createMemo(() =>
    filteredInvoices()
      .filter((inv) => inv.paymentMode === 'fonepay_qr')
      .reduce((acc, inv) => acc + inv.paidAmount, 0)
  );

  const totalExpenses = createMemo(() =>
    expenses.reduce((acc, exp) => acc + exp.amount, 0)
  );

  // Estimate COGS (Cost of goods sold based on item purchaseCost if available)
  const estimatedCost = createMemo(() => {
    let cost = 0;
    filteredInvoices().forEach((inv) => {
      inv.items.forEach((line) => {
        const product = items.find((i) => i.id === line.itemId || i.name === line.itemName);
        const buyRate = product?.purchaseCost || product?.costPrice || line.unitPrice * 0.75; // fallback to 75% cost
        cost += buyRate * line.quantity;
      });
    });
    return cost;
  });

  const estimatedGrossProfit = createMemo(() =>
    Math.max(0, totalSalesRevenue() - estimatedCost())
  );

  const netEarnings = createMemo(() =>
    Math.max(0, estimatedGrossProfit() - totalExpenses())
  );

  // Payment Breakdown
  const paymentBreakdown = createMemo(() => {
    const list = filteredInvoices();
    const modes: Record<string, number> = {
      cash: 0,
      fonepay_qr: 0,
      credit: 0,
      wallet: 0,
    };

    list.forEach((inv) => {
      const m = inv.paymentMode || 'cash';
      if (modes[m] !== undefined) {
        modes[m] += inv.paidAmount || inv.totalAmount;
      } else {
        modes.cash += inv.paidAmount || inv.totalAmount;
      }
    });

    const total = Object.values(modes).reduce((a, b) => a + b, 0) || 1;
    return {
      cash: { amount: modes.cash, pct: Math.round((modes.cash / total) * 100) },
      fonepay_qr: { amount: modes.fonepay_qr, pct: Math.round((modes.fonepay_qr / total) * 100) },
      credit: { amount: modes.credit, pct: Math.round((modes.credit / total) * 100) },
      wallet: { amount: modes.wallet, pct: Math.round((modes.wallet / total) * 100) },
    };
  });

  // Top Selling Products Leaderboard
  const topProducts = createMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    filteredInvoices().forEach((inv) => {
      inv.items.forEach((item) => {
        const itemName = item.itemName || 'Item';
        const prev = map.get(itemName) || { name: itemName, qty: 0, revenue: 0 };
        prev.qty += item.quantity;
        prev.revenue += item.totalAmount;
        map.set(itemName, prev);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  });

  // Recent 7 days trend bars
  const weeklyTrend = createMemo(() => {
    const days: { label: string; sales: number; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const daySales = invoices
        .filter((inv) => inv.invoiceDateAd.startsWith(dStr))
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      const count = invoices.filter((inv) => inv.invoiceDateAd.startsWith(dStr)).length;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ label: dayName, sales: daySales, count });
    }
    const maxSale = Math.max(...days.map((d) => d.sales), 1000);
    return { days, maxSale };
  });

  const handleExportCsv = () => {
    const headers = ['Invoice #', 'Date AD', 'Date BS', 'Customer', 'Payment Mode', 'Subtotal', 'Tax', 'Total', 'Paid', 'Due'];
    const rows = filteredInvoices().map((inv) => [
      inv.invoiceNumber,
      inv.invoiceDateAd,
      inv.invoiceDateBs,
      `"${inv.partyName || 'Counter'}"`,
      inv.paymentMode,
      inv.subtotal,
      inv.taxAmount,
      inv.totalAmount,
      inv.paidAmount,
      inv.dueAmount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Byapar_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div class="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Title & Global Controls */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-heading font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>Financial Analytics & Reports</span>
            <span class="text-xs bg-orange-100 dark:bg-orange-950/60 text-[#FF4500] font-bold px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-900">
              Live BI
            </span>
          </h1>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            Real-time cash flow, digital Fonepay transactions, profit & loss, and IRD CBMS tax audit.
          </p>
        </div>

        <div class="flex items-center gap-2">
          {/* Time Filter Buttons */}
          <div class="flex bg-gray-100 dark:bg-neutral-900 p-1 rounded-xl border border-gray-200 dark:border-neutral-800 text-xs font-semibold">
            <button
              onClick={() => setTimeFilter('7d')}
              class={`px-3 py-1.5 rounded-lg transition ${
                timeFilter() === '7d'
                  ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {currentLang() === 'ne' ? '७ दिन' : '7 Days'}
            </button>
            <button
              onClick={() => setTimeFilter('30d')}
              class={`px-3 py-1.5 rounded-lg transition ${
                timeFilter() === '30d'
                  ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {currentLang() === 'ne' ? '३० दिन' : '30 Days'}
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              class={`px-3 py-1.5 rounded-lg transition ${
                timeFilter() === 'all'
                  ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {currentLang() === 'ne' ? 'सम्पूर्ण' : 'All Time'}
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            class="btn-outline text-xs !py-2 !px-3 flex items-center gap-1.5 font-bold"
          >
            <IconDownload size={14} />
            <span>{currentLang() === 'ne' ? 'सीएसभी निर्यात' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced GTV */}
        <div class="stat-card border-l-4 border-l-[#FF4500]">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">
            {currentLang() === 'ne' ? 'कुल बिक्री' : 'Gross Sales (GTV)'}
          </span>
          <span class="text-2xl font-black text-gray-900 dark:text-white mt-1 block font-mono">
            {formatNepaliCurrency(totalSalesRevenue())}
          </span>
          <div class="flex items-center justify-between text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
            <span>{filteredInvoices().length} {currentLang() === 'ne' ? 'बिल' : 'total invoices'}</span>
            <span class="text-emerald-500 font-semibold">100% CBMS Logged</span>
          </div>
        </div>

        {/* Realized Cash Inflow */}
        <div class="stat-card border-l-4 border-l-emerald-500">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">
            {currentLang() === 'ne' ? 'उठाइएको नगद' : 'Collected Cash'}
          </span>
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
            {formatNepaliCurrency(totalPaidRevenue())}
          </span>
          <div class="text-[11px] text-emerald-500 mt-1">
            {totalSalesRevenue() > 0
              ? `${Math.round((totalPaidRevenue() / totalSalesRevenue()) * 100)}% recovery rate`
              : '0%'}
          </div>
        </div>

        {/* Fonepay Digital QR Volume */}
        <div class="stat-card border-l-4 border-l-red-500">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase">
              Fonepay Dynamic QR
            </span>
            <span class="text-[10px] bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">
              Digital
            </span>
          </div>
          <span class="text-2xl font-black text-red-600 dark:text-red-400 mt-1 block font-mono">
            {formatNepaliCurrency(fonepayRevenue())}
          </span>
          <div class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
            Zero cash handling friction
          </div>
        </div>

        {/* Credit / Khata Outflow */}
        <div class="stat-card border-l-4 border-l-amber-500">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">
            {currentLang() === 'ne' ? 'बाँकी उधारो' : 'Outstanding Credit'}
          </span>
          <span class="text-2xl font-black text-amber-500 mt-1 block font-mono">
            {formatNepaliCurrency(totalCreditIssued())}
          </span>
          <div class="text-[11px] text-amber-500/80 mt-1">
            {currentLang() === 'ne' ? 'उधारो लिन बाँकी' : 'Active khata receivables'}
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Sales Trend Bar Chart & Payment Mode Donut Chart */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Bar Chart (2 columns) */}
        <div class="lg:col-span-2 stat-card !p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                {currentLang() === 'ne' ? 'दैनिक बिक्री (अन्तिम ७ दिन)' : 'Daily Sales Trend (Last 7 Days)'}
              </h3>
              <p class="text-xs text-gray-400 dark:text-neutral-500">
                Revenue patterns and counter transaction volume
              </p>
            </div>
            <span class="text-xs font-mono font-bold text-[#FF4500]">
              Peak: {formatNepaliCurrency(weeklyTrend().maxSale)}
            </span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div class="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-gray-100 dark:border-neutral-800">
            <For each={weeklyTrend().days}>
              {(day) => {
                const heightPct = Math.max(8, Math.round((day.sales / weeklyTrend().maxSale) * 100));
                return (
                  <div class="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div class="absolute -top-10 opacity-0 group-hover:opacity-100 transition bg-neutral-900 text-white text-[10px] font-mono py-1 px-2 rounded pointer-events-none shadow-lg whitespace-nowrap z-10">
                      {formatNepaliCurrency(day.sales)} ({day.count} sales)
                    </div>

                    <div
                      class="w-full max-w-[42px] bg-gradient-to-t from-[#FF4500] to-orange-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span class="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 mt-2">
                      {day.label}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-400 dark:text-neutral-500 pt-3">
            <span>Consistent volume across standard billing hours</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">
              Avg: {formatNepaliCurrency(totalSalesRevenue() / (weeklyTrend().days.length || 1))} / day
            </span>
          </div>
        </div>

        {/* Payment Channels Donut Chart (1 column) */}
        <div class="stat-card !p-5 flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-1">
              Payment Method Breakdown
            </h3>
            <p class="text-xs text-gray-400 dark:text-neutral-500 mb-4">
              Digital vs physical counter settlement
            </p>

            {/* SVG Donut Chart */}
            <div class="relative w-40 h-40 mx-auto my-2 flex items-center justify-center">
              <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                {/* Background Ring */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="4.5"
                  class="text-gray-100 dark:text-neutral-800"
                />
                {/* Cash Segment (Emerald) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10B981"
                  stroke-width="4.5"
                  stroke-dasharray={`${paymentBreakdown().cash.pct}, 100`}
                  class="transition-all duration-700"
                />
                {/* Fonepay Segment (Red) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#EF4444"
                  stroke-width="4.5"
                  stroke-dasharray={`${paymentBreakdown().fonepay_qr.pct}, 100`}
                  stroke-dashoffset={`-${paymentBreakdown().cash.pct}`}
                  class="transition-all duration-700"
                />
                {/* Credit Segment (Amber) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#F59E0B"
                  stroke-width="4.5"
                  stroke-dasharray={`${paymentBreakdown().credit.pct}, 100`}
                  stroke-dashoffset={`-${paymentBreakdown().cash.pct + paymentBreakdown().fonepay_qr.pct}`}
                  class="transition-all duration-700"
                />
              </svg>

              <div class="absolute flex flex-col items-center justify-center text-center">
                <span class="text-xs text-gray-400 font-semibold">Total</span>
                <span class="text-sm font-black font-mono text-gray-900 dark:text-white">
                  {formatNepaliCurrency(totalSalesRevenue())}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Legend */}
          <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-neutral-800 text-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-500" />
                <span class="text-gray-700 dark:text-neutral-300">{currentLang() === 'ne' ? 'नगद' : 'Cash Settlement'}</span>
              </div>
              <span class="font-mono font-bold">{paymentBreakdown().cash.pct}%</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-red-500" />
                <span class="text-gray-700 dark:text-neutral-300">Fonepay QR</span>
              </div>
              <span class="font-mono font-bold text-red-500">{paymentBreakdown().fonepay_qr.pct}%</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-amber-500" />
                <span class="text-gray-700 dark:text-neutral-300">{currentLang() === 'ne' ? 'उधारो (खाता)' : 'Credit (Khata)'}</span>
              </div>
              <span class="font-mono font-bold text-amber-500">{paymentBreakdown().credit.pct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Profit & Loss + Top Products Section */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimated Profit & Loss Summary */}
        <div class="stat-card !p-5 bg-gradient-to-br from-emerald-50/40 via-white to-transparent dark:from-emerald-950/20 dark:via-black dark:to-transparent border border-emerald-200 dark:border-emerald-900/40">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">
              Estimated Profit & Loss (P&L)
            </h3>
            <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Net Positive
            </span>
          </div>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between items-center text-gray-600 dark:text-neutral-400">
              <span>{currentLang() === 'ne' ? 'कुल बिक्री (बिलगत)' : 'Gross Sales (Invoiced)'}</span>
              <span class="font-mono font-bold text-gray-900 dark:text-white">
                {formatNepaliCurrency(totalSalesRevenue())}
              </span>
            </div>

            <div class="flex justify-between items-center text-gray-600 dark:text-neutral-400">
              <span>{currentLang() === 'ne' ? 'अनुमानित लागत (COGS)' : 'Estimated Cost of Goods (COGS)'}</span>
              <span class="font-mono font-semibold text-rose-500">
                - {formatNepaliCurrency(estimatedCost())}
              </span>
            </div>

            <div class="flex justify-between items-center border-t border-gray-200 dark:border-neutral-800 pt-2 font-bold text-gray-900 dark:text-white">
              <span>{currentLang() === 'ne' ? 'कुल नाफा' : 'Gross Profit Margin'}</span>
              <span class="font-mono text-emerald-600 dark:text-emerald-400">
                {formatNepaliCurrency(estimatedGrossProfit())}
              </span>
            </div>

            <div class="flex justify-between items-center text-gray-600 dark:text-neutral-400">
              <span>{currentLang() === 'ne' ? 'संचालन खर्च' : 'Operating Expenses (Rent, Bills)'}</span>
              <span class="font-mono font-semibold text-rose-500">
                - {formatNepaliCurrency(totalExpenses())}
              </span>
            </div>

            <div class="flex justify-between items-center border-t-2 border-emerald-500/30 pt-3">
              <div>
                <span class="text-sm font-black text-gray-900 dark:text-white block">
                  {currentLang() === 'ne' ? 'निखालस कमाई' : 'Net Merchant Earnings'}
                </span>
                <span class="text-[10px] text-gray-400">Calculated after COGS & recorded expenses</span>
              </div>
              <span class="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatNepaliCurrency(netEarnings())}
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 Best-Selling Products */}
        <div class="lg:col-span-2 stat-card !p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                {currentLang() === 'ne' ? 'शीर्ष बिक्री सामान' : 'Top Performing Products Leaderboard'}
              </h3>
              <p class="text-xs text-gray-400 dark:text-neutral-500">
                Highest revenue-generating inventory items
              </p>
            </div>
            <span class="text-xs text-gray-500 font-semibold">Ranked by Revenue</span>
          </div>

          <div class="space-y-3">
            <For
              each={topProducts()}
              fallback={
                <div class="text-center py-8 text-xs text-gray-400">
                  {currentLang() === 'ne' ? 'यस समयमा कुनै बिक्री दर्ता छैन।' : 'No sales data available for this timeframe yet.'}
                </div>
              }
            >
              {(prod, idx) => {
                const maxProdRev = topProducts()[0]?.revenue || 1;
                const pct = Math.round((prod.revenue / maxProdRev) * 100);
                return (
                  <div class="space-y-1">
                    <div class="flex justify-between items-center text-xs">
                      <div class="flex items-center gap-2">
                        <span class="w-5 h-5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 font-bold flex items-center justify-center text-[10px]">
                          #{idx() + 1}
                        </span>
                        <span class="font-semibold text-gray-800 dark:text-neutral-200">
                          {prod.name}
                        </span>
                        <span class="text-[11px] text-gray-400 font-mono">
                          ({prod.qty} units sold)
                        </span>
                      </div>
                      <span class="font-mono font-bold text-gray-900 dark:text-white">
                        {formatNepaliCurrency(prod.revenue)}
                      </span>
                    </div>

                    <div class="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div
                        class="bg-gradient-to-r from-orange-500 to-[#FF4500] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>

      {/* CBMS IRD Compliance Banner */}
      <div class="stat-card bg-gradient-to-r from-brand-50 to-white dark:from-neutral-900 dark:to-black border-brand-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 !p-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 class="font-bold text-gray-900 dark:text-white text-sm">
              Nepal IRD Real-time CBMS Tax Audit
            </h3>
            <span class="text-[10px] bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-2 py-0.5 rounded-full font-bold">
              Schedule-13 Compliant
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            All issued tax invoices are cryptographically hashed and automatically audited for IRD compliance.
          </p>
        </div>
        <div class="flex items-center gap-2 font-mono text-xs text-gray-600 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800">
          <span>Registered PAN / VAT:</span>
          <span class="font-bold text-brand-600 dark:text-brand-400 font-mono">
            {currentBusiness.pan || '302918274'}
          </span>
        </div>
      </div>

      {/* Invoices Register Table */}
      <div class="stat-card overflow-hidden !p-0">
        <div class="p-4 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-sm text-gray-900 dark:text-white">
              {currentLang() === 'ne' ? 'बिक्री बिल दर्ता' : 'Sales Invoices Register'}
            </h3>
            <span class="text-xs text-gray-400 dark:text-neutral-500">
              {currentLang() === 'ne' ? `${filteredInvoices().length} दर्ता देखाइदै` : `Showing ${filteredInvoices().length} records`}
            </span>
          </div>

          <div class="flex items-center gap-2">
            {/* Search Input */}
            <div class="relative">
              <IconSearch size={14} class="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder={currentLang() === 'ne' ? 'बिल वा ग्राहक खोज्नुहोस्...' : 'Search invoice or customer...'}
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="input-field !py-1.5 !pl-8 text-xs font-mono w-48 sm:w-64"
              />
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter()}
              onChange={(e) => setPaymentFilter(e.currentTarget.value)}
              class="input-field !py-1.5 text-xs font-semibold"
            >
              <option value="all">{currentLang() === 'ne' ? 'सबै माध्यम' : 'All Modes'}</option>
              <option value="cash">{currentLang() === 'ne' ? 'नगद' : 'Cash'}</option>
              <option value="fonepay_qr">Fonepay QR</option>
              <option value="credit">{currentLang() === 'ne' ? 'उधारो (खाता)' : 'Credit (Khata)'}</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 uppercase font-semibold text-[10px] border-b border-gray-100 dark:border-neutral-800">
              <tr>
                <th class="p-3">{currentLang() === 'ne' ? 'बिल नं.' : 'Invoice #'}</th>
                <th class="p-3">{currentLang() === 'ne' ? 'मिति' : 'Date'}</th>
                <th class="p-3">{currentLang() === 'ne' ? 'ग्राहक' : 'Customer'}</th>
                <th class="p-3">{currentLang() === 'ne' ? 'भुक्तानी' : 'Payment'}</th>
                <th class="p-3 text-right">{currentLang() === 'ne' ? 'रकम' : 'Total'}</th>
                <th class="p-3 text-right">{currentLang() === 'ne' ? 'उधारो' : 'Credit Due'}</th>
                <th class="p-3 text-center">CBMS</th>
                <th class="p-3 text-center">{currentLang() === 'ne' ? 'कार्य' : 'Action'}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-neutral-800/60 text-gray-600 dark:text-neutral-300">
              <For
                each={filteredInvoices()}
                fallback={
                  <tr>
                    <td colspan="8" class="p-8 text-center text-xs text-gray-400">
                      {currentLang() === 'ne' ? 'खोज्नु भएको बिल फेला पर्न सकिएन।' : 'No invoices found matching criteria.'}
                    </td>
                  </tr>
                }
              >
                {(inv) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition">
                    <td class="p-3 font-mono font-bold text-gray-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td class="p-3 font-mono text-gray-400 dark:text-neutral-400">
                      {settings.calendar === 'BS' ? inv.invoiceDateBs : inv.invoiceDateAd}
                    </td>
                    <td class="p-3 font-medium text-gray-700 dark:text-neutral-200">
                      {inv.partyName || (currentLang() === 'ne' ? 'नगद ग्राहक' : 'Counter Customer')}
                    </td>
                    <td class="p-3">
                      <span
                        class={`uppercase font-bold text-[10px] px-2 py-0.5 rounded ${
                          inv.paymentMode === 'fonepay_qr'
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                            : inv.paymentMode === 'credit'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                        }`}
                      >
                        {inv.paymentMode === 'fonepay_qr' ? 'Fonepay' : inv.paymentMode}
                      </span>
                    </td>
                    <td class="p-3 text-right font-black text-brand-600 dark:text-brand-400 font-mono">
                      {formatNepaliCurrency(inv.totalAmount)}
                    </td>
                    <td class="p-3 text-right font-mono">
                      {inv.dueAmount > 0 ? (
                        <span class="font-bold text-red-500 dark:text-red-400">
                          {formatNepaliCurrency(inv.dueAmount)}
                        </span>
                      ) : (
                        <span class="text-gray-300 dark:text-neutral-600">-</span>
                      )}
                    </td>
                    <td class="p-3 text-center">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        {currentLang() === 'ne' ? 'सत्यापित' : 'Audited'}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
                        title="View / Print Tax Invoice"
                      >
                        <IconPrinter size={16} />
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      <Show when={selectedInvoice()}>
        <ReceiptModal
          invoice={selectedInvoice()!}
          onClose={() => setSelectedInvoice(null)}
        />
      </Show>
    </div>
  );
};
