// Margin charged and the final amount, shown for open trades in the transactions table.
// Worked out here in the browser only: realized profit stays as the backend calculates it.
//
// Margin interest is 6% a year over a 360-day year, charged per day and rounded up to
// whole dollars: days × ROUNDUP(total × 6 / 36000, 0), where total = shares × entry price.

const ANNUAL_RATE_PCT = 6;
const DAY_MS = 86_400_000;
const toUTC = (iso) => Date.parse(`${iso}T00:00:00Z`);

// The position's value at entry, in whole cents (shares can be fractional).
const totalCents = (trade) => Math.round(trade.quantity * trade.entryPrice * 100);
export const tradeTotal = (trade) => totalCents(trade) / 100;

// Days on margin, counting the first and last day: bought today = 1, yesterday = 2.
export function marginDays(entryDate, endDate) {
  return Math.max(1, Math.round((toUTC(endDate) - toUTC(entryDate)) / DAY_MS) + 1);
}

// { amount, days, perDay, typed }. A margin typed in for the trade wins; otherwise
// interest runs from the entry date to the exit date (open trades: to today).
export function marginCharge(trade, today) {
  if (trade.margin > 0) return { amount: trade.margin, typed: true };
  const days = marginDays(trade.entryDate, trade.exitDate ?? today);
  // Integer cents keep exact cases exact: $36,000 is $6 a day, not $7.
  const perDay = Math.ceil((totalCents(trade) * ANNUAL_RATE_PCT) / (36000 * 100));
  return { amount: days * perDay, days, perDay, typed: false };
}

// The final amount per share: a buy cost you (total + margin) ÷ shares, a short
// leaves you (total − margin) ÷ shares.
export function finalPerShare(trade, charged) {
  const chargedCents = Math.round(charged * 100);
  const cents = trade.side === 'short' ? totalCents(trade) - chargedCents : totalCents(trade) + chargedCents;
  return cents / 100 / trade.quantity;
}

// How far the final amount per share is from the entry price, in %:
// (final − entry) × 100 / entry. Positive for a buy (margin adds cost), negative for a short.
export const finalChangePct = (trade, finalPrice) =>
  ((finalPrice - trade.entryPrice) * 100) / trade.entryPrice;
