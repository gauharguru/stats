/* All money arithmetic is done in integer paise to avoid floating point
   errors; values are converted back to rupees (2 decimals) at the edges. */

export const toPaise = (rupees: number | string | null | undefined): number =>
  Math.round(Number(rupees ?? 0) * 100);

export const toRupees = (paise: number): number => Math.round(paise) / 100;

export function isValidAmount(v: unknown): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && Math.abs(toPaise(n) - n * 100) < 1e-6 && n < 1e13;
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return (tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')).trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? ones[h] + ' Hundred' : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}

/** Indian numbering: 1,23,45,678 -> One Crore Twenty Three Lakh ... */
function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(integerToWords(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (n) parts.push(threeDigits(n));
  return parts.join(' ');
}

export function amountInWords(rupees: number): string {
  const paise = toPaise(rupees);
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  let s = 'Rupees ' + integerToWords(r);
  if (p) s += ' and ' + twoDigits(p) + ' Paise';
  return s + ' Only';
}
