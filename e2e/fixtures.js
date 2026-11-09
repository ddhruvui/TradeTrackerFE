import { test as base, expect } from '@playwright/test';

// The e2e API (see playwright.config.js). Tests talk to it directly to seed data and
// to check what a click saved.
export const API = 'http://127.0.0.1:4100/api';
export const TODAY = '2026-11-09';
export const NOON = (iso) => new Date(`${iso}T12:00:00Z`);

async function call(request, method, path, data) {
  const res = await request.fetch(API + path, { method, data });
  if (!res.ok()) throw new Error(`${method} ${path}: ${res.status()} ${await res.text()}`);
  return res.status() === 204 ? null : res.json();
}

export const api = {
  get: (request, path) => call(request, 'GET', path),
  post: (request, path, data) => call(request, 'POST', path, data),
  patch: (request, path, data) => call(request, 'PATCH', path, data),
  trades: (request) => call(request, 'GET', '/trades'),
};

// Empties the e2e database through the API. Refuses unless the API says it's on the
// test database, so a wrong setting can't clear real trades.
export async function resetDb(request) {
  const info = await api.get(request, '/info');
  if (!info.testDb) throw new Error('The e2e API is not on the test database; refusing to clear it.');
  const trades = await api.trades(request);
  await Promise.all(trades.map((t) => call(request, 'DELETE', `/trades/${t.id}`)));
  await api.patch(request, '/investment', { short: 0, mid: 0, long: 0 });
}

// The redesign's sample data: five open positions (seven lots) and five closed trades,
// with $40,000 invested. On Nov 9, 2026 the totals are: week +$253.25, month +$528.65,
// year and overall +$607.47, with $97.85 of margin paid.
export async function seedSample(request) {
  const add = (t) => api.post(request, '/trades', t);
  const exit = (id, e) => api.post(request, `/trades/${id}/exit`, e);
  const closed = async (t, e) => {
    const trade = await add(t);
    return exit(trade.id, e);
  };
  await Promise.all([
    api.patch(request, '/investment', { short: 10000, mid: 10000, long: 20000 }),
    closed(
      { symbol: 'NVDA', side: 'buy', term: 'short', broker: 'R', quantity: 50, entryPrice: 176.2, entryDate: '2026-10-30' },
      { exitPrice: 181.5, exitDate: '2026-11-06', margin: 11.75 },
    ),
    closed(
      { symbol: 'AAPL', side: 'buy', term: 'long', broker: 'V', quantity: 15, entryPrice: 228.4, entryDate: '2026-07-14' },
      { exitPrice: 251.1, exitDate: '2026-11-04', margin: 65.1 },
    ),
    closed(
      { symbol: 'TSLA', side: 'short', term: 'short', broker: 'R', quantity: 8, entryPrice: 442, entryDate: '2026-10-27' },
      { exitPrice: 455.25, exitDate: '2026-10-31', margin: 2.95 },
    ),
    closed(
      { symbol: 'COST', side: 'buy', term: 'mid', broker: 'V', quantity: 4, entryPrice: 915, entryDate: '2026-09-08' },
      { exitPrice: 948.3, exitDate: '2026-09-29', margin: 13.42 },
    ).then(({ closed: cost }) => api.patch(request, `/trades/${cost.id}`, { pnlOverride: 119.4 })),
    // AMD: 30 shorted Oct 20; 10 bought back Oct 30 paying 10/30 of $13.87; 20 still open.
    closed(
      { symbol: 'AMD', side: 'short', term: 'mid', broker: 'ML', quantity: 30, entryPrice: 252.1, entryDate: '2026-10-20' },
      { quantity: 10, exitPrice: 244.8, exitDate: '2026-10-30', margin: 4.63 },
    ),
    add({ symbol: 'AMD', side: 'short', term: 'mid', broker: 'ML', quantity: 10, entryPrice: 248.6, entryDate: '2026-10-28' }),
    add({ symbol: 'MSFT', side: 'buy', term: 'long', broker: 'V', quantity: 12, entryPrice: 498.4, entryDate: '2026-09-15' }),
    add({ symbol: 'NVDA', side: 'buy', term: 'short', broker: 'R', quantity: 60, entryPrice: 186.4, entryDate: '2026-11-02' }),
    add({ symbol: 'NVDA', side: 'buy', term: 'short', broker: 'R', quantity: 25, entryPrice: 191.75, entryDate: '2026-11-06' }),
    add({ symbol: 'PLTR', side: 'buy', term: 'short', broker: 'R', quantity: 40, entryPrice: 182.35, entryDate: '2026-11-03' }),
    add({ symbol: 'SNOW', side: 'short', term: 'short', broker: 'R', quantity: 15, entryPrice: 246.8, entryDate: '2026-11-04' }),
  ]);
}

// Each test: an empty database seeded with the sample (unless it opts out with
// `test.use({ seed: false })`), and the page's clock fixed at noon on Nov 9, 2026.
export const test = base.extend({
  seed: [true, { option: true }],
  page: async ({ page, request, seed }, use) => {
    await resetDb(request);
    if (seed) await seedSample(request);
    await page.clock.setFixedTime(NOON(TODAY));
    await use(page);
  },
});

export { expect };

// Page helpers -------------------------------------------------------------------

export const position = (page, symbol, side = 'buy') =>
  page.locator('.pos').filter({ has: page.locator('.ticker', { hasText: new RegExp(`^${symbol}$`) }) }).filter({
    has: page.locator(`.side-pill--${side}`),
  });

export const stat = (page, label) => page.locator('.stat').filter({ has: page.getByRole('heading', { name: label, exact: true }) });

// Radio buttons drawn as a segmented control or cards: the (transparent) radio sits on
// top of its text, so check it directly. `name` is its exact label, or a RegExp.
export const choose = (scope, name) =>
  scope.getByRole('radio', typeof name === 'string' ? { name, exact: true } : { name }).check();

export const toast = (page) => page.locator('.toast');

export async function openApp(page) {
  await page.goto('/');
  await expect(page.locator('.pos').first().or(page.locator('.empty'))).toBeVisible();
}
