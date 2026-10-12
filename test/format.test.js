import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pctArrow } from '../src/format.js';

test('a share of the investment shows its direction with an arrow', () => {
  assert.equal(pctArrow(10), '↑ 10%');
  assert.equal(pctArrow(-2.5), '↓ 2.5%');
  assert.equal(pctArrow(0.1125), '↑ 0.11%');
  assert.equal(pctArrow(0), '0%');
});
