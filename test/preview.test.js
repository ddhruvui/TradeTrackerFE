import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewExit } from '../src/preview.js';

const position = { side: 'buy', quantity: 40, entryPrice: 118.25 };

test('a full exit takes the margin off', () => {
  assert.equal(previewExit(position, { quantity: 40, exitPrice: 125.5, margin: 6.5 }), 283.5);
});

test('a partial exit leaves the margin for the final exit', () => {
  assert.equal(previewExit(position, { quantity: 15, exitPrice: 125.5, margin: 6.5 }), 108.75);
});

test('margin deepens a loss: a $5 loss with $10 margin is −$15', () => {
  const oneShare = { side: 'buy', quantity: 1, entryPrice: 100 };
  assert.equal(previewExit(oneShare, { quantity: 1, exitPrice: 95, margin: 10 }), -15);
});

test('a short gains when it is bought back lower', () => {
  const short = { side: 'short', quantity: 20, entryPrice: 262.4 };
  assert.equal(previewExit(short, { quantity: 20, exitPrice: 250, margin: 0 }), 248);
});

test('nothing to preview until the inputs make sense', () => {
  assert.equal(previewExit(position, { quantity: 41, exitPrice: 125, margin: 0 }), null);
  assert.equal(previewExit(position, { quantity: 10, exitPrice: 0, margin: 0 }), null);
  assert.equal(previewExit(position, { quantity: 10, exitPrice: 120, margin: -1 }), null);
});
