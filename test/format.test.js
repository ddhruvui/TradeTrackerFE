import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centsUp, pct2, pctArrow } from '../src/format.js';

test('per-share amounts round up to the cent with two decimals', () => {
  assert.equal(centsUp(541.3252), '$541.33');
  assert.equal(centsUp(540.8201), '$540.83');
  assert.equal(centsUp(80.8), '$80.80'); // exact amounts aren't pushed up by float noise
  assert.equal(centsUp(10), '$10.00');
  assert.equal(centsUp(1234.5), '$1,234.50');
});

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
