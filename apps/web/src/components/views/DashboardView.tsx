import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import {
  invoices,
  khataEntries,
  expenses,
  incomes,
  reminders,
  currentBusiness,
  setActiveTab,
  isDarkMode,
} from '../../db/localDb';
import { formatNepaliCurrency } from '@byapar/core';
import {
  IconCalendar,
  IconGift,
  IconChevronDown,
  IconArrowUp,
  IconArrowDown,
  IconPlus,
} from '../icons';

export const DashboardView: Component = () => {
  const [chartMode, setChartMode] = createSignal<'daily' | 'weekly'>('daily');

  // Calculate stats from real data
  const totalIncome = createMemo(() => {
    const fromInvoices = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const fromIncomes = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    return fromInvoices + fromIncomes;
  });

  const totalExpense = createMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  });

  const toReceive = createMemo(() => {
    return khataEntries
      .filter((e) => e.entryType === 'diyo')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  const toGive = createMemo(() => {
    return khataEntries
      .filter((e) => e.entryType === 'liyo')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  const upcomingReminders = createMemo(() => {
    return reminders.filter((r) => r.status === 'upcoming').slice(0, 3);
  });

  // Cashflow chart data (last 7 days)
  const chartData = createMemo(() => {
    const days: { label: string; moneyIn: number; moneyOut: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayIn = invoices
        .filter((inv) => inv.invoiceDateAd === dateStr)
        .reduce((sum, inv) => sum + inv.paidAmount, 0);

      const dayOut = expenses
        .filter((exp) => exp.date === dateStr)
        .reduce((sum, exp) => sum + exp.amount, 0);

      days.push({ label: dayLabel, moneyIn: dayIn, moneyOut: dayOut });
    }
    return days;
  });

  const chartMax = createMemo(() => {
    const maxVal = Math.max(
      ...chartData().map((d) => Math.max(d.moneyIn, d.moneyOut)),
      1
    );
    return Math.ceil(maxVal / 1000) * 1000 || 5000;
  });

  return (
    <div class="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white tracking-tight">
          Welcome {currentBusiness.nameEn || currentBusiness.name}
        </h1>
        <div class="flex items-center gap-2.5">
          <button
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            onClick={() => setActiveTab('expense')}
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
          <button
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            onClick={() => setActiveTab('income')}
          >
            <IconPlus class="w-3.5 h-3.5" />
            <span>Add Income</span>
          </button>
          <button
            class="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900 text-gray-700 dark:text-neutral-200 text-xs font-medium transition-all shadow-sm"
            onClick={() => setActiveTab('pos')}
          >
            <span>Billing</span>
            <IconChevronDown class="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income */}
        <div class="rounded-xl p-4 bg-[#e6fbf3] dark:bg-black border border-emerald-100/80 dark:border-emerald-950/80 transition-all hover:shadow-card">
          <div class="w-7 h-7 rounded-md bg-emerald-100/90 dark:bg-emerald-950/80 flex items-center justify-center mb-2.5 text-emerald-600 dark:text-emerald-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Income (This Month)</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNepaliCurrency(totalIncome())}</p>
        </div>

        {/* Expense */}
        <div class="rounded-xl p-4 bg-[#fef2f2] dark:bg-black border border-rose-100/80 dark:border-rose-950/80 transition-all hover:shadow-card">
          <div class="w-7 h-7 rounded-md bg-rose-100/90 dark:bg-rose-950/80 flex items-center justify-center mb-2.5 text-rose-500 dark:text-rose-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Expense (This Month)</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNepaliCurrency(totalExpense())}</p>
        </div>

        {/* To Receive */}
        <div class="rounded-xl p-4 bg-[#e6fbf3] dark:bg-black border border-emerald-100/80 dark:border-emerald-950/80 transition-all hover:shadow-card">
          <div class="w-7 h-7 rounded-md bg-emerald-100/90 dark:bg-emerald-950/80 flex items-center justify-center mb-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <IconArrowDown class="w-4 h-4" />
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">To Receive</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNepaliCurrency(toReceive())}</p>
        </div>

        {/* To Give */}
        <div class="rounded-xl p-4 bg-[#fef2f2] dark:bg-black border border-rose-100/80 dark:border-rose-950/80 transition-all hover:shadow-card">
          <div class="w-7 h-7 rounded-md bg-rose-100/90 dark:bg-rose-950/80 flex items-center justify-center mb-2.5 text-rose-500 dark:text-rose-400 font-bold text-sm">
            <IconArrowUp class="w-4 h-4" />
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">To Give</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNepaliCurrency(toGive())}</p>
        </div>
      </div>

      {/* Main Content Grid: Chart + Side Column */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Chart */}
        <div class="lg:col-span-2 stat-card !p-5">
          <div class="flex items-center justify-between mb-6">
            <h2 class="font-heading font-semibold text-gray-900 dark:text-white text-base">
              Cashflow <span class="text-gray-400 dark:text-neutral-500 font-normal text-xs">(Last 7 Days)</span>
            </h2>
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-black text-xs font-medium text-gray-700 dark:text-neutral-300 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-900">
              <IconCalendar class="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500" />
              <span>Daily</span>
              <IconChevronDown class="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500" />
            </div>
          </div>

          {/* SVG Chart */}
          <div class="relative h-52">
            <svg class="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <For each={[0, 1, 2, 3, 4]}>
                {(i) => (
                  <line
                    x1="0"
                    y1={40 * i}
                    x2="700"
                    y2={40 * i}
                    stroke={isDarkMode() ? '#1f1f1f' : '#f3f4f6'}
                    stroke-width="1"
                    stroke-dasharray="4 4"
                  />
                )}
              </For>

              {/* Bars */}
              <For each={chartData()}>
                {(d, idx) => {
                  const barWidth = 30;
                  const gap = 700 / 7;
                  const x = gap * idx() + gap / 2 - barWidth;
                  const maxH = 160;
                  const hIn = (d.moneyIn / chartMax()) * maxH;
                  const hOut = (d.moneyOut / chartMax()) * maxH;
                  return (
                    <>
                      <rect
                        x={x}
                        y={180 - hIn}
                        width={barWidth - 2}
                        height={hIn}
                        rx="3"
                        fill="#10b981"
                        opacity="0.85"
                      />
                      <rect
                        x={x + barWidth}
                        y={180 - hOut}
                        width={barWidth - 2}
                        height={hOut}
                        rx="3"
                        fill="#ef4444"
                        opacity="0.85"
                      />
                    </>
                  );
                }}
              </For>
            </svg>

            {/* X axis labels */}
            <div class="flex justify-around mt-2">
              <For each={chartData()}>
                {(d) => (
                  <span class="text-[10px] text-gray-400 dark:text-neutral-500 font-mono">
                    {d.label}
                  </span>
                )}
              </For>
            </div>
          </div>

          {/* Legend */}
          <div class="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span class="text-xs text-gray-500 dark:text-neutral-400">Total Money In</span>
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {formatNepaliCurrency(totalIncome())}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span class="text-xs text-gray-500 dark:text-neutral-400">Total Money Out</span>
              <span class="text-xs font-bold text-red-500 dark:text-red-400">
                {formatNepaliCurrency(totalExpense())}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Column */}
        <div class="space-y-5">
          {/* Total Balance */}
          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500 dark:text-neutral-400">Total Balance (Cash & Bank)</p>
              <svg class="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 cursor-pointer" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNepaliCurrency(totalIncome() - totalExpense())}
            </p>
          </div>

          {/* Upcoming Reminders */}
          <div class="stat-card">
            <p class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Upcoming Reminders ({upcomingReminders().length})
            </p>
            <Show
              when={upcomingReminders().length > 0}
              fallback={
                <div class="text-center py-4">
                  <p class="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                    Reminder Not Created Yet!
                  </p>
                  <p class="text-xs text-gray-400 dark:text-neutral-500 mb-3">
                    Create reminders to track credit collections and due dates.
                  </p>
                  <button class="btn-outline text-xs" onClick={() => setActiveTab('reminders')}>
                    + Add New Reminder
                  </button>
                </div>
              }
            >
              <div class="space-y-2">
                <For each={upcomingReminders()}>
                  {(r) => (
                    <div class="flex items-center justify-between py-2 border-b border-gray-50 dark:border-neutral-800 last:border-0">
                      <div>
                        <p class="text-sm font-medium text-gray-800 dark:text-neutral-200">{r.title}</p>
                        <p class="text-xs text-gray-400 dark:text-neutral-500">{r.dueDate}</p>
                      </div>
                      <Show when={r.amount}>
                        <span class="text-sm font-bold text-brand-600 dark:text-emerald-400">
                          {formatNepaliCurrency(r.amount!)}
                        </span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          {/* Referral Card */}
          <div class="stat-card bg-gradient-to-br from-amber-50 to-white dark:from-neutral-950 dark:to-black border-amber-100 dark:border-neutral-800">
            <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
              <IconGift class="w-5 h-5" />
            </div>
            <p class="text-sm font-bold text-gray-900 dark:text-white mb-1">
              Invite Friends. Get Rewarded.
            </p>
            <p class="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
              Share your invite link and earn <b class="text-gray-800 dark:text-white">150 Coins</b> when your friends join,
              and <b class="text-gray-800 dark:text-white">1 Month Premium Free For Both</b> when your friend upgrades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
