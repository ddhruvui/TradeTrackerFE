const USD = { style: 'currency', currency: 'USD' };
const moneyFormat = new Intl.NumberFormat('en-US', USD);
const signedMoneyFormat = new Intl.NumberFormat('en-US', { ...USD, signDisplay: 'exceptZero' });
const priceFormat = new Intl.NumberFormat('en-US', { ...USD, maximumFractionDigits: 4 });
const quantityFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

// A typographic minus lines up with the plus sign on gains.
const withMinus = (text) => text.replace('-', '−');

export const money = (n) => withMinus(moneyFormat.format(n));
const wholeMoneyFormat = new Intl.NumberFormat('en-US', { ...USD, maximumFractionDigits: 0 });
export const wholeMoney = (n) => withMinus(wholeMoneyFormat.format(n));
export const signedMoney = (n) => withMinus(signedMoneyFormat.format(n));
export const price = (n) => priceFormat.format(n);
// Rounded up to the cent, always two decimals: 541.3252 → $541.33. toFixed trims float
// noise first so an exact amount (80.8 × 100 = 8080.000…01) isn't pushed up a cent.
export const centsUp = (n) => money(Math.ceil(Number((n * 100).toFixed(6))) / 100);
export const qty = (n) => quantityFormat.format(n);
export const pct = (n) => withMinus(percentFormat.format(n / 100));
const percent2Format = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// Two decimals and no plus sign: 0.09%, −0.12%.
export const pct2 = (n) => withMinus(percent2Format.format(n / 100));

const signedPct2Format = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
// Two decimals with its sign: +3.42%, −0.12%, 0.00%.
export const signedPct2 = (n) => withMinus(signedPct2Format.format(n / 100));

// A share of the investment with an arrow for its direction: ↑ 10%, ↓ 2.5%.
const shareFormat = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
export const pctArrow = (n) =>
  `${n > 0 ? '↑ ' : n < 0 ? '↓ ' : ''}${shareFormat.format(Math.abs(n) / 100)}`;

// Trade dates are calendar strings; format them in UTC so the day never shifts.
const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const dateFormat = (options) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' });
const monthDay = dateFormat({ month: 'short', day: 'numeric' });
const monthDayYear = dateFormat({ month: 'short', day: 'numeric', year: 'numeric' });
const weekdayMonthDay = dateFormat({ weekday: 'short', month: 'short', day: 'numeric' });
const fullDay = dateFormat({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const monthYearFormat = dateFormat({ month: 'long', year: 'numeric' });

export const shortDate = (iso, today) =>
  (iso.slice(0, 4) === today.slice(0, 4) ? monthDay : monthDayYear).format(utc(iso));
export const fullDate = (iso) => monthDayYear.format(utc(iso));
export const weekdayDate = (iso) => weekdayMonthDay.format(utc(iso));
export const longDate = (iso) => fullDay.format(utc(iso));
export const monthYear = (iso) => monthYearFormat.format(utc(iso));
export const heldFor = (days) => (days <= 0 ? 'same day' : days === 1 ? '1 day' : `${days} days`);

// A moment, such as when the last prices were uploaded, in the viewer's own time:
// "today, 3:32 PM", "Nov 12, 3:32 PM", or "Nov 12, 2025, 3:32 PM" from another year.
// Null if it can't be read. timeZone is for the tests; the page uses the browser's.
export function stampTime(iso, today, timeZone) {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return null;
  const format = (options) => new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(at);
  const day = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(at);
  const clock = { hour: 'numeric', minute: '2-digit' };
  if (day === today) return `today, ${format(clock)}`;
  const year = day.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' };
  return format({ month: 'short', day: 'numeric', ...year, ...clock });
}

// The same moment in full, for a tooltip: "Thursday, November 12, 2026 at 3:32:22 PM EST".
export const fullTime = (iso, timeZone) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone }).format(new Date(iso));
