import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestTickers } from '../src/tickers.js';

const symbols = (list) => list.map((s) => s.symbol);

test('typing the start of a symbol suggests it', () => {
  assert.deepEqual(symbols(suggestTickers('nv')), ['NVDA']);
});

test('nothing typed suggests nothing', () => {
  assert.deepEqual(suggestTickers('  '), []);
});

test('an exact match comes first, then symbols starting with it, then ones containing it', () => {
  assert.deepEqual(symbols(suggestTickers('ma')), ['MA', 'MAR', 'AMAT']);
});

test('previously traded symbols come before the watchlist and can be off it', () => {
  const list = suggestTickers('s', ['SOFI', 'SPY']);
  assert.deepEqual(list.slice(0, 2), [
    { symbol: 'SOFI', traded: true },
    { symbol: 'SPY', traded: true },
  ]);
  assert.equal(list.filter((s) => s.symbol === 'SPY').length, 1);
});

test('suggestions are capped', () => {
  assert.equal(suggestTickers('a').length, 8);
});
