import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closedTotals, groupByExitMonth } from '../src/closedGroups.js';

const closed = (symbol, exitDate, realizedPnl, margin) => ({ symbol, exitDate, realizedPnl, margin });

// Newest exit first, as the backend sends them.
const trades = [
  closed('NVDA', '2026-11-06', 253.25, 11.75),
  closed('AAPL', '2026-11-04', 275.4, 65.1),
  closed('TSLA', '2026-10-31', -108.95, 2.95),
  closed('AMD', '2026-10-30', 68.37, 4.63),
  closed('COST', '2026-09-29', 119.4, 13.42),
];

test('closed trades group by exit month, newest first, with subtotals', () => {
  const groups = groupByExitMonth(trades);
  assert.deepEqual(
    groups.map((g) => [g.key, g.count, g.pnl, g.trades.map((t) => t.symbol).join(',')]),
    [
      ['2026-11', 2, 528.65, 'NVDA,AAPL'],
      ['2026-10', 2, -40.58, 'TSLA,AMD'],
      ['2026-09', 1, 119.4, 'COST'],
    ],
  );
});

test('totals add up in cents: net profit and margin paid', () => {
  assert.deepEqual(closedTotals(trades), { pnl: 607.47, margin: 97.85, count: 5 });
  assert.deepEqual(closedTotals([]), { pnl: 0, margin: 0, count: 0 });
});
