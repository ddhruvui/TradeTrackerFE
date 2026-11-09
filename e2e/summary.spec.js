import { api, choose, expect, openApp, stat, test } from './fixtures.js';

const terms = (page) => page.getByRole('group', { name: 'Show terms' });

test('T01 this week shows the signed total, its share of invested, count and margin', async ({ page }) => {
  await openApp(page);
  const week = stat(page, 'This week');
  await expect(week).toContainText('Fri, Nov 6 – Thu, Nov 12');
  await expect(week.locator('.stat__value')).toHaveText('+$253.25');
  await expect(week).toContainText('↑ 0.63%');
  await expect(week).toContainText('1 closed trade · $11.75 margin');
  await expect(stat(page, 'This month').locator('.stat__value')).toHaveText('+$528.65');
  await expect(stat(page, 'This year').locator('.stat__value')).toHaveText('+$607.47');
  await expect(stat(page, 'Overall')).toContainText('Since Jul 14, 2026');
  await expect(stat(page, 'Overall')).toContainText('5 closed trades · $97.85 margin');
});

test('T02 a period with no closed trades shows $0.00 in muted grey', async ({ page }) => {
  await openApp(page);
  await choose(terms(page), 'Long term');
  const week = stat(page, 'This week');
  await expect(week.locator('.stat__value')).toHaveText('$0.00');
  await expect(week.locator('.stat__value')).toHaveClass(/tone-flat/);
  await expect(week).toContainText('No closed trades');
  await expect(stat(page, 'This month').locator('.stat__value')).toHaveText('+$275.40');
});

test('T03 the term filter narrows totals and lists, and is remembered', async ({ page }) => {
  await openApp(page);
  await choose(terms(page), 'Mid term');
  await expect(page.getByText('Mid term · as of Monday, November 9, 2026')).toBeVisible();
  await expect(page.locator('.pos .ticker')).toHaveText(['AMD']);
  await expect(stat(page, 'Invested').locator('.stat__amount')).toHaveText('$10,000.00');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Mid term' })).toBeChecked();
  await expect(page.locator('.pos .ticker')).toHaveText(['AMD']);
});

test('T04 invested amounts save, and the split shows without hovering', async ({ page, request }) => {
  await api.patch(request, '/investment', { short: 0, mid: 0, long: 0 });
  await openApp(page);
  const card = stat(page, 'Invested');
  await card.getByRole('button', { name: 'Set amounts' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invested amounts' });
  await dialog.getByLabel('Short-term').fill('10000');
  await dialog.getByLabel('Mid-term').fill('10000');
  await dialog.getByLabel('Long-term').fill('20000');
  await expect(dialog).toContainText('$40,000.00');
  await dialog.getByRole('button', { name: 'Save amounts' }).click();
  await expect(dialog).toBeHidden();
  await expect(card.locator('.stat__amount')).toHaveText('$40,000.00');
  await expect(card).toContainText('Short $10,000');
  await expect(card).toContainText('Long $20,000');
  await expect(stat(page, 'This week')).toContainText('↑ 0.63%');
});

test('T05 a negative amount is flagged on its field and nothing is saved', async ({ page, request }) => {
  await openApp(page);
  await stat(page, 'Invested').getByRole('button', { name: 'Edit amounts' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invested amounts' });
  const long = dialog.getByLabel('Long-term');
  await long.fill('-5');
  await dialog.getByRole('button', { name: 'Save amounts' }).click();
  await expect(dialog.getByText('Must be $0 or more.')).toBeVisible();
  await expect(long).toBeFocused();
  await expect(long).toHaveAttribute('aria-invalid', 'true');
  expect((await api.get(request, '/investment')).long).toBe(20000);
});
