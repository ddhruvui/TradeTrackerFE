import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOpenTrades, targetPrices } from '../src/openGroups.js';

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
  near(aapl.margin, 20);
});

test('a short’s final average takes the margin off, using the calculated margin when none is typed', () => {
  // roundup(5 × 3 days (Oct 17–19) × $130 × 6 / 36000, 2) = roundup($0.325) = $0.33: ($650 − $0.33) ÷ 5.
  const [short] = groupOpenTrades([lot('AAPL', 'short', 5, 130, '2026-10-17')], today);
  near(short.avgValue, 130);
  near(short.finalAvg, 129.934);
  near(short.margin, 0.33);
});

test('buy targets are 2%, 5% and 6% above the final avg amt, rounded up', () => {
  // Final avg amt $543.0833 shows as $543.09; 1.02 × 543.09 = 553.9518 → 553.96.
  assert.deepEqual(targetPrices('buy', 543.0833), [
    { pct: 2, price: 553.96 },
    { pct: 5, price: 570.25 }, // 570.2445
    { pct: 6, price: 575.68 }, // 575.6754
  ]);
});

test('short targets are 2%, 5% and 6% below the final avg amt, rounded down', () => {
  assert.deepEqual(targetPrices('short', 543.09), [
    { pct: 2, price: 532.22 }, // 532.2282
    { pct: 5, price: 515.93 }, // 515.9355
    { pct: 6, price: 510.5 }, // 510.5046
  ]);
});

test('an exact target is not pushed a cent either way', () => {
  assert.deepEqual(targetPrices('buy', 100).map((t) => t.price), [102, 105, 106]);
  assert.deepEqual(targetPrices('short', 100).map((t) => t.price), [98, 95, 94]);
});
