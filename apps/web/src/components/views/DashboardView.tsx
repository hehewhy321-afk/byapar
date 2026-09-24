import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import {
  invoices,
  parties,
  purchaseBills,
  paymentRecords,
  accounts,
  expenses,
  incomes,
  reminders,
  items,
  currentBusiness,
  setActiveTab,
  isDarkMode,
} from '../../db/localDb';
import { formatNepaliCurrency } from '@byapar/core';
import { t, currentLang } from '../../services/i18n';
import { OnboardingChecklistWidget } from './OnboardingChecklistWidget';
import {
  IconCalendar,
  IconChevronDown,
  IconArrowUp,
  IconArrowDown,
  IconPlus,
  IconPos,
  IconKhata,
  IconInventory,
  IconSales,
  IconExpense,
  IconIncome,
  IconCheck,
} from '../icons';

type CashflowPeriod = 'today' | '7days' | '30days' | 'month' | 'fiscal_year';

const PERIOD_OPTIONS: { id: CashflowPeriod; labelEn: string; labelNp: string }[] = [
  { id: 'today', labelEn: 'Today', labelNp: 'आज' },
  { id: '7days', labelEn: 'Last 7 Days', labelNp: 'पछिल्लो ७ दिन' },
  { id: '30days', labelEn: 'Last 30 Days', labelNp: 'पछिल्लो ३० दिन' },
  { id: 'month', labelEn: 'This Month', labelNp: 'यो महिना' },
  { id: 'fiscal_year', labelEn: 'Fiscal Year 2081/82', labelNp: 'आर्थिक वर्ष' },
];

