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
export const signedMoney = (n) => withMinus(signedMoneyFormat.format(n));
export const price = (n) => priceFormat.format(n);
export const qty = (n) => quantityFormat.format(n);
export const pct = (n) => withMinus(percentFormat.format(n / 100));

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
