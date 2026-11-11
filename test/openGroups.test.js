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

test('buy targets 1x–4x are 6.6%, 3.47%, 2.43% and 1.91% above the final avg amt, rounded up', () => {
  // Final avg amt $543.0833 shows as $543.09; 1.066 × 543.09 = 578.93394 → 578.94.
  assert.deepEqual(targetPrices('buy', 543.0833), [
    { label: '1x', pct: 6.6, price: 578.94 },
    { label: '2x', pct: 3.47, price: 561.94 }, // 561.935223
    { label: '3x', pct: 2.43, price: 556.29 }, // 556.287087
    { label: '4x', pct: 1.91, price: 553.47 }, // 553.463019
  ]);
});

test('short targets 1x–4x are 6.6%, 3.47%, 2.43% and 1.91% below the final avg amt, rounded down', () => {
  assert.deepEqual(targetPrices('short', 543.09), [
    { label: '1x', pct: 6.6, price: 507.24 }, // 507.24606
    { label: '2x', pct: 3.47, price: 524.24 }, // 524.244777
    { label: '3x', pct: 2.43, price: 529.89 }, // 529.892913
    { label: '4x', pct: 1.91, price: 532.71 }, // 532.716981
  ]);
});

test('an exact target is not pushed a cent either way', () => {
  assert.deepEqual(targetPrices('buy', 100).map((t) => t.price), [106.6, 103.47, 102.43, 101.91]);
  assert.deepEqual(targetPrices('short', 100).map((t) => t.price), [93.4, 96.53, 97.57, 98.09]);
});

test('NVDA lots 60 @ $186.40 (Nov 2) and 25 @ $191.75 (Nov 6) on Nov 9: break-even $188.19', () => {
  const [nvda] = groupOpenTrades(
    [lot('NVDA', 'buy', 60, 186.4, '2026-11-02'), lot('NVDA', 'buy', 25, 191.75, '2026-11-06')],
    '2026-11-09',
  );
  near(nvda.margin, 18.12); // $14.92 + $3.20
  assert.equal(Math.ceil(Number((nvda.finalAvg * 100).toFixed(6))) / 100, 188.19);
  assert.deepEqual(
    targetPrices('buy', nvda.finalAvg).map((t) => t.price),
    [200.62, 194.73, 192.77, 191.79],
  );
});
