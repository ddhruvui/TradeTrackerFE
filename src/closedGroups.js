// Closed trades grouped by the month they exited, newest month first, each with a
// subtotal of realized profit (worked out in cents so it matches the backend's totals).
// Expects trades already sorted by exit date; the order inside each month is kept.
// [{ key: '2026-11', trades, pnl, count }]
export function groupByExitMonth(trades) {
  const groups = [];
  for (const trade of trades) {
    const key = trade.exitDate.slice(0, 7);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, trades: [], cents: 0 };
      groups.push(group);
    }
    group.trades.push(trade);
    group.cents += Math.round((trade.realizedPnl ?? 0) * 100);
  }
  return groups.map(({ key, trades: list, cents }) => ({
    key,
    trades: list,
    pnl: cents / 100,
    count: list.length,
  }));
}

// Net realized profit and margin over a list of closed trades.
export function closedTotals(trades) {
  let pnlCents = 0;
  let marginCents = 0;
  for (const trade of trades) {
    pnlCents += Math.round((trade.realizedPnl ?? 0) * 100);
    marginCents += Math.round((trade.margin ?? 0) * 100);
  }
  return { pnl: pnlCents / 100, margin: marginCents / 100, count: trades.length };
}
