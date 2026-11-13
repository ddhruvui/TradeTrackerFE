import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centsUp, fullTime, pct2, pctArrow, stampTime } from '../src/format.js';

test('per-share amounts round up to the cent with two decimals', () => {
  assert.equal(centsUp(541.3252), '$541.33');
  assert.equal(centsUp(540.8201), '$540.83');
  assert.equal(centsUp(80.8), '$80.80'); // exact amounts aren't pushed up by float noise
  assert.equal(centsUp(10), '$10.00');
  assert.equal(centsUp(1234.5), '$1,234.50');
});

test('the final amount’s bracket uses two decimals and no plus sign', () => {
  assert.equal(pct2(0.0924), '0.09%');
  assert.equal(pct2(-0.0924), '−0.09%');
  assert.equal(pct2(1.2), '1.20%');
});

test('a share of the investment shows its direction with an arrow', () => {
  assert.equal(pctArrow(10), '↑ 10%');
  assert.equal(pctArrow(-2.5), '↓ 2.5%');
  assert.equal(pctArrow(0.1125), '↑ 0.11%');
  assert.equal(pctArrow(0), '0%');
});

test('the last price time reads in the viewer’s time zone, with today and the year only when needed', () => {
  // Intl may put a narrow no-break space before AM/PM; compare with plain spaces.
  const stamp = (...args) => stampTime(...args)?.replace(/\s/g, ' ') ?? null;
  const at = '2026-11-12T20:32:22.207Z'; // 3:32 PM in New York, 2:02 AM on Nov 13 in Kolkata
  assert.equal(stamp(at, '2026-11-12', 'America/New_York'), 'today, 3:32 PM');
  assert.equal(stamp(at, '2026-11-13', 'America/New_York'), 'Nov 12, 3:32 PM');
  assert.equal(stamp(at, '2026-11-13', 'Asia/Kolkata'), 'today, 2:02 AM');
  assert.equal(stamp(at, '2027-01-04', 'America/New_York'), 'Nov 12, 2026, 3:32 PM');
  assert.equal(stamp(null, '2026-11-12'), null);
  assert.equal(stamp('not a date', '2026-11-12'), null);
  assert.match(fullTime(at, 'America/New_York').replace(/\s/g, ' '), /^Thursday, November 12, 2026 at 3:32:22 PM EST$/);
});
