// What an exit would realize, shown live on the open row before you confirm.
// The backend does the real math when you submit; this mirrors its rule:
// price move × shares, minus margin only when the exit closes the last shares.
// Returns null until the inputs describe a valid exit.
export function previewExit(trade, { quantity, exitPrice, margin = 0 }) {
  if (!(exitPrice > 0) || !(quantity > 0) || !(margin >= 0)) return null;
  if (quantity > trade.quantity + 1e-9) return null;

  const perShare =
    trade.side === 'short' ? trade.entryPrice - exitPrice : exitPrice - trade.entryPrice;
  const closesPosition = Math.round((trade.quantity - quantity) * 1e6) <= 0;
  const cents =
    Math.round(perShare * quantity * 100) - (closesPosition ? Math.round(margin * 100) : 0);
  return cents / 100;
}
