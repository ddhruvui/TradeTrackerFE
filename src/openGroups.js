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
// amount per share after margin charged (finalAvg), plus the lots' margin added up,
// worked out in whole cents.
function averages(trades, today) {
  let shares = 0;
  let totalCents = 0;
  let finalCents = 0;
  let marginCents = 0;
  for (const trade of trades) {
    const cents = Math.round(trade.quantity * trade.entryPrice * 100);
    const charged = Math.round(marginCharge(trade, today).amount * 100);
    shares += trade.quantity;
    totalCents += cents;
    marginCents += charged;
    finalCents += trade.side === 'short' ? cents - charged : cents + charged;
  }
  return {
    shares,
    avgValue: totalCents / 100 / shares,
    finalAvg: finalCents / 100 / shares,
    margin: marginCents / 100,
  };
}

// [{ symbol, side, trades, shares, avgValue, finalAvg, margin }], in display order.
export function groupOpenTrades(trades, today) {
  const groups = [];
  for (const trade of sortOpenByTicker(trades)) {
    const last = groups.at(-1);
    if (last && last.symbol === trade.symbol && last.side === trade.side) last.trades.push(trade);
    else groups.push({ symbol: trade.symbol, side: trade.side, trades: [trade] });
  }
  return groups.map((group) => ({ ...group, ...averages(group.trades, today) }));
}

// Exit targets from the Final avg amt as shown (rounded up to the cent), listed
// nearest first: 4x 1.91%, 3x 2.43%, 2x 3.47%, 1x 6.6%. A buy aims above it,
// rounded up; a short aims below it, rounded down.
// Buy 1x: roundup(1.066 × final avg, 2). Short 1x: rounddown(0.934 × final avg, 2).
export const TARGET_PCTS = [1.91, 2.43, 3.47, 6.6];

// How far the last price is from break-even as shown (rounded up to the cent), as a
// percentage of it: +3.42 means 3.42% above. `ahead` says whether that's the side the
// position profits on: above for a buy, below for a short. Null without a last price.
export function lastVsBreakEven(side, finalAvg, lastPrice) {
  if (!Number.isFinite(lastPrice)) return null;
  const breakEven = Math.ceil(Number((finalAvg * 100).toFixed(6))) / 100;
  if (!(breakEven > 0)) return null;
  const pct = ((lastPrice - breakEven) / breakEven) * 100;
  const shown = Number(pct.toFixed(2));
  return { pct, ahead: shown === 0 ? null : side === 'short' ? shown < 0 : shown > 0 };
}

// A target is reached once the last price is at or past it: at or above it for a buy,
// at or below it for a short. No last price means not reached.
export function targetReached(side, target, lastPrice) {
  if (!Number.isFinite(lastPrice)) return false;
  return side === 'short' ? lastPrice <= target : target <= lastPrice;
}

// [{ label: '4x', pct: 1.91, price }, …], in TARGET_PCTS order.
export function targetPrices(side, finalAvg) {
  const baseCents = Math.ceil(Number((finalAvg * 100).toFixed(6)));
  return TARGET_PCTS.map((pct, i) => {
    // Whole cents × hundredths of a percent stays an exact integer before the last division.
    const bp = Math.round(pct * 100);
    const scaled = baseCents * (side === 'short' ? 10000 - bp : 10000 + bp);
    const cents = side === 'short' ? Math.floor(scaled / 10000) : Math.ceil(scaled / 10000);
    return { label: `${TARGET_PCTS.length - i}x`, pct, price: cents / 100 };
  });
}
