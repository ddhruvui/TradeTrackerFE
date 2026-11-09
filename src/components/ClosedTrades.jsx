import { Fragment, useState } from 'react';
import { TERM_NAMES } from '../labels.js';
import { groupByExitMonth } from '../closedGroups.js';
import { heldFor, money, monthYear, pct, pctArrow, price, qty, shortDate, signedMoney } from '../format.js';
import { SidePill, TermTag } from './Controls.jsx';
import { InfoIcon, PencilIcon } from './Icons.jsx';
import { SortHeader } from './OpenPositions.jsx';

const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

// Profit, return % and days held come from the backend. An amount you typed in
// (pnlOverride) is marked "edited"; the chip opens the calculated amount next to it.
function ClosedRow({ trade, today, brokerNames, shareTitle, popover, onPopover, onEdit }) {
  const pnl = trade.realizedPnl;
  const edited = trade.pnlOverride != null;
  const share = trade.pctOfInvestment;
  const popId = `edited-${trade.id}`;
  const entry = shortDate(trade.entryDate, today);
  const exit = shortDate(trade.exitDate, today);
  const broker = brokerNames[trade.broker] ?? trade.broker;
  return (
    <div role="row" className="list__row closed-row">
      <div role="rowheader" className="cell closed-row__name">
        <span className="ticker">{trade.symbol}</span>
        <SidePill side={trade.side} />
        {trade.splitFrom && (
          <span className="tag" title="Part of a position; the rest stayed open">
            partial
          </span>
        )}
      </div>
      <div role="cell" className="cell cell--quiet closed-row__col">
        <TermTag term={trade.term} />
      </div>
      <div role="cell" className="cell cell--quiet closed-row__col">
        {broker}
      </div>
      <div role="cell" className="cell cell--num closed-row__col">
        {qty(trade.quantity)}
      </div>
      <div role="cell" className="cell cell--num cell--stack closed-row__col">
        <span>{price(trade.entryPrice)}</span>
        <span className="cell__sub">{entry}</span>
      </div>
      <div role="cell" className="cell cell--num cell--stack closed-row__col">
        <span>{price(trade.exitPrice)}</span>
        <span className="cell__sub">{exit}</span>
      </div>
      <div role="cell" className="cell cell--num cell--quiet closed-row__col">
        {heldFor(trade.daysHeld)}
      </div>
      <div role="cell" className="cell cell--num cell--quiet closed-row__col">
        {trade.margin ? money(trade.margin) : <span className="tone-flat">—</span>}
      </div>
      <div role="cell" className="cell cell--num cell--stack closed-row__pnl-cell">
        <span className="pnl-line">
          {edited && (
            <button
              type="button"
              className="tag"
              aria-expanded={popover === trade.id}
              aria-controls={popover === trade.id ? popId : undefined}
              onClick={() => onPopover(popover === trade.id ? null : trade.id)}
              onBlur={() => onPopover(null)}
            >
              edited
            </button>
          )}
          <span className={`closed-row__pnl tone-${tone(pnl)}`}>{signedMoney(pnl)}</span>
        </span>
        <span className="cell__sub">{pct(trade.returnPct)} on cost</span>
        {popover === trade.id && (
          <span id={popId} className="popover" role="status">
            <strong>Your broker’s figure</strong>
            You entered {signedMoney(trade.pnlOverride)}. Calculated from prices and margin:{' '}
            {trade.calculatedPnl == null ? '—' : signedMoney(trade.calculatedPnl)}. Totals use yours.
          </span>
        )}
      </div>
      <div role="cell" className="cell cell--num closed-row__share" title={share == null ? 'Set your invested amounts to see this' : shareTitle}>
        {share == null ? <span className="tone-flat">—</span> : <span className={`tone-${tone(share)}`} style={{ fontWeight: 600 }}>{pctArrow(share)}</span>}
      </div>
      <p role="cell" className="closed-row__dates">
        {entry} → {exit} · {heldFor(trade.daysHeld)}
      </p>
      <p role="cell" className="closed-row__meta">
        {qty(trade.quantity)} sh · {price(trade.entryPrice)} → {price(trade.exitPrice)} · {broker} ·{' '}
        {TERM_NAMES[trade.term]}
        {trade.margin ? ` · ${money(trade.margin)} margin` : ''}
      </p>
      <div role="cell" className="cell cell--end closed-row__edit">
        <button
          type="button"
          className="icon-btn"
          aria-label={`Edit the ${trade.symbol} trade closed ${exit}`}
          onClick={() => onEdit(trade)}
        >
          <PencilIcon size={15} />
        </button>
      </div>
    </div>
  );
}

// The closed trades. Sorted by exit date they're grouped by month, with subtotals that
// match the period totals; sorted by stock or entry they're one list.
export function ClosedTrades({ trades, today, shareTitle, brokerNames, sort, onSort, onEdit }) {
  const [popover, setPopover] = useState(null);
  const groups = sort.key === 'exit' ? groupByExitMonth(trades) : [{ key: 'all', trades }];
  return (
    <>
      <div className="list-scroll">
        <div role="table" aria-label="Closed trades" className="list list--closed">
          <div role="row" className="list__row list__head">
            <SortHeader sortKey="stock" sort={sort} onSort={onSort}>
              Trade
            </SortHeader>
            <div role="columnheader" className="cell">
              Term
            </div>
            <div role="columnheader" className="cell">
              Broker
            </div>
            <div role="columnheader" className="cell cell--num">
              Shares
            </div>
            <SortHeader sortKey="entry" sort={sort} onSort={onSort} className="cell--num">
              Entry
            </SortHeader>
            <SortHeader sortKey="exit" sort={sort} onSort={onSort} className="cell--num">
              Exit
            </SortHeader>
            <div role="columnheader" className="cell cell--num">
              Held
            </div>
            <div role="columnheader" className="cell cell--num">
              Margin
            </div>
            <div role="columnheader" className="cell cell--num">
              Realized P&amp;L
            </div>
            <div role="columnheader" className="cell cell--num">
              Of invested
            </div>
            <div role="columnheader" className="cell">
              <span className="visually-hidden">Edit</span>
            </div>
          </div>
          {groups.map((group) => (
            <Fragment key={group.key}>
              {group.key !== 'all' && (
                <div role="row" className="month-row">
                  <div role="rowheader">
                    <span className="month-row__name">{monthYear(`${group.key}-01`)}</span>
                    <span className="month-row__count">
                      {group.count} {group.count === 1 ? 'trade' : 'trades'}
                    </span>
                  </div>
                  <div role="cell" className={`month-row__total tone-${tone(group.pnl)}`}>
                    {signedMoney(group.pnl)}
                  </div>
                </div>
              )}
              {group.trades.map((trade) => (
                <ClosedRow
                  key={trade.id}
                  trade={trade}
                  today={today}
                  brokerNames={brokerNames}
                  shareTitle={shareTitle}
                  popover={popover}
                  onPopover={setPopover}
                  onEdit={onEdit}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="list__footnote">
        <InfoIcon />
        <p>
          Return is on the trade’s cost (shares × entry). Of invested uses the term you’re viewing. A partial exit
          shows the share of margin it paid.
        </p>
      </div>
    </>
  );
}
