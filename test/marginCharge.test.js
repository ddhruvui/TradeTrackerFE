import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('days × roundup(total × 6 / 36000): $54,082.52 for 5 days is $50', () => {
  assert.equal(tradeTotal(position()), 54082.52);
  assert.deepEqual(marginCharge(position(), today), { amount: 50, days: 5, perDay: 10, typed: false });
});

test('an exact daily amount is not rounded up again', () => {
  const exact = position({ quantity: 1, entryPrice: 36000, entryDate: today });
  assert.equal(marginCharge(exact, today).perDay, 6);
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
