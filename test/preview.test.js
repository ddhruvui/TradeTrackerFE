import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatedPnl, previewExit } from '../src/preview.js';

const position = { side: 'buy', quantity: 40, entryPrice: 118.25 };

test('a full exit takes the margin off', () => {
  assert.equal(previewExit(position, { quantity: 40, exitPrice: 125.5, margin: 6.5 }), 283.5);
});

test('a partial exit takes off the margin share it pays', () => {
  // 15 × $7.25 = $108.75, less this exit's share of the margin.
  assert.equal(previewExit(position, { quantity: 15, exitPrice: 125.5, margin: 2.44 }), 106.31);
  assert.equal(previewExit(position, { quantity: 15, exitPrice: 125.5, margin: 0 }), 108.75);
});

test('buying back 10 of AMD’s 20 shares at $245.16 with $8.83 margin realizes $60.57', () => {
  const amd = { side: 'short', quantity: 20, entryPrice: 252.1 };
  assert.equal(previewExit(amd, { quantity: 10, exitPrice: 245.16, margin: 8.83 }), 60.57);
});

test('margin deepens a loss: a $5 loss with $10 margin is −$15', () => {
  const oneShare = { side: 'buy', quantity: 1, entryPrice: 100 };
  assert.equal(previewExit(oneShare, { quantity: 1, exitPrice: 95, margin: 10 }), -15);
});

test('a short gains when it is bought back lower', () => {
  const short = { side: 'short', quantity: 20, entryPrice: 262.4 };
  assert.equal(previewExit(short, { quantity: 20, exitPrice: 250, margin: 0 }), 248);
});

test('a closed trade’s calculated amount matches the backend: price move minus margin', () => {
  const fields = { side: 'buy', quantity: 10, entryPrice: 50, exitPrice: 60, margin: 2 };
  assert.equal(calculatedPnl(fields), 98);
  assert.equal(calculatedPnl({ ...fields, side: 'short' }), -102);
  assert.equal(calculatedPnl({ ...fields, entryPrice: 0 }), null);
});

test('nothing to preview until the inputs make sense', () => {
  assert.equal(previewExit(position, { quantity: 41, exitPrice: 125, margin: 0 }), null);
  assert.equal(previewExit(position, { quantity: 10, exitPrice: 0, margin: 0 }), null);
  assert.equal(previewExit(position, { quantity: 10, exitPrice: 120, margin: -1 }), null);
});
