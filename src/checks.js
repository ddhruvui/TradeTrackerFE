// Field-by-field checks for the panels. Each returns { field: message } for the
// fields with a problem, in the order they appear, so the first one can take focus.
// The backend checks everything again and explains anything these miss.

const isNumber = (value) => value !== '' && value != null && Number.isFinite(Number(value));

export function newTradeProblems({ symbol, quantity, entryPrice, entryDate, margin, fixedMargin }) {
  const problems = {};
  if (!String(symbol ?? '').trim()) problems.symbol = 'Enter a stock symbol.';
  if (!(isNumber(quantity) && Number(quantity) > 0)) problems.quantity = 'Enter a quantity above 0.';
  if (!(isNumber(entryPrice) && Number(entryPrice) > 0)) problems.entryPrice = 'Enter a price above 0.';
  if (!entryDate) problems.entryDate = 'Pick the date of the trade.';
  if (fixedMargin && !(isNumber(margin) && Number(margin) >= 0)) problems.margin = 'Margin must be $0 or more.';
  return problems;
}

export function exitProblems(lot, { quantity, exitPrice, exitDate, margin }, today) {
  const problems = {};
  const exitWord = lot.side === 'short' ? 'buy back' : 'sell';
  if (!(isNumber(quantity) && Number(quantity) > 0)) {
    problems.quantity = `Enter how many shares to ${exitWord}.`;
  } else if (Number(quantity) > lot.quantity + 1e-9) {
    problems.quantity = `This lot has ${lot.quantity} shares. Enter ${lot.quantity} or fewer.`;
  }
  if (!(isNumber(exitPrice) && Number(exitPrice) > 0)) {
    problems.exitPrice = lot.side === 'short' ? 'Enter the buy-back price.' : 'Enter the sell price.';
  }
  if (!exitDate) problems.exitDate = 'Pick the date.';
  else if (exitDate < lot.entryDate) problems.exitDate = 'The date can’t be before the entry date.';
  else if (exitDate > today) problems.exitDate = 'The date can’t be in the future.';
  if (!(isNumber(margin) && Number(margin) >= 0)) problems.margin = 'Margin must be $0 or more.';
  return problems;
}

export function investmentProblems(amounts) {
  const problems = {};
  for (const [term, value] of Object.entries(amounts)) {
    if (value !== '' && !(isNumber(value) && Number(value) >= 0)) problems[term] = 'Must be $0 or more.';
  }
  return problems;
}

// New trades start on the term being viewed, so they show up in the list.
export const defaultTerm = (filter) => (filter === 'all' ? 'short' : filter);
