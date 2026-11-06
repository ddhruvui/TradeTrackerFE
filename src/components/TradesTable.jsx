import { useState } from 'react';
import { TERM_LABELS } from '../labels.js';
import { previewExit } from '../preview.js';
import { marginCharge } from '../marginCharge.js';
import { groupOpenTrades, targetPrices } from '../openGroups.js';
import {
  centsUp,
  heldFor,
  money,
  pct,
  pctArrow,
  price,
  qty,
  shortDate,
  signedMoney,
} from '../format.js';

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


// A ticker's share-weighted averages over its open lots (buys and shorts separately),
// in cells spanning that ticker's rows.
function GroupAverageCells({ group }) {
  const rows = group.trades.length;
  const shares = `${qty(group.shares)} ${group.shares === 1 ? 'share' : 'shares'}`;
  return (
    <>
      <td
        className="num group-avg"
        rowSpan={rows}
        title={`Average ${group.side === 'short' ? 'short' : 'buy'} price over ${shares} of ${group.symbol}`}
      >
        {centsUp(group.avgValue)}
        <span className="sub">{shares}</span>
      </td>
      <td
        className="num group-avg"
        rowSpan={rows}
        title={`Average final amount over ${shares} of ${group.symbol}`}
      >
        {centsUp(group.finalAvg)}
        <span className="sub">per share</span>
      </td>
      <td
        className="num group-avg"
        rowSpan={rows}
        title={`Exit targets ${group.side === 'short' ? 'below' : 'above'} the Final avg amt of ${centsUp(group.finalAvg)}`}
      >
        <dl className="targets">
          {targetPrices(group.side, group.finalAvg).map(({ pct, price: target }) => (
            <div key={pct} className="targets__row">
              <dt>{pct}%</dt>
              <dd>{money(target)}</dd>
            </div>
          ))}
        </dl>
      </td>
    </>
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

// group: set on the first row of a ticker's lots, which carries the merged average cells.
function OpenRow({ trade, today, brokerNames, group, onExit, onEdit }) {
  const [shares, setShares] = useState(String(trade.quantity));
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState(today);
  // Until you type in the margin box (null), it follows the margin charged up to the
  // exit date, or the trade's own margin if one was typed in when it was added.
  const [typedMargin, setTypedMargin] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const formId = `exit-${trade.id}`;
  const isShort = trade.side === 'short';
  const priceLabel = isShort ? 'Buy price' : 'Sell price';
  const autoMargin = marginCharge({ ...trade, exitDate: exitDate || today }, today).amount.toFixed(2);
  const margin = typedMargin ?? autoMargin;
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
          onChange={(e) => setTypedMargin(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={`${trade.symbol} margin, charged when the last shares close`}
          title="Margin charged up to the exit date; type to change it. Charged when the last shares close."
        />
      </td>
      {group && <GroupAverageCells group={group} />}
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

// Realized profit as a share of the investment behind the selected view, with an arrow.
function ShareCell({ trade, shareTitle }) {
  const share = trade.pctOfInvestment;
  if (share == null) {
    return (
      <td className="num" title="Set your investment amounts to see this">
        <span className="none">—</span>
      </td>
    );
  }
  return (
    <td className="num" title={shareTitle}>
      <span className={`share tone-${tone(share)}`}>{pctArrow(share)}</span>
    </td>
  );
}

// Profit, return % and days held come from the backend. An amount you typed in
// (pnlOverride) is marked "edited", with the calculated amount on hover.
function ClosedRow({ trade, today, brokerNames, shareTitle, onEdit }) {
  const pnl = trade.realizedPnl;
  const held = heldFor(trade.daysHeld);
  const edited = trade.pnlOverride != null;
  const pnlTitle =
    edited && trade.calculatedPnl != null
      ? `You edited this amount. Calculated: ${signedMoney(trade.calculatedPnl)}`
      : undefined;
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
      <td className="num" title={pnlTitle}>
        <span className={`pnl tone-${tone(pnl)}`}>{signedMoney(pnl)}</span>
        <span className="sub">
          <span title="Return on this trade’s cost (shares × entry price)">{pct(trade.returnPct)}</span>
          {edited ? ' · edited' : ''}
        </span>
      </td>
      <ShareCell trade={trade} shareTitle={shareTitle} />
      <EditButton trade={trade} onEdit={onEdit} />
    </tr>
  );
}

// A section title above each table: OPEN 3  By ticker…
function SectionHead({ id, title, count, note }) {
  return (
    <div className="group-head">
      <h3 id={id} className="group-head__title">
        {title}
      </h3>
      <span className="group-head__count">{count}</span>
      <span className="group-head__note">{note}</span>
    </div>
  );
}

// Column headers shared by both tables.
function LeadingHeaders() {
  return (
    <>
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
    </>
  );
}

function EditHeader() {
  return (
    <th scope="col" className="actions">
      <span className="visually-hidden">Edit</span>
    </th>
  );
}

function OpenTable({ groups, count, today, brokerNames, onExit, onEdit }) {
  return (
    <section className="trade-section" aria-labelledby="open-trades-title">
      <SectionHead
        id="open-trades-title"
        title="Open"
        count={count}
        note="By ticker. Not realized until you exit. Lower the shares to exit part of a position; margin is charged when the last shares close."
      />
      <div className="table-wrap">
        <table className="trades">
          <thead>
            <tr>
              <LeadingHeaders />
              <th
                scope="col"
                className="num"
                title="Filled in at 6% a year: roundup(shares × days × entry price × 6 / 36000, 2), counting the buy or short date as day 1 and the exit date as the last. Type to use your own amount."
              >
                Margin
              </th>
              <th
                scope="col"
                className="num"
                title="Average buy (or short) price of the ticker's open lots, weighted by shares. Buys and shorts are averaged separately."
              >
                Avg value
              </th>
              <th
                scope="col"
                className="num"
                title="Per share over the ticker's open lots. Buy: (total + margin) ÷ shares. Short: (total − margin) ÷ shares, with margin to today. For reference; realized profit isn't changed."
              >
                Final avg amt
              </th>
              <th
                scope="col"
                className="num"
                title="Exit targets from the Final avg amt. Buy: 1.02, 1.05 and 1.06 × Final avg amt, rounded up. Short: 0.98, 0.95 and 0.94 ×, rounded down."
              >
                Target
              </th>
              <th scope="col">Exit</th>
              <th scope="col" className="num" title="What the exit you're typing would realize">
                If exited
              </th>
              <EditHeader />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.trades.map((trade, index) => (
                <OpenRow
                  key={`${trade.id}:${trade.quantity}`}
                  trade={trade}
                  today={today}
                  brokerNames={brokerNames}
                  group={index === 0 ? group : null}
                  onExit={onExit}
                  onEdit={onEdit}
                />
              )),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClosedTable({ trades, today, brokerNames, shareTitle, onEdit }) {
  return (
    <section className="trade-section" aria-labelledby="closed-trades-title">
      <SectionHead id="closed-trades-title" title="Closed" count={trades.length} note="Newest exit first." />
      <div className="table-wrap">
        <table className="trades">
          <thead>
            <tr>
              <LeadingHeaders />
              <th scope="col" className="num">
                Margin
              </th>
              <th scope="col">Exit</th>
              <th scope="col" className="num">
                Realized P&amp;L
              </th>
              <th scope="col" className="num">
                Of investment
              </th>
              <EditHeader />
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <ClosedRow
                key={trade.id}
                trade={trade}
                today={today}
                brokerNames={brokerNames}
                shareTitle={shareTitle}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TradesTable({
  rows,
  today,
  term,
  invested,
  brokerNames,
  loading,
  onExit,
  onEdit,
}) {
  if (loading) return <p className="table-status">Loading transactions…</p>;

  const shareTitle = `Share of the ${
    term === 'all' ? 'total' : TERM_LABELS[term].toLowerCase()
  } investment (${money(invested ?? 0)})`;

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
    <>
      {open.length > 0 && (
        <OpenTable
          // Open trades by ticker A→Z, grouped by ticker and side for the averages.
          groups={groupOpenTrades(open, today)}
          count={open.length}
          today={today}
          brokerNames={brokerNames}
          onExit={onExit}
          onEdit={onEdit}
        />
      )}
      {closed.length > 0 && (
        <ClosedTable
          trades={closed}
          today={today}
          brokerNames={brokerNames}
          shareTitle={shareTitle}
          onEdit={onEdit}
        />
      )}
    </>
  );
}
