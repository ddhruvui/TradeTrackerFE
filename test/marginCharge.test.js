import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exitMarginSplit,
  finalChangePct,
  finalPerShare,
  marginCharge,
  marginDays,
  tradeTotal,
} from '../src/marginCharge.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);

const today = '2026-10-17';
const position = (overrides = {}) => ({
  side: 'buy',
  quantity: 100,
  entryPrice: 540.8252,
  entryDate: '2026-10-13',
  exitDate: null,
  margin: 0,
  ...overrides,
});

test('days count both ends: bought today is 1, yesterday is 2', () => {
  assert.equal(marginDays(today, today), 1);
  assert.equal(marginDays('2026-10-16', today), 2);
  assert.equal(marginDays('2026-09-30', today), 18);
});

test('roundup(shares × days × price × 6 / 36000, 2): $54,082.52 for 5 days is $45.07', () => {
  assert.equal(tradeTotal(position()), 54082.52);
  // 100 × 5 × 540.8252 × 6 / 36000 = 45.0687…, rounded up to the cent.
  assert.deepEqual(marginCharge(position(), today), { amount: 45.07, days: 5, typed: false });
});

test('an exact amount is not rounded up again', () => {
  const exact = position({ quantity: 1, entryPrice: 36000, entryDate: today });
  assert.equal(marginCharge(exact, today).amount, 6);
});

test('a closed trade is charged until its exit date, not today', () => {
  const closed = position({ exitDate: '2026-10-14', exitPrice: 550 });
  assert.equal(marginCharge(closed, today).days, 2);
});

test('a typed margin wins over the calculation', () => {
  assert.deepEqual(marginCharge(position({ margin: 12.5 }), today), { amount: 12.5, typed: true });
});

test('final amount per share: a buy adds the margin, a short takes it off', () => {
  near(finalPerShare(position(), 50), 541.3252); // ($54,082.52 + $50) ÷ 100
  near(finalPerShare(position({ side: 'short' }), 50), 540.3252); // ($54,082.52 − $50) ÷ 100
  near(finalPerShare(position({ quantity: 12.5, entryPrice: 80 }), 10), 80.8); // fractional shares
});

test('the bracketed % is the final amount against the entry price', () => {
  // (541.3252 − 540.8252) × 100 / 540.8252 ≈ 0.09%
  near(finalChangePct(position(), 541.3252), (0.5 * 100) / 540.8252);
  near(finalChangePct(position({ side: 'short' }), 540.3252), (-0.5 * 100) / 540.8252);
});

// Every exit pays its share of the margin so far; the shares left keep accruing.
const nov9 = '2026-11-09';
const amd = { side: 'short', quantity: 20, entryPrice: 252.1, entryDate: '2026-10-20', exitDate: null, margin: 0 };
const nvda = { side: 'buy', quantity: 60, entryPrice: 186.4, entryDate: '2026-11-02', exitDate: null, margin: 0 };

test('buying back 10 of 20 shares pays half the margin so far; the 10 left stay on auto', () => {
  // $17.65 so far (21 days); half is $8.825, rounded up to $8.83.
  assert.deepEqual(exitMarginSplit(amd, 10, nov9), {
    charged: 8.83,
    left: { amount: 8.83, typed: false },
    share: 0.5,
    total: 17.65,
  });
});

test('selling 30 of 60 pays $7.46, and the 30 left keep accruing day by day', () => {
  const split = exitMarginSplit(nvda, 30, nov9);
  assert.equal(split.charged, 7.46);
  assert.deepEqual(split.left, { amount: 7.46, typed: false });
  // The next day the 30 left show $8.39: 30 × $186.40 × 9 days × 6 / 36000, rounded up.
  assert.equal(marginCharge({ ...nvda, quantity: 30 }, '2026-11-10').amount, 8.39);
});

test('the exit that sells every share pays all of the margin', () => {
  assert.deepEqual(exitMarginSplit(nvda, 60, nov9), { charged: 14.92, left: null, share: 1, total: 14.92 });
});

test('a typed margin splits so the parts add up to the whole', () => {
  assert.deepEqual(exitMarginSplit({ ...amd, margin: 20 }, 10, nov9).left, { amount: 10, typed: true });
  const split = exitMarginSplit({ ...amd, margin: 17.65 }, 10, nov9);
  assert.deepEqual([split.charged, split.left.amount], [8.83, 8.82]);
});
