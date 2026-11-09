import { api, choose, expect, openApp, test, toast } from './fixtures.js';

const newTrade = async (page) => {
  await page.getByRole('button', { name: /^New trade/ }).click();
  return page.getByRole('dialog', { name: 'New trade' });
};

async function fillTrade(dialog, { symbol, shares, price }) {
  await dialog.getByLabel('Stock').fill(symbol);
  await dialog.getByLabel('Shares').fill(shares);
  await dialog.getByLabel(/^(Buy|Short) price$/).fill(price);
}

test('T06 N opens New trade with focus in Stock; Esc closes it', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('n');
  const dialog = page.getByRole('dialog', { name: 'New trade' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Stock')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('T07 symbol suggestions put traded symbols first; arrows and Enter pick, Esc closes the list', async ({ page }) => {
  await openApp(page);
  const dialog = await newTrade(page);
  const stock = dialog.getByLabel('Stock');
  await stock.fill('am');
  const options = dialog.getByRole('option');
  await expect(options).toHaveText([/^AMD/, 'AMAT', 'AMGN', 'AMT', 'AMZN']);
  await expect(options.first()).toContainText('traded before');
  for (let i = 0; i < 4; i += 1) await stock.press('ArrowDown');
  await stock.press('Enter');
  await expect(stock).toHaveValue('AMZN');
  await expect(dialog.getByRole('listbox')).toBeHidden();

  await stock.fill('ms');
  await expect(dialog.getByRole('listbox')).toBeVisible();
  await stock.press('Escape');
  await expect(dialog.getByRole('listbox')).toBeHidden();
  await expect(dialog).toBeVisible(); // Esc closed the list, not the panel
});

test('T08 submitting an empty form flags each field, focuses the first, and sends nothing', async ({ page, request }) => {
  await openApp(page);
  const before = (await api.trades(request)).length;
  const dialog = await newTrade(page);
  await dialog.getByRole('button', { name: 'Add buy' }).click();
  await expect(dialog.locator('.field__error')).toHaveText([
    'Enter a stock symbol.',
    'Enter a quantity above 0.',
    'Enter a price above 0.',
  ]);
  await expect(dialog.getByLabel('Stock')).toBeFocused();
  await expect(dialog.getByLabel('Stock')).toHaveAttribute('aria-invalid', 'true');
  expect((await api.trades(request)).length).toBe(before);
});

test('T09 while viewing Mid term, a new trade starts as Mid-term and shows in the list', async ({ page, request }) => {
  await openApp(page);
  await choose(page.getByRole('group', { name: 'Show terms' }), 'Mid term');
  await expect(page.locator('.pos .ticker')).toHaveText(['AMD']);
  const dialog = await newTrade(page);
  await expect(dialog.getByRole('radio', { name: 'Mid-term' })).toBeChecked();
  await expect(dialog).toContainText('Starts on Mid term, the term you’re viewing.');
  await fillTrade(dialog, { symbol: 'AMZN', shares: '25', price: '231.40' });
  await dialog.getByRole('button', { name: 'Add buy' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.pos .ticker')).toHaveText(['AMD', 'AMZN']);
  expect((await api.trades(request)).find((t) => t.symbol === 'AMZN').term).toBe('mid');
});

test('T10 switching to Short renames the price and the button', async ({ page }) => {
  await openApp(page);
  const dialog = await newTrade(page);
  await choose(dialog, /^Short Sell first/);
  await expect(dialog.getByLabel('Short price')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Add short' })).toBeVisible();
  await expect(dialog.locator('.side-card--short')).toHaveCSS('border-color', /rgb\(148, 72, 10\)/);
});

test('T11 adding a trade confirms it in a toast and saves it with auto margin', async ({ page, request }) => {
  await openApp(page);
  const dialog = await newTrade(page);
  await fillTrade(dialog, { symbol: 'AMZN', shares: '25', price: '231.40' });
  await expect(dialog).toContainText('Buy 25 AMZN at $231.40');
  await expect(dialog).toContainText('$5,785.00');
  await expect(dialog).toContainText('about $0.97 a day');
  await dialog.getByRole('button', { name: 'Add buy' }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page)).toContainText('Added AMZN at Robinhood: buy of 25 at $231.40');
  const amzn = (await api.trades(request)).find((t) => t.symbol === 'AMZN');
  expect([amzn.broker, amzn.term, amzn.margin, amzn.entryDate]).toEqual(['R', 'short', 0, '2026-11-09']);
});

test('T12 a fixed margin is saved as typed', async ({ page, request }) => {
  await openApp(page);
  const dialog = await newTrade(page);
  await fillTrade(dialog, { symbol: 'UBER', shares: '10', price: '90' });
  await dialog.getByRole('button', { name: 'Fixed $' }).click();
  await dialog.getByLabel('Fixed margin in dollars').fill('20');
  await expect(dialog).toContainText('Fixed: $20.00, taken off profit as you exit');
  await dialog.getByRole('button', { name: 'Add buy' }).click();
  await expect(dialog).toBeHidden();
  expect((await api.trades(request)).find((t) => t.symbol === 'UBER').margin).toBe(20);
});
