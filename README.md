# Trade Tracker

The React dashboard for Trade Tracker. It leads with realized profit for this week (Friday to Thursday), this month, this year and overall, then lists your open positions and closed trades on two tabs. Every action opens in one side panel (a bottom sheet on phones): **New trade** (the header button, or press **N**), **Sell** / **Buy back** on a position (fully or partly), **Edit** on a lot or a closed trade, and **Edit amounts** for what you've invested. The term filter in the header narrows everything, and new trades start on the term you're viewing.

It needs the API from [TradeTrackerBE](https://github.com/ddhruvui/TradeTrackerBE) running.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, with /api sent to the backend
```

Start TradeTrackerBE first (`npm run dev` there). By default this app expects it at `http://127.0.0.1:4000`; to change that, copy `.env.example` to `.env` and set `API_URL`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the build on :4173, also sending `/api` to the backend |
| `npm test` | Unit tests for the margin, exit preview, grouping, sorting, field checks and formatting |
| `npm run test:e2e` | End-to-end tests in a real browser against the real API (below) |

## End-to-end tests

`npm run test:e2e` runs the Playwright suite in `e2e/`: one test per case in the UX test plan (T01–T42), about two minutes. It starts its own API (port 4100) and dev server (port 5174), so it doesn't touch a running `npm run dev`, and drives your installed Google Chrome, so there's no browser to download.

- The API uses the MongoDB cluster from TradeTrackerBE's `.env`, forced onto a separate database, `TradeTrackerE2E` (set `E2E_DB` to pick another). **Every test clears that database** and seeds the sample trades in `e2e/fixtures.js`; it refuses to run unless the API reports the test database.
- The browser's clock is fixed at noon on Nov 9, 2026, so margins, periods and targets are exact numbers.
- On a failure, `test-results/` holds a trace: `npx playwright show-trace test-results/<test>/trace.zip`.

## Deploy on Render

The dashboard is a static site that calls the API on Vercel directly.

1. In Render, choose **New → Blueprint** and pick this repo; `render.yaml` sets everything up. Or choose **New → Static Site** with the build command `npm ci && npm run build`, the publish directory `dist`, and the environment variable `VITE_API_URL=https://tradetrackerbe.vercel.app`.
2. When Render shows the site's address (like `https://trade-tracker-fe.onrender.com`), add it to `CORS_ORIGINS` in the Vercel project for TradeTrackerBE and redeploy the API. Until then the browser blocks the dashboard's calls and the page says so.

`VITE_API_URL` is built into the app, so changing it needs a new Render deploy.

## Where the numbers come from

The backend does all the profit math: `/api/summary` returns the four totals for the viewer's date and term, and `/api/trades` returns the trades sorted and filtered, with each closed trade's profit, return % and days held. The page reloads both after every change.

The amount invested in each term is set from the **Invested** card at the end of the totals; All is their sum, and the card shows the split. Each total and each closed trade (in the **Of invested** column) also shows its profit as ↑/↓ % of the investment behind the selected view: that term's amount, or the total under All.

Fractional shares and approximate prices can leave a calculated profit a little off, so a closed trade's Edit panel has **Use my broker's figure**: switch it on and type your broker's final profit or loss, which then counts everywhere. The list marks such trades "edited"; the chip opens the calculated amount next to yours.

**Margin** is a margin you typed in (Fixed), or else Auto at 6% a year: ROUNDUP(shares × days × entry price × 6 / 36000, 2), rounded up to the cent, with days counted from the buy or short date (that day is day 1) to today or the exit date (`src/marginCharge.js`). Every exit pays its share of it: selling 10 of 20 shares charges half the margin so far, and the shares left keep accruing (Auto) or keep the rest (Fixed). The Exit panel shows both amounts before you confirm, and the backend's `marginSplit` saves the same split.

Open trades are grouped by ticker and side into positions, listed A→Z with buys before shorts (`src/openGroups.js`). Each position shows its shares, the share-weighted **Avg entry**, the **Margin to date** of its lots, and its **Break-even** per share: (cost + margin) ÷ shares for a buy, (cost − margin) ÷ shares for a short. The **Exit targets** sit 2%, 5% and 6% past break-even (rounded up for buys, down for shorts); clicking one opens the Exit panel with that price. Expand a position to see its lots, each with its own Sell and Edit.

Closed trades sorted by exit date are grouped by month, with subtotals that match the period totals (`src/closedGroups.js`).

The one profit calculation here is the live result in the Exit panel (`src/preview.js`). It mirrors the backend's exit rule (price move × shares, minus the margin this exit pays), so change both together.

## Layout

```
src/
  App.jsx              data loading, page layout, panels, the N shortcut
  api.js               calls to the backend
  marginCharge.js      6%/yr margin and how an exit splits it
  preview.js           live exit result
  openGroups.js        positions, break-even and exit targets
  closedGroups.js      closed trades by exit month
  checks.js            field-by-field checks for the panels
  sortTrades.js        column sorting
  tickers.js           symbol suggestions
  format.js            money, percent and date formatting
  components/
    Panel.jsx          the side panel / bottom sheet every action opens in
    SummaryStrip.jsx   realized-profit totals and the Invested card
    OpenPositions.jsx  open positions and their lots
    ClosedTrades.jsx   closed trades, grouped by month
    NewTradePanel.jsx, ExitPanel.jsx, EditPanel.jsx, InvestmentPanel.jsx
    Controls.jsx, Icons.jsx, States.jsx, SymbolInput.jsx, Toast.jsx
  styles.css           light and dark themes; cards instead of tables below 820px
test/                  node:test suites for the files above
e2e/                   Playwright tests, one per UX test-plan case
```
