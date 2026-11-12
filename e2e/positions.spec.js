import { api, expect, openApp, position, test } from './fixtures.js';

test('T13 lots group by ticker and side; buys and shorts stay apart', async ({ page, request }) => {
  await api.post(request, '/trades', {
    symbol: 'NVDA',
    side: 'short',
    term: 'short',
    quantity: 5,
    entryPrice: 190,
    entryDate: '2026-11-05',
  });
  await openApp(page);
  const buys = position(page, 'NVDA', 'buy');
  await expect(buys).toContainText('2 lots');
  await expect(buys.locator('.pos__shares')).toContainText('85');
  await expect(buys.locator('.pos__avg')).toHaveText('$187.98');
  await expect(position(page, 'NVDA', 'short')).toContainText('1 lot');
});

test('T14 expanding a position shows its lots in the same columns, and stays expanded', async ({ page }) => {
  await openApp(page);
  const nvda = position(page, 'NVDA');
  await nvda.getByRole('button', { name: 'Show NVDA lots' }).click();
  const lots = page.getByRole('rowgroup', { name: 'NVDA lots' }).locator('.lot');
  await expect(lots).toHaveCount(2);
  await expect(lots.nth(0)).toContainText('Lot · Nov 6');
  await expect(lots.nth(1)).toContainText('Lot · Nov 2');
  await expect(lots.nth(1)).toContainText('$14.92');
  // The lot's Shares cell ends where the position's does.
  const positionShares = await nvda.locator('.pos__shares').boundingBox();
  const lotShares = await lots.nth(1).locator('.cell').nth(3).boundingBox();
  expect(Math.abs(positionShares.x + positionShares.width - (lotShares.x + lotShares.width))).toBeLessThan(1);

  await page.reload();
  await expect(page.getByRole('rowgroup', { name: 'NVDA lots' }).locator('.lot')).toHaveCount(2);
});

test('T15 NVDA: margin to date, break-even and targets follow the rules', async ({ page }) => {
  await openApp(page);
  const nvda = position(page, 'NVDA');
  await expect(nvda.locator('.pos__margin')).toHaveText('$18.12');
  await expect(nvda.locator('.pos__be')).toHaveText('$188.19');
  await expect(nvda.locator('.targets .chip')).toHaveText(['4x$191.79', '3x$192.77', '2x$194.73', '1x$200.62']);
  // A short's targets sit below break-even, rounded down.
  const snow = position(page, 'SNOW', 'short');
  await expect(snow.locator('.pos__be')).toHaveText('$246.56');
  await expect(snow.locator('.targets .chip')).toHaveText(['4x$241.85', '3x$240.56', '2x$238.00', '1x$230.28']);
});

test('T15c targets the last price has reached turn green: at or below it for a buy, at or above it for a short', async ({ page }) => {
  await page.route('**/api/prices', (route) =>
    route.fulfill({ json: { uploadedAt: '2026-11-09T12:00:00.000Z', prices: { NVDA: 192.77, SNOW: 240 } } }),
  );
  await openApp(page);
  // NVDA (buy) at $192.77: 4x $191.79 and 3x $192.77 are reached, 2x and 1x are not.
  const nvda = position(page, 'NVDA');
  await expect(nvda.locator('.targets .chip--reached')).toHaveText(['4x$191.79', '3x$192.77']);
  await expect(nvda.getByRole('button', { name: /4x target.*reached: last price \$192\.77/ })).toBeVisible();
  // SNOW (short) at $240.00: 4x $241.85 and 3x $240.56 are reached.
  await expect(position(page, 'SNOW', 'short').locator('.targets .chip--reached')).toHaveText(['4x$241.85', '3x$240.56']);
  // Next to break-even: the last price and how far it is from break-even.
  await expect(page.getByRole('columnheader', { name: 'Last price' })).toBeVisible();
  await expect(nvda.locator('.pos__last')).toHaveText('$192.77 (+2.43%) from break-even');
  await expect(nvda.locator('.pos__last-pct')).toHaveClass(/is-gain/);
  const snowLast = position(page, 'SNOW', 'short').locator('.pos__last');
  await expect(snowLast).toHaveText('$240.00 (−2.66%) from break-even');
  await expect(snowLast.locator('.pos__last-pct')).toHaveClass(/is-gain/);
  await expect(position(page, 'PLTR').locator('.pos__last')).toHaveText('–');
  // No last price for PLTR: nothing coloured.
  await expect(position(page, 'PLTR').locator('.targets .chip')).toHaveCount(4);
  await expect(position(page, 'PLTR').locator('.targets .chip--reached')).toHaveCount(0);
  // The Exit panel marks the same targets.
  await nvda.getByRole('button', { name: /4x target/ }).click();
  await expect(page.getByRole('dialog', { name: 'Sell NVDA' }).locator('.chip--reached')).toHaveCount(2);
});

test('T15b an open position’s ticker opens Google Finance in a new tab', async ({ page }) => {
  await openApp(page);
  const link = position(page, 'NVDA').getByRole('link', { name: 'NVDA on Google Finance (opens in a new tab)' });
  await expect(link).toHaveAttribute('href', 'https://www.google.com/finance/quote/NVDA:NASDAQ');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('T16 sorting moves whole positions', async ({ page }) => {
  await openApp(page);
  const tickers = page.locator('.pos .ticker');
  await expect(tickers).toHaveText(['AMD', 'MSFT', 'NVDA', 'PLTR', 'SNOW']);
  await page.getByRole('button', { name: 'Position' }).click();
  await expect(tickers).toHaveText(['SNOW', 'PLTR', 'NVDA', 'MSFT', 'AMD']);
  await page.getByRole('button', { name: 'Avg entry' }).click(); // newest entry first
  await expect(tickers).toHaveText(['NVDA', 'SNOW', 'PLTR', 'AMD', 'MSFT']);
});

test('T17 keyboard: chevron, ticker link, each target and Sell are reachable with a visible focus ring', async ({ page }) => {
  await openApp(page);
  const nvda = position(page, 'NVDA');
  await nvda.getByRole('button', { name: 'Show NVDA lots' }).focus();
  await page.keyboard.press('Tab');
  await expect(nvda.getByRole('link', { name: /^NVDA on Google Finance/ })).toBeFocused();
  for (const label of ['4x', '3x', '2x', '1x']) {
    await page.keyboard.press('Tab');
    await expect(nvda.getByRole('button', { name: new RegExp(`${label} target`) })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(nvda.getByRole('button', { name: 'Sell NVDA', exact: true })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).toBe('solid');
});
