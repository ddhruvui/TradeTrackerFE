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

// A symbol's Google Finance page. Google picks the exchange itself: ?q=QCOM goes to
// /finance/quote/QCOM:NASDAQ, ?q=JPM to JPM:NYSE and ?q=BRK-B to BRK.B:NYSE.
export function googleFinanceUrl(symbol) {
  return `https://www.google.com/finance?q=${encodeURIComponent(symbol)}`;
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
