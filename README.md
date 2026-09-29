# Trade Tracker

The React dashboard for Trade Tracker. It shows realized profit for this week (Friday to Thursday), this month, this year and overall, and lists your trades, open positions first. Add buys and shorts, exit them in place (fully or partly), and filter everything by term.

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
| `npm test` | Tests for the live exit preview |

## Where the numbers come from

The backend does all the profit math: `/api/summary` returns the four totals for the viewer's date and term, and `/api/trades` returns the trades sorted and filtered, with each closed trade's profit, return % and days held. The page reloads both after every change.

The one calculation here is the live "if sold" preview on open rows (`src/preview.js`). It mirrors the backend's exit rule (price move × shares, minus margin on the exit that closes the last shares), so change both together.

## Layout

```
src/
  App.jsx          data loading and page layout
  api.js           calls to the backend
  preview.js       live exit preview
  components/      summary tiles, entry form, trades table, edit dialog
  format.js        money, percent and date formatting
  styles.css       light and dark themes
test/              node:test suite for preview.js
```
