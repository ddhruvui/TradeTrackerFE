import { api, choose, expect, openApp, position, stat, test } from './fixtures.js';

test('T31 when the API is down: one banner, Unavailable totals, and the badge stays', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Test database', { exact: true })).toBeVisible();
  await page.route('**/api/**', (route) => route.fulfill({ status: 502, body: '' }));
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: 'Can’t load your trades' })).toBeVisible();
  await expect(page.locator('.stat').getByText('Unavailable', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Test database', { exact: true })).toBeVisible();

  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Can’t load your trades')).toBeHidden();
  await expect(stat(page, 'This week').locator('.stat__value')).toHaveText('+$253.25');
});

test.describe('with no trades', () => {
  test.use({ seed: false });

  test('T32 an empty database invites the first trade', async ({ page }) => {
    await openApp(page);
    const empty = page.locator('.empty');
    await expect(empty.getByRole('heading', { name: 'Start your trade log' })).toBeVisible();
    await expect(empty).toContainText('or press N');
    await empty.getByRole('button', { name: 'New trade' }).click();
    await expect(page.getByRole('dialog', { name: 'New trade' })).toBeVisible();
  });

  test('T33 a term with nothing in it offers both ways out', async ({ page, request }) => {
    await api.post(request, '/trades', {
      symbol: 'PLTR',
      side: 'buy',
      term: 'short',
      quantity: 40,
      entryPrice: 182.35,
      entryDate: '2026-11-03',
    });
    await openApp(page);
    await choose(page.getByRole('group', { name: 'Show terms' }), 'Mid term');
    const empty = page.locator('.empty');
    await expect(empty.getByRole('heading', { name: 'No mid-term trades' })).toBeVisible();
    await empty.getByRole('button', { name: 'New mid-term trade' }).click();
    const dialog = page.getByRole('dialog', { name: 'New trade' });
    await expect(dialog.getByRole('radio', { name: 'Mid-term' })).toBeChecked();
    await page.keyboard.press('Escape');
    await empty.getByRole('button', { name: 'Show all terms' }).click();
    await expect(page.getByRole('radio', { name: 'All' })).toBeChecked();
    await expect(position(page, 'PLTR')).toBeVisible();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test('T34 no sideways scrolling; positions are cards; Sell is reachable; tap targets are 44px', async ({ page }) => {
    await openApp(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await expect(page.locator('.list__head')).toBeHidden();
    const nvda = position(page, 'NVDA');
    const card = await nvda.boundingBox();
    expect(card.x + card.width).toBeLessThanOrEqual(375);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.list button, .fab, .tab')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.height < 44 || r.width < 44);
        })
        .map((el) => el.textContent.trim()),
    );
    expect(small).toEqual([]);
    await expect(page.getByRole('button', { name: 'New trade', exact: true })).toBeVisible(); // the floating button

    await nvda.getByRole('button', { name: 'Sell NVDA', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Sell NVDA' });
    await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished))); // let it slide in
    const sheet = await dialog.boundingBox();
    expect(Math.round(sheet.y + sheet.height)).toBe(812); // a bottom sheet
    expect(Math.round(sheet.width)).toBe(375);
  });
});

// Text colors against the surfaces they sit on, from the theme's own tokens.
async function contrastRatios(page) {
  return page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const hex = (name) => css.getPropertyValue(name).trim();
    const lum = (h) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) =>
        c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (fg, bg) => {
      const [a, b] = [lum(hex(fg)), lum(hex(bg))].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    };
    const pairs = [
      ['--ink', '--surface'], ['--ink-2', '--sunken'], ['--muted', '--surface'], ['--muted', '--surface-2'],
      ['--muted', '--bg'], ['--gain', '--surface'], ['--loss', '--surface'], ['--gain', '--gain-soft'],
      ['--loss', '--loss-soft'], ['--buy', '--buy-soft'], ['--short', '--short-soft'], ['--warn', '--warn-soft'],
      ['--on-primary', '--primary'],
    ];
    return Object.fromEntries(pairs.map(([fg, bg]) => [`${fg} on ${bg}`, Math.round(ratio(fg, bg) * 100) / 100]));
  });
}

test('T35a light theme: text is 4.5:1 or better', async ({ page }) => {
  await openApp(page);
  for (const [pair, value] of Object.entries(await contrastRatios(page))) expect(value, pair).toBeGreaterThanOrEqual(4.5);
});

test.describe('in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('T35b dark theme follows the system, and text is 4.5:1 or better', async ({ page }) => {
    await openApp(page);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(14, 18, 17)');
    for (const [pair, value] of Object.entries(await contrastRatios(page))) expect(value, pair).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('T36 panels appear without sliding', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /^New trade/ }).click();
    const dialog = page.getByRole('dialog', { name: 'New trade' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});

test('T37 values read with their sign; sides read Buy or Short; lists are real tables', async ({ page }) => {
  await openApp(page);
  await expect(stat(page, 'This week').locator('.stat__value')).toHaveText(/^\+\$/);
  await expect(position(page, 'SNOW', 'short').locator('.side-pill')).toHaveText('Short');
  await expect(position(page, 'MSFT').locator('.side-pill')).toHaveText('Buy');
  await expect(page.getByRole('table', { name: 'Open positions' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Break-even' })).toBeVisible();
  await page.getByRole('tab', { name: /Closed trades/ }).click();
  const tsla = page.locator('.closed-row').filter({ hasText: 'TSLA' });
  await expect(tsla).toContainText('−$108.95');
  await expect(tsla).toContainText('↓ 0.27%');
});
