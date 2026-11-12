import { api, choose, expect, openApp, position, stat, test, toast } from './fixtures.js';

async function editClosed(page, symbol, exitDate) {
  await openApp(page);
  await page.getByRole('tab', { name: /Closed trades/ }).click();
  await page.getByRole('button', { name: `Edit the ${symbol} trade closed ${exitDate}` }).click();
  return page.getByRole('dialog', { name: `Edit ${symbol}` });
}

// More actions sits at the end of the panel's scrolling body, below the fold on a
// closed trade; clicking it also proves nothing overlaps it there.
const openMoreActions = (dialog) => dialog.getByText('More actions').click();

async function editNvdaNov2(page) {
  await openApp(page);
  await position(page, 'NVDA').getByRole('button', { name: 'Show NVDA lots' }).click();
  await page.getByRole('button', { name: 'Edit the NVDA lot from Nov 2, including its margin' }).click();
  return page.getByRole('dialog', { name: 'Edit NVDA lot' });
}

test('T27 your broker’s figure counts everywhere; “Use the calculated amount” reverts', async ({ page }) => {
  let dialog = await editClosed(page, 'NVDA', 'Nov 6');
  await dialog.getByRole('switch', { name: /Use my broker/ }).click();
  await dialog.getByLabel('Realized P&L').fill('250');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(toast(page)).toContainText('Saved changes to NVDA');
  const row = page.locator('.closed-row').filter({ hasText: 'NVDA' });
  await expect(row).toContainText('+$250.00');
  await expect(row.getByRole('button', { name: 'edited' })).toBeVisible();
  await expect(stat(page, 'This week').locator('.stat__value')).toHaveText('+$250.00');

  await page.getByRole('button', { name: 'Edit the NVDA trade closed Nov 6' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit NVDA' });
  await dialog.getByRole('button', { name: 'Use the calculated amount' }).click();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('+$253.25');
  await expect(row.getByRole('button', { name: 'edited' })).toHaveCount(0);
});

test('T28 Reopen asks first, then moves the trade back to Open', async ({ page, request }) => {
  const dialog = await editClosed(page, 'TSLA', 'Oct 31');
  await openMoreActions(dialog);
  await dialog.getByRole('button', { name: 'Reopen…' }).click();
  await expect(dialog.getByText('Reopen this trade?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Reopen', exact: true }).click();
  await expect(toast(page)).toContainText('Reopened TSLA');
  await expect(page.getByRole('tab', { name: /Open positions/ })).toHaveAttribute('aria-selected', 'true');
  await expect(position(page, 'TSLA', 'short')).toBeVisible();
  expect((await api.trades(request)).find((t) => t.symbol === 'TSLA').exitPrice).toBeNull();
});

test('T29 Delete asks first and says it can’t be undone', async ({ page, request }) => {
  const dialog = await editClosed(page, 'TSLA', 'Oct 31');
  await openMoreActions(dialog);
  await expect(dialog).toContainText('This can’t be undone.');
  await dialog.getByRole('button', { name: 'Delete…' }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(toast(page)).toContainText('Deleted the TSLA transaction');
  expect((await api.trades(request)).some((t) => t.symbol === 'TSLA')).toBe(false);
});

test('T30 closing with unsaved changes asks “Discard your changes?”', async ({ page, request }) => {
  const dialog = await editNvdaNov2(page);
  await dialog.getByLabel('Shares').fill('61');
  await page.keyboard.press('Escape');
  await expect(dialog.getByText('Discard your changes?')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(dialog.getByLabel('Shares')).toHaveValue('61');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect(dialog).toBeHidden();
  expect((await api.trades(request)).find((t) => t.symbol === 'NVDA' && t.entryDate === '2026-11-02').quantity).toBe(60);
});

test('T39 a fixed margin on an open lot previews its effect on the position before saving', async ({ page }) => {
  const dialog = await editNvdaNov2(page);
  await choose(dialog, 'Fixed amount');
  await dialog.getByLabel('Fixed margin').fill('20');
  const effect = dialog.getByRole('region', { name: 'Effect on the NVDA position' });
  await expect(effect).toContainText('$18.12 → $23.20');
  await expect(effect).toContainText('$188.19 → $188.25');
  await expect(effect).toContainText('$191.85 / $192.83 / $194.79 / $200.68');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  const lot = page.locator('.lot', { hasText: 'Lot · Nov 2' });
  await expect(lot).toContainText('$20.00');
  await expect(lot).toContainText('fixed');
  await expect(position(page, 'NVDA').locator('.pos__be')).toHaveText('$188.25');
});

test('T40 back to Auto: $0 means Auto, and the lot accrues 6%/yr again', async ({ page, request }) => {
  const lot = (await api.trades(request)).find((t) => t.symbol === 'NVDA' && t.entryDate === '2026-11-02');
  await api.patch(request, `/trades/${lot.id}`, { margin: 20 });
  const dialog = await editNvdaNov2(page);
  await expect(dialog.getByRole('radio', { name: 'Fixed amount' })).toBeChecked();
  await dialog.getByLabel('Fixed margin').fill('0');
  await expect(dialog).toContainText('$0 means Auto: it goes back to 6%/yr ($14.92 so far).');
  await choose(dialog, 'Auto · 6%/yr');
  await expect(dialog).toContainText('$14.92 so far');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.lot', { hasText: 'Lot · Nov 2' })).toContainText('$14.92');
  expect((await api.trades(request)).find((t) => t.id === lot.id).margin).toBe(0);
});
