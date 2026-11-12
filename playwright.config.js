import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the real API on a throwaway database, and this app's dev server,
// on their own ports so they never touch a running `npm run dev`. Every test resets
// the database and seeds the sample trades (e2e/fixtures.js), with the browser's
// clock fixed to Nov 9, 2026 so every number is checkable.
//
// The database is E2E_DB (default TradeTrackerE2E) on the cluster in TradeTrackerBE's
// .env, forced with TEST_DB=true. The tests clear it before each test.
export const E2E_DB = process.env.E2E_DB ?? 'TradeTrackerE2E';
const API_PORT = 4100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  // One shared database, so one test at a time.
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    // The installed Google Chrome; no browser download needed.
    channel: 'chrome',
    timezoneId: 'UTC',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'npm --prefix ../TradeTrackerBE start',
      // LAST_PRICE_DB: last prices come from the e2e database (none), not the live upload;
      // tests that need them answer /api/prices themselves.
      env: { TEST_DB: 'true', MONGO_DB_Test: E2E_DB, LAST_PRICE_DB: E2E_DB, API_PORT: String(API_PORT), HOST: '127.0.0.1' },
      url: `http://127.0.0.1:${API_PORT}/api/info`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      env: { API_URL: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
