// The usual watchlist, suggested as you type a symbol. Tape spelling (BRK-B, not BRK.B).
export const WATCHLIST = [
  'AAL', 'AAPL', 'ABBV', 'ABNB', 'ABT', 'ADI', 'ADP', 'AEP', 'AMAT', 'AMD',
  'AMGN', 'AMT', 'AMZN', 'ANET', 'APD', 'APH', 'ARM', 'ASML', 'AVGO', 'AXP',
  'BA', 'BAC', 'BKNG', 'BLK', 'BMY', 'BNY', 'BRK-B', 'C', 'CAT', 'CB',
  'CEG', 'CME', 'COF', 'COP', 'COST', 'CRM', 'CRWD', 'CSCO', 'CSX', 'CTAS',
  'CVX', 'D', 'DASH', 'DDOG', 'DE', 'DELL', 'DHR', 'DIS', 'DLR', 'DUK',
  'ECL', 'EMR', 'EQIX', 'ETN', 'FCX', 'GD', 'GE', 'GEV', 'GILD', 'GLW',
  'GOOG', 'GOOGL', 'GS', 'HD', 'HLT', 'HOOD', 'IBM', 'INTC', 'ISRG', 'JCI',
  'JNJ', 'JPM', 'KLAC', 'KO', 'LIN', 'LLY', 'LMT', 'LOW', 'LRCX', 'MA',
  'MAR', 'MCD', 'MDLZ', 'MDT', 'META', 'MMM', 'MNST', 'MO', 'MPC', 'MRK',
  'MRNA', 'MRVL', 'MS', 'MSFT', 'MU', 'NEE', 'NEM', 'NFLX', 'NOW', 'NUE',
  'NVDA', 'O', 'ORCL', 'PANW', 'PEP', 'PFE', 'PG', 'PGR', 'PH', 'PLD',
  'PLTR', 'PM', 'PSA', 'PSX', 'PWR', 'QCOM', 'QQQ', 'RTX', 'SBUX', 'SCHW',
  'SHW', 'SNOW', 'SO', 'SPG', 'SPGI', 'SPY', 'SRE', 'STX', 'T', 'TJX',
  'TMO', 'TSLA', 'TSM', 'TT', 'TXN', 'UAL', 'UBER', 'UNH', 'UNP', 'UPS',
  'USB', 'V', 'VLO', 'VRTX', 'VST', 'VZ', 'WDC', 'WELL', 'WFC', 'WM',
  'XOM',
];

// Where each symbol trades: the watchlist plus symbols traded off it (CRCL, VOO).
// Checked against Google Finance's quote pages in Nov 2026. Add a symbol here when
// you start trading one that isn't listed.
const LISTINGS = {
  NASDAQ: [
    'AAL', 'AAPL', 'ABNB', 'ADI', 'ADP', 'AEP', 'AMAT', 'AMD', 'AMGN', 'AMZN',
    'ARM', 'ASML', 'AVGO', 'BKNG', 'CEG', 'CME', 'COST', 'CRWD', 'CSCO', 'CSX',
    'CTAS', 'DASH', 'DDOG', 'EQIX', 'GILD', 'GOOG', 'GOOGL', 'HLT', 'HOOD', 'INTC',
    'ISRG', 'KLAC', 'LIN', 'LRCX', 'MAR', 'MDLZ', 'META', 'MNST', 'MRNA', 'MRVL',
    'MSFT', 'MU', 'NFLX', 'NVDA', 'PANW', 'PEP', 'PLTR', 'QCOM', 'QQQ', 'SBUX',
    'STX', 'TSLA', 'TXN', 'UAL', 'VRTX', 'WDC',
  ],
  NYSE: [
    'ABBV', 'ABT', 'AMT', 'ANET', 'APD', 'APH', 'AXP', 'BA', 'BAC', 'BLK',
    'BMY', 'BNY', 'BRK-B', 'C', 'CAT', 'CB', 'COF', 'COP', 'CRCL', 'CRM',
    'CVX', 'D', 'DE', 'DELL', 'DHR', 'DIS', 'DLR', 'DUK', 'ECL', 'EMR',
    'ETN', 'FCX', 'GD', 'GE', 'GEV', 'GLW', 'GS', 'HD', 'IBM', 'JCI',
    'JNJ', 'JPM', 'KO', 'LLY', 'LMT', 'LOW', 'MA', 'MCD', 'MDT', 'MMM',
    'MO', 'MPC', 'MRK', 'MS', 'NEE', 'NEM', 'NOW', 'NUE', 'O', 'ORCL',
    'PFE', 'PG', 'PGR', 'PH', 'PLD', 'PM', 'PSA', 'PSX', 'PWR', 'RTX',
    'SCHW', 'SHW', 'SNOW', 'SO', 'SPG', 'SPGI', 'SRE', 'T', 'TJX', 'TMO',
    'TSM', 'TT', 'UBER', 'UNH', 'UNP', 'UPS', 'USB', 'V', 'VLO', 'VST',
    'VZ', 'WELL', 'WFC', 'WM', 'XOM',
  ],
  NYSEARCA: [
    'SPY', 'VOO',
  ],
};

const EXCHANGES = new Map(
  Object.entries(LISTINGS).flatMap(([exchange, symbols]) => symbols.map((symbol) => [symbol, exchange])),
);

export const exchangeOf = (symbol) => EXCHANGES.get(symbol);

// A symbol's Google Finance quote page, like /finance/quote/ADI:NASDAQ. Google writes
// class shares with a dot (BRK-B is BRK.B:NYSE). A symbol with no known exchange falls
// back to Google's ?q= search, which finds some symbols but lands others (ADI, AMD,
// META, VOO…) on the Finance home page, so the listing above is what makes it reliable.
export function googleFinanceUrl(symbol) {
  const exchange = exchangeOf(symbol);
  if (!exchange) return `https://www.google.com/finance?q=${encodeURIComponent(symbol)}`;
  return `https://www.google.com/finance/quote/${encodeURIComponent(symbol.replace('-', '.'))}:${exchange}`;
}

// Symbols matching what's typed: an exact match first, then ones that start with it,
// then ones that contain it. Within each, symbols already traded come before the watchlist.
// Returns [{ symbol, traded }].
export function suggestTickers(typed, traded = [], limit = 8) {
  const q = typed.trim().toUpperCase();
  if (!q) return [];
  const tradedSet = new Set(traded);
  const all = [...new Set([...[...tradedSet].sort(), ...WATCHLIST])];
  const rank = (symbol) => {
    if (symbol === q) return 0;
    if (symbol.startsWith(q)) return 1;
    if (symbol.includes(q)) return 2;
    return -1;
  };
  return all
    .map((symbol) => ({ symbol, traded: tradedSet.has(symbol), rank: rank(symbol) }))
    .filter((s) => s.rank >= 0)
    .sort((a, b) => a.rank - b.rank || b.traded - a.traded || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map(({ symbol, traded }) => ({ symbol, traded }));
}
