// The term filter and summaries say "Short term"; a trade's own term reads "Short-term"
// so it never looks like the Short side (a short sale).
export const TERM_LABELS = { short: 'Short term', mid: 'Mid term', long: 'Long term' };
export const TERM_NAMES = { short: 'Short-term', mid: 'Mid-term', long: 'Long-term' };
export const TERM_LEVEL = { short: 1, mid: 2, long: 3 };
export const TERMS = ['short', 'mid', 'long'];

export const sideLabel = (side) => (side === 'short' ? 'Short' : 'Buy');
// The word for leaving a position: sell a buy, buy back a short.
export const exitVerb = (side) => (side === 'short' ? 'Buy back' : 'Sell');
