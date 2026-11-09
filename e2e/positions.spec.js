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
  await expect(nvda.locator('.targets .chip')).toHaveText(['+2%$191.96', '+5%$197.60', '+6%$199.49']);
  // A short's targets sit below break-even, rounded down.
  const snow = position(page, 'SNOW', 'short');
  await expect(snow.locator('.pos__be')).toHaveText('$246.56');
  await expect(snow.locator('.targets .chip')).toHaveText(['−2%$241.62', '−5%$234.23', '−6%$231.76']);
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

test('T17 keyboard: chevron, each target and Sell are reachable with a visible focus ring', async ({ page }) => {
  await openApp(page);
  const nvda = position(page, 'NVDA');
  await nvda.getByRole('button', { name: 'Show NVDA lots' }).focus();
  for (const pct of ['+2%', '+5%', '+6%']) {
    await page.keyboard.press('Tab');
    await expect(nvda.getByRole('button', { name: new RegExp(`\\${pct} target`) })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(nvda.getByRole('button', { name: 'Sell NVDA', exact: true })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)).toBe('solid');
});
