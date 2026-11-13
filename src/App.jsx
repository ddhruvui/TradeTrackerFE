import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { fullTime, longDate, money, price, qty, signedMoney, stampTime } from './format.js';
import { useStoredChoice, useStoredJson, useStoredSet, useToday } from './hooks.js';
import { TERM_LABELS, TERM_NAMES } from './labels.js';
import { groupOpenTrades } from './openGroups.js';
import { sortOpenGroups, sortTrades } from './sortTrades.js';
import { closedTotals } from './closedGroups.js';
import { Segmented } from './components/Controls.jsx';
import { BrandMark, PlusIcon, SearchIcon } from './components/Icons.jsx';
import { SummaryStrip } from './components/SummaryStrip.jsx';
import { OpenPositions, groupKey } from './components/OpenPositions.jsx';
import { ClosedTrades } from './components/ClosedTrades.jsx';
import { Empty, ErrorBanner, ListSkeleton } from './components/States.jsx';
import { NewTradePanel } from './components/NewTradePanel.jsx';
import { ExitPanel } from './components/ExitPanel.jsx';
import { EditPanel } from './components/EditPanel.jsx';
import { InvestmentPanel } from './components/InvestmentPanel.jsx';
import { Toast } from './components/Toast.jsx';

const FILTERS = [
  ['all', 'All'],
  ['short', 'Short term'],
  ['mid', 'Mid term'],
  ['long', 'Long term'],
];
const FILTER_KEYS = FILTERS.map(([key]) => key);
const TABS = ['open', 'closed'];
const isOpen = (trade) => trade.exitPrice == null;
const isTyping = (el) => Boolean(el) && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export default function App() {
  const today = useToday();
  const [term, setTerm] = useStoredChoice('trade-tracker:term', FILTER_KEYS);
  const [tab, setTab] = useStoredChoice('tradeTracker.tab', TABS);
  const [query, setQuery] = useState('');
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [expanded, toggleExpanded] = useStoredSet('tradeTracker.openPositions');
  const [openSort, setOpenSort] = useState({ key: 'stock', dir: 'asc' });
  const [closedSort, setClosedSort] = useState({ key: 'exit', dir: 'desc' });
  const lastFocus = useRef(null);

  // From .env via the API: which database, and the broker list. Whether this is the test
  // database is remembered, so the badge stays even when the API can't be reached.
  const [testDb, setTestDb] = useStoredJson('tradeTracker.testDb', false);
  const [info, setInfo] = useState({ brokers: [], defaultBroker: null });
  const loadInfo = useCallback(() => {
    api
      .info()
      .then((next) => {
        setInfo({ brokers: next.brokers ?? [], defaultBroker: next.defaultBroker ?? null });
        setTestDb(Boolean(next.testDb));
      })
      .catch(() => {}); // Without it the page still works; new trades get the server's default broker.
  }, [setTestDb]);
  useEffect(loadInfo, [loadInfo]);

  useEffect(() => {
    document.title = testDb ? 'Trade Tracker (test database)' : 'Trade Tracker';
  }, [testDb]);

  // Every symbol traded before, whatever the term filter, for the symbol suggestions.
  const [tradedSymbols, setTradedSymbols] = useState([]);
  const rememberSymbols = useCallback((list) => {
    setTradedSymbols((current) => {
      const next = new Set(current);
      list.forEach((trade) => next.add(trade.symbol));
      return next.size === current.length ? current : [...next].sort();
    });
  }, []);
  useEffect(() => {
    api
      .list('all')
      .then(rememberSymbols)
      .catch(() => {}); // Suggestions fall back to the watchlist.
  }, [rememberSymbols]);

  const brokerNames = useMemo(
    () => Object.fromEntries(info.brokers.map(({ code, name }) => [code, name])),
    [info.brokers],
  );

  // The backend does the profit math: it sorts and filters the trades and totals
  // each period. Reloaded after every change so the numbers come from one place.
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    const thisLoad = ++latestLoad.current;
    try {
      const [list, totals] = await Promise.all([api.list(term), api.summary(term, today)]);
      if (thisLoad !== latestLoad.current) return; // a newer filter or date is loading
      setTrades(list);
      rememberSymbols(list);
      setSummary(totals);
      setStatus('ready');
    } catch (err) {
      if (thisLoad !== latestLoad.current) return;
      setLoadError(err.message);
      setSummary(null);
      setStatus('error');
    }
  }, [term, today, rememberSymbols]);

  useEffect(() => {
    load();
  }, [load]);

  // Last prices colour the exit targets a position has reached. They're optional:
  // if they can't be loaded the targets just stay plain. Re-read with the trades.
  // When they were uploaded shows next to Realized profit.
  const [lastPrices, setLastPrices] = useState({});
  const [pricesAt, setPricesAt] = useState(null);
  useEffect(() => {
    let current = true;
    api
      .prices()
      .then(({ uploadedAt, prices }) => {
        if (!current) return;
        setLastPrices(prices ?? {});
        setPricesAt(uploadedAt ?? null);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [trades]);
  const priceStamp = stampTime(pricesAt, today);

  function retry() {
    setStatus('loading');
    if (!info.brokers.length) loadInfo();
    load();
  }

  const notify = (message, extra = {}) => setToast({ message, id: Date.now(), ...extra });
  const clearToast = useCallback(() => setToast(null), []);

  // Panels: remember what had focus, and give it back when the panel closes.
  function openPanel(next) {
    lastFocus.current = document.activeElement;
    setPanel(next);
  }
  const closePanel = useCallback(() => {
    setPanel(null);
    const target = lastFocus.current;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
    });
  }, []);
  const openNew = () => openPanel({ type: 'new' });

  // N starts a new trade from anywhere outside a text field.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'n' && event.key !== 'N') return;
      if (event.metaKey || event.ctrlKey || event.altKey || panel || isTyping(event.target)) return;
      event.preventDefault();
      lastFocus.current = document.activeElement;
      setPanel({ type: 'new' });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panel]);

  // Lists, after the ticker filter.
  const q = query.trim().toUpperCase();
  const matches = (trade) => !q || trade.symbol.includes(q);
  const openTrades = trades.filter(isOpen);
  const allGroups = useMemo(() => groupOpenTrades(openTrades, today), [openTrades, today]);
  const groups = sortOpenGroups(allGroups.filter(matches), openSort);
  const closedAll = trades.filter((trade) => !isOpen(trade));
  const closedShown = sortTrades(closedAll.filter(matches), closedSort);
  const totals = closedTotals(closedShown);
  const lotCount = groups.reduce((sum, group) => sum + group.trades.length, 0);

  async function addTrade(input, { keepOpen }) {
    const trade = await api.create(input);
    if (!keepOpen) closePanel();
    setTab('open');
    await load();
    const broker = brokerNames[trade.broker] ?? trade.broker;
    if (term !== 'all' && trade.term !== term) {
      notify(`Added ${trade.symbol} to ${TERM_LABELS[trade.term]}. You’re viewing ${TERM_LABELS[term]}.`, {
        action: { label: `Show ${TERM_LABELS[trade.term]}`, onClick: () => setTerm(trade.term) },
      });
    } else {
      notify(
        `Added ${trade.symbol} at ${broker}: ${trade.side === 'short' ? 'short' : 'buy'} of ${qty(trade.quantity)} at ${price(trade.entryPrice)}`,
      );
    }
    return trade;
  }

  async function exitTrade(lot, exit) {
    const { closed, remaining } = await api.exit(lot.id, exit);
    closePanel();
    await load();
    const verb = lot.side === 'short' ? 'Bought back' : 'Sold';
    notify(
      `${verb} ${qty(closed.quantity)} ${closed.symbol}: ${signedMoney(closed.realizedPnl)} realized` +
        (remaining ? `, ${qty(remaining.quantity)} still open` : ''),
      { action: { label: 'View in Closed', onClick: () => setTab('closed') } },
    );
  }

  async function saveTrade(id, changes) {
    const trade = await api.update(id, changes);
    closePanel();
    await load();
    const reopened = Object.keys(changes).length === 2 && changes.exitPrice === null;
    if (reopened) setTab('open');
    notify(reopened ? `Reopened ${trade.symbol}` : `Saved changes to ${trade.symbol}`);
  }

  async function deleteTrade(trade) {
    await api.remove(trade.id);
    closePanel();
    await load();
    notify(`Deleted the ${trade.symbol} transaction`);
  }

  async function saveInvestment(amounts) {
    await api.saveInvestment(amounts);
    closePanel();
    await load();
    notify('Saved your invested amounts');
  }

  // The panel's subject, looked up fresh so it follows reloads.
  const exitGroup = panel?.type === 'exit' ? allGroups.find((group) => groupKey(group) === panel.key) : null;
  const editTrade = panel?.type === 'edit' ? trades.find((trade) => trade.id === panel.id) : null;
  const editGroup =
    editTrade && isOpen(editTrade)
      ? allGroups.find((group) => group.symbol === editTrade.symbol && group.side === editTrade.side)
      : null;

  const termWord = term === 'all' ? '' : TERM_NAMES[term].toLowerCase();
  let list;
  if (status === 'loading' && !trades.length) {
    list = <ListSkeleton />;
  } else if (status === 'error' && !trades.length) {
    list = <Empty title="Your trades will show here" text="They couldn’t load. Try again once the API is up." />;
  } else if (!trades.length) {
    list =
      term === 'all' ? (
        <Empty mark title="Start your trade log" text="Add your first buy or short. It shows up here as an open position, and your realized profit fills in as you exit.">
          <button type="button" className="btn btn--primary" onClick={openNew}>
            <PlusIcon />
            New trade
          </button>
          <span>
            or press <kbd>N</kbd>
          </span>
        </Empty>
      ) : (
        <Empty
          title={`No ${termWord} trades`}
          text={`You’re viewing ${TERM_LABELS[term]}. Trades you add from here start as ${TERM_NAMES[term]}, so they’ll show up in this list.`}
        >
          <button type="button" className="btn btn--primary" onClick={openNew}>
            New {termWord} trade
          </button>
          <button type="button" className="btn" onClick={() => setTerm('all')}>
            Show all terms
          </button>
        </Empty>
      );
  } else if (tab === 'open') {
    list = groups.length ? (
      <OpenPositions
        groups={groups}
        today={today}
        brokerNames={brokerNames}
        lastPrices={lastPrices}
        expanded={expanded}
        onToggle={toggleExpanded}
        sort={openSort}
        onSort={setOpenSort}
        onExit={(group, { lotId, price: target }) =>
          openPanel({ type: 'exit', key: groupKey(group), lotId, price: target })
        }
        onEdit={(trade) => openPanel({ type: 'edit', id: trade.id })}
      />
    ) : q && openTrades.length ? (
      <Empty title={`No open tickers match “${q}”`}>
        <button type="button" className="btn" onClick={() => setQuery('')}>
          Clear the filter
        </button>
      </Empty>
    ) : (
      <Empty title="No open positions" text="Everything here is closed. Add a trade to start a new position.">
        <button type="button" className="btn btn--primary" onClick={openNew}>
          <PlusIcon />
          New trade
        </button>
      </Empty>
    );
  } else {
    list = closedShown.length ? (
      <ClosedTrades
        trades={closedShown}
        today={today}
        shareTitle={`Share of the ${term === 'all' ? 'total' : TERM_LABELS[term].toLowerCase()} investment (${money(summary?.invested ?? 0)})`}
        brokerNames={brokerNames}
        sort={closedSort}
        onSort={setClosedSort}
        onEdit={(trade) => openPanel({ type: 'edit', id: trade.id })}
      />
    ) : q && closedAll.length ? (
      <Empty title={`No closed tickers match “${q}”`}>
        <button type="button" className="btn" onClick={() => setQuery('')}>
          Clear the filter
        </button>
      </Empty>
    ) : (
      <Empty title="No closed trades yet" text="Sell or buy back from Open positions; the trade lands here with its realized profit." />
    );
  }

  function onTabKey(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next = tab === 'open' ? 'closed' : 'open';
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
    event.preventDefault();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <BrandMark />
            <span className="brand__name">Trade Tracker</span>
            {testDb && (
              <span className="db-flag" title="TEST_DB=true in TradeTrackerBE’s .env. Running npm test there clears this database.">
                Test database
              </span>
            )}
          </div>
          <Segmented
            name="term-filter"
            label="Show terms"
            options={FILTERS}
            value={term}
            onChange={setTerm}
            className="term-filter"
          />
          <button type="button" className="btn btn--primary new-trade-btn" onClick={openNew}>
            <PlusIcon />
            New trade
            <kbd>N</kbd>
          </button>
        </div>
      </header>

      <main className="main">
        {status === 'error' && <ErrorBanner message={loadError} onRetry={retry} />}

        <section aria-labelledby="realized-title">
          <div className="section-head">
            <h2 id="realized-title">Realized profit</h2>
            <span className="section-head__sub">
              {term === 'all' ? 'All terms' : TERM_LABELS[term]} · as of {longDate(today)}
              {priceStamp && (
                <span className="section-head__stamp">
                  {' · '}last price{' '}
                  <time dateTime={pricesAt} title={`Last prices uploaded ${fullTime(pricesAt)}`}>
                    {priceStamp}
                  </time>
                </span>
              )}
            </span>
          </div>
          <SummaryStrip
            summary={summary}
            today={today}
            term={term}
            failed={status === 'error'}
            onEditInvestment={() => openPanel({ type: 'investment' })}
          />
        </section>

        <section className="board" aria-label="Trades">
          <div className="board__bar">
            <div className="tabs" role="tablist" aria-label="Trade lists" onKeyDown={onTabKey}>
              {[
                ['open', 'Open positions', allGroups.length],
                ['closed', 'Closed trades', closedAll.length],
              ].map(([key, text, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  className="tab"
                  aria-selected={tab === key}
                  aria-controls="trade-list"
                  tabIndex={tab === key ? 0 : -1}
                  onClick={() => setTab(key)}
                >
                  {text}
                  <span className="count">{count}</span>
                </button>
              ))}
            </div>
            <div className="board__tools">
              {status === 'ready' && trades.length > 0 && (
                <span className="num">
                  {tab === 'open' ? (
                    `${groups.length} ${groups.length === 1 ? 'position' : 'positions'} · ${lotCount} ${lotCount === 1 ? 'lot' : 'lots'}`
                  ) : (
                    <>
                      {totals.count} {totals.count === 1 ? 'trade' : 'trades'} · net{' '}
                      <strong className={totals.pnl > 0 ? 'tone-gain' : totals.pnl < 0 ? 'tone-loss' : ''}>
                        {signedMoney(totals.pnl)}
                      </strong>{' '}
                      · {money(totals.margin)} margin
                    </>
                  )}
                </span>
              )}
              <label className="search">
                <span className="visually-hidden">Filter by ticker</span>
                <SearchIcon />
                <input
                  type="search"
                  placeholder="Filter tickers"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
          </div>
          <div role="tabpanel" id="trade-list" aria-labelledby={`tab-${tab}`}>
            {list}
          </div>
        </section>
      </main>

      <button type="button" className="fab" onClick={openNew}>
        <PlusIcon size={18} />
        New trade
      </button>

      {panel?.type === 'new' && (
        <NewTradePanel
          today={today}
          brokers={info.brokers}
          defaultBroker={info.defaultBroker}
          tradedSymbols={tradedSymbols}
          filterTerm={term}
          onAdd={addTrade}
          onClose={closePanel}
        />
      )}
      {exitGroup && (
        <ExitPanel
          key={`${panel.key}:${panel.lotId}:${panel.price}`}
          group={exitGroup}
          lotId={panel.lotId}
          startPrice={panel.price}
          lastPrice={lastPrices[exitGroup.symbol]}
          today={today}
          invested={summary?.invested ?? 0}
          brokerNames={brokerNames}
          onExit={exitTrade}
          onEditLot={(lot) => setPanel({ type: 'edit', id: lot.id })}
          onClose={closePanel}
        />
      )}
      {editTrade && (
        <EditPanel
          key={editTrade.id}
          trade={editTrade}
          group={editGroup}
          today={today}
          brokers={info.brokers}
          onSave={saveTrade}
          onDelete={deleteTrade}
          onClose={closePanel}
        />
      )}
      {panel?.type === 'investment' && summary && (
        <InvestmentPanel investment={summary.investment} onSave={saveInvestment} onClose={closePanel} />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </>
  );
}
