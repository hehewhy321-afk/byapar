/**
 * BYAPAR (व्यापार) - Financial & Business Calculation Utilities
 * Powers EMI, Nepali Khata Interest, VAT (Inclusive/Exclusive), Margin & Cash Calculators
 */

export interface EmiScheduleItem {
  month: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

export interface EmiResult {
  monthlyEmi: number;
  totalInterest: number;
  totalAmount: number;
  totalPayment: number;
  schedule: EmiScheduleItem[];
}

/**
 * Calculates standard Equated Monthly Installment (EMI)
 * Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): EmiResult {
  if (principal <= 0 || tenureMonths <= 0) {
    return { monthlyEmi: 0, totalInterest: 0, totalAmount: 0, totalPayment: 0, schedule: [] };
  }

  if (annualRatePercent <= 0) {
    const monthlyEmi = principal / tenureMonths;
    const schedule: EmiScheduleItem[] = [];
    let rem = principal;
    for (let m = 1; m <= tenureMonths; m++) {
      rem -= monthlyEmi;
      schedule.push({
        month: m,
        principalPart: Math.round(monthlyEmi),
        interestPart: 0,
        balance: Math.max(0, Math.round(rem)),
      });
    }
    return {
      monthlyEmi: Math.round(monthlyEmi),
      totalInterest: 0,
      totalAmount: principal,
      totalPayment: principal,
      schedule,
    };
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const monthlyEmi = (principal * monthlyRate * factor) / (factor - 1);
  const totalAmount = monthlyEmi * tenureMonths;
  const totalInterest = totalAmount - principal;

  // Generate schedule
  const schedule: EmiScheduleItem[] = [];
  let remainingBalance = principal;

  for (let m = 1; m <= tenureMonths; m++) {
    const interestPart = remainingBalance * monthlyRate;
    const principalPart = monthlyEmi - interestPart;
    remainingBalance -= principalPart;

    schedule.push({
      month: m,
      principalPart: Math.round(principalPart),
      interestPart: Math.round(interestPart),
      balance: Math.max(0, Math.round(remainingBalance)),
    });
  }

  const roundedTotal = Math.round(totalAmount);
  return {
    monthlyEmi: Math.round(monthlyEmi),
    totalInterest: Math.round(totalInterest),
    totalAmount: roundedTotal,
    totalPayment: roundedTotal,
    schedule,
  };
}

export interface InterestResult {
  principal: number;
  ratePercent: number;
  days: number;
  monthsEquivalent: number;
  totalInterest: number;
  totalPayable: number;
  totalAmount: number;
  dailyRate: number;
  dailyInterest: number;
}

/**
 * Calculates Nepali Business/Khata Interest & Commercial Loan Interest
 * Supports:
 * - Monthly Rate ("महिनाको ब्याज" e.g., 1.5% or 2% per month common in Kirana/Wholesale)
 * - Annual Rate (Standard commercial banking rate e.g., 10.5% p.a.)
 * - Simple Interest vs Compound Interest
 */
export function calculateInterest(
  principal: number,
  ratePercent: number,
  days: number,
  options?: {
    isMonthlyRate?: boolean; // true = rate is per month (default in Nepali informal trade)
    isCompound?: boolean;
    compoundFrequency?: 'monthly' | 'quarterly' | 'annually';
  }
): InterestResult {
  if (principal <= 0 || days <= 0 || ratePercent <= 0) {
    return {
      principal,
      ratePercent,
      days,
      monthsEquivalent: Number((days / 30).toFixed(2)),
      totalInterest: 0,
      totalPayable: principal,
      totalAmount: principal,
      dailyRate: 0,
      dailyInterest: 0,
    };
  }

  const isMonthly = options?.isMonthlyRate ?? false;
  // Convert rate to daily rate
  const annualRate = isMonthly ? ratePercent * 12 : ratePercent;
  const dailyRateFraction = annualRate / 100 / 365;

  let totalInterest = 0;

  if (options?.isCompound) {
    let n = 12; // compounding frequency per year
    if (options.compoundFrequency === 'quarterly') n = 4;
    else if (options.compoundFrequency === 'annually') n = 1;

    const tYears = days / 365;
    const r = annualRate / 100;
    const amount = principal * Math.pow(1 + r / n, n * tYears);
    totalInterest = amount - principal;
  } else {
    // Simple Interest (most common in Nepali Khata)
    totalInterest = principal * dailyRateFraction * days;
  }

  const totalPayable = principal + totalInterest;
  const roundedPayable = Math.round(totalPayable * 100) / 100;
  const roundedDaily = Math.round(principal * dailyRateFraction * 100) / 100;

  return {
    principal,
    ratePercent,
    days,
    monthsEquivalent: Number((days / 30).toFixed(2)),
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: roundedPayable,
    totalAmount: roundedPayable,
    dailyRate: roundedDaily,
    dailyInterest: roundedDaily,
  };
}

export interface TaxResult {
  inputAmount: number;
  isInclusive: boolean;
  taxRatePercent: number;
  baseAmount: number;
  taxAmount: number;
  grossAmount: number;
  finalAmount: number;
}

/**
 * Calculates VAT (13% Nepal default) or TDS with Inclusive & Exclusive toggle
 */
export function calculateTax(
  amount: number,
  taxRatePercent: number = 13,
  isInclusive: boolean = false
): TaxResult {
  if (amount <= 0 || taxRatePercent <= 0) {
    return {
      inputAmount: amount,
      isInclusive,
      taxRatePercent,
      baseAmount: amount,
      taxAmount: 0,
      grossAmount: amount,
      finalAmount: amount,
    };
  }

  const rate = taxRatePercent / 100;

  if (isInclusive) {
    // Amount is already gross (includes VAT)
    // Gross = Base * (1 + rate) => Base = Gross / (1 + rate)
    const baseAmount = amount / (1 + rate);
    const taxAmount = amount - baseAmount;
    const roundedBase = Math.round(baseAmount * 100) / 100;
    return {
      inputAmount: amount,
      isInclusive: true,
      taxRatePercent,
      baseAmount: roundedBase,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grossAmount: amount,
      finalAmount: roundedBase,
    };
  } else {
    // Amount is Taxable Base (excludes VAT)
    const taxAmount = amount * rate;
    const grossAmount = amount + taxAmount;
    const roundedGross = Math.round(grossAmount * 100) / 100;
    return {
      inputAmount: amount,
      isInclusive: false,
      taxRatePercent,
      baseAmount: amount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grossAmount: roundedGross,
      finalAmount: roundedGross,
    };
  }
}

export interface MarginResult {
  costPrice: number;
  sellingPrice: number;
  profit: number;
  marginPercent: number;
  markupPercent: number;
}

/**
 * Calculates Gross Profit, Margin %, and Markup %
 */
export function calculateMargin(costPrice: number, sellingPrice: number): MarginResult {
  const profit = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  const markupPercent = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  return {
    costPrice,
    sellingPrice,
    profit: Math.round(profit * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
    markupPercent: Math.round(markupPercent * 100) / 100,
  };
}

/**
 * Calculates required Selling Price for a desired Profit Margin %
 */
export function calculateTargetSellingPrice(
  costPrice: number,
  targetMarginPercent: number
): number {
  if (costPrice <= 0 || targetMarginPercent >= 100) return costPrice;
  const sellingPrice = costPrice / (1 - targetMarginPercent / 100);
  return Math.round(sellingPrice * 100) / 100;
}

export interface DenominationItem {
  denomination: number;
  count: number;
  total: number;
}

export interface DenominationResult {
  grandTotal: number;
  totalNotes: number;
  breakdown: DenominationItem[];
}

export const NEPAL_DENOMINATIONS = [1000, 500, 100, 50, 20, 10, 5, 2, 1] as const;

/**
 * Calculates total currency in cash drawer from denomination counts
 */
export function calculateDenominations(
  counts: Record<number, number>
): DenominationResult {
  let grandTotal = 0;
  let totalNotes = 0;
  const breakdown: DenominationItem[] = [];

  for (const denom of NEPAL_DENOMINATIONS) {
    const count = Math.max(0, counts[denom] || 0);
    const total = denom * count;
    grandTotal += total;
    totalNotes += count;
    breakdown.push({ denomination: denom, count, total });
  }

  return { grandTotal, totalNotes, breakdown };
}
