import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  calculateEmi,
  calculateInterest,
  calculateTax,
  calculateMargin,
  calculateTargetSellingPrice,
  calculateDenominations,
  NEPAL_DENOMINATIONS,
  formatNepaliCurrency,
} from '@byapar/core';
import { currentLang } from '../../services/i18n';
import {
  IconTools,
  IconCheck,
  IconArrowDown,
  IconArrowUp,
  IconReceipt,
  IconAccounts,
} from '../icons';

export const UtilitiesView: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'emi' | 'interest' | 'vat' | 'margin' | 'cash'>('emi');

  // -------------------------------------------------------------
  // 1. EMI Calculator State
  // -------------------------------------------------------------
  const [emiPrincipal, setEmiPrincipal] = createSignal<number>(500000);
  const [emiRate, setEmiRate] = createSignal<number>(12);
  const [emiTenureMonths, setEmiTenureMonths] = createSignal<number>(24);
  const [showSchedule, setShowSchedule] = createSignal<boolean>(false);

  const emiResult = createMemo(() => {
    return calculateEmi(emiPrincipal(), emiRate(), emiTenureMonths());
  });

  // -------------------------------------------------------------
  // 2. Nepali Khata & Loan Interest State
  // -------------------------------------------------------------
  const [interestPrincipal, setInterestPrincipal] = createSignal<number>(100000);
  const [interestRate, setInterestRate] = createSignal<number>(2); // 2% per month default
  const [isMonthlyRate, setIsMonthlyRate] = createSignal<boolean>(true);
  const [interestDays, setInterestDays] = createSignal<number>(90);
  const [isCompound, setIsCompound] = createSignal<boolean>(false);
  const [compoundFreq, setCompoundFreq] = createSignal<'monthly' | 'quarterly' | 'annually'>('monthly');

  const interestResult = createMemo(() => {
    return calculateInterest(interestPrincipal(), interestRate(), interestDays(), {
      isMonthlyRate: isMonthlyRate(),
      isCompound: isCompound(),
      compoundFrequency: compoundFreq(),
    });
  });

  // -------------------------------------------------------------
  // 3. VAT & TDS State
  // -------------------------------------------------------------
  const [taxAmountInput, setTaxAmountInput] = createSignal<number>(10000);
  const [taxRate, setTaxRate] = createSignal<number>(13);
  const [isTaxInclusive, setIsTaxInclusive] = createSignal<boolean>(false);

  const taxResult = createMemo(() => {
    return calculateTax(taxAmountInput(), taxRate(), isTaxInclusive());
  });

  // -------------------------------------------------------------
  // 4. Margin & Markup State
  // -------------------------------------------------------------
  const [marginMode, setMarginMode] = createSignal<'cost_sale' | 'target_margin'>('cost_sale');
  const [marginCost, setMarginCost] = createSignal<number>(800);
  const [marginSale, setMarginSale] = createSignal<number>(1000);
  const [targetMarginPercent, setTargetMarginPercent] = createSignal<number>(20);

  const marginResult = createMemo(() => {
    if (marginMode() === 'cost_sale') {
      return calculateMargin(marginCost(), marginSale());
    } else {
      const targetSale = calculateTargetSellingPrice(marginCost(), targetMarginPercent());
      return calculateMargin(marginCost(), targetSale);
    }
  });

  // -------------------------------------------------------------
  // 5. Cash Drawer & Change Calculator State
  // -------------------------------------------------------------
  const [counts, setCounts] = createSignal<Record<number, number>>({
    1000: 10,
    500: 20,
    100: 50,
    50: 40,
    20: 30,
    10: 25,
    5: 20,
    2: 10,
    1: 10,
  });
  const [expectedDrawerCash, setExpectedDrawerCash] = createSignal<number>(25000);

  // Quick Change Return helper
  const [changeBillTotal, setChangeBillTotal] = createSignal<number>(1350);
  const [changeCashPaid, setChangeCashPaid] = createSignal<number>(2000);

  const cashResult = createMemo(() => {
    return calculateDenominations(counts());
  });

  const cashDiscrepancy = createMemo(() => {
    return cashResult().grandTotal - expectedDrawerCash();
  });

  const changeToReturn = createMemo(() => {
    return Math.max(0, changeCashPaid() - changeBillTotal());
  });

  const updateCount = (denom: number, val: number) => {
    const next = { ...counts(), [denom]: Math.max(0, val) };
    setCounts(next);
  };

  const clearCashCounts = () => {
    const empty: Record<number, number> = {};
    for (const d of NEPAL_DENOMINATIONS) {
      empty[d] = 0;
    }
    setCounts(empty);
  };

  return (
    <div class="space-y-6 animate-fade-in p-2 sm:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-neutral-800 pb-4">
        <div>
          <h2 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <IconTools class="w-6 h-6 text-[#FF4500]" />
            <span>
              {currentLang() === 'ne'
                ? 'व्यापारिक क्यालकुलेटर तथा वित्तीय औजारहरू'
                : 'Business Calculators & Financial Utilities'}
            </span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            {currentLang() === 'ne'
              ? 'ऋण किस्ता (EMI), नेपाली खाता ब्याज, भ्याट/टीडीएस, नाफा मार्जिन र गल्ला नगद काउन्टर'
              : 'EMI loan scheduler, Nepali monthly Khata interest, VAT/TDS, Margin/Markup & Cash drawer counter'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div class="flex flex-wrap gap-1.5 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('emi')}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab() === 'emi'
                ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {currentLang() === 'ne' ? '१. ऋण किस्ता (EMI)' : '1. Loan EMI'}
          </button>
          <button
            onClick={() => setActiveTab('interest')}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab() === 'interest'
                ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {currentLang() === 'ne' ? '२. खाता ब्याज' : '2. Khata Interest'}
          </button>
          <button
            onClick={() => setActiveTab('vat')}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab() === 'vat'
                ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {currentLang() === 'ne' ? '३. भ्याट र टीडीएस' : '3. VAT & TDS'}
          </button>
          <button
            onClick={() => setActiveTab('margin')}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab() === 'margin'
                ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {currentLang() === 'ne' ? '४. नाफा मार्जिन' : '4. Margin & Markup'}
          </button>
          <button
            onClick={() => setActiveTab('cash')}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab() === 'cash'
                ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {currentLang() === 'ne' ? '५. गल्ला काउन्टर' : '5. Cash Counter'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. EMI CALCULATOR */}
      {/* ------------------------------------------------------------- */}
      <Show when={activeTab() === 'emi'}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div class="lg:col-span-5 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm space-y-5">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              {currentLang() === 'ne' ? 'ऋण विवरण' : 'Loan Input Parameters'}
            </h3>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'ऋण रकम (रु.):' : 'Loan Amount (Principal NPR):'}
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={emiPrincipal()}
                onInput={(e) => setEmiPrincipal(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
              <div class="flex gap-2 mt-2">
                {[100000, 300000, 500000, 1000000, 2500000].map((amt) => (
                  <button
                    onClick={() => setEmiPrincipal(amt)}
                    class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 font-mono"
                  >
                    {amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'वार्षिक ब्याजदर (% p.a.):' : 'Annual Interest Rate (% p.a.):'}
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={emiRate()}
                onInput={(e) => setEmiRate(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
              <div class="flex gap-2 mt-2">
                {[8.5, 10, 12, 13.5, 15].map((r) => (
                  <button
                    onClick={() => setEmiRate(r)}
                    class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 font-mono"
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'भुक्तानी अवधि (महिनाहरू):' : 'Loan Tenure (Months):'}
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={emiTenureMonths()}
                onInput={(e) => setEmiTenureMonths(parseInt(e.currentTarget.value, 10) || 1)}
                class="input-field text-base font-bold"
              />
              <div class="flex gap-2 mt-2">
                {[6, 12, 24, 36, 60].map((m) => (
                  <button
                    onClick={() => setEmiTenureMonths(m)}
                    class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 font-mono"
                  >
                    {m}m ({m / 12}y)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary Card */}
          <div class="lg:col-span-7 space-y-6">
            <div class="bg-gradient-to-br from-brand-50 to-orange-50 dark:from-neutral-900 dark:to-neutral-950 p-6 rounded-2xl border border-brand-200 dark:border-neutral-800 shadow-sm">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div class="p-4 bg-white dark:bg-black/60 rounded-xl border border-brand-100 dark:border-neutral-800">
                  <span class="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 block uppercase">
                    {currentLang() === 'ne' ? 'मासिक किस्ता (EMI)' : 'Monthly EMI'}
                  </span>
                  <span class="text-2xl font-black text-[#FF4500] mt-1 block">
                    {formatNepaliCurrency(emiResult().monthlyEmi)}
                  </span>
                  <span class="text-[10px] text-gray-400">per month</span>
                </div>

                <div class="p-4 bg-white dark:bg-black/60 rounded-xl border border-brand-100 dark:border-neutral-800">
                  <span class="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 block uppercase">
                    {currentLang() === 'ne' ? 'कुल ब्याज रकम' : 'Total Interest'}
                  </span>
                  <span class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                    {formatNepaliCurrency(emiResult().totalInterest)}
                  </span>
                  <span class="text-[10px] text-gray-400">
                    {((emiResult().totalInterest / (emiResult().totalAmount || 1)) * 100).toFixed(1)}% of total
                  </span>
                </div>

                <div class="p-4 bg-white dark:bg-black/60 rounded-xl border border-brand-100 dark:border-neutral-800">
                  <span class="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 block uppercase">
                    {currentLang() === 'ne' ? 'कुल भुक्तानी रकम' : 'Total Payment'}
                  </span>
                  <span class="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
                    {formatNepaliCurrency(emiResult().totalAmount)}
                  </span>
                  <span class="text-[10px] text-gray-400">Principal + Interest</span>
                </div>
              </div>

              {/* Progress Breakdown Bar */}
              <div class="mt-6">
                <div class="flex justify-between text-xs font-semibold mb-1 text-gray-600 dark:text-neutral-300">
                  <span>
                    Principal: {((emiPrincipal() / (emiResult().totalAmount || 1)) * 100).toFixed(0)}%
                  </span>
                  <span>
                    Interest: {((emiResult().totalInterest / (emiResult().totalAmount || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div class="w-full h-3 bg-rose-200 dark:bg-rose-950 rounded-full overflow-hidden flex">
                  <div
                    class="h-full bg-brand-500"
                    style={{
                      width: `${(emiPrincipal() / (emiResult().totalAmount || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div class="mt-6 flex justify-between items-center">
                <button
                  onClick={() => setShowSchedule(!showSchedule())}
                  class="btn-outline text-xs flex items-center gap-1.5"
                >
                  <IconReceipt class="w-3.5 h-3.5" />
                  <span>
                    {showSchedule()
                      ? (currentLang() === 'ne' ? 'तालिका लुकाउनुहोस्' : 'Hide Amortization Schedule')
                      : (currentLang() === 'ne' ? 'मासिक किस्ता तालिका हेर्नुहोस्' : 'View Monthly Amortization Table')}
                  </span>
                </button>
              </div>
            </div>

            {/* Amortization Schedule */}
            <Show when={showSchedule()}>
              <div class="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
                  <h4 class="text-xs font-bold uppercase text-gray-700 dark:text-neutral-300">
                    {currentLang() === 'ne' ? 'मासिक साँवा र ब्याज विवरण' : 'Month-by-Month Amortization Schedule'}
                  </h4>
                </div>
                <div class="max-h-72 overflow-y-auto">
                  <table class="w-full text-xs text-left">
                    <thead class="bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th class="py-2.5 px-4">Month</th>
                        <th class="py-2.5 px-4 text-right">Principal</th>
                        <th class="py-2.5 px-4 text-right">Interest</th>
                        <th class="py-2.5 px-4 text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                      <For each={emiResult().schedule}>
                        {(row) => (
                          <tr class="hover:bg-gray-50/50 dark:hover:bg-neutral-900/40">
                            <td class="py-2 px-4 font-mono font-bold">M{row.month}</td>
                            <td class="py-2 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              Rs. {row.principalPart.toLocaleString()}
                            </td>
                            <td class="py-2 px-4 text-right font-mono text-rose-500">
                              Rs. {row.interestPart.toLocaleString()}
                            </td>
                            <td class="py-2 px-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                              Rs. {row.balance.toLocaleString()}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* ------------------------------------------------------------- */}
      {/* 2. NEPALI KHATA & COMMERCIAL INTEREST */}
      {/* ------------------------------------------------------------- */}
      <Show when={activeTab() === 'interest'}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-5 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm space-y-5">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              {currentLang() === 'ne' ? 'ब्याज गणना विवरण' : 'Interest Parameters'}
            </h3>

            {/* Monthly vs Annual Rate Switch */}
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5">
                {currentLang() === 'ne' ? 'ब्याजदरको प्रकार:' : 'Rate Type:'}
              </label>
              <div class="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthlyRate(true);
                    if (interestRate() > 10) setInterestRate(2);
                  }}
                  class={`py-2 rounded-lg text-xs font-bold transition ${
                    isMonthlyRate() ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {currentLang() === 'ne' ? 'महिनाको ब्याज (नेपाली खाता)' : 'Monthly Rate (Khata)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthlyRate(false);
                    if (interestRate() < 5) setInterestRate(12);
                  }}
                  class={`py-2 rounded-lg text-xs font-bold transition ${
                    !isMonthlyRate() ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {currentLang() === 'ne' ? 'वार्षिक ब्याज (Annual Bank)' : 'Annual Rate (% p.a.)'}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'मूलधन / सावाँ (रु.):' : 'Principal Amount (Rs.):'}
              </label>
              <input
                type="number"
                min="100"
                step="1000"
                value={interestPrincipal()}
                onInput={(e) => setInterestPrincipal(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {isMonthlyRate()
                  ? (currentLang() === 'ne' ? 'प्रति महिना ब्याजदर (% per month):' : 'Monthly Rate (% per month):')
                  : (currentLang() === 'ne' ? 'वार्षिक ब्याजदर (% p.a.):' : 'Annual Interest Rate (% p.a.):')}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={interestRate()}
                onInput={(e) => setInterestRate(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
              <div class="flex gap-2 mt-2">
                {isMonthlyRate()
                  ? [1, 1.5, 2, 2.5, 3].map((r) => (
                      <button
                        onClick={() => setInterestRate(r)}
                        class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 font-mono"
                      >
                        {r}%/mo
                      </button>
                    ))
                  : [10, 12, 14, 16, 18].map((r) => (
                      <button
                        onClick={() => setInterestRate(r)}
                        class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 font-mono"
                      >
                        {r}% p.a.
                      </button>
                    ))}
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'समय अवधि (दिनहरू):' : 'Duration (Days):'}
              </label>
              <input
                type="number"
                min="1"
                value={interestDays()}
                onInput={(e) => setInterestDays(parseInt(e.currentTarget.value, 10) || 1)}
                class="input-field text-base font-bold"
              />
              <div class="flex gap-2 mt-2">
                {[15, 30, 60, 90, 180, 365].map((d) => (
                  <button
                    onClick={() => setInterestDays(d)}
                    class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 font-mono"
                  >
                    {d} days ({Math.round(d / 30)}m)
                  </button>
                ))}
              </div>
            </div>

            {/* Simple vs Compound toggle */}
            <div class="pt-2 border-t border-gray-100 dark:border-neutral-800">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800 dark:text-neutral-200">
                <input
                  type="checkbox"
                  checked={isCompound()}
                  onChange={(e) => setIsCompound(e.currentTarget.checked)}
                  class="rounded text-[#FF4500] focus:ring-[#FF4500]"
                />
                <span>{currentLang() === 'ne' ? 'चक्रवृद्धि ब्याज (Compound Interest)' : 'Enable Compound Interest'}</span>
              </label>

              <Show when={isCompound()}>
                <div class="mt-3 flex items-center gap-2">
                  <span class="text-xs text-gray-500">Frequency:</span>
                  <select
                    value={compoundFreq()}
                    onChange={(e) => setCompoundFreq(e.currentTarget.value as any)}
                    class="input-field !py-1 text-xs"
                  >
                    <option value="monthly">Monthly Compounding</option>
                    <option value="quarterly">Quarterly Compounding</option>
                    <option value="annually">Annually Compounding</option>
                  </select>
                </div>
              </Show>
            </div>
          </div>

          {/* Results Summary */}
          <div class="lg:col-span-7 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-6">
                {currentLang() === 'ne' ? 'गणना नतिजा' : 'Calculation Summary'}
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800">
                  <span class="text-xs text-gray-500 dark:text-neutral-400 block font-medium">
                    {currentLang() === 'ne' ? 'सावाँ रकम (Principal)' : 'Principal Amount'}
                  </span>
                  <span class="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
                    {formatNepaliCurrency(interestResult().principal)}
                  </span>
                </div>

                <div class="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <span class="text-xs text-rose-600 dark:text-rose-400 block font-bold">
                    {currentLang() === 'ne' ? 'कुल ब्याज रकम (Accrued Interest)' : 'Total Interest Accrued'}
                  </span>
                  <span class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                    {formatNepaliCurrency(interestResult().totalInterest)}
                  </span>
                </div>
              </div>

              <div class="mt-4 p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
                <span class="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                  {currentLang() === 'ne' ? 'कुल चुक्ता गर्नुपर्ने रकम (Total Payable)' : 'Total Amount to Settle (Principal + Interest)'}
                </span>
                <span class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block">
                  {formatNepaliCurrency(interestResult().totalPayable)}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-neutral-800 text-xs">
                <div>
                  <span class="text-gray-400 block">Daily Accrual:</span>
                  <span class="font-bold text-gray-900 dark:text-white font-mono">
                    Rs. {interestResult().dailyRate.toLocaleString()} / day
                  </span>
                </div>
                <div>
                  <span class="text-gray-400 block">Effective Annual Rate:</span>
                  <span class="font-bold text-gray-900 dark:text-white font-mono">
                    {isMonthlyRate() ? `${(interestRate() * 12).toFixed(1)}% p.a.` : `${interestRate()}% p.a.`}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-8 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span class="font-bold">Note:</span>
              <span>
                {currentLang() === 'ne'
                  ? 'नेपाली किराना तथा थोक व्यापारमा प्राय: प्रति महिना १.५% देखि २% सम्मको साधारण ब्याज चलनचल्तीमा छ।'
                  : 'Nepali informal commerce commonly charges 1.5% to 2% monthly rate calculated on 30-day cycles.'}
              </span>
            </div>
          </div>
        </div>
      </Show>

      {/* ------------------------------------------------------------- */}
      {/* 3. VAT & TDS CALCULATOR */}
      {/* ------------------------------------------------------------- */}
      <Show when={activeTab() === 'vat'}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-5 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm space-y-5">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              {currentLang() === 'ne' ? 'कर गणना विकल्पहरू' : 'Tax Configuration'}
            </h3>

            {/* Inclusive vs Exclusive Toggle */}
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5">
                {currentLang() === 'ne' ? 'भ्याट गणना विधि:' : 'Calculation Mode:'}
              </label>
              <div class="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsTaxInclusive(false)}
                  class={`py-2 rounded-lg text-xs font-bold transition ${
                    !isTaxInclusive() ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {currentLang() === 'ne' ? 'भ्याट बाहेक (Exclusive +13%)' : 'Tax Exclusive (+VAT)'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsTaxInclusive(true)}
                  class={`py-2 rounded-lg text-xs font-bold transition ${
                    isTaxInclusive() ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {currentLang() === 'ne' ? 'भ्याट सहित (Inclusive / Reverse)' : 'Tax Inclusive (Reverse)'}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {isTaxInclusive()
                  ? (currentLang() === 'ne' ? 'कुल रकम (Gross Amount with Tax):' : 'Gross Amount (Tax Included):')
                  : (currentLang() === 'ne' ? 'कर लाग्ने रकम (Taxable Base Amount):' : 'Taxable Base Amount (Excluding Tax):')}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={taxAmountInput()}
                onInput={(e) => setTaxAmountInput(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'करको दर (% Rate):' : 'Tax Rate Percentage (%):'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={taxRate()}
                onInput={(e) => setTaxRate(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                {[
                  { label: '13% VAT (Standard Nepal)', rate: 13 },
                  { label: '1.5% TDS (Goods Supply)', rate: 1.5 },
                  { label: '10% TDS (Rent/Services)', rate: 10 },
                  { label: '15% TDS (Technical Fee)', rate: 15 },
                ].map((item) => (
                  <button
                    onClick={() => setTaxRate(item.rate)}
                    class="px-2.5 py-1 text-[11px] bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 font-semibold"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div class="lg:col-span-7 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
            <div class="space-y-4">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
                {currentLang() === 'ne' ? 'कर विच्छेदन (Tax Breakdown)' : 'Tax Breakdown Invoice Summary'}
              </h3>

              <div class="p-4 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 flex justify-between items-center">
                <div>
                  <span class="text-xs text-gray-500 dark:text-neutral-400 block font-medium">
                    {currentLang() === 'ne' ? 'कर योग्य आधार रकम (Taxable Base)' : 'Taxable Base Amount (Excl. Tax)'}
                  </span>
                  <span class="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block font-mono">
                    Rs. {taxResult().baseAmount.toLocaleString()}
                  </span>
                </div>
                <span class="text-xs text-gray-400 font-mono">
                  {((taxResult().baseAmount / (taxResult().grossAmount || 1)) * 100).toFixed(1)}%
                </span>
              </div>

              <div class="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 flex justify-between items-center">
                <div>
                  <span class="text-xs text-blue-600 dark:text-blue-400 block font-bold">
                    {taxRate() === 13 ? 'VAT (13%)' : `TDS / Tax (${taxRate()}%)`}
                  </span>
                  <span class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block font-mono">
                    Rs. {taxResult().taxAmount.toLocaleString()}
                  </span>
                </div>
                <span class="text-xs text-blue-500 font-mono font-bold">
                  +{taxRate()}%
                </span>
              </div>

              <div class="p-5 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl flex justify-between items-center">
                <div>
                  <span class="text-xs text-brand-700 dark:text-brand-300 font-bold uppercase tracking-wider block">
                    {currentLang() === 'ne' ? 'कुल बिल रकम (Gross Total)' : 'Total Invoice Amount (Gross)'}
                  </span>
                  <span class="text-3xl font-black text-[#FF4500] mt-1 block font-mono">
                    Rs. {taxResult().grossAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-800 text-xs text-gray-400">
              {isTaxInclusive()
                ? 'Formula (Reverse): Base = Gross ÷ (1 + Rate) • VAT = Gross - Base'
                : 'Formula (Direct): Tax = Base × Rate • Gross = Base + Tax'}
            </div>
          </div>
        </div>
      </Show>

      {/* ------------------------------------------------------------- */}
      {/* 4. MARGIN & MARKUP CALCULATOR */}
      {/* ------------------------------------------------------------- */}
      <Show when={activeTab() === 'margin'}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-5 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm space-y-5">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              {currentLang() === 'ne' ? 'नाफा मार्जिन विकल्पहरू' : 'Margin Setup'}
            </h3>

            {/* Mode selection */}
            <div class="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl">
              <button
                type="button"
                onClick={() => setMarginMode('cost_sale')}
                class={`py-2 rounded-lg text-xs font-bold transition ${
                  marginMode() === 'cost_sale' ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm' : 'text-gray-500'
                }`}
              >
                {currentLang() === 'ne' ? 'लागत र बिक्री मूल्य' : 'Cost & Sale Price'}
              </button>
              <button
                type="button"
                onClick={() => setMarginMode('target_margin')}
                class={`py-2 rounded-lg text-xs font-bold transition ${
                  marginMode() === 'target_margin' ? 'bg-white dark:bg-black text-[#FF4500] shadow-sm' : 'text-gray-500'
                }`}
              >
                {currentLang() === 'ne' ? 'लक्ष्य नाफा मार्जिन' : 'Target Margin %'}
              </button>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                {currentLang() === 'ne' ? 'खरिद / लागत मूल्य (Cost Price):' : 'Item Cost Price (CP in Rs.):'}
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={marginCost()}
                onInput={(e) => setMarginCost(parseFloat(e.currentTarget.value) || 0)}
                class="input-field text-base font-bold"
              />
            </div>

            <Show when={marginMode() === 'cost_sale'}>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'बिक्री मूल्य (Selling Price):' : 'Selling Price (SP in Rs.):'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={marginSale()}
                  onInput={(e) => setMarginSale(parseFloat(e.currentTarget.value) || 0)}
                  class="input-field text-base font-bold"
                />
              </div>
            </Show>

            <Show when={marginMode() === 'target_margin'}>
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'चाहेको नाफा मार्जिन (% Margin):' : 'Desired Profit Margin (%):'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  value={targetMarginPercent()}
                  onInput={(e) => setTargetMarginPercent(parseFloat(e.currentTarget.value) || 1)}
                  class="input-field text-base font-bold"
                />
                <div class="flex gap-2 mt-2">
                  {[10, 15, 20, 25, 30].map((p) => (
                    <button
                      onClick={() => setTargetMarginPercent(p)}
                      class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-neutral-800 rounded font-mono"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            </Show>
          </div>

          {/* Results Summary */}
          <div class="lg:col-span-7 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
            <div class="space-y-4">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
                {currentLang() === 'ne' ? 'नाफा तथा मार्जिन नतिजा' : 'Profit & Margin Analytics'}
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <span class="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">
                    {currentLang() === 'ne' ? 'खुद नाफा (Gross Profit)' : 'Gross Profit'}
                  </span>
                  <span class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
                    Rs. {marginResult().profit.toLocaleString()}
                  </span>
                </div>

                <div class="p-4 bg-brand-50 dark:bg-neutral-900 rounded-xl border border-brand-200 dark:border-neutral-800">
                  <span class="text-xs text-brand-700 dark:text-brand-300 font-semibold block">
                    {currentLang() === 'ne' ? 'सिफारिस बिक्री मूल्य (Selling Price)' : 'Recommended Selling Price'}
                  </span>
                  <span class="text-3xl font-black text-gray-900 dark:text-white mt-1 block font-mono">
                    Rs. {marginResult().sellingPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 pt-2">
                <div class="p-4 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 text-center">
                  <span class="text-xs text-gray-500 block uppercase font-bold">
                    Profit Margin
                  </span>
                  <span class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                    {marginResult().marginPercent.toFixed(1)}%
                  </span>
                  <span class="text-[10px] text-gray-400">Profit ÷ Selling Price</span>
                </div>

                <div class="p-4 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 text-center">
                  <span class="text-xs text-gray-500 block uppercase font-bold">
                    Markup
                  </span>
                  <span class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                    {marginResult().markupPercent.toFixed(1)}%
                  </span>
                  <span class="text-[10px] text-gray-400">Profit ÷ Cost Price</span>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-800 text-xs text-gray-400">
              Tip: Margin is always calculated relative to Selling Price, whereas Markup is added directly onto Cost.
            </div>
          </div>
        </div>
      </Show>

      {/* ------------------------------------------------------------- */}
      {/* 5. CASH DRAWER COUNTER & CHANGE RETURN */}
      {/* ------------------------------------------------------------- */}
      <Show when={activeTab() === 'cash'}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Notes Counter Table */}
          <div class="lg:col-span-7 bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800">
              <div>
                <h3 class="text-sm font-bold uppercase text-gray-900 dark:text-white">
                  {currentLang() === 'ne' ? 'नेपाली नोट काउन्टर' : 'Nepali Note Denomination Counter'}
                </h3>
                <p class="text-xs text-gray-400">Enter quantity of physical notes in drawer</p>
              </div>
              <button
                onClick={clearCashCounts}
                class="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded font-medium"
              >
                Reset All
              </button>
            </div>

            <div class="space-y-2">
              <For each={NEPAL_DENOMINATIONS}>
                {(denom) => {
                  const cnt = () => counts()[denom] || 0;
                  const total = () => denom * cnt();

                  return (
                    <div class="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
                      <div class="flex items-center gap-3 w-32">
                        <span class="w-14 text-center py-1 bg-white dark:bg-black rounded-lg border font-mono font-bold text-xs shadow-xs text-gray-900 dark:text-white">
                          रु. {denom}
                        </span>
                        <span class="text-xs text-gray-400">×</span>
                      </div>

                      {/* Stepper & input */}
                      <div class="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCount(denom, cnt() - 1)}
                          class="w-7 h-7 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-neutral-800 rounded border font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={cnt()}
                          onInput={(e) => updateCount(denom, parseInt(e.currentTarget.value, 10) || 0)}
                          class="w-16 h-7 text-center font-mono font-bold text-xs rounded border bg-white dark:bg-black text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => updateCount(denom, cnt() + 1)}
                          class="w-7 h-7 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-neutral-800 rounded border font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Total for this denomination */}
                      <div class="w-32 text-right font-mono font-bold text-xs text-gray-900 dark:text-white">
                        Rs. {total().toLocaleString()}
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Reconciliation & Change Calculator */}
          <div class="lg:col-span-5 space-y-6">
            {/* Grand Total Summary */}
            <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6 rounded-2xl">
              <span class="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">
                {currentLang() === 'ne' ? 'गल्लामा कुल नगद (Counted Cash)' : 'Total Counted Cash in Drawer'}
              </span>
              <span class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block font-mono">
                {formatNepaliCurrency(cashResult().grandTotal)}
              </span>
              <span class="text-xs text-gray-500 dark:text-neutral-400 mt-1 block">
                Total physical notes: <span class="font-bold text-gray-800 dark:text-neutral-200">{cashResult().totalNotes} notes</span>
              </span>
            </div>

            {/* Expected vs Actual Discrepancy */}
            <div class="bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 space-y-3">
              <h4 class="text-xs font-bold uppercase text-gray-700 dark:text-neutral-300">
                {currentLang() === 'ne' ? 'गल्ला हिसाब मिलान (Reconciliation)' : 'Cash Drawer Reconciliation'}
              </h4>

              <div>
                <label class="block text-xs text-gray-500 dark:text-neutral-400 mb-1">
                  Expected Cash by Day Sales (रु.):
                </label>
                <input
                  type="number"
                  min="0"
                  value={expectedDrawerCash()}
                  onInput={(e) => setExpectedDrawerCash(parseFloat(e.currentTarget.value) || 0)}
                  class="input-field text-sm font-mono font-bold"
                />
              </div>

              <div class={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                cashDiscrepancy() === 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : cashDiscrepancy() > 0
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                <span>Discrepancy:</span>
                <span class="font-mono text-sm">
                  {cashDiscrepancy() === 0
                    ? 'Exact Match (रु. ०)'
                    : cashDiscrepancy() > 0
                    ? `Surplus / बढी (+Rs. ${cashDiscrepancy().toLocaleString()})`
                    : `Shortage / घटी (-Rs. ${Math.abs(cashDiscrepancy()).toLocaleString()})`}
                </span>
              </div>
            </div>

            {/* Quick Change to Return Tool */}
            <div class="bg-white dark:bg-neutral-950 p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 space-y-3">
              <h4 class="text-xs font-bold uppercase text-gray-700 dark:text-neutral-300">
                {currentLang() === 'ne' ? 'ग्राहक फिर्ता क्यालकुलेटर (Change to Return)' : 'Customer Change Return Assistant'}
              </h4>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] text-gray-500 mb-1">Bill Amount:</label>
                  <input
                    type="number"
                    value={changeBillTotal()}
                    onInput={(e) => setChangeBillTotal(parseFloat(e.currentTarget.value) || 0)}
                    class="input-field text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label class="block text-[11px] text-gray-500 mb-1">Customer Paid:</label>
                  <input
                    type="number"
                    value={changeCashPaid()}
                    onInput={(e) => setChangeCashPaid(parseFloat(e.currentTarget.value) || 0)}
                    class="input-field text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
                <span class="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {currentLang() === 'ne' ? 'फिर्ता दिनुपर्ने रकम:' : 'Change to Return:'}
                </span>
                <span class="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {formatNepaliCurrency(changeToReturn())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
