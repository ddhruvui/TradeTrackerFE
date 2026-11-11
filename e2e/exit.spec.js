import { NOON, TODAY, api, expect, openApp, position, test, toast } from './fixtures.js';

async function openExit(page, symbol, side = 'buy') {
  const verb = side === 'short' ? 'Buy back' : 'Sell';
  await position(page, symbol, side).getByRole('button', { name: `${verb} ${symbol}`, exact: true }).click();
  return page.getByRole('dialog', { name: `${verb} ${symbol}` });
}

const openLot = async (request, symbol, entryDate) =>
  (await api.trades(request)).find((t) => t.symbol === symbol && t.entryDate === entryDate && t.exitDate == null);

test('T18 a position with two lots asks which one (oldest first); one lot goes straight on', async ({ page }) => {
  await openApp(page);
  let dialog = await openExit(page, 'NVDA');
  await expect(dialog.getByRole('group', { name: 'Which lot' })).toBeVisible();
  await expect(dialog.getByRole('radio', { name: /60 shares bought at \$186\.40/ })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  dialog = await openExit(page, 'PLTR');
  await expect(dialog.getByRole('group', { name: 'Which lot' })).toHaveCount(0);
  await expect(dialog.getByLabel('Shares to sell')).toHaveValue('40');
});

test('T19 a target chip fills the price, from the row or inside the panel', async ({ page }) => {
  await openApp(page);
  await position(page, 'NVDA').getByRole('button', { name: /4x target/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Sell NVDA' });
  await expect(dialog.getByLabel('Sell price')).toHaveValue('191.79');
  await dialog.getByRole('button', { name: /^2x/ }).click();
  await expect(dialog.getByLabel('Sell price')).toHaveValue('194.73');
  // (194.73 − 186.40) × 60 − $14.92
  await expect(dialog.locator('.result__value')).toHaveText('+$484.88');
});

test('T20 selling the whole lot charges all its margin: +$308.48', async ({ page, request }) => {
  await openApp(page);
  await position(page, 'NVDA').getByRole('button', { name: /4x target/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Sell NVDA' });
  await expect(dialog.getByLabel('Margin charged now')).toHaveValue('14.92');
  await expect(dialog.locator('.result__value')).toHaveText('+$308.48');
  await expect(dialog.locator('.result')).toContainText('+$5.39 × 60');
  await expect(dialog.locator('.result')).toContainText('+2.8%');
  await dialog.getByRole('button', { name: 'Sell 60 NVDA' }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page)).toContainText('Sold 60 NVDA: +$308.48 realized');
  const sold = (await api.trades(request)).find((t) => t.symbol === 'NVDA' && t.entryDate === '2026-11-02');
  expect([sold.exitDate, sold.margin, sold.realizedPnl]).toEqual([TODAY, 14.92, 308.48]);
});

test('T21 selling 30 of 60 pays half the margin; the 30 left stay on auto', async ({ page, request }) => {
  await openApp(page);
  await position(page, 'NVDA').getByRole('button', { name: /4x target/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Sell NVDA' });
  await dialog.getByRole('button', { name: 'Half' }).click();
  await expect(dialog.getByLabel('Margin charged now')).toHaveValue('7.46');
  await expect(dialog).toContainText('50% of $14.92 so far (30 of 60 shares)');
  const split = dialog.getByRole('region', { name: 'How this lot’s margin splits' });
  await expect(split).toContainText('30 still open (auto)');
  await expect(split).toContainText('$7.46 so far');
  await expect(dialog.locator('.result__value')).toHaveText('+$154.24');
  await dialog.getByRole('button', { name: 'Sell 30 NVDA' }).click();
  await expect(toast(page)).toContainText('Sold 30 NVDA: +$154.24 realized, 30 still open');

  const trades = (await api.trades(request)).filter((t) => t.symbol === 'NVDA' && t.entryDate === '2026-11-02');
  const closed = trades.find((t) => t.exitDate);
  const open = trades.find((t) => !t.exitDate);
  expect([closed.quantity, closed.margin, closed.realizedPnl, Boolean(closed.splitFrom)]).toEqual([30, 7.46, 154.24, true]);
  expect([open.quantity, open.margin]).toEqual([30, 0]);
});

test('T22 too many shares, no price or an early date are flagged, and nothing is sent', async ({ page, request }) => {
  await openApp(page);
  const before = JSON.stringify(await api.trades(request));
  const dialog = await openExit(page, 'NVDA');
  await dialog.getByLabel('Shares to sell').fill('75');
  await expect(dialog.getByText('This lot has 60 shares. Enter 60 or fewer.')).toBeVisible();
  await dialog.getByLabel('Shares to sell').fill('60');
  await dialog.getByLabel('Sell date').fill('2026-11-01');
  await dialog.getByRole('button', { name: 'Sell 60 NVDA' }).click();
  await expect(dialog.getByText('Enter the sell price.')).toBeVisible();
  await expect(dialog.getByText('The date can’t be before the entry date.')).toBeVisible();
  await expect(dialog.getByLabel('Sell price')).toBeFocused();
  await expect(dialog).toBeVisible();
  expect(JSON.stringify(await api.trades(request))).toBe(before);
});

test('T23 the date starts on today, between the entry date and today', async ({ page }) => {
  await openApp(page);
  const dialog = await openExit(page, 'NVDA');
  const date = dialog.getByLabel('Sell date');
  await expect(date).toHaveValue(TODAY);
  await expect(date).toHaveAttribute('min', '2026-11-02');
  await expect(date).toHaveAttribute('max', TODAY);
});

test('T38 buying back 10 of AMD’s 20 shares pays $8.83 (50% of $17.65): +$58.27', async ({ page, request }) => {
  await openApp(page);
  const dialog = await openExit(page, 'AMD', 'short');
  await expect(dialog.getByRole('radio', { name: /20 shares shorted at \$252\.10/ })).toBeChecked();
  await dialog.getByLabel('Shares to buy back').fill('10');
  await dialog.getByRole('button', { name: /^4x/ }).click();
  await expect(dialog.getByLabel('Buy-back price')).toHaveValue('245.39');
  await expect(dialog.getByLabel('Margin charged now')).toHaveValue('8.83');
  await expect(dialog).toContainText('50% of $17.65 so far (10 of 20 shares)');
  await expect(dialog.locator('.result__value')).toHaveText('+$58.27');
  await dialog.getByRole('button', { name: 'Buy back 10 AMD' }).click();
  await expect(toast(page)).toContainText('Bought back 10 AMD: +$58.27 realized, 10 still open');

  const amd = (await api.trades(request)).filter((t) => t.symbol === 'AMD' && t.entryDate === '2026-10-20');
  const today = amd.find((t) => t.exitDate === TODAY);
  const open = amd.find((t) => !t.exitDate);
  expect([today.margin, today.realizedPnl]).toEqual([8.83, 58.27]);
  expect([open.quantity, open.margin]).toEqual([10, 0]);
  await expect(position(page, 'AMD', 'short').locator('.pos__margin')).toHaveText('$14.22'); // $8.83 + $5.39
});

test('T41 after a partial sale the shares left keep accruing: $7.46 on Nov 9, $8.39 on Nov 10', async ({ page, request }) => {
  const lot = await openLot(request, 'NVDA', '2026-11-02');
  await api.post(request, `/trades/${lot.id}/exit`, { quantity: 30, exitPrice: 191.96, exitDate: TODAY, margin: 7.46 });
  await openApp(page);
  await position(page, 'NVDA').getByRole('button', { name: 'Show NVDA lots' }).click();
  await expect(page.locator('.lot', { hasText: 'Lot · Nov 2' })).toContainText('$7.46');
  await page.clock.setFixedTime(NOON('2026-11-10'));
  await page.reload();
  await expect(page.locator('.lot', { hasText: 'Lot · Nov 2' })).toContainText('$8.39');
});

test('T42 a fixed $20 margin splits $10 now and $10 kept', async ({ page, request }) => {
  const lot = await openLot(request, 'NVDA', '2026-11-02');
  await api.patch(request, `/trades/${lot.id}`, { margin: 20 });
  await openApp(page);
  const dialog = await openExit(page, 'NVDA');
  await dialog.getByRole('button', { name: 'Half' }).click();
  await dialog.getByRole('button', { name: /^4x/ }).click();
  await expect(dialog.getByLabel('Margin charged now')).toHaveValue('10.00');
  const split = dialog.getByRole('region', { name: 'How this lot’s margin splits' });
  await expect(split).toContainText('30 still open (fixed)');
  await expect(split).toContainText('$10.00 kept');
  await dialog.getByRole('button', { name: 'Sell 30 NVDA' }).click();
  await expect(dialog).toBeHidden();

  const trades = (await api.trades(request)).filter((t) => t.symbol === 'NVDA' && t.entryDate === '2026-11-02');
  expect(trades.map((t) => [Boolean(t.exitDate), t.margin]).sort()).toEqual([
    [false, 10],
    [true, 10],
  ]);
});
