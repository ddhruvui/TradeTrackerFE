import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOpenTrades, lastVsBreakEven, targetPrices, targetReached } from '../src/openGroups.js';

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

test('buy targets 4x–1x are 1.91%, 2.43%, 3.47% and 6.6% above the final avg amt, rounded up', () => {
  // Final avg amt $543.0833 shows as $543.09; 1.066 × 543.09 = 578.93394 → 578.94.
  assert.deepEqual(targetPrices('buy', 543.0833), [
    { label: '4x', pct: 1.91, price: 553.47 }, // 553.463019
    { label: '3x', pct: 2.43, price: 556.29 }, // 556.287087
    { label: '2x', pct: 3.47, price: 561.94 }, // 561.935223
    { label: '1x', pct: 6.6, price: 578.94 },
  ]);
});

test('short targets 4x–1x are 1.91%, 2.43%, 3.47% and 6.6% below the final avg amt, rounded down', () => {
  assert.deepEqual(targetPrices('short', 543.09), [
    { label: '4x', pct: 1.91, price: 532.71 }, // 532.716981
    { label: '3x', pct: 2.43, price: 529.89 }, // 529.892913
    { label: '2x', pct: 3.47, price: 524.24 }, // 524.244777
    { label: '1x', pct: 6.6, price: 507.24 }, // 507.24606
  ]);
});

test('an exact target is not pushed a cent either way', () => {
  assert.deepEqual(targetPrices('buy', 100).map((t) => t.price), [101.91, 102.43, 103.47, 106.6]);
  assert.deepEqual(targetPrices('short', 100).map((t) => t.price), [98.09, 97.57, 96.53, 93.4]);
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
    [191.79, 192.77, 194.73, 200.62],
  );
});

test('a buy target is reached when it is at or below the last price', () => {
  assert.equal(targetReached('buy', 191.79, 192), true);
  assert.equal(targetReached('buy', 192, 192), true);
  assert.equal(targetReached('buy', 192.01, 192), false);
});

test('a short target is reached when the last price is at or below it', () => {
  assert.equal(targetReached('short', 241.85, 240), true);
  assert.equal(targetReached('short', 240, 240), true);
  assert.equal(targetReached('short', 238, 240), false);
});

test('without a last price no target is reached', () => {
  assert.equal(targetReached('buy', 100, undefined), false);
  assert.equal(targetReached('short', 100, null), false);
});

test('last price vs break-even is a percentage of the break-even shown; above is ahead for a buy', () => {
  // Final avg amt 188.1832 shows as $188.19; (192.77 − 188.19) ÷ 188.19 = +2.43%.
  const up = lastVsBreakEven('buy', 188.1832, 192.77);
  assert.equal(up.pct.toFixed(2), '2.43');
  assert.equal(up.ahead, true);
  assert.equal(lastVsBreakEven('buy', 188.19, 180).ahead, false);
});

test('for a short, a last price below break-even is ahead', () => {
  const down = lastVsBreakEven('short', 246.56, 240);
  assert.equal(down.pct.toFixed(2), '-2.66');
  assert.equal(down.ahead, true);
  assert.equal(lastVsBreakEven('short', 246.56, 250).ahead, false);
});

test('at break-even it is neither ahead nor behind, and no last price gives nothing', () => {
  assert.deepEqual(lastVsBreakEven('buy', 100, 100), { pct: 0, ahead: null });
  assert.equal(lastVsBreakEven('buy', 100, undefined), null);
});
