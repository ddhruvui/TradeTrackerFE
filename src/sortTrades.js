// Column sorting for the trade tables: Stock, Entry and Exit.
// sort = { key: 'stock' | 'entry' | 'exit', dir: 'asc' | 'desc' }

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Entry and exit sort by date, then by price on the same day.
const KEYS = {
  stock: (a, b) => a.symbol.localeCompare(b.symbol),
  entry: (a, b) => compare(a.entryDate, b.entryDate) || a.entryPrice - b.entryPrice,
  exit: (a, b) => compare(a.exitDate ?? '', b.exitDate ?? '') || (a.exitPrice ?? 0) - (b.exitPrice ?? 0),
};

// Ties keep the order the trades came in (Array.prototype.sort is stable).
export function sortTrades(trades, { key, dir }) {
  const sign = dir === 'desc' ? -1 : 1;
  return [...trades].sort((a, b) => sign * KEYS[key](a, b));
}

// Open lots stay grouped by ticker for the merged average cells, so sorting
// reorders whole groups. By Stock: ticker A→Z or Z→A (buys before shorts).
// By Entry: lots within each group by entry, and groups by their first lot.
export function sortOpenGroups(groups, { key, dir }) {
  if (key === 'stock') {
    if (dir === 'asc') return groups;
    return [...groups].sort(
      (a, b) => b.symbol.localeCompare(a.symbol) || (a.side === b.side ? 0 : a.side === 'buy' ? -1 : 1),
    );
  }
  const sorted = groups.map((group) => ({ ...group, trades: sortTrades(group.trades, { key, dir }) }));
  const sign = dir === 'desc' ? -1 : 1;
  return sorted.sort((a, b) => sign * KEYS[key](a.trades[0], b.trades[0]));
}

// Clicking the sorted column flips it; a new column starts A→Z for Stock
// and newest first for dates.
export function nextSort(current, key) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'stock' ? 'asc' : 'desc' };
}
