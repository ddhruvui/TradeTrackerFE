import { marginCharge } from './marginCharge.js';

// Open trades sorted by ticker A→Z (buys before shorts, newest entry first within each),
// then grouped by ticker and side. Buys and shorts of one ticker are averaged separately.
const newestFirst = (a, b) => (a < b ? 1 : a > b ? -1 : 0);
const createdMs = (trade) => (trade.createdAt ? new Date(trade.createdAt).getTime() : 0);

export function sortOpenByTicker(trades) {
  return [...trades].sort(
    (a, b) =>
      a.symbol.localeCompare(b.symbol) ||
      (a.side === b.side ? 0 : a.side === 'buy' ? -1 : 1) ||
      newestFirst(a.entryDate, b.entryDate) ||
      createdMs(b) - createdMs(a),
  );
}

// Share-weighted averages over a group's lots: the entry price (avgValue) and the final
// amount per share after margin charged (finalAvg), worked out in whole cents.
function averages(trades, today) {
  let shares = 0;
  let totalCents = 0;
  let finalCents = 0;
  for (const trade of trades) {
    const cents = Math.round(trade.quantity * trade.entryPrice * 100);
    const charged = Math.round(marginCharge(trade, today).amount * 100);
    shares += trade.quantity;
    totalCents += cents;
    finalCents += trade.side === 'short' ? cents - charged : cents + charged;
  }
  return { shares, avgValue: totalCents / 100 / shares, finalAvg: finalCents / 100 / shares };
}

// [{ symbol, side, trades, shares, avgValue, finalAvg }], in display order.
export function groupOpenTrades(trades, today) {
  const groups = [];
  for (const trade of sortOpenByTicker(trades)) {
    const last = groups.at(-1);
    if (last && last.symbol === trade.symbol && last.side === trade.side) last.trades.push(trade);
    else groups.push({ symbol: trade.symbol, side: trade.side, trades: [trade] });
  }
  return groups.map((group) => ({ ...group, ...averages(group.trades, today) }));
}

// Exit targets from the Final avg amt as shown (rounded up to the cent):
// a buy aims above it, rounded up; a short aims below it, rounded down.
// Buy 2%: roundup(1.02 × final avg, 2). Short 2%: rounddown(0.98 × final avg, 2).
export const TARGET_PCTS = [2, 5, 6];

export function targetPrices(side, finalAvg) {
  const baseCents = Math.ceil(Number((finalAvg * 100).toFixed(6)));
  return TARGET_PCTS.map((pct) => {
    // Whole cents × whole percent stays an exact integer before the last division.
    const scaled = baseCents * (side === 'short' ? 100 - pct : 100 + pct);
    const cents = side === 'short' ? Math.floor(scaled / 100) : Math.ceil(scaled / 100);
    return { pct, price: cents / 100 };
  });
}
