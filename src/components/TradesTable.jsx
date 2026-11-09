import { useState } from 'react';
import { useStoredChoice, useStoredSet } from '../hooks.js';
import { TERM_LABELS } from '../labels.js';
import { previewExit } from '../preview.js';
import { marginCharge } from '../marginCharge.js';
import { groupOpenTrades, targetPrices } from '../openGroups.js';
import { nextSort, sortOpenGroups, sortTrades } from '../sortTrades.js';
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


// A position's final amount and exit targets, worked out over its open lots
// (buys and shorts of one ticker separately).
function FinalAvgCell({ group }) {
  const shares = `${qty(group.shares)} ${group.shares === 1 ? 'share' : 'shares'}`;
  return (
    <td className="num" title={`Average final amount over ${shares} of ${group.symbol}`}>
      {centsUp(group.finalAvg)}
      <span className="sub">per share</span>
    </td>
  );
}

// The 2%, 5% and 6% targets as an evenly spaced ladder: percent above, price below.
function TargetCell({ group }) {
  return (
    <td
      className="target-cell"
      title={`Exit targets ${group.side === 'short' ? 'below' : 'above'} the Final avg amt of ${centsUp(group.finalAvg)}`}
    >
      <ol className="ladder">
        {targetPrices(group.side, group.finalAvg).map(({ pct, price: target }) => (
          <li key={pct} className="ladder__rung">
            <span className="ladder__pct">{pct}%</span>
            <span className="ladder__dot" aria-hidden="true" />
            <span className="ladder__price">{money(target)}</span>
          </li>
        ))}
      </ol>
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

// One lot inside a position's lots panel, with its own margin, exit form and edit button.
function OpenRow({ trade, today, brokerNames, onExit, onEdit }) {
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

// One value when every lot shares it, otherwise all of them.
function sameOrMixed(trades, pick) {
  const values = [...new Set(trades.map(pick))];
  return values.length === 1 ? { value: values[0] } : { values };
}

const OPEN_COLUMNS = 8;

// A position: one summary row (total shares, average entry, total
// margin, final avg and targets) and, when expanded, a lots panel under it where each
// lot keeps its own margin, exit form and edit button.
function PositionRows({ group, today, brokerNames, expanded, onToggle, onExit, onEdit }) {
  const [first] = group.trades;
  const panelId = `lots-${group.symbol}-${group.side}`;
  const broker = sameOrMixed(group.trades, (trade) => trade.broker);
  const term = sameOrMixed(group.trades, (trade) => trade.term);
  const oldest = group.trades.reduce((min, trade) => (trade.entryDate < min ? trade.entryDate : min), first.entryDate);
  const shares = `${qty(group.shares)} ${group.shares === 1 ? 'share' : 'shares'}`;
  return (
    <>
      <tr className={`trade trade--open trade--position${expanded ? ' is-expanded' : ''}`}>
        <th scope="row" className="stock">
          <button
            type="button"
            className="row-toggle"
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            onClick={onToggle}
            title={expanded ? 'Hide the lots' : 'Show the lots to exit or edit them'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M3.5 2 6.5 5 3.5 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="ticker">{group.symbol}</span>
            <span className="lot-count" title={`${group.trades.length} open ${group.trades.length === 1 ? 'lot' : 'lots'}`}>
              {group.trades.length}
              <span className="visually-hidden"> {group.trades.length === 1 ? 'lot' : 'lots'}</span>
            </span>
          </button>
          <span className={`badge badge--${group.side}`}>{group.side === 'short' ? 'Short' : 'Buy'}</span>
        </th>
        {broker.value ? (
          <BrokerCell trade={first} brokerNames={brokerNames} />
        ) : (
          <td>
            <abbr className="broker" title={broker.values.map((code) => brokerNames[code] ?? code).join(', ')}>
              {broker.values.length} brokers
            </abbr>
          </td>
        )}
        <td>
          {term.value ? (
            <TermTag term={term.value} />
          ) : (
            <span className="term" title={term.values.map((t) => TERM_LABELS[t]).join(', ')}>
              Mixed
            </span>
          )}
        </td>
        <td className="num">
          {qty(group.shares)}
        </td>
        <td
          className="num"
          title={`Average ${group.side === 'short' ? 'short' : 'buy'} price over ${shares} of ${group.symbol}, weighted by shares`}
        >
          {centsUp(group.avgValue)}
          <span className="sub">avg · since {shortDate(oldest, today)}</span>
        </td>
        <td className="num" title="The lots' margin added up. Change it on each lot.">
          {money(group.margin)}
          <span className="sub">total</span>
        </td>
        <FinalAvgCell group={group} />
        <TargetCell group={group} />
      </tr>
      {expanded && (
        <tr className="lots-row" id={panelId}>
          <td colSpan={OPEN_COLUMNS}>
            <div className="lots-panel">
              <table className="trades trades--lots" aria-label={`${group.symbol} ${group.side} lots`}>
                <thead>
                  <tr>
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
                      If exited
                    </th>
                    <EditHeader />
                  </tr>
                </thead>
                <tbody>
                  {group.trades.map((trade) => (
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
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
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
// With onToggle, the title and count become a button that shows or hides the table.
function SectionHead({ id, title, count, note, expanded, controls, onToggle }) {
  if (!onToggle) {
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
  return (
    <div className="group-head">
      <h3 id={id} className="group-head__title">
        <button
          type="button"
          className="group-head__toggle"
          aria-expanded={expanded}
          aria-controls={expanded ? controls : undefined}
          onClick={onToggle}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M3.5 2 6.5 5 3.5 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          {title}
          <span className="group-head__count">{count}</span>
        </button>
      </h3>
      <span className="group-head__note">{note}</span>
    </div>
  );
}

// A column header that sorts its table when clicked; the arrow shows the direction.
function SortHeader({ sortKey, sort, onSort, className, title, children }) {
  const active = sort.key === sortKey;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
  return (
    <th scope="col" className={className} aria-sort={ariaSort} title={title}>
      <button
        type="button"
        className={`sort-btn${active ? ' sort-btn--active' : ''}`}
        onClick={() => onSort(nextSort(sort, sortKey))}
      >
        {children}
        <span className="sort-btn__arrow" aria-hidden="true">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

// Column headers shared by both tables.
function LeadingHeaders({ sort, onSort }) {
  return (
    <>
      <SortHeader sortKey="stock" sort={sort} onSort={onSort} className="stock">
        Stock
      </SortHeader>
      <th scope="col">Broker</th>
      <th scope="col">Term</th>
      <th scope="col" className="num">
        Qty
      </th>
      <SortHeader sortKey="entry" sort={sort} onSort={onSort} className="num" title="Sort by entry date">
        Entry
      </SortHeader>
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

function OpenTable({ groups: byTicker, count, today, brokerNames, onExit, onEdit }) {
  const [sort, setSort] = useState({ key: 'stock', dir: 'asc' });
  const groups = sortOpenGroups(byTicker, sort);
  // Positions start collapsed; the ones you open are remembered.
  const [expanded, toggle] = useStoredSet('tradeTracker.openPositions');
  const groupKey = (group) => `${group.symbol}:${group.side}`;
  return (
    <section className="trade-section" aria-labelledby="open-trades-title">
      <SectionHead
        id="open-trades-title"
        title="Open"
        count={groups.length}
        note={`Grouped by ticker, ${count} ${count === 1 ? 'lot' : 'lots'}. Open a position's lots to exit or edit them. Not realized until you exit; margin is charged when a lot's last shares close.`}
      />
      <div className="table-wrap">
        <table className="trades">
          <thead>
            <tr>
              <LeadingHeaders sort={sort} onSort={setSort} />
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
                title="Per share over the ticker's open lots. Buy: (total + margin) ÷ shares. Short: (total − margin) ÷ shares, with margin to today. For reference; realized profit isn't changed."
              >
                Final avg amt
              </th>
              <th
                scope="col"
                className="target-cell"
                title="Exit targets from the Final avg amt. Buy: 1.02, 1.05 and 1.06 × Final avg amt, rounded up. Short: 0.98, 0.95 and 0.94 ×, rounded down."
              >
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <PositionRows
                key={groupKey(group)}
                group={group}
                today={today}
                brokerNames={brokerNames}
                expanded={expanded.has(groupKey(group))}
                onToggle={() => toggle(groupKey(group))}
                onExit={onExit}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClosedTable({ trades: newestExitFirst, today, brokerNames, shareTitle, onEdit }) {
  const [sort, setSort] = useState({ key: 'exit', dir: 'desc' });
  const trades = sortTrades(newestExitFirst, sort);
  // Hidden until you show it; the choice is remembered.
  const [shown, setShown] = useStoredChoice('tradeTracker.closedShown', ['hidden', 'shown']);
  const expanded = shown === 'shown';
  return (
    <section className="panel trade-section" aria-labelledby="closed-trades-title">
      <SectionHead
        id="closed-trades-title"
        title="Closed"
        count={trades.length}
        note={expanded ? 'Sort by Stock, Entry or Exit.' : 'Show to see your closed trades.'}
        expanded={expanded}
        controls="closed-trades-table"
        onToggle={() => setShown(expanded ? 'hidden' : 'shown')}
      />
      {expanded && (
        <div className="table-wrap" id="closed-trades-table">
          <table className="trades">
            <thead>
              <tr>
                <LeadingHeaders sort={sort} onSort={setSort} />
                <th scope="col" className="num">
                  Margin
                </th>
                <SortHeader sortKey="exit" sort={sort} onSort={setSort} title="Sort by exit date">
                  Exit
                </SortHeader>
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
      )}
    </section>
  );
}

// The open positions, under the new transaction form. Loading and empty states show here.
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
  if (open.length === 0) return null;
  return (
    <OpenTable
      // Open trades by ticker A→Z, grouped by ticker and side for the averages.
      groups={groupOpenTrades(open, today)}
      count={open.length}
      today={today}
      brokerNames={brokerNames}
      onExit={onExit}
      onEdit={onEdit}
    />
  );
}

// The closed trades, in a card of their own below the form. Nothing while loading
// or when no trade is closed.
export function ClosedTrades({ rows, today, term, invested, brokerNames, loading, onEdit }) {
  const closed = rows.filter((trade) => !isOpen(trade));
  if (loading || closed.length === 0) return null;

  const shareTitle = `Share of the ${
    term === 'all' ? 'total' : TERM_LABELS[term].toLowerCase()
  } investment (${money(invested ?? 0)})`;

  return (
    <ClosedTable
      trades={closed}
      today={today}
      brokerNames={brokerNames}
      shareTitle={shareTitle}
      onEdit={onEdit}
    />
  );
}
