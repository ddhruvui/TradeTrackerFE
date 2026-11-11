import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WATCHLIST, exchangeOf, googleFinanceUrl, suggestTickers } from '../src/tickers.js';

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

test('a ticker links to its Google Finance quote page on its own exchange', () => {
  assert.equal(googleFinanceUrl('ADI'), 'https://www.google.com/finance/quote/ADI:NASDAQ');
  assert.equal(googleFinanceUrl('QCOM'), 'https://www.google.com/finance/quote/QCOM:NASDAQ');
  assert.equal(googleFinanceUrl('JPM'), 'https://www.google.com/finance/quote/JPM:NYSE');
  assert.equal(googleFinanceUrl('VOO'), 'https://www.google.com/finance/quote/VOO:NYSEARCA');
  assert.equal(googleFinanceUrl('BRK-B'), 'https://www.google.com/finance/quote/BRK.B:NYSE');
});

test('every watchlist symbol has an exchange, so none falls back to the search', () => {
  assert.deepEqual(WATCHLIST.filter((symbol) => !exchangeOf(symbol)), []);
});

test('a symbol with no known exchange falls back to Google’s search', () => {
  assert.equal(googleFinanceUrl('ZZZZ'), 'https://www.google.com/finance?q=ZZZZ');
});
