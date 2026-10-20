import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOpenTrades } from '../src/openGroups.js';

const today = '2026-10-19';
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);
const lot = (symbol, side, quantity, entryPrice, entryDate, margin = 0) => ({
  id: `${symbol}-${side}-${entryDate}`,
  symbol,
  side,
  quantity,
  entryPrice,
  entryDate,
  exitPrice: null,
  exitDate: null,
  margin,
});

test('open trades sort by ticker A→Z, buys before shorts, newest entry first', () => {
  const groups = groupOpenTrades(
    [
      lot('TSLA', 'short', 5, 200, '2026-10-17'),
      lot('AAPL', 'buy', 10, 100, '2026-10-15'),
      lot('AAPL', 'short', 5, 130, '2026-10-17'),
      lot('AAPL', 'buy', 30, 120, '2026-10-18'),
    ],
    today,
  );
  assert.deepEqual(
    groups.map((g) => `${g.symbol} ${g.side}: ${g.trades.map((t) => t.entryDate).join(', ')}`),
    ['AAPL buy: 2026-10-18, 2026-10-15', 'AAPL short: 2026-10-17', 'TSLA short: 2026-10-17'],
  );
});

test('averages are weighted by shares: 10 @ $100 and 30 @ $120 average $115', () => {
  // Typed margins keep the final amounts fixed: ($1,000 + $5 + $3,600 + $15) ÷ 40 shares.
  const [aapl] = groupOpenTrades(
    [lot('AAPL', 'buy', 10, 100, '2026-10-15', 5), lot('AAPL', 'buy', 30, 120, '2026-10-18', 15)],
    today,
  );
  assert.equal(aapl.shares, 40);
  near(aapl.avgValue, 115);
  near(aapl.finalAvg, 115.5);
});

test('a short’s final average takes the margin off, using the calculated margin when none is typed', () => {
  // $650 total → roundup($0.11) = $1 a day × 3 days (Oct 17–19) = $3: ($650 − $3) ÷ 5.
  const [short] = groupOpenTrades([lot('AAPL', 'short', 5, 130, '2026-10-17')], today);
  near(short.avgValue, 130);
  near(short.finalAvg, 129.4);
});
