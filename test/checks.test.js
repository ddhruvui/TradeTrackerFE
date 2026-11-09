import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTerm, exitProblems, investmentProblems, newTradeProblems } from '../src/checks.js';

test('an empty new trade flags each field, in form order', () => {
  const problems = newTradeProblems({ symbol: ' ', quantity: '', entryPrice: '0', entryDate: '' });
  assert.deepEqual(Object.keys(problems), ['symbol', 'quantity', 'entryPrice', 'entryDate']);
  assert.equal(problems.symbol, 'Enter a stock symbol.');
  assert.equal(problems.entryPrice, 'Enter a price above 0.');
});

test('a complete new trade has no problems; a fixed margin must be $0 or more', () => {
  const trade = { symbol: 'AMZN', quantity: '25', entryPrice: '231.40', entryDate: '2026-11-09' };
  assert.deepEqual(newTradeProblems(trade), {});
  assert.deepEqual(newTradeProblems({ ...trade, fixedMargin: true, margin: '-1' }), {
    margin: 'Margin must be $0 or more.',
  });
  assert.deepEqual(newTradeProblems({ ...trade, fixedMargin: false, margin: '-1' }), {});
});

test('an exit can’t take more shares than the lot has, or go before the entry or after today', () => {
  const lot = { side: 'buy', quantity: 60, entryDate: '2026-11-02' };
  const exit = { quantity: '75', exitPrice: '0', exitDate: '2026-11-01', margin: '14.92' };
  assert.deepEqual(exitProblems(lot, exit, '2026-11-09'), {
    quantity: 'This lot has 60 shares. Enter 60 or fewer.',
    exitPrice: 'Enter the sell price.',
    exitDate: 'The date can’t be before the entry date.',
  });
  const ok = { quantity: '30', exitPrice: '191.96', exitDate: '2026-11-09', margin: '7.46' };
  assert.deepEqual(exitProblems(lot, ok, '2026-11-09'), {});
  assert.equal(exitProblems({ ...lot, side: 'short' }, { ...ok, exitPrice: '' }, '2026-11-09').exitPrice, 'Enter the buy-back price.');
  assert.equal(exitProblems(lot, { ...ok, exitDate: '2026-11-10' }, '2026-11-09').exitDate, 'The date can’t be in the future.');
});

test('invested amounts must be $0 or more; empty means $0', () => {
  assert.deepEqual(investmentProblems({ short: '10000', mid: '', long: '-5' }), { long: 'Must be $0 or more.' });
});

test('new trades start on the term being viewed', () => {
  assert.equal(defaultTerm('mid'), 'mid');
  assert.equal(defaultTerm('all'), 'short');
});