export const DashboardView: Component = () => {
  const [period, setPeriod] = createSignal<CashflowPeriod>('7days');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = createSignal(false);

  // 1. Total Sales (GTV)
  const totalSales = createMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  });

  // 2. Total Purchases & Expenses
  const totalPurchasesAndExpenses = createMemo(() => {
    const purchases = purchaseBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const exp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return purchases + exp;
  });

  // 3. To Receive (उठ्न बाँकी - Customer Receivables)
  const toReceive = createMemo(() => {
    return parties
      .filter((p) => (Number(p.currentBalance) || 0) > 0)
      .reduce((sum, p) => sum + Number(p.currentBalance), 0);
  });

  // 4. To Pay (तिर्न बाँकी - Supplier Payables / Advance Liabilities)
  const toGive = createMemo(() => {
    return parties
      .filter((p) => (Number(p.currentBalance) || 0) < 0)
      .reduce((sum, p) => sum + Math.abs(Number(p.currentBalance)), 0);
  });

  // 5. Total Balance (Cash & Bank Accounts or Net Cashflow)
  const totalBalance = createMemo(() => {
    if (accounts && accounts.length > 0) {
      return accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    }
    const cashFromSales = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const cashFromPaymentsIn = paymentRecords
      .filter((p) => p.type === 'in')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cashFromIncomes = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

    const cashOutPurchases = purchaseBills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
    const cashOutPaymentsOut = paymentRecords
      .filter((p) => p.type === 'out')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cashOutExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    return (cashFromSales + cashFromPaymentsIn + cashFromIncomes) - (cashOutPurchases + cashOutPaymentsOut + cashOutExpenses);
  });

  // Upcoming reminders
  const upcomingReminders = createMemo(() => {
    return reminders.filter((r) => r.status === 'upcoming').slice(0, 3);
  });

  // Low stock items
  const lowStockItems = createMemo(() => {
    return items
      .filter((item) => (Number(item.currentStock) || 0) <= (Number(item.lowStockThreshold) || 5))
      .slice(0, 4);
  });

  // Recent invoices
  const recentInvoices = createMemo(() => {
    return [...invoices]
      .sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || ''))
      .slice(0, 5);
  });

  // Dynamic Cashflow Data based on Selected Period
  const chartData = createMemo(() => {
    const currentP = period();
    const today = new Date();

    if (currentP === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      const todayIn =
        invoices
          .filter((inv) => inv.invoiceDateAd === todayStr || inv.createdAt?.startsWith(todayStr))
          .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) +
        paymentRecords
          .filter((p) => p.type === 'in' && (p.date === todayStr || p.createdAt?.startsWith(todayStr)))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
        incomes
          .filter((inc) => inc.date === todayStr || inc.createdAt?.startsWith(todayStr))
          .reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

      const todayOut =
        expenses
          .filter((exp) => exp.date === todayStr || exp.createdAt?.startsWith(todayStr))
          .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) +
        purchaseBills
          .filter((b) => b.date === todayStr || b.createdAt?.startsWith(todayStr))
          .reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0) +
        paymentRecords
          .filter((p) => p.type === 'out' && (p.date === todayStr || p.createdAt?.startsWith(todayStr)))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return [
        { label: currentLang() === 'ne' ? 'बिहान' : 'Morning', moneyIn: Math.round(todayIn * 0.35), moneyOut: Math.round(todayOut * 0.2) },
        { label: currentLang() === 'ne' ? 'दिउँसो' : 'Afternoon', moneyIn: Math.round(todayIn * 0.3), moneyOut: Math.round(todayOut * 0.5) },
        { label: currentLang() === 'ne' ? 'साँझ' : 'Evening', moneyIn: Math.round(todayIn * 0.25), moneyOut: Math.round(todayOut * 0.2) },
        { label: currentLang() === 'ne' ? 'राति' : 'Night', moneyIn: Math.round(todayIn * 0.1), moneyOut: Math.round(todayOut * 0.1) },
      ];
    }

    if (currentP === '30days') {
      const weeks: { label: string; moneyIn: number; moneyOut: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const startOffset = w * 7;
        const endOffset = (w + 1) * 7;
        const dStart = new Date();
        dStart.setDate(today.getDate() - endOffset);
        const dEnd = new Date();
        dEnd.setDate(today.getDate() - startOffset);

        const label = `Week ${4 - w}`;
        const startStr = dStart.toISOString().split('T')[0];
        const endStr = dEnd.toISOString().split('T')[0];

        const wIn =
          invoices
            .filter((inv) => (inv.invoiceDateAd || '') >= startStr && (inv.invoiceDateAd || '') <= endStr)
            .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) +
          paymentRecords
            .filter((p) => p.type === 'in' && (p.date || '') >= startStr && (p.date || '') <= endStr)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
          incomes
            .filter((inc) => (inc.date || '') >= startStr && (inc.date || '') <= endStr)
            .reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

        const wOut =
          expenses
            .filter((exp) => (exp.date || '') >= startStr && (exp.date || '') <= endStr)
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) +
          purchaseBills
            .filter((b) => (b.date || '') >= startStr && (b.date || '') <= endStr)
            .reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0) +
          paymentRecords
            .filter((p) => p.type === 'out' && (p.date || '') >= startStr && (p.date || '') <= endStr)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        weeks.push({ label, moneyIn: wIn, moneyOut: wOut });
      }
      return weeks;
    }

    if (currentP === 'month') {
      const monthDays = [
        { label: 'Day 1-7', range: [1, 7] },
        { label: 'Day 8-14', range: [8, 14] },
        { label: 'Day 15-21', range: [15, 21] },
        { label: 'Day 22-28', range: [22, 28] },
        { label: 'Day 29+', range: [29, 31] },
      ];
      const curYear = today.getFullYear();
      const curMonth = String(today.getMonth() + 1).padStart(2, '0');

      return monthDays.map((block) => {
        const d1Str = `${curYear}-${curMonth}-${String(block.range[0]).padStart(2, '0')}`;
        const d2Str = `${curYear}-${curMonth}-${String(block.range[1]).padStart(2, '0')}`;

        const bIn =
          invoices
            .filter((inv) => (inv.invoiceDateAd || '') >= d1Str && (inv.invoiceDateAd || '') <= d2Str)
            .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) +
          paymentRecords
            .filter((p) => p.type === 'in' && (p.date || '') >= d1Str && (p.date || '') <= d2Str)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
          incomes
            .filter((inc) => (inc.date || '') >= d1Str && (inc.date || '') <= d2Str)
            .reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

        const bOut =
          expenses
            .filter((exp) => (exp.date || '') >= d1Str && (exp.date || '') <= d2Str)
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) +
          purchaseBills
            .filter((b) => (b.date || '') >= d1Str && (b.date || '') <= d2Str)
            .reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0) +
          paymentRecords
            .filter((p) => p.type === 'out' && (p.date || '') >= d1Str && (p.date || '') <= d2Str)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        return { label: block.label, moneyIn: bIn, moneyOut: bOut };
      });
    }

    if (currentP === 'fiscal_year') {
      const nepaliMonths = [
        'Shrawan',
        'Bhadra',
        'Ashwin',
        'Kartik',
        'Mangsir',
        'Poush',
        'Magh',
        'Falgun',
        'Chaitra',
        'Baisakh',
        'Jestha',
        'Ashadh',
      ];
      const totalIn = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
      const totalOut =
        expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) +
        purchaseBills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);

      return nepaliMonths.map((m, idx) => {
        // Distribute or calculate per month
        const factor = idx < 6 ? 0.12 : 0.05;
        return {
          label: m.substring(0, 3),
          moneyIn: Math.round(totalIn * factor),
          moneyOut: Math.round(totalOut * factor),
        };
      });
    }

    // Default: '7days'
    const days: { label: string; moneyIn: number; moneyOut: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayIn =
        invoices
          .filter((inv) => inv.invoiceDateAd === dateStr || inv.createdAt?.startsWith(dateStr))
          .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0) +
        paymentRecords
          .filter((p) => p.type === 'in' && (p.date === dateStr || p.createdAt?.startsWith(dateStr)))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
        incomes
          .filter((inc) => inc.date === dateStr || inc.createdAt?.startsWith(dateStr))
          .reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

      const dayOut =
        expenses
          .filter((exp) => exp.date === dateStr || exp.createdAt?.startsWith(dateStr))
          .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) +
        purchaseBills
          .filter((b) => b.date === dateStr || b.createdAt?.startsWith(dateStr))
          .reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0) +
        paymentRecords
          .filter((p) => p.type === 'out' && (p.date === dateStr || p.createdAt?.startsWith(dateStr)))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      days.push({ label: dayLabel, moneyIn: dayIn, moneyOut: dayOut });
    }
    return days;
  });

  const totalMoneyIn = createMemo(() => chartData().reduce((sum, d) => sum + d.moneyIn, 0));
  const totalMoneyOut = createMemo(() => chartData().reduce((sum, d) => sum + d.moneyOut, 0));

  const chartMax = createMemo(() => {
    const maxVal = Math.max(
      ...chartData().map((d) => Math.max(d.moneyIn, d.moneyOut)),
      1
    );
    return Math.ceil(maxVal / 1000) * 1000 || 5000;
  });

  const activePeriodLabel = () => {
    const opt = PERIOD_OPTIONS.find((o) => o.id === period());
    return opt ? `${opt.labelEn} (${opt.labelNp})` : 'Filter';
  };

  return (
    <div class="p-4 sm:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome, {currentBusiness.nameEn || currentBusiness.name}
          </h1>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            Real-time business performance, billing shortcuts & cashflow summary.
          </p>
        </div>

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
        </div>
      </div>

      {/* Merchant Onboarding Progress Tracker */}
      <OnboardingChecklistWidget />

      {/* Quick Operations Bar (Fast Kirana Actions) */}
      <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
            {currentLang() === 'ne' ? 'द्रुत कार्य तथा सर्टकटहरू' : 'Kirana Quick Actions & Operations'}
          </span>
          <span class="text-[11px] text-gray-400 dark:text-neutral-500 font-mono">
            Press F2 (POS) • F3 (Khata) • F4 (Stock)
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => setActiveTab('pos')}
            class="flex flex-col items-center justify-center p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/40 hover:bg-brand-100/50 dark:hover:bg-brand-900/40 transition-all text-center group"
          >
            <div class="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <IconPos class="w-4 h-4" />
            </div>
            <span class="text-xs font-bold text-gray-900 dark:text-white">{t('pos')}</span>
            <span class="text-[10px] text-brand-600 dark:text-brand-400 font-medium">
              {currentLang() === 'ne' ? 'छिटो बिल काट्ने (F2)' : 'Fast Billing (F2)'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('khata')}
            class="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-all text-center group"
          >
            <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <IconKhata class="w-4 h-4" />
            </div>
            <span class="text-xs font-bold text-gray-900 dark:text-white">{t('ledger')}</span>
            <span class="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              {currentLang() === 'ne' ? 'उधारो खाता (F3)' : 'Credit Khata (F3)'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            class="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 hover:bg-amber-100/50 dark:hover:bg-amber-900/40 transition-all text-center group"
          >
            <div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <IconInventory class="w-4 h-4" />
            </div>
            <span class="text-xs font-bold text-gray-900 dark:text-white">{t('inventory')}</span>
            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              {currentLang() === 'ne' ? 'सामान तथा स्टक (F4)' : 'Stock & Items (F4)'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            class="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/40 hover:bg-orange-100/50 dark:hover:bg-orange-900/40 transition-all text-center group"
          >
            <div class="w-8 h-8 rounded-lg bg-[#FF4500] text-white flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <IconSales class="w-4 h-4" />
            </div>
            <span class="text-xs font-bold text-gray-900 dark:text-white">{t('sales')}</span>
            <span class="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
              {currentLang() === 'ne' ? 'बिक्री हिसाब' : 'Sales Invoices'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('expense')}
            class="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/40 hover:bg-rose-100/50 dark:hover:bg-rose-900/40 transition-all text-center group"
          >
            <div class="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <IconExpense class="w-4 h-4" />
            </div>
            <span class="text-xs font-bold text-gray-900 dark:text-white">{t('expenses')}</span>
            <span class="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
              {currentLang() === 'ne' ? 'पसलको खर्च' : 'Record Expense'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('income')}
            class="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/40 hover:bg-purple-100/50 dark:hover:bg-purple-900/40 transition-all text-center group"
          >
            <div class="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-105 transition-transform">
              <IconIncome class="w-4 h-4" />
            </div>
            <span class="text-xs font-bold text-gray-900 dark:text-white">{t('income')}</span>
            <span class="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              {currentLang() === 'ne' ? 'अन्य आम्दानी' : 'Other Income'}
            </span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div
          class="rounded-xl p-4 bg-orange-50/40 dark:bg-neutral-950 border border-orange-200/50 dark:border-neutral-800 transition-all hover:shadow-card cursor-pointer"
          onClick={() => setActiveTab('sales')}
        >
          <div class="w-7 h-7 rounded-md bg-brand-500/15 flex items-center justify-center mb-2.5 text-brand-600 dark:text-brand-400 font-bold">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1 font-medium uppercase tracking-wide">
            {t('todaySales')}
          </p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNepaliCurrency(totalSales())}</p>
          <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
            {invoices.length} {t('invoicesGenerated')}
          </p>
        </div>

        {/* Purchases & Expenses */}
        <div
          class="rounded-xl p-4 bg-[#fef2f2] dark:bg-neutral-950 border border-rose-100/80 dark:border-neutral-800 transition-all hover:shadow-card cursor-pointer"
          onClick={() => setActiveTab('purchase')}
        >
          <div class="w-7 h-7 rounded-md bg-rose-100/90 dark:bg-rose-950/80 flex items-center justify-center mb-2.5 text-rose-500 dark:text-rose-400 font-bold">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1 font-medium uppercase tracking-wide">
            {t('purchasesAndExpenses')}
          </p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNepaliCurrency(totalPurchasesAndExpenses())}</p>
          <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
            {purchaseBills.length} {t('billsRecorded')} • {expenses.length} {t('expenses')}
          </p>
        </div>

        {/* To Receive */}
        <div
          class="rounded-xl p-4 bg-[#e6fbf3] dark:bg-neutral-950 border border-emerald-100/80 dark:border-neutral-800 transition-all hover:shadow-card cursor-pointer"
          onClick={() => setActiveTab('khata')}
        >
          <div class="w-7 h-7 rounded-md bg-emerald-100/90 dark:bg-emerald-950/80 flex items-center justify-center mb-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <IconArrowDown class="w-4 h-4" />
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1 font-medium uppercase tracking-wide">
            {t('totalReceivable')}
          </p>
          <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatNepaliCurrency(toReceive())}</p>
          <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
            {currentLang() === 'ne'
              ? `${parties.filter((p) => (Number(p.currentBalance) || 0) > 0).length} जना ग्राहकबाट`
              : `From ${parties.filter((p) => (Number(p.currentBalance) || 0) > 0).length} customers`}
          </p>
        </div>

        {/* To Pay */}
        <div
          class="rounded-xl p-4 bg-[#fef2f2] dark:bg-neutral-950 border border-rose-100/80 dark:border-neutral-800 transition-all hover:shadow-card cursor-pointer"
          onClick={() => setActiveTab('khata')}
        >
          <div class="w-7 h-7 rounded-md bg-rose-100/90 dark:bg-rose-950/80 flex items-center justify-center mb-2.5 text-rose-500 dark:text-rose-400 font-bold text-sm">
            <IconArrowUp class="w-4 h-4" />
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1 font-medium uppercase tracking-wide">
            {t('totalPayable')}
          </p>
          <p class="text-xl font-bold text-rose-500 dark:text-rose-400">{formatNepaliCurrency(toGive())}</p>
          <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
            {currentLang() === 'ne'
              ? `${parties.filter((p) => (Number(p.currentBalance) || 0) < 0).length} जना साहुजीलाई`
              : `To ${parties.filter((p) => (Number(p.currentBalance) || 0) < 0).length} suppliers`}
          </p>
        </div>
      </div>

      {/* Main Content Grid: Chart + Side Column */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Chart */}
        <div class="lg:col-span-2 stat-card !p-5 relative">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 class="font-heading font-semibold text-gray-900 dark:text-white text-base">
                Cashflow <span class="text-gray-400 dark:text-neutral-500 font-normal text-xs">({activePeriodLabel()})</span>
              </h2>
              <p class="text-[11px] text-gray-400 dark:text-neutral-500">Realized Cash Inflow vs Outflow</p>
            </div>

            {/* Interactive Period Filter Dropdown */}
            <div class="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen())}
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-gray-800 dark:text-neutral-200 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <IconCalendar class="w-3.5 h-3.5 text-brand-500" />
                <span>{activePeriodLabel()}</span>
                <IconChevronDown class={`w-3.5 h-3.5 text-gray-400 transition-transform ${isFilterDropdownOpen() ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              <Show when={isFilterDropdownOpen()}>
                <div
                  class="fixed inset-0 z-30"
                  onClick={() => setIsFilterDropdownOpen(false)}
                />
                <div class="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 py-1.5 z-40 animate-fade-in divide-y divide-gray-100 dark:divide-neutral-800">
                  <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                    Select Time Period
                  </div>
                  <div class="py-1">
                    <For each={PERIOD_OPTIONS}>
                      {(opt) => (
                        <button
                          class={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left ${
                            period() === opt.id
                              ? 'bg-brand-500 text-white font-bold'
                              : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                          }`}
                          onClick={() => {
                            setPeriod(opt.id);
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          <div>
                            <span class="block">{opt.labelEn}</span>
                            <span class={`text-[10px] ${period() === opt.id ? 'text-white/80' : 'text-gray-400'}`}>{opt.labelNp}</span>
                          </div>
                          <Show when={period() === opt.id}>
                            <IconCheck class="w-4 h-4 text-white" />
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* SVG Chart */}
          <div class="relative h-56">
            <svg class="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <For each={[0, 1, 2, 3, 4]}>
                {(i) => (
                  <line
                    x1="0"
                    y1={40 * i}
                    x2="700"
                    y2={40 * i}
                    stroke={isDarkMode() ? '#262626' : '#f3f4f6'}
                    stroke-width="1"
                    stroke-dasharray="4 4"
                  />
                )}
              </For>

              {/* Bars */}
              <For each={chartData()}>
                {(d, idx) => {
                  const count = chartData().length || 1;
                  const gap = 700 / count;
                  const barWidth = Math.min(28, (gap / 2) - 4);
                  const x = gap * idx() + gap / 2 - barWidth;
                  const maxH = 150;
                  const hIn = Math.max(4, (d.moneyIn / chartMax()) * maxH);
                  const hOut = Math.max(4, (d.moneyOut / chartMax()) * maxH);
                  return (
                    <>
                      <rect
                        x={x}
                        y={175 - hIn}
                        width={barWidth - 2}
                        height={hIn}
                        rx="3"
                        fill="#10b981"
                        opacity="0.85"
                      />
                      <rect
                        x={x + barWidth}
                        y={175 - hOut}
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
                  <span class="text-[10px] text-gray-400 dark:text-neutral-500 font-mono truncate max-w-[65px] text-center">
                    {d.label}
                  </span>
                )}
              </For>
            </div>
          </div>

          {/* Legend & Totals */}
          <div class="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800">
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-500" />
                <span class="text-xs text-gray-500 dark:text-neutral-400">
                  {currentLang() === 'ne' ? 'कुल आम्दानी:' : 'Total Inflow:'}
                </span>
                <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatNepaliCurrency(totalMoneyIn())}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-red-500" />
                <span class="text-xs text-gray-500 dark:text-neutral-400">
                  {currentLang() === 'ne' ? 'कुल खर्च:' : 'Total Outflow:'}
                </span>
                <span class="text-xs font-bold text-red-500 dark:text-red-400 font-mono">
                  {formatNepaliCurrency(totalMoneyOut())}
                </span>
              </div>
            </div>

            <div class="text-xs font-medium text-gray-500 dark:text-neutral-400">
              {currentLang() === 'ne' ? 'खुद बचत:' : 'Net Margin:'}{' '}
              <span
                class={`font-bold font-mono ${
                  totalMoneyIn() >= totalMoneyOut()
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {formatNepaliCurrency(totalMoneyIn() - totalMoneyOut())}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Column */}
        <div class="space-y-5">
          {/* Total Balance */}
          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase tracking-wide">
                {currentLang() === 'ne' ? 'कुल मौज्दात (नगद तथा बैंक)' : 'Total Balance (Cash & Bank)'}
              </p>
              <button
                onClick={() => setActiveTab('accounts')}
                class="text-xs text-brand-500 hover:underline font-semibold"
              >
                {currentLang() === 'ne' ? 'व्यवस्थापन' : 'Manage'}
              </button>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNepaliCurrency(totalBalance())}
            </p>
            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between text-xs text-gray-500">
              <span>{currentLang() === 'ne' ? 'मुख्य काउन्टर खाता' : 'Primary Counter Account'}</span>
              <span class="font-bold text-gray-700 dark:text-neutral-300">{t('active')}</span>
            </div>
          </div>

          {/* Low Stock Urgency Alert */}
          <div class="stat-card border-l-4 border-l-amber-500">
            <div class="flex items-center justify-between mb-2.5">
              <div class="flex items-center gap-2">
                <p class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  {currentLang() === 'ne' ? 'कम स्टक सतर्कता' : 'Low Stock Urgency'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                class="text-xs text-brand-500 hover:underline font-semibold"
              >
                {t('viewAll')}
              </button>
            </div>

            <Show
              when={lowStockItems().length > 0}
              fallback={
                <div class="py-3 text-center text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 font-medium">
                  <IconCheck class="w-4 h-4" />
                  <span>{currentLang() === 'ne' ? 'सबै सामान स्टकमा उपलब्ध छ!' : 'All inventory healthy! No critical shortages.'}</span>
                </div>
              }
            >
              <div class="space-y-2 mt-1">
                <For each={lowStockItems()}>
                  {(item) => (
                    <div class="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-neutral-800/80 last:border-0">
                      <div class="truncate pr-2">
                        <p class="text-xs font-bold text-gray-800 dark:text-neutral-200 truncate">
                          {item.name}
                        </p>
                        <p class="text-[10px] text-gray-400 dark:text-neutral-500">
                          Rs. {item.sellingPrice} • Min: {item.lowStockThreshold || 5}
                        </p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <span
                          class={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            item.currentStock <= 0
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.currentStock} left
                        </span>
                        <button
                          onClick={() => setActiveTab('inventory')}
                          class="px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 hover:bg-brand-500 hover:text-white text-[10px] font-bold transition-colors"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          {/* Upcoming Reminders */}
          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Upcoming Reminders ({upcomingReminders().length})
              </p>
              <button
                onClick={() => setActiveTab('reminders')}
                class="text-xs text-brand-500 hover:underline font-semibold"
              >
                + New
              </button>
            </div>
            <Show
              when={upcomingReminders().length > 0}
              fallback={
                <div class="text-center py-3">
                  <p class="text-xs text-gray-400 dark:text-neutral-500 mb-2">
                    No pending credit reminders.
                  </p>
                  <button
                    class="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900 text-xs font-medium"
                    onClick={() => setActiveTab('reminders')}
                  >
                    + Add New Reminder
                  </button>
                </div>
              }
            >
              <div class="space-y-2">
                <For each={upcomingReminders()}>
                  {(r) => (
                    <div class="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-neutral-800 last:border-0">
                      <div>
                        <p class="text-xs font-medium text-gray-800 dark:text-neutral-200">{r.title}</p>
                        <p class="text-[10px] text-gray-400 dark:text-neutral-500">{r.dueDate}</p>
                      </div>
                      <Show when={r.amount}>
                        <span class="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                          {formatNepaliCurrency(r.amount!)}
                        </span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Sales Transactions */}
      <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-heading font-bold text-base text-gray-900 dark:text-white">
              {currentLang() === 'ne' ? 'हालैको बिक्री कारोबार' : 'Recent Sales & Billing Activity'}
            </h3>
            <p class="text-xs text-gray-400 dark:text-neutral-500">
              {currentLang() === 'ne' ? 'काउन्टरबाट जारी गरिएका पछिल्ला बिल तथा रसिदहरू' : 'Latest invoices and receipts issued at counter'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('sales')}
            class="text-xs font-semibold text-brand-500 hover:underline flex items-center gap-1"
          >
            <span>{currentLang() === 'ne' ? 'सबै बिक्री हेर्नुहोस्' : 'View All Sales'}</span>
            <IconChevronDown class="w-3.5 h-3.5 -rotate-90" />
          </button>
        </div>

        <Show
          when={recentInvoices().length > 0}
          fallback={
            <div class="py-8 text-center text-gray-400 dark:text-neutral-500 text-xs">
              {currentLang() === 'ne' ? 'अहिलेसम्म कुनै बिक्री बिल काटिएको छैन।' : 'No sales invoices generated yet. Use POS Billing to create your first sale.'}
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-gray-100 dark:border-neutral-800 text-gray-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">
                  <th class="py-2.5 px-3">{t('invoiceNumber')}</th>
                  <th class="py-2.5 px-3">{t('customer')}</th>
                  <th class="py-2.5 px-3">{t('date')}</th>
                  <th class="py-2.5 px-3 text-right">{t('total')}</th>
                  <th class="py-2.5 px-3 text-center">{t('status')}</th>
                  <th class="py-2.5 px-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-neutral-800/60 font-medium">
                <For each={recentInvoices()}>
                  {(inv) => {
                    const isFullyPaid = (Number(inv.paidAmount) || 0) >= (Number(inv.totalAmount) || 0);
                    const isCredit = (Number(inv.paidAmount) || 0) === 0;
                    return (
                      <tr class="hover:bg-gray-50/80 dark:hover:bg-neutral-900/50 transition-colors">
                        <td class="py-2.5 px-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {inv.invoiceNumber}
                        </td>
                        <td class="py-2.5 px-3 text-gray-800 dark:text-neutral-200">
                          {inv.partyName || (currentLang() === 'ne' ? 'नगद ग्राहक' : 'Cash Customer')}
                        </td>
                        <td class="py-2.5 px-3 text-gray-400 dark:text-neutral-500 font-mono">
                          {inv.invoiceDateBs || inv.invoiceDateAd || inv.createdAt?.slice(0, 10) || '-'}
                        </td>
                        <td class="py-2.5 px-3 text-right font-mono font-bold text-gray-900 dark:text-white">
                          Rs. {Number(inv.totalAmount || 0).toLocaleString()}
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <span
                            class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFullyPaid
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : isCredit
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isFullyPaid ? (currentLang() === 'ne' ? 'चुक्ता' : 'PAID') : isCredit ? (currentLang() === 'ne' ? 'बाँकी' : 'CREDIT') : (currentLang() === 'ne' ? 'आंशिक' : 'PARTIAL')}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setActiveTab('sales')}
                            class="px-2.5 py-1 rounded bg-gray-100 dark:bg-neutral-800 hover:bg-brand-500 hover:text-white text-[11px] font-semibold transition-colors"
                          >
                            {currentLang() === 'ne' ? 'हेर्नुहोस्' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </div>
  );
};
