import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pct2, pctArrow } from '../src/format.js';

test('the final amount’s bracket uses two decimals and no plus sign', () => {
  assert.equal(pct2(0.0924), '0.09%');
  assert.equal(pct2(-0.0924), '−0.09%');
  assert.equal(pct2(1.2), '1.20%');
});

test('a share of the investment shows its direction with an arrow', () => {
  assert.equal(pctArrow(10), '↑ 10%');
  assert.equal(pctArrow(-2.5), '↓ 2.5%');
  assert.equal(pctArrow(0.1125), '↑ 0.11%');
  assert.equal(pctArrow(0), '0%');
});
