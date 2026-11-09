// What an exit would realize, shown live in the Exit panel before you confirm.
// The backend does the real math when you submit; this mirrors its rule:
// price move × shares, minus the margin this exit pays. Every exit pays its share
// of the margin (see exitMarginSplit in marginCharge.js), so `margin` here is that share.
// Returns null until the inputs describe a valid exit.
export function previewExit(trade, { quantity, exitPrice, margin = 0 }) {
  if (!(exitPrice > 0) || !(quantity > 0) || !(margin >= 0)) return null;
  if (quantity > trade.quantity + 1e-9) return null;

  const perShare =
    trade.side === 'short' ? trade.entryPrice - exitPrice : exitPrice - trade.entryPrice;
  const cents = Math.round(perShare * quantity * 100) - Math.round(margin * 100);
  return cents / 100;
}

// The calculated profit or loss of a closed trade from the Edit panel's fields.
// The whole position has exited, so all its margin comes off. Null until the fields make sense.
export function calculatedPnl({ side, quantity, entryPrice, exitPrice, margin = 0 }) {
  if (!(entryPrice > 0)) return null;
  return previewExit({ side, quantity, entryPrice }, { quantity, exitPrice, margin });
}
