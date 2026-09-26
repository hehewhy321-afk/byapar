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
  adToBs,
} from '@byapar/core';
import { currentLang } from '../../services/i18n';
import {
  IconTools,
  IconReceipt,
  IconQrCode,
  IconTruck,
  IconTrendingUp,
  IconAccounts,
} from '../icons';

type UtilityTab =
  | 'units'
  | 'calendar'
  | 'qr'
  | 'fuel'
  | 'discount'
  | 'emi'
  | 'interest'
  | 'vat'
  | 'margin'
  | 'cash';

export const UtilitiesView: Component = () => {
  const [activeTab, setActiveTab] = createSignal<UtilityTab>('units');
  const [categoryGroup, setCategoryGroup] = createSignal<'daily' | 'finance'>('daily');

  // =============================================================
  // 1. UNIT & MEASURE CONVERTER STATE
  // =============================================================
  const [unitCategory, setUnitCategory] = createSignal<'weight' | 'area' | 'volume'>('weight');
  const [unitInputValue, setUnitInputValue] = createSignal<number>(1);
  const [selectedUnit, setSelectedUnit] = createSignal<string>('kg');

  // Conversion reference matrices (in base units: Grams for weight, Sq. Ft for area, Millilitres for volume)
  const weightUnits: Record<string, { label: string; toBase: number }> = {
    kg: { label: 'Kilogram (kg)', toBase: 1000 },
    gram: { label: 'Gram (g)', toBase: 1 },
    quintal: { label: 'Quintal (100 kg)', toBase: 100000 },
    ton: { label: 'Metric Ton (1,000 kg)', toBase: 1000000 },
    dharni: { label: 'Dharni (2.392 kg)', toBase: 2392 },
    pau_std: { label: 'Standard Pau (200g)', toBase: 200 },
    pau_kirana: { label: 'Kirana Pau (250g)', toBase: 250 },
    tola: { label: 'Tola (11.66g)', toBase: 11.6638 },
    muri: { label: 'Muri (~80 kg)', toBase: 80000 },
    pathi: { label: 'Pathi (~4 kg)', toBase: 4000 },
    mana: { label: 'Mana (~500g)', toBase: 500 },
  };

  const areaUnits: Record<string, { label: string; toBase: number }> = {
    ropani: { label: 'Ropani (16 Aana)', toBase: 5476 },
    aana: { label: 'Aana (4 Paisa)', toBase: 342.25 },
    paisa: { label: 'Paisa (4 Daam)', toBase: 85.5625 },
    daam: { label: 'Daam (1/4 Paisa)', toBase: 21.3906 },
    bigha: { label: 'Bigha (20 Kattha)', toBase: 72900 },
    kattha: { label: 'Kattha (20 Dhur)', toBase: 3645 },
    dhur: { label: 'Dhur (182.25 sq ft)', toBase: 182.25 },
    sqft: { label: 'Square Feet (sq ft)', toBase: 1 },
    sqm: { label: 'Square Metre (sq m)', toBase: 10.7639 },
  };

  const volumeUnits: Record<string, { label: string; toBase: number }> = {
    litre: { label: 'Litre (L)', toBase: 1000 },
    ml: { label: 'Millilitre (mL)', toBase: 1 },
    gallon: { label: 'Gallon (3.785 L)', toBase: 3785.41 },
  };

  const unitConversions = createMemo(() => {
    const val = unitInputValue() || 0;
    const cat = unitCategory();
    const map = cat === 'weight' ? weightUnits : cat === 'area' ? areaUnits : volumeUnits;
    const currentUnitMeta = map[selectedUnit()] || Object.values(map)[0];
    const baseValue = val * currentUnitMeta.toBase;

    return Object.entries(map).map(([key, meta]) => {
      const converted = baseValue / meta.toBase;
      const formatted = converted >= 1000 ? converted.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : converted.toFixed(4).replace(/\.?0+$/, '');
      return {
        key,
        label: meta.label,
        value: formatted,
        isCurrent: key === selectedUnit(),
      };
    });
  });

  // =============================================================
  // 2. NEPALI BS ⇄ AD CALENDAR CONVERTER STATE
  // =============================================================
  const [adDateInput, setAdDateInput] = createSignal<string>(new Date().toISOString().split('T')[0]);
  const [bsYearInput, setBsYearInput] = createSignal<number>(2081);
  const [bsMonthInput, setBsMonthInput] = createSignal<number>(6);
  const [bsDayInput, setBsDayInput] = createSignal<number>(11);

  // Date difference state
  const [diffDate1, setDiffDate1] = createSignal<string>(new Date().toISOString().split('T')[0]);
  const [diffDate2, setDiffDate2] = createSignal<string>('2025-04-13');

  const adConvertedResult = createMemo(() => {
    try {
      const bs = adToBs(new Date(adDateInput()));
      const d = new Date(adDateInput());
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const daysNp = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
      return {
        bsFormatted: bs.formatted,
        bsFormattedNp: bs.formattedNp,
        monthName: bs.monthName,
        monthNameNp: bs.monthNameNp,
        dayOfWeek: days[d.getDay()],
        dayOfWeekNp: daysNp[d.getDay()],
      };
    } catch {
      return null;
    }
  });

  const dateDiffResult = createMemo(() => {
    try {
      const d1 = new Date(diffDate1());
      const d2 = new Date(diffDate2());
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const months = Math.floor(totalDays / 30);
      const remainingDays = totalDays % 30;
      return { totalDays, months, remainingDays };
    } catch {
      return { totalDays: 0, months: 0, remainingDays: 0 };
    }
  });

  // =============================================================
  // 3. COUNTER QR CODE GENERATOR STATE
  // =============================================================
  const [qrType, setQrType] = createSignal<'wifi' | 'whatsapp' | 'payment' | 'text'>('wifi');
  const [wifiSsid, setWifiSsid] = createSignal('Shrestha_Guest_WiFi');
  const [wifiPass, setWifiPass] = createSignal('Welcome@2081');
  const [waPhone, setWaPhone] = createSignal('9841234567');
  const [waMessage, setWaMessage] = createSignal('Namaste! Inquiring about store inventory.');
  const [paymentPhone, setPaymentPhone] = createSignal('9841234567');
  const [paymentAmount, setPaymentAmount] = createSignal<number>(0);
  const [customText, setCustomText] = createSignal('https://byapar.app');

  const generatedQrData = createMemo(() => {
    switch (qrType()) {
      case 'wifi':
        return `WIFI:S:${wifiSsid()};T:WPA;P:${wifiPass()};;`;
      case 'whatsapp': {
        let phone = waPhone().replace(/[^0-9]/g, '');
        if (!phone.startsWith('977') && phone.length === 10) phone = '977' + phone;
        return `https://wa.me/${phone}?text=${encodeURIComponent(waMessage())}`;
      }
      case 'payment':
        return paymentAmount() > 0
          ? `fonepay://pay?merchant=${paymentPhone()}&amount=${paymentAmount()}`
          : `fonepay://pay?merchant=${paymentPhone()}`;
      case 'text':
        return customText();
    }
  });

  const qrImageUrl = createMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(generatedQrData())}`;
  });

  // =============================================================
  // 4. FUEL & DELIVERY LOGISTICS STATE
  // =============================================================
  const [deliveryDistanceKm, setDeliveryDistanceKm] = createSignal<number>(18);
  const [vehicleMileage, setVehicleMileage] = createSignal<number>(35); // 35 km/L default motorbike
  const [fuelPricePerLitre, setFuelPricePerLitre] = createSignal<number>(170); // Rs 170 / L
  const [packagesCount, setPackagesCount] = createSignal<number>(6);
  const [driverAllowance, setDriverAllowance] = createSignal<number>(150);

  const logisticsResult = createMemo(() => {
    const totalKm = deliveryDistanceKm() * 2; // round trip
    const mileage = Math.max(1, vehicleMileage());
    const litresNeeded = totalKm / mileage;
    const fuelCost = litresNeeded * fuelPricePerLitre();
    const netTripCost = fuelCost + driverAllowance();
    const pkg = Math.max(1, packagesCount());
    const costPerPackage = netTripCost / pkg;
    const suggestedDeliveryRate = Math.ceil(costPerPackage * 1.3 / 10) * 10; // 30% margin rounded to nearest 10

    return {
      roundTripKm: totalKm,
      litresNeeded: litresNeeded.toFixed(2),
      fuelCost: Math.round(fuelCost),
      netTripCost: Math.round(netTripCost),
      costPerPackage: Math.round(costPerPackage),
      suggestedRate: suggestedDeliveryRate,
    };
  });

  // =============================================================
  // 5. SMART DISCOUNT & BILL SPLITTER STATE
  // =============================================================
  const [discountMode, setDiscountMode] = createSignal<'percentage' | 'bogo' | 'split'>('percentage');
  const [origBillPrice, setOrigBillPrice] = createSignal<number>(2500);
  const [discountPercent, setDiscountPercent] = createSignal<number>(15);
  const [flatDiscountCash, setFlatDiscountCash] = createSignal<number>(100);

  // BOGO inputs
  const [buyCount, setBuyCount] = createSignal<number>(2);
  const [getCount, setGetCount] = createSignal<number>(1);
  const [singleItemCost, setSingleItemCost] = createSignal<number>(450);

  // Split bill inputs
  const [splitBillAmount, setSplitBillAmount] = createSignal<number>(3600);
  const [splitPeopleCount, setSplitPeopleCount] = createSignal<number>(4);
  const [splitTipCash, setSplitTipCash] = createSignal<number>(200);

  const discountResult = createMemo(() => {
    const price = origBillPrice();
    const pctAmt = price * (discountPercent() / 100);
    const totalSavings = pctAmt + flatDiscountCash();
    const finalAmount = Math.max(0, price - totalSavings);
    const effectivePct = price > 0 ? ((totalSavings / price) * 100).toFixed(1) : '0';
    return { finalAmount: Math.round(finalAmount), totalSavings: Math.round(totalSavings), effectivePct };
  });

  const bogoResult = createMemo(() => {
    const b = buyCount();
    const g = getCount();
    const totalUnits = b + g;
    const totalPricePaid = b * singleItemCost();
    const effectivePerItem = totalUnits > 0 ? totalPricePaid / totalUnits : 0;
    const totalWithoutDeal = totalUnits * singleItemCost();
    const totalSavings = totalWithoutDeal - totalPricePaid;
    const savingsPct = totalWithoutDeal > 0 ? ((totalSavings / totalWithoutDeal) * 100).toFixed(1) : '0';
    return {
      totalUnits,
      totalPricePaid: Math.round(totalPricePaid),
      effectivePerItem: Math.round(effectivePerItem),
      totalSavings: Math.round(totalSavings),
      savingsPct,
    };
  });

  const splitResult = createMemo(() => {
    const total = splitBillAmount() + splitTipCash();
    const count = Math.max(1, splitPeopleCount());
    const exactPerPerson = total / count;
    const roundedPerPerson = Math.ceil(exactPerPerson / 10) * 10;
    return {
      totalPayable: total,
      exactPerPerson: exactPerPerson.toFixed(2),
      roundedPerPerson,
    };
  });

  // =============================================================
  // 6. EMI CALCULATOR STATE
  // =============================================================
  const [emiPrincipal, setEmiPrincipal] = createSignal<number>(500000);
  const [emiRate, setEmiRate] = createSignal<number>(12);
  const [emiTenureMonths, setEmiTenureMonths] = createSignal<number>(24);
  const [showSchedule, setShowSchedule] = createSignal<boolean>(false);

  const emiResult = createMemo(() => {
    return calculateEmi(emiPrincipal(), emiRate(), emiTenureMonths());
  });

  // =============================================================
  // 7. NEPALI KHATA & LOAN INTEREST STATE
  // =============================================================
  const [interestPrincipal, setInterestPrincipal] = createSignal<number>(100000);
  const [interestRate, setInterestRate] = createSignal<number>(2); // 2% per month
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

  // =============================================================
  // 8. VAT & TDS STATE
  // =============================================================
  const [taxAmountInput, setTaxAmountInput] = createSignal<number>(10000);
  const [taxRate, setTaxRate] = createSignal<number>(13);
  const [isTaxInclusive, setIsTaxInclusive] = createSignal<boolean>(false);

  const taxResult = createMemo(() => {
    return calculateTax(taxAmountInput(), taxRate(), isTaxInclusive());
  });

  // =============================================================
  // 9. MARGIN & MARKUP STATE
  // =============================================================
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

  // =============================================================
  // 10. CASH DRAWER STATE
  // =============================================================
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
  const [changeBillTotal, setChangeBillTotal] = createSignal<number>(1350);
  const [changeCashPaid, setChangeCashPaid] = createSignal<number>(2000);

  const cashResult = createMemo(() => calculateDenominations(counts()));
  const cashDiscrepancy = createMemo(() => cashResult().grandTotal - expectedDrawerCash());
  const changeToReturn = createMemo(() => Math.max(0, changeCashPaid() - changeBillTotal()));

  const updateCount = (denom: number, val: number) => {
    setCounts({ ...counts(), [denom]: Math.max(0, val) });
  };

  const clearCashCounts = () => {
    const empty: Record<number, number> = {};
    for (const d of NEPAL_DENOMINATIONS) empty[d] = 0;
    setCounts(empty);
  };

  return (
    <div class="space-y-6 animate-fade-in p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-neutral-800">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-neutral-800 text-stone-700 dark:text-neutral-300 text-[11px] font-bold">
            <IconTools class="w-3.5 h-3.5 text-stone-900 dark:text-white" />
            <span>{currentLang() === 'ne' ? 'दैनिक व्यापारिक औजारहरू' : 'Daily Merchant Utilities Suite'}</span>
          </div>
          <h2 class="text-xl font-bold font-heading text-stone-900 dark:text-white mt-1">
            {currentLang() === 'ne' ? 'क्यालकुलेटर तथा दैनिक औजारहरू' : 'Calculators & Daily Utilities'}
          </h2>
          <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
            {currentLang() === 'ne'
              ? 'दैनिक नाप-तौल, क्यालेन्डर, क्युआर कोड, ढुवानी खर्च, छुट तथा ऋण र गल्ला हिसाब'
              : 'Minimal daily utilities for measures, Nepali calendar, QR generator, delivery logistics & accounting'}
          </p>
        </div>

        {/* Category Switcher: Daily Life vs Finance */}
        <div class="inline-flex p-1 bg-stone-100 dark:bg-neutral-900 rounded-xl border border-stone-200 dark:border-neutral-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setCategoryGroup('daily');
              if (['emi', 'interest', 'vat', 'margin', 'cash'].includes(activeTab())) {
                setActiveTab('units');
              }
            }}
            class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              categoryGroup() === 'daily'
                ? 'bg-white dark:bg-neutral-800 text-[#FF4500] shadow-xs font-bold'
                : 'text-stone-500 hover:text-stone-800 dark:text-neutral-400'
            }`}
          >
            <IconTools class="w-3.5 h-3.5" />
            <span>{currentLang() === 'ne' ? 'दैनिक जीवन तथा पसल' : 'Daily Life & Shop'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryGroup('finance');
              if (['units', 'calendar', 'qr', 'fuel', 'discount'].includes(activeTab())) {
                setActiveTab('emi');
              }
            }}
            class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              categoryGroup() === 'finance'
                ? 'bg-white dark:bg-neutral-800 text-[#FF4500] shadow-xs font-bold'
                : 'text-stone-500 hover:text-stone-800 dark:text-neutral-400'
            }`}
          >
            <IconAccounts class="w-3.5 h-3.5" />
            <span>{currentLang() === 'ne' ? 'वित्तीय तथा हिसाब' : 'Finance & Accounting'}</span>
          </button>
        </div>
      </div>

      {/* Segmented Tool Navigation Pills */}
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <Show when={categoryGroup() === 'daily'}>
          <button
            type="button"
            onClick={() => setActiveTab('units')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'units'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 8l9-5 9 5M6 14a3 3 0 0 0 6 0M12 14a3 3 0 0 0 6 0"/></svg>
            <span>{currentLang() === 'ne' ? 'नाप-तौल रूपान्तरण' : 'Unit Converter'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'calendar'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{currentLang() === 'ne' ? 'BS ⇄ AD क्यालेन्डर' : 'BS ⇄ AD Calendar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'qr'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <IconQrCode class="w-3.5 h-3.5" />
            <span>{currentLang() === 'ne' ? 'काउन्टर QR जेनेरेटर' : 'Counter QR Generator'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fuel')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'fuel'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <IconTruck class="w-3.5 h-3.5" />
            <span>{currentLang() === 'ne' ? 'ढुवानी तथा इन्धन' : 'Fuel & Delivery'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discount')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'discount'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span>{currentLang() === 'ne' ? 'छुट तथा बिल बाँडफाँड' : 'Discounts & Split Bill'}</span>
          </button>
        </Show>

        <Show when={categoryGroup() === 'finance'}>
          <button
            type="button"
            onClick={() => setActiveTab('emi')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'emi'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M14 10v11M12 3L2 10h20L12 3z"/></svg>
            <span>{currentLang() === 'ne' ? 'ऋण किस्ता (EMI)' : 'Loan EMI'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interest')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'interest'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
            <span>{currentLang() === 'ne' ? 'खाता ब्याज' : 'Khata Interest'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vat')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'vat'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <IconReceipt class="w-3.5 h-3.5" />
            <span>{currentLang() === 'ne' ? 'भ्याट तथा टीडीएस' : 'VAT & TDS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('margin')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'margin'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <IconTrendingUp class="w-3.5 h-3.5" />
            <span>{currentLang() === 'ne' ? 'नाफा मार्जिन' : 'Margin & Markup'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cash')}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              activeTab() === 'cash'
                ? 'bg-[#FF4500] text-white border-[#FF4500] font-bold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-stone-600 dark:text-neutral-300 border-stone-200 dark:border-neutral-800 hover:bg-orange-50 hover:text-[#FF4500]'
            }`}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
            <span>{currentLang() === 'ne' ? 'गल्ला नगद काउन्टर' : 'Cash Drawer'}</span>
          </button>
        </Show>
      </div>

      {/* =========================================================
          TAB 1: UNIT & MEASURE CONVERTER
          ========================================================= */}
      <Show when={activeTab() === 'units'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              Nepali Units & Measurement Converter
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Convert Nepali traditional grain & weight units (Dharni, Pau, Muri, Pathi, Tola), land area (Ropani, Aana, Bigha, Kattha) and liquid volume in standard English
            </p>
          </div>

          {/* Sub-category pills */}
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUnitCategory('weight');
                setSelectedUnit('kg');
              }}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                unitCategory() === 'weight'
                  ? 'bg-[#FF4500] text-white shadow-xs'
                  : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300 hover:text-[#FF4500]'
              }`}
            >
              Weight & Grains
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitCategory('area');
                setSelectedUnit('ropani');
              }}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                unitCategory() === 'area'
                  ? 'bg-[#FF4500] text-white shadow-xs'
                  : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300 hover:text-[#FF4500]'
              }`}
            >
              Store & Land Area
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitCategory('volume');
                setSelectedUnit('litre');
              }}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                unitCategory() === 'volume'
                  ? 'bg-[#FF4500] text-white shadow-xs'
                  : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300 hover:text-[#FF4500]'
              }`}
            >
              Liquid Volume
            </button>
          </div>

          {/* Input Row */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                Enter Quantity
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={unitInputValue()}
                onInput={(e) => setUnitInputValue(parseFloat(e.currentTarget.value) || 0)}
                class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800 text-stone-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                Select Unit
              </label>
              <select
                value={selectedUnit()}
                onChange={(e) => setSelectedUnit(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800 text-stone-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-stone-400 cursor-pointer"
              >
                <Show when={unitCategory() === 'weight'}>
                  <For each={Object.entries(weightUnits)}>
                    {([key, meta]) => (
                      <option value={key}>{meta.label}</option>
                    )}
                  </For>
                </Show>
                <Show when={unitCategory() === 'area'}>
                  <For each={Object.entries(areaUnits)}>
                    {([key, meta]) => (
                      <option value={key}>{meta.label}</option>
                    )}
                  </For>
                </Show>
                <Show when={unitCategory() === 'volume'}>
                  <For each={Object.entries(volumeUnits)}>
                    {([key, meta]) => (
                      <option value={key}>{meta.label}</option>
                    )}
                  </For>
                </Show>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div class="pt-2">
            <div class="text-xs font-bold text-stone-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Equivalent Values Across All Units
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <For each={unitConversions()}>
                {(item) => (
                  <div
                    class={`p-3 rounded-xl border transition ${
                      item.isCurrent
                        ? 'border-stone-900 dark:border-white bg-stone-50 dark:bg-neutral-800/80 shadow-xs'
                        : 'border-stone-100 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                    }`}
                  >
                    <div class="text-[11px] text-stone-500 dark:text-neutral-400 truncate">{item.label}</div>
                    <div class="text-base font-extrabold font-mono text-stone-900 dark:text-white mt-1 truncate">
                      {item.value}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 2: BS ⇄ AD CALENDAR & DATE DIFFERENCE
          ========================================================= */}
      <Show when={activeTab() === 'calendar'}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AD to BS Converter */}
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-4 shadow-xs">
            <div>
              <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
                {currentLang() === 'ne' ? 'अङ्ग्रेजी मितिबाट नेपाली मिति (AD to BS)' : 'English AD to Nepali BS'}
              </h3>
              <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
                Bank statement dates to Bikram Sambat conversion
              </p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                Enter Gregorian Date (AD)
              </label>
              <input
                type="date"
                value={adDateInput()}
                onInput={(e) => setAdDateInput(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800 text-stone-900 dark:text-white text-sm font-semibold"
              />
            </div>

            <Show when={adConvertedResult()}>
              <div class="p-4 rounded-xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-2">
                <div class="text-xs text-stone-500 dark:text-neutral-400">Bikram Sambat (वि.सं.) Result:</div>
                <div class="text-2xl font-black font-heading text-stone-900 dark:text-white">
                  {adConvertedResult()?.bsFormattedNp}
                </div>
                <div class="text-xs font-medium text-stone-600 dark:text-neutral-300">
                  {adConvertedResult()?.monthNameNp} ({adConvertedResult()?.monthName}) • {adConvertedResult()?.dayOfWeekNp}
                </div>
              </div>
            </Show>
          </div>

          {/* Days & Credit Period Calculator */}
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-4 shadow-xs">
            <div>
              <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
                {currentLang() === 'ne' ? 'मिति फरक र खाता दिन गणना' : 'Credit Period & Days Calculator'}
              </h3>
              <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
                Calculate elapsed credit days or days remaining until expiry
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={diffDate1()}
                  onInput={(e) => setDiffDate1(e.currentTarget.value)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800 text-xs font-semibold"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={diffDate2()}
                  onInput={(e) => setDiffDate2(e.currentTarget.value)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 bg-stone-50/50 dark:bg-neutral-800 text-xs font-semibold"
                />
              </div>
            </div>

            <div class="p-4 rounded-xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs text-stone-500">Total Duration:</div>
                  <div class="text-2xl font-black font-heading text-stone-900 dark:text-white">
                    {dateDiffResult().totalDays} <span class="text-sm font-normal text-stone-500">Days</span>
                  </div>
                </div>
                <div class="text-right text-xs text-stone-500">
                  <div>≈ {dateDiffResult().months} Months</div>
                  <div>+ {dateDiffResult().remainingDays} Days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 3: COUNTER QR CODE GENERATOR
          ========================================================= */}
      <Show when={activeTab() === 'qr'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? 'पसल काउन्टर क्युआर कोड जेनेरेटर' : 'Store Counter QR Code Generator'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Create instant scan-to-connect Shop WiFi, WhatsApp, or Payment QR codes to print or display on your counter
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Input controls */}
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrType('wifi')}
                  class={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    qrType() === 'wifi' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  WiFi
                </button>
                <button
                  type="button"
                  onClick={() => setQrType('whatsapp')}
                  class={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    qrType() === 'whatsapp' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setQrType('payment')}
                  class={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    qrType() === 'payment' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  Fonepay
                </button>
                <button
                  type="button"
                  onClick={() => setQrType('text')}
                  class={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    qrType() === 'text' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  Custom Link
                </button>
              </div>

              <Show when={qrType() === 'wifi'}>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      WiFi Network Name (SSID)
                    </label>
                    <input
                      type="text"
                      value={wifiSsid()}
                      onInput={(e) => setWifiSsid(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      WiFi Password
                    </label>
                    <input
                      type="text"
                      value={wifiPass()}
                      onInput={(e) => setWifiPass(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold font-mono"
                    />
                  </div>
                </div>
              </Show>

              <Show when={qrType() === 'whatsapp'}>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      WhatsApp Mobile Number
                    </label>
                    <input
                      type="text"
                      value={waPhone()}
                      onInput={(e) => setWaPhone(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Default Message
                    </label>
                    <input
                      type="text"
                      value={waMessage()}
                      onInput={(e) => setWaMessage(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                </div>
              </Show>

              <Show when={qrType() === 'payment'}>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Merchant ID / Mobile Number
                    </label>
                    <input
                      type="text"
                      value={paymentPhone()}
                      onInput={(e) => setPaymentPhone(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Lock Bill Amount (Optional, 0 for open)
                    </label>
                    <input
                      type="number"
                      value={paymentAmount()}
                      onInput={(e) => setPaymentAmount(parseFloat(e.currentTarget.value) || 0)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold font-mono"
                    />
                  </div>
                </div>
              </Show>

              <Show when={qrType() === 'text'}>
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Store Website / Google Maps / Menu URL
                  </label>
                  <input
                    type="text"
                    value={customText()}
                    onInput={(e) => setCustomText(e.currentTarget.value)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
              </Show>
            </div>

            {/* QR Preview Card */}
            <div class="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 text-center">
              <div class="bg-white p-3 rounded-2xl shadow-sm border border-stone-200">
                <img src={qrImageUrl()} alt="Generated QR" class="w-48 h-48 object-contain" />
              </div>
              <div class="mt-3 font-bold text-xs text-stone-800 dark:text-neutral-200 uppercase tracking-wider">
                Scan with any Smartphone Camera
              </div>
              <a
                href={qrImageUrl()}
                download="store_qr.png"
                target="_blank"
                rel="noreferrer"
                class="mt-3 px-4 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition"
              >
                Download / Print QR
              </a>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 4: FUEL & DELIVERY LOGISTICS CALCULATOR
          ========================================================= */}
      <Show when={activeTab() === 'fuel'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? 'ढुवानी तथा इन्धन खर्च क्यालकुलेटर' : 'Delivery & Fuel Cost Calculator'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Calculate exact delivery fuel consumption, per-package expense, and suggested customer delivery rate
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  One-way Delivery Distance (km)
                </label>
                <input
                  type="number"
                  value={deliveryDistanceKm()}
                  onInput={(e) => setDeliveryDistanceKm(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Vehicle Mileage (km per Litre)
                </label>
                <div class="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setVehicleMileage(35)}
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-[#FF4500] border border-orange-200 hover:bg-orange-100"
                  >
                    Motorcycle (35 km/L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleMileage(12)}
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-[#FF4500] border border-orange-200 hover:bg-orange-100"
                  >
                    Van / Pickup (12 km/L)
                  </button>
                </div>
                <input
                  type="number"
                  value={vehicleMileage()}
                  onInput={(e) => setVehicleMileage(parseFloat(e.currentTarget.value) || 1)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Fuel Price (रु / Litre)
                  </label>
                  <input
                    type="number"
                    value={fuelPricePerLitre()}
                    onInput={(e) => setFuelPricePerLitre(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Orders / Packages
                  </label>
                  <input
                    type="number"
                    value={packagesCount()}
                    onInput={(e) => setPackagesCount(parseFloat(e.currentTarget.value) || 1)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Results card */}
            <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-4">
              <div>
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Total Round Trip Cost:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white mt-1">
                  रु {logisticsResult().netTripCost.toLocaleString()}
                </div>
                <div class="text-xs text-stone-500 mt-0.5">
                  ({logisticsResult().roundTripKm} km roundtrip • {logisticsResult().litresNeeded} Litres fuel)
                </div>
              </div>

              <div class="pt-4 border-t border-stone-200 dark:border-neutral-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-stone-500">Cost Per Package:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {logisticsResult().costPerPackage}
                  </div>
                </div>
                <div>
                  <span class="text-stone-500">Suggested Delivery Fee:</span>
                  <div class="font-bold text-sm text-emerald-600">
                    रु {logisticsResult().suggestedRate} / order
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 5: SMART DISCOUNT & BILL SPLITTER
          ========================================================= */}
      <Show when={activeTab() === 'discount'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? 'छुट, अफर तथा बिल बाँडफाँड' : 'Discounts, Deals & Split Bill'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Calculate percentage & cash discounts, Buy X Get Y Free unit costs, or split restaurant/khata bills
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDiscountMode('percentage')}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                discountMode() === 'percentage' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              Percentage & Cash Discount
            </button>
            <button
              type="button"
              onClick={() => setDiscountMode('bogo')}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                discountMode() === 'bogo' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              Buy X Get Y Free Deal
            </button>
            <button
              type="button"
              onClick={() => setDiscountMode('split')}
              class={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                discountMode() === 'split' ? 'bg-[#FF4500] text-white shadow-xs' : 'bg-orange-50 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              Split Bill Among People
            </button>
          </div>

          <Show when={discountMode() === 'percentage'}>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Original Price (रु)
                  </label>
                  <input
                    type="number"
                    value={origBillPrice()}
                    onInput={(e) => setOrigBillPrice(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      value={discountPercent()}
                      onInput={(e) => setDiscountPercent(parseFloat(e.currentTarget.value) || 0)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Flat Coupon (रु)
                    </label>
                    <input
                      type="number"
                      value={flatDiscountCash()}
                      onInput={(e) => setFlatDiscountCash(parseFloat(e.currentTarget.value) || 0)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-2">
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Final Payable Amount:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white">
                  रु {discountResult().finalAmount.toLocaleString()}
                </div>
                <div class="text-xs text-emerald-600 font-bold">
                  Saved रु {discountResult().totalSavings} ({discountResult().effectivePct}% effective discount)
                </div>
              </div>
            </div>
          </Show>

          <Show when={discountMode() === 'bogo'}>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Buy Quantity
                    </label>
                    <input
                      type="number"
                      value={buyCount()}
                      onInput={(e) => setBuyCount(parseInt(e.currentTarget.value, 10) || 1)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Get Free Quantity
                    </label>
                    <input
                      type="number"
                      value={getCount()}
                      onInput={(e) => setGetCount(parseInt(e.currentTarget.value, 10) || 0)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Regular Unit Price (रु)
                  </label>
                  <input
                    type="number"
                    value={singleItemCost()}
                    onInput={(e) => setSingleItemCost(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
              </div>

              <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-2">
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Effective Price Per Piece:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white">
                  रु {bogoResult().effectivePerItem} <span class="text-xs font-normal text-stone-400">/ piece</span>
                </div>
                <div class="text-xs text-emerald-600 font-bold">
                  Total for {bogoResult().totalUnits} pieces: रु {bogoResult().totalPricePaid} (Save {bogoResult().savingsPct}%)
                </div>
              </div>
            </div>
          </Show>

          <Show when={discountMode() === 'split'}>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Total Bill Amount (रु)
                  </label>
                  <input
                    type="number"
                    value={splitBillAmount()}
                    onInput={(e) => setSplitBillAmount(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Number of People
                    </label>
                    <input
                      type="number"
                      value={splitPeopleCount()}
                      onInput={(e) => setSplitPeopleCount(parseInt(e.currentTarget.value, 10) || 1)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                      Extra Tip (रु)
                    </label>
                    <input
                      type="number"
                      value={splitTipCash()}
                      onInput={(e) => setSplitTipCash(parseFloat(e.currentTarget.value) || 0)}
                      class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-2">
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Each Person Pays:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white">
                  रु {splitResult().roundedPerPerson}
                </div>
                <div class="text-xs text-stone-500">
                  Exact: रु {splitResult().exactPerPerson} each (Total: रु {splitResult().totalPayable})
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* =========================================================
          TAB 6: LOAN EMI CALCULATOR
          ========================================================= */}
      <Show when={activeTab() === 'emi'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? 'ऋण किस्ता क्यालकुलेटर (Bank & Cooperative EMI)' : 'Loan EMI Calculator'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Standard commercial bank & cooperative reducing-balance loan scheduler
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Loan Principal (रु)
                </label>
                <input
                  type="number"
                  value={emiPrincipal()}
                  onInput={(e) => setEmiPrincipal(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    value={emiRate()}
                    onInput={(e) => setEmiRate(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    value={emiTenureMonths()}
                    onInput={(e) => setEmiTenureMonths(parseInt(e.currentTarget.value, 10) || 1)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-4">
              <div>
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Monthly EMI Installment:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white mt-1">
                  रु {emiResult().monthlyEmi.toLocaleString()}
                </div>
              </div>

              <div class="pt-4 border-t border-stone-200 dark:border-neutral-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-stone-500">Total Interest:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {emiResult().totalInterest.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span class="text-stone-500">Total Repayment:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {emiResult().totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 7: NEPALI KHATA & LOAN INTEREST
          ========================================================= */}
      <Show when={activeTab() === 'interest'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? 'नेपाली खाता ब्याज क्यालकुलेटर (सयकडा / मासिक)' : 'Nepali Khata & Loan Interest'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Traditional Nepali monthly interest rate (सयकडा २/३ रुपैयाँ) and daybook interest calculations
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Principal Amount (रु)
                </label>
                <input
                  type="number"
                  value={interestPrincipal()}
                  onInput={(e) => setInterestPrincipal(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Rate (% / Month)
                  </label>
                  <input
                    type="number"
                    value={interestRate()}
                    onInput={(e) => setInterestRate(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    value={interestDays()}
                    onInput={(e) => setInterestDays(parseInt(e.currentTarget.value, 10) || 1)}
                    class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-4">
              <div>
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Total Interest Accrued:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white mt-1">
                  रु {interestResult().totalInterest.toLocaleString()}
                </div>
              </div>

              <div class="pt-4 border-t border-stone-200 dark:border-neutral-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-stone-500">Per Day Interest:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {interestResult().dailyRate.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span class="text-stone-500">Total Total Receivable:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {interestResult().totalPayable.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 8: VAT & TDS
          ========================================================= */}
      <Show when={activeTab() === 'vat'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? '१३% भ्याट तथा टीडीएस क्यालकुलेटर' : '13% VAT & TDS Calculator'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Nepal Inland Revenue Department (IRD) compliant 13% tax extraction and addition
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Amount (रु)
                </label>
                <input
                  type="number"
                  value={taxAmountInput()}
                  onInput={(e) => setTaxAmountInput(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>

              <div class="flex items-center gap-4 text-xs font-semibold">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="vatMode"
                    checked={!isTaxInclusive()}
                    onChange={() => setIsTaxInclusive(false)}
                  />
                  <span>Exclusive (+ 13% VAT)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="vatMode"
                    checked={isTaxInclusive()}
                    onChange={() => setIsTaxInclusive(true)}
                  />
                  <span>Inclusive (Extract VAT)</span>
                </label>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-4">
              <div>
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                  {isTaxInclusive() ? 'Base Taxable Amount:' : 'Gross Final Amount:'}
                </div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white mt-1">
                  रु {(isTaxInclusive() ? taxResult().baseAmount : taxResult().grossAmount).toLocaleString()}
                </div>
              </div>

              <div class="pt-4 border-t border-stone-200 dark:border-neutral-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-stone-500">13% VAT Component:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {taxResult().taxAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span class="text-stone-500">1.5% TDS Component:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    रु {(taxResult().baseAmount * 0.015).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 9: MARGIN & MARKUP
          ========================================================= */}
      <Show when={activeTab() === 'margin'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div>
            <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
              {currentLang() === 'ne' ? 'नाफा मार्जिन तथा मार्कअप क्यालकुलेटर' : 'Profit Margin & Markup Calculator'}
            </h3>
            <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
              Calculate profit margin %, markup %, or target selling price for goods
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Purchase Cost Price (रु)
                </label>
                <input
                  type="number"
                  value={marginCost()}
                  onInput={(e) => setMarginCost(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-stone-700 dark:text-neutral-300 mb-1">
                  Selling Price (रु)
                </label>
                <input
                  type="number"
                  value={marginSale()}
                  onInput={(e) => setMarginSale(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-neutral-700 text-xs font-semibold"
                />
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-4">
              <div>
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Net Profit:</div>
                <div class="text-3xl font-black font-heading text-emerald-600 mt-1">
                  रु {marginResult().profit.toLocaleString()}
                </div>
              </div>

              <div class="pt-4 border-t border-stone-200 dark:border-neutral-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-stone-500">Profit Margin:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    {marginResult().marginPercent.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span class="text-stone-500">Markup on Cost:</span>
                  <div class="font-bold text-sm text-stone-800 dark:text-neutral-200">
                    {marginResult().markupPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* =========================================================
          TAB 10: CASH DRAWER & CHANGE RETURN
          ========================================================= */}
      <Show when={activeTab() === 'cash'}>
        <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-stone-200 dark:border-neutral-800 p-6 space-y-6 shadow-xs">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading font-bold text-base text-stone-900 dark:text-white">
                {currentLang() === 'ne' ? 'गल्ला नगद काउन्टर तथा फिर्ता' : 'Cash Drawer Counter & Change Return'}
              </h3>
              <p class="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
                Physical Nepali banknote counting and quick customer change calculation
              </p>
            </div>
            <button
              type="button"
              onClick={clearCashCounts}
              class="px-3 py-1 text-xs text-stone-500 hover:text-stone-900 border border-stone-200 rounded-lg"
            >
              Clear Counts
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div class="space-y-2">
              <For each={NEPAL_DENOMINATIONS}>
                {(d) => (
                  <div class="flex items-center justify-between text-xs py-1">
                    <span class="font-bold font-mono text-stone-800 dark:text-neutral-200 w-16">
                      रु {d}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={counts()[d] || 0}
                      onInput={(e) => updateCount(d, parseInt(e.currentTarget.value, 10) || 0)}
                      class="w-20 px-2 py-1 rounded-lg border border-stone-200 text-xs font-mono text-center"
                    />
                    <span class="w-24 text-right font-mono text-stone-500">
                      = रु {((counts()[d] || 0) * d).toLocaleString()}
                    </span>
                  </div>
                )}
              </For>
            </div>

            <div class="p-6 rounded-2xl bg-stone-50 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/60 space-y-4">
              <div>
                <div class="text-xs text-stone-500 uppercase tracking-wider font-semibold">Total Physical Cash in Drawer:</div>
                <div class="text-3xl font-black font-heading text-stone-900 dark:text-white mt-1">
                  रु {cashResult().grandTotal.toLocaleString()}
                </div>
                <div class="text-xs text-stone-500 mt-0.5">
                  ({cashResult().totalNotes} Banknotes)
                </div>
              </div>

              <div class="pt-4 border-t border-stone-200 dark:border-neutral-700 space-y-3 text-xs">
                <div>
                  <span class="text-stone-500">Quick Change Return Helper:</span>
                  <div class="grid grid-cols-2 gap-2 mt-1.5">
                    <input
                      type="number"
                      placeholder="Bill Total (रु)"
                      value={changeBillTotal()}
                      onInput={(e) => setChangeBillTotal(parseFloat(e.currentTarget.value) || 0)}
                      class="px-2 py-1 rounded border border-stone-200 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Cash Given (रु)"
                      value={changeCashPaid()}
                      onInput={(e) => setChangeCashPaid(parseFloat(e.currentTarget.value) || 0)}
                      class="px-2 py-1 rounded border border-stone-200 text-xs"
                    />
                  </div>
                  <div class="mt-2 text-sm font-bold text-stone-900 dark:text-white">
                    Return to Customer: <span class="text-emerald-600">रु {changeToReturn()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
