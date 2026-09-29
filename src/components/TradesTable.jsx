import { useState } from 'react';
import { TERM_LABELS } from '../labels.js';
import { previewExit } from '../preview.js';
import { heldFor, money, pct, price, qty, shortDate, signedMoney } from '../format.js';

const COLUMN_COUNT = 9;
const isOpen = (trade) => trade.exitPrice == null;
const TERM_WORDS = { short: 'Short', mid: 'Mid', long: 'Long' };
const TERM_STEPS = { short: 1, mid: 2, long: 3 };
const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

// Three rising bars: one for short term, two for mid, three for long.
function TermTag({ term }) {
  return (
    <span className="term" title={TERM_LABELS[term]}>
      <span className="term__bars" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <i key={step} className={step <= TERM_STEPS[term] ? 'on' : undefined} />
        ))}
      </span>
      {TERM_WORDS[term]}
    </span>
  );
}

function StockCell({ trade }) {
  return (
    <th scope="row" className="stock">
      <span className="ticker">{trade.symbol}</span>
      <span className={`badge badge--${trade.side}`}>{trade.side === 'short' ? 'Short' : 'Buy'}</span>
    </th>
  );
}

// Short code with the full name from .env on hover.
function BrokerCell({ trade, brokerNames }) {
  return (
    <td>
      <abbr className="broker" title={brokerNames[trade.broker] ?? trade.broker}>
        {trade.broker}
      </abbr>
    </td>
  );
}

function EntryCell({ trade, today }) {
  return (
    <td className="num">
      {price(trade.entryPrice)}
      <span className="sub">{shortDate(trade.entryDate, today)}</span>
    </td>
  );
}

function EditButton({ trade, onEdit }) {
  return (
    <td className="actions">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onEdit(trade)}
        aria-label={`Edit ${trade.symbol} transaction`}
        title="Edit or delete"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M10.9 2.7a1.6 1.6 0 0 1 2.3 0l.1.1a1.6 1.6 0 0 1 0 2.3L6 12.4l-3.1.7.7-3.1 7.3-7.3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </td>
  );
}

function OpenRow({ trade, today, brokerNames, onExit, onEdit }) {
  const [shares, setShares] = useState(String(trade.quantity));
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState(today);
  const [margin, setMargin] = useState(String(trade.margin ?? 0));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const formId = `exit-${trade.id}`;
  const isShort = trade.side === 'short';
  const priceLabel = isShort ? 'Buy price' : 'Sell price';
  const exit = {
    quantity: shares === '' ? trade.quantity : Number(shares),
    exitPrice: Number(exitPrice),
    exitDate,
    margin: margin === '' ? 0 : Number(margin),
  };
  const preview = exitPrice === '' ? null : previewExit(trade, exit);

  // The backend checks the exit and explains anything wrong (price, shares, date).
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onExit(trade, exit);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="trade trade--open">
      <StockCell trade={trade} />
      <BrokerCell trade={trade} brokerNames={brokerNames} />
      <td>
        <TermTag term={trade.term} />
      </td>
      <td className="num">{qty(trade.quantity)}</td>
      <EntryCell trade={trade} today={today} />
      <td className="num">
        <input
          form={formId}
          className="input input--margin"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={`${trade.symbol} margin, charged when the last shares close`}
          title="Charged when the last shares close"
        />
      </td>
      <td className="exit">
        <form id={formId} className="exit-form" onSubmit={submit} noValidate>
          <input
            className="input input--shares"
            type="number"
            inputMode="decimal"
            min="0"
            max={trade.quantity}
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            aria-label={`Shares to ${isShort ? 'buy back' : 'sell'}, out of ${trade.quantity}`}
            title="Shares to exit. Fewer than the full position leaves the rest open."
          />
          <input
            className="input input--exit-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            placeholder={priceLabel}
            aria-label={priceLabel}
          />
          <input
            className="input input--exit-date"
            type="date"
            min={trade.entryDate}
            max={today}
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            aria-label={isShort ? 'Buy date' : 'Sell date'}
          />
          <button type="submit" className="btn btn--sm btn--exit" disabled={busy}>
            {isShort ? 'Buy' : 'Sell'}
          </button>
        </form>
        {error && (
          <p className="row-error" role="alert">
            {error}
          </p>
        )}
      </td>
      <td className="num">
        {preview == null ? (
          <span className="pill-open">Open</span>
        ) : (
          <>
            <span className={`pnl pnl--preview tone-${tone(preview)}`}>{signedMoney(preview)}</span>
            <span className="sub">if {isShort ? 'bought back' : 'sold'}</span>
          </>
        )}
      </td>
      <EditButton trade={trade} onEdit={onEdit} />
    </tr>
  );
}

