/**
 * BYAPAR (व्यापार) - Bikram Sambat (BS) & Nepali Financial Calendar Engine
 * Accurate mapping between Gregorian (AD) and Bikram Sambat (BS)
 */

export const NEPALI_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मङ्सिर', 'पुस', 'माघ', 'फागुन', 'चैत'
] as const;

export const NEPALI_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
] as const;

export const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

// Calendar reference data for modern years (2075 BS - 2085 BS)
// [Year, Month Day Counts from Baisakh to Chaitra, Reference AD Epoch in ms for Baisakh 1]
const BS_CALENDAR_DATA: Record<number, number[]> = {
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
};

// Anchor: 2081 Baisakh 1 = 2024 April 13
const ANCHOR_BS_YEAR = 2081;
const ANCHOR_AD_DATE = new Date(Date.UTC(2024, 3, 13)); // 2024-04-13 UTC

/**
 * Convert an AD Date instance to Bikram Sambat Date Object
 */
export function adToBs(dateInput: Date | string): {
  year: number;
  month: number;
  day: number;
  formatted: string;
  formattedNp: string;
  monthName: string;
  monthNameNp: string;
} {
  const adDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const targetUtc = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
  const anchorUtc = ANCHOR_AD_DATE.getTime();

  let diffDays = Math.round((targetUtc - anchorUtc) / (1000 * 60 * 60 * 24));

  let bsYear = ANCHOR_BS_YEAR;
  let bsMonth = 1;
  let bsDay = 1;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const monthDays = BS_CALENDAR_DATA[bsYear]?.[bsMonth - 1] ?? 30;
      if (diffDays >= monthDays) {
        diffDays -= monthDays;
        bsMonth++;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      } else {
        bsDay += diffDays;
        diffDays = 0;
      }
    }
  } else {
    while (diffDays < 0) {
      bsMonth--;
      if (bsMonth < 1) {
        bsMonth = 12;
        bsYear--;
      }
      const monthDays = BS_CALENDAR_DATA[bsYear]?.[bsMonth - 1] ?? 30;
      if (Math.abs(diffDays) >= monthDays) {
        diffDays += monthDays;
      } else {
        bsDay = monthDays + diffDays + 1;
        diffDays = 0;
      }
    }
  }

  const mm = String(bsMonth).padStart(2, '0');
  const dd = String(bsDay).padStart(2, '0');
  const formatted = `${bsYear}-${mm}-${dd}`;
  const formattedNp = toNepaliDigits(`${bsYear}/${mm}/${dd}`);

  return {
    year: bsYear,
    month: bsMonth,
    day: bsDay,
    formatted,
    formattedNp,
    monthName: NEPALI_MONTHS_EN[bsMonth - 1] ?? 'Baisakh',
    monthNameNp: NEPALI_MONTHS_NP[bsMonth - 1] ?? 'बैशाख',
  };
}

/**
 * Calculates the Nepal Fiscal Year (आ.व.) for a given BS date.
 * Fiscal year begins on Shrawan 1 (Month 4) and concludes on Ashadh end (Month 3).
 * Example: 2081-05-28 is in "2081/82". 2081-02-10 is in "2080/81".
 */
export function getNepaliFiscalYear(bsDateString: string): string {
  const [yearStr, monthStr] = bsDateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (month >= 4) {
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}/${nextYearShort}`;
  } else {
    const currentYearShort = String(year).slice(-2);
    return `${year - 1}/${currentYearShort}`;
  }
}

/**
 * Converts English ASCII digits (0-9) to Nepali Devanagari digits (०-९)
 */
export function toNepaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => NEPALI_DIGITS[parseInt(d, 10)]);
}

/**
 * Formats a currency amount into the South Asian format (lakhs & crores)
 * e.g., 1234567.89 -> "12,34,567.89"
 */
export function formatNepaliCurrency(amount: number, includeSymbol = true): string {
  const parts = amount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = (isNegative ? '-' : '') + formattedInt + '.' + decimalPart;

  return includeSymbol ? `रु. ${result}` : result;
}
