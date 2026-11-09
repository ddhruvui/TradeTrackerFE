import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSort, sortOpenGroups, sortTrades } from '../src/sortTrades.js';
import { groupOpenTrades } from '../src/openGroups.js';

const trade = (symbol, entryDate, exitDate = null, side = 'buy') => ({
  id: `${symbol}-${entryDate}-${side}`,
  symbol,
  side,
  quantity: 1,
  entryPrice: 10,
  entryDate,
  exitPrice: exitDate ? 11 : null,
  exitDate,
  margin: 0,
});
const ids = (list) => list.map((t) => t.id);

test('closed trades sort by stock, entry and exit in both directions', () => {
  const list = [
    trade('MSFT', '2026-10-02', '2026-10-05'),
    trade('AAPL', '2026-10-03', '2026-10-04'),
    trade('TSLA', '2026-10-01', '2026-10-06'),
  ];
  assert.deepEqual(ids(sortTrades(list, { key: 'stock', dir: 'asc' })).map((id) => id.slice(0, 4)), ['AAPL', 'MSFT', 'TSLA']);
  assert.deepEqual(ids(sortTrades(list, { key: 'stock', dir: 'desc' })).map((id) => id.slice(0, 4)), ['TSLA', 'MSFT', 'AAPL']);
  assert.deepEqual(sortTrades(list, { key: 'entry', dir: 'desc' }).map((t) => t.symbol), ['AAPL', 'MSFT', 'TSLA']);
  assert.deepEqual(sortTrades(list, { key: 'exit', dir: 'asc' }).map((t) => t.symbol), ['AAPL', 'MSFT', 'TSLA']);
  assert.deepEqual(sortTrades(list, { key: 'exit', dir: 'desc' }).map((t) => t.symbol), ['TSLA', 'MSFT', 'AAPL']);
});

test('open groups stay together when sorted', () => {
  const groups = groupOpenTrades(
    [trade('AAPL', '2026-10-01'), trade('AAPL', '2026-10-09'), trade('MSFT', '2026-10-05'), trade('AAPL', '2026-10-03', null, 'short')],
    '2026-10-19',
  );
  const label = (gs) => gs.map((g) => `${g.symbol} ${g.side}: ${g.trades.map((t) => t.entryDate.slice(8)).join(',')}`);
  assert.deepEqual(label(sortOpenGroups(groups, { key: 'stock', dir: 'desc' })), ['MSFT buy: 05', 'AAPL buy: 09,01', 'AAPL short: 03']);
  assert.deepEqual(label(sortOpenGroups(groups, { key: 'entry', dir: 'asc' })), ['AAPL buy: 01,09', 'AAPL short: 03', 'MSFT buy: 05']);
  assert.deepEqual(label(sortOpenGroups(groups, { key: 'entry', dir: 'desc' })), ['AAPL buy: 09,01', 'MSFT buy: 05', 'AAPL short: 03']);
});

test('clicking flips the sorted column; a new column starts at its default', () => {
  assert.deepEqual(nextSort({ key: 'stock', dir: 'asc' }, 'stock'), { key: 'stock', dir: 'desc' });
  assert.deepEqual(nextSort({ key: 'stock', dir: 'asc' }, 'exit'), { key: 'exit', dir: 'desc' });
  assert.deepEqual(nextSort({ key: 'exit', dir: 'desc' }, 'stock'), { key: 'stock', dir: 'asc' });
});
