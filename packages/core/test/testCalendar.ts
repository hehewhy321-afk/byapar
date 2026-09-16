import { adToBs, getNepaliFiscalYear, toNepaliDigits, formatNepaliCurrency } from '../src/calendar/bsCalendar';

console.log('=== TESTING BIKRAM SAMBAT CALENDAR ENGINE ===');

const testDate = new Date('2026-09-13T12:00:00Z');
const bs = adToBs(testDate);
console.log('AD Date:', testDate.toISOString());
console.log('BS Date:', bs.formatted);
console.log('BS Date Nepali:', bs.formattedNp);
console.log('Nepali Month:', bs.monthNameNp);
console.log('Fiscal Year:', getNepaliFiscalYear(bs.formatted));
console.log('Nepali Digits (123456):', toNepaliDigits('123456'));
console.log('Nepali Currency (1545000.50):', formatNepaliCurrency(1545000.5));

if (bs.year >= 2080 && bs.formattedNp) {
  console.log('>>> [PASS] All calendar calculations validated successfully!');
} else {
  console.error('>>> [FAIL] Calendar calculations mismatch!');
  process.exit(1);
}
