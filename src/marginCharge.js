// Margin charged and the final amount, shown for open trades in the transactions table.
// Worked out here in the browser only: realized profit stays as the backend calculates it.
//
// Margin interest is 6% a year over a 360-day year, rounded up to the cent:
// ROUNDUP(shares × days × entry price × 6 / 36000, 2).

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

// { amount, days, typed }. A margin typed in for the trade wins; otherwise
// interest runs from the entry date to the exit date (open trades: to today).
export function marginCharge(trade, today) {
  if (trade.margin > 0) return { amount: trade.margin, typed: true };
  const days = marginDays(trade.entryDate, trade.exitDate ?? today);
  // Integer cents keep exact cases exact: $36,000 for a day is $6.00, not $6.01.
  const cents = Math.ceil((totalCents(trade) * days * ANNUAL_RATE_PCT) / 36000);
  return { amount: cents / 100, days, typed: false };
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
