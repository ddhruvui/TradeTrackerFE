import { TERM_LABELS, TERM_NAMES, exitVerb } from '../labels.js';
import { marginCharge } from '../marginCharge.js';
import { lastVsBreakEven, targetPrices, targetReached } from '../openGroups.js';
import { nextSort } from '../sortTrades.js';
import { googleFinanceUrl } from '../tickers.js';
import { centsUp, money, price, qty, shortDate, signedPct2 } from '../format.js';
import { SidePill, TermTag } from './Controls.jsx';
import { ChevronIcon, InfoIcon, LotBranch, PencilIcon, SortIcon } from './Icons.jsx';

// One value when every lot shares it, otherwise all of them.
function sameOrMixed(trades, pick) {
  const values = [...new Set(trades.map(pick))];
  return values.length === 1 ? { value: values[0] } : { values };
}

export const groupKey = (group) => `${group.symbol}:${group.side}`;

// A column header that sorts its list when clicked; the arrow shows the direction.
export function SortHeader({ sortKey, sort, onSort, className = '', children }) {
  const active = sort.key === sortKey;
  return (
    <div
      role="columnheader"
      className={`cell ${className}`}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        className={`sort-btn${active ? ' sort-btn--active' : ''}`}
        onClick={() => onSort(nextSort(sort, sortKey))}
      >
        {children}
        <SortIcon dir={active ? sort.dir : null} />
      </button>
    </div>
  );
}

