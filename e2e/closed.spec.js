import { expect, openApp, stat, test } from './fixtures.js';

const openClosed = async (page) => {
  await openApp(page);
  await page.getByRole('tab', { name: /Closed trades/ }).click();
};

test('T24 closed trades group by exit month; November matches This month', async ({ page }) => {
  await openClosed(page);
  const months = page.locator('.month-row');
  await expect(months.locator('.month-row__name')).toHaveText(['November 2026', 'October 2026', 'September 2026']);
  await expect(months.locator('.month-row__total')).toHaveText(['+$528.65', '−$40.58', '+$119.40']);
  const thisMonth = await stat(page, 'This month').locator('.stat__value').textContent();
  await expect(months.first().locator('.month-row__total')).toHaveText(thisMonth);
  await expect(page.locator('.closed-row .ticker')).toHaveText(['NVDA', 'AAPL', 'TSLA', 'AMD', 'COST']);
  await expect(page.locator('.board__tools')).toContainText('5 trades · net +$607.47 · $97.85 margin');

  // Sorting by Trade shows one flat list.
  await page.getByRole('button', { name: 'Trade', exact: true }).click();
  await expect(page.locator('.month-row')).toHaveCount(0);
  await expect(page.locator('.closed-row .ticker')).toHaveText(['AAPL', 'AMD', 'COST', 'NVDA', 'TSLA']);
});

test('T25 the “edited” chip opens the calculated amount from the keyboard', async ({ page }) => {
  await openClosed(page);
  const chip = page.getByRole('button', { name: 'edited' });
  await chip.focus();
  await page.keyboard.press('Enter');
  await expect(chip).toHaveAttribute('aria-expanded', 'true');
  const note = page.locator('.popover');
  await expect(note).toContainText('You entered +$119.40');
  await expect(note).toContainText('Calculated from prices and margin: +$119.78');
  await page.keyboard.press('Tab');
  await expect(note).toBeHidden();
});

test('T26 a partial exit is marked and shows the margin share it paid', async ({ page }) => {
  await openClosed(page);
  const amd = page.locator('.closed-row').filter({ hasText: 'AMD' });
  await expect(amd).toContainText('partial');
  await expect(amd).toContainText('$4.63');
  await expect(amd).toContainText('+$68.37');
});