// Profit, return % and days held come from the backend.
function ClosedRow({ trade, today, brokerNames, onEdit }) {
  const pnl = trade.realizedPnl;
  const held = heldFor(trade.daysHeld);
  return (
    <tr className="trade">
      <StockCell trade={trade} />
      <BrokerCell trade={trade} brokerNames={brokerNames} />
      <td>
        <TermTag term={trade.term} />
      </td>
      <td className="num">{qty(trade.quantity)}</td>
      <EntryCell trade={trade} today={today} />
      <td className="num">{trade.margin ? money(trade.margin) : <span className="none">—</span>}</td>
      <td className="exit">
        {price(trade.exitPrice)}
        <span className="sub">
          {shortDate(trade.exitDate, today)} · {held}
          {trade.splitFrom ? ' · partial' : ''}
        </span>
      </td>
      <td className="num">
        <span className={`pnl tone-${tone(pnl)}`}>{signedMoney(pnl)}</span>
        <span className="sub">{pct(trade.returnPct)}</span>
      </td>
      <EditButton trade={trade} onEdit={onEdit} />
    </tr>
  );
}

function GroupHead({ title, count, note }) {
  return (
    <tr className="group-head">
      <th colSpan={COLUMN_COUNT} scope="rowgroup">
        <span className="group-head__title">{title}</span>
        <span className="group-head__count">{count}</span>
        <span className="group-head__note">{note}</span>
      </th>
    </tr>
  );
}

export function TradesTable({ rows, today, term, brokerNames, loading, onExit, onEdit }) {
  if (loading) return <p className="table-status">Loading transactions…</p>;

  if (rows.length === 0) {
    return (
      <div className="empty">
        <strong>
          {term === 'all' ? 'No transactions yet' : `No ${TERM_LABELS[term].toLowerCase()} transactions`}
        </strong>
        <span>
          {term === 'all'
            ? 'Add your first buy or short above. It shows up here as an open position.'
            : 'Switch the filter to All to see every transaction.'}
        </span>
      </div>
    );
  }

  const open = rows.filter(isOpen);
  const closed = rows.filter((trade) => !isOpen(trade));

  return (
    <div className="table-wrap">
      <table className="trades">
        <caption className="visually-hidden">
          Transactions, open positions first, then closed trades by exit date
        </caption>
        <thead>
          <tr>
            <th scope="col" className="stock">
              Stock
            </th>
            <th scope="col">Broker</th>
            <th scope="col">Term</th>
            <th scope="col" className="num">
              Qty
            </th>
            <th scope="col" className="num">
              Entry
            </th>
            <th scope="col" className="num">
              Margin
            </th>
            <th scope="col">Exit</th>
            <th scope="col" className="num">
              Realized P&amp;L
            </th>
            <th scope="col" className="actions">
              <span className="visually-hidden">Edit</span>
            </th>
          </tr>
        </thead>
        {open.length > 0 && (
          <tbody>
            <GroupHead
              title="Open"
              count={open.length}
              note="Not realized until you exit. Lower the shares to exit part of a position; margin is charged when the last shares close."
            />
            {open.map((trade) => (
              <OpenRow
                key={`${trade.id}:${trade.quantity}`}
                trade={trade}
                today={today}
                brokerNames={brokerNames}
                onExit={onExit}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        )}
        {closed.length > 0 && (
          <tbody>
            <GroupHead title="Closed" count={closed.length} note="Newest exit first." />
            {closed.map((trade) => (
              <ClosedRow
                key={trade.id}
                trade={trade}
                today={today}
                brokerNames={brokerNames}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