function LotRow({ trade, today, brokerNames, onExit, onEdit }) {
  const charge = marginCharge(trade, today);
  const verb = exitVerb(trade.side);
  const date = shortDate(trade.entryDate, today);
  return (
    <div role="row" className="list__row lot">
      <div role="rowheader" className="cell lot__name">
        <LotBranch />
        Lot · {date}
      </div>
      <div role="cell" className="cell lot__col">
        {TERM_NAMES[trade.term]}
      </div>
      <div role="cell" className="cell lot__col">
        {brokerNames[trade.broker] ?? trade.broker}
      </div>
      <div role="cell" className="cell cell--num lot__col">
        {qty(trade.quantity)}
      </div>
      <div role="cell" className="cell cell--num lot__col">
        {price(trade.entryPrice)}
      </div>
      <div role="cell" className="cell cell--num lot__col" title={charge.typed ? 'Fixed amount' : `6%/yr for ${charge.days} days`}>
        {money(charge.amount)}
        {charge.typed && <span className="tag">fixed</span>}
      </div>
      <div role="cell" className="cell lot__col" />
      <div role="cell" className="cell lot__col" />
      <div role="cell" className="cell lot__col" />
      <p role="cell" className="lot__summary">
        {qty(trade.quantity)} sh at {price(trade.entryPrice)} · margin {money(charge.amount)}
        {charge.typed ? ' fixed' : ''}
      </p>
      <div role="cell" className="cell cell--end lot__actions">
        <button type="button" className="link-btn" style={{ padding: '6px 8px', fontSize: 13 }} onClick={() => onExit(trade.id)}>
          {verb}
          <span className="visually-hidden"> the lot from {date}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Edit the ${trade.symbol} lot from ${date}, including its margin`}
          onClick={() => onEdit(trade)}
        >
          <PencilIcon size={15} />
        </button>
      </div>
    </div>
  );
}

// A position: one row with the totals over its open lots (shares, average entry,
// margin to date, break-even and exit targets) and, when expanded, a row per lot.
function PositionRows({ group, today, brokerNames, lastPrice, expanded, onToggle, onExit, onEdit }) {
  const [first] = group.trades;
  const lots = group.trades.length;
  const lotsText = `${lots} ${lots === 1 ? 'lot' : 'lots'}`;
  const broker = sameOrMixed(group.trades, (t) => t.broker);
  const term = sameOrMixed(group.trades, (t) => t.term);
  const oldest = group.trades.reduce((min, t) => (t.entryDate < min ? t.entryDate : min), first.entryDate);
  const since = shortDate(oldest, today);
  const brokerText = broker.value
    ? (brokerNames[broker.value] ?? broker.value)
    : `${broker.values.length} brokers`;
  const termText = term.value ? TERM_NAMES[term.value] : 'Mixed terms';
  const verb = exitVerb(group.side);
  const panelId = `lots-${group.symbol}-${group.side}`;
  const vsBreakEven = lastVsBreakEven(group.side, group.finalAvg, lastPrice);

  return (
    <>
      <div role="row" className="list__row pos">
        <div role="rowheader" className="cell pos__name">
          <button
            type="button"
            className="chev"
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            aria-label={`${expanded ? 'Hide' : 'Show'} ${group.symbol} lots`}
            onClick={onToggle}
          >
            <ChevronIcon size={14} />
          </button>
          <div className="pos__title">
            <div className="pos__line">
              <a
                className="ticker"
                href={googleFinanceUrl(group.symbol)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${group.symbol} in Google Finance`}
                aria-label={`${group.symbol} on Google Finance (opens in a new tab)`}
              >
                {group.symbol}
              </a>
              <SidePill side={group.side} />
            </div>
            <span className="cell__sub pos__since">
              {lotsText} · since {since}
            </span>
          </div>
        </div>
        <div role="cell" className="cell cell--quiet pos__term">
          {term.value ? (
            <TermTag term={term.value} />
          ) : (
            <span title={term.values.map((t) => TERM_LABELS[t]).join(', ')}>Mixed</span>
          )}
        </div>
        <div role="cell" className="cell cell--quiet pos__broker" title={broker.values?.map((c) => brokerNames[c] ?? c).join(', ')}>
          {brokerText}
        </div>
        <div role="cell" className="cell cell--num pos__shares">
          {qty(group.shares)}
          <span className="visually-hidden"> shares</span>
        </div>
        <div role="cell" className="cell cell--num pos__avg" data-label="Avg entry">
          {centsUp(group.avgValue)}
        </div>
        <div role="cell" className="cell cell--num cell--quiet pos__margin">
          {money(group.margin)}
        </div>
        <div role="cell" className="cell cell--num pos__be" data-label="Break-even" style={{ fontWeight: 600 }}>
          {centsUp(group.finalAvg)}
        </div>
        <div role="cell" className="cell cell--num pos__last" data-label="Last price">
          {vsBreakEven ? (
            <span>
              {money(lastPrice)}{' '}
              <span
                className={`pos__last-pct${vsBreakEven.ahead == null ? '' : vsBreakEven.ahead ? ' is-gain' : ' is-loss'}`}
                title="Last price compared with break-even"
              >
                ({signedPct2(vsBreakEven.pct)})
                <span className="visually-hidden"> from break-even</span>
              </span>
            </span>
          ) : (
            <span className="cell__sub" title="No last price for this stock">
              –
            </span>
          )}
        </div>
        <div role="cell" className="cell pos__targets">
          <div className="targets">
            {targetPrices(group.side, group.finalAvg).map(({ label, pct, price: target }) => {
              const sign = group.side === 'short' ? '−' : '+';
              const reached = targetReached(group.side, target, lastPrice);
              const reachedText = reached ? `, reached: last price ${money(lastPrice)}` : '';
              return (
                <button
                  key={label}
                  type="button"
                  className={reached ? 'chip chip--reached' : 'chip'}
                  onClick={() => onExit(null, target)}
                  title={`${sign}${pct}%${reachedText}`}
                  aria-label={`${verb} ${group.symbol} at ${money(target)}, the ${label} target (${sign}${pct}%)${reachedText}`}
                >
                  <span className="chip__pct">{label}</span>
                  {money(target)}
                </button>
              );
            })}
          </div>
        </div>
        <div role="cell" className="pos__meta">
          <button type="button" className="pos__lots-link" aria-expanded={expanded} onClick={onToggle}>
            <span className="pos__lots-text">{expanded ? `Hide ${lotsText}` : lotsText}</span>
            <span className="pos__meta-text">
              {brokerText} · {termText} · since {since}
            </span>
          </button>
        </div>
        <div role="cell" className="cell cell--end pos__actions">
          <button type="button" className="btn btn--sm" onClick={() => onExit(null)}>
            {verb}
            <span className="visually-hidden"> {group.symbol}</span>
          </button>
        </div>
      </div>
      {expanded && (
        <div role="rowgroup" id={panelId} aria-label={`${group.symbol} lots`}>
          {group.trades.map((trade) => (
            <LotRow
              key={`${trade.id}:${trade.quantity}`}
              trade={trade}
              today={today}
              brokerNames={brokerNames}
              onExit={(lotId) => onExit(lotId)}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </>
  );
}

// The open positions, grouped by ticker and side. `onExit(group, { lotId, price })`
// opens the Exit panel; `onEdit(trade)` opens a lot's Edit panel.
export function OpenPositions({ groups, today, brokerNames, lastPrices = {}, expanded, onToggle, sort, onSort, onExit, onEdit }) {
  return (
    <>
      <div className="list-scroll">
        <div role="table" aria-label="Open positions" className="list list--open">
          <div role="row" className="list__row list__head">
            <SortHeader sortKey="stock" sort={sort} onSort={onSort} className="pos-head__name">
              <span style={{ paddingLeft: 38 }}>Position</span>
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
              Avg entry
            </SortHeader>
            <div role="columnheader" className="cell cell--num">
              Margin to date
            </div>
            <div role="columnheader" className="cell cell--num">
              Break-even
            </div>
            <div role="columnheader" className="cell cell--num">
              Last price
            </div>
            <div role="columnheader" className="cell">
              Exit targets
            </div>
            <div role="columnheader" className="cell">
              <span className="visually-hidden">Actions</span>
            </div>
          </div>
          {groups.map((group) => (
            <PositionRows
              key={groupKey(group)}
              group={group}
              today={today}
              lastPrice={lastPrices[group.symbol]}
              brokerNames={brokerNames}
              expanded={expanded.has(groupKey(group))}
              onToggle={() => onToggle(groupKey(group))}
              onExit={(lotId, target) => onExit(group, { lotId, price: target })}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
      <div className="list__footnote">
        <InfoIcon />
        <p>
          Margin accrues at 6% a year (360-day year) from the entry date, unless you type your own amount. Each
          exit pays its share: selling 10 of 20 shares charges half the margin so far, and the rest keeps accruing
          until those shares close. Break-even is (cost + margin) ÷ shares for buys and (cost − margin) ÷ shares for
          shorts; the 4x–1x targets sit 1.91%, 2.43%, 3.47% and 6.6% past it, and turn green once the stock’s last price has reached them. Last price shows how far it is from break-even, in brackets. Nothing here counts as realized profit until you exit.
        </p>
      </div>
    </>
  );
}
