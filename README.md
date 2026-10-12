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

## Deploy on Render

The dashboard is a static site that calls the API on Vercel directly.

1. In Render, choose **New → Blueprint** and pick this repo; `render.yaml` sets everything up. Or choose **New → Static Site** with the build command `npm ci && npm run build`, the publish directory `dist`, and the environment variable `VITE_API_URL=https://tradetrackerbe.vercel.app`.
2. When Render shows the site's address (like `https://trade-tracker-fe.onrender.com`), add it to `CORS_ORIGINS` in the Vercel project for TradeTrackerBE and redeploy the API. Until then the browser blocks the dashboard's calls and the page says so.

`VITE_API_URL` is built into the app, so changing it needs a new Render deploy.

## Where the numbers come from

The backend does all the profit math: `/api/summary` returns the four totals for the viewer's date and term, and `/api/trades` returns the trades sorted and filtered, with each closed trade's profit, return % and days held. The page reloads both after every change.

The amount invested in each term is set with **Set amounts** / **Edit** next to the totals; All is their sum. Each total and each closed trade (in the **Of investment** column) also shows its profit as ↑/↓ % of the investment behind the selected view: that term's amount, or the total under All.

Fractional shares and approximate prices can leave a calculated profit a little off, so a closed trade's Edit window has a **Realized P&L** field: it follows the calculation until you type your broker's final figure, which then counts everywhere. The table marks such rows "edited" and shows the calculated amount on hover.

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
