import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { longDate, price, qty, signedMoney } from './format.js';
import { useStoredChoice, useToday } from './hooks.js';
import { TERM_LABELS } from './labels.js';
import { Segmented } from './components/Controls.jsx';
import { SummaryCards } from './components/SummaryCards.jsx';
import { AddTradeForm } from './components/AddTradeForm.jsx';
import { TradesTable } from './components/TradesTable.jsx';
import { EditTradeDialog } from './components/EditTradeDialog.jsx';
import { Toast } from './components/Toast.jsx';

const FILTERS = [
  ['all', 'All'],
  ['short', 'Short term'],
  ['mid', 'Mid term'],
  ['long', 'Long term'],
];
const FILTER_KEYS = FILTERS.map(([key]) => key);

export default function App() {
  const today = useToday();
  const [term, setTerm] = useStoredChoice('trade-tracker:term', FILTER_KEYS);
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  // From .env via the API: which database, and the broker list.
  const [info, setInfo] = useState({ testDb: false, brokers: [], defaultBroker: null });

  useEffect(() => {
    api
      .info()
      .then((next) => setInfo((current) => ({ ...current, ...next })))
      .catch(() => {}); // Without it the page still works; new trades get the server's default broker.
  }, []);

  useEffect(() => {
    document.title = info.testDb ? 'Trade Tracker (test database)' : 'Trade Tracker';
  }, [info.testDb]);

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
      setSummary(totals);
      setStatus('ready');
    } catch (err) {
      if (thisLoad !== latestLoad.current) return;
      setLoadError(err.message);
      setStatus('error');
    }
  }, [term, today]);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setStatus('loading');
    load();
  }

  const notify = (message) => setToast({ message, id: Date.now() });
  const clearToast = useCallback(() => setToast(null), []);

  async function addTrade(input) {
    const trade = await api.create(input);
    await load();
    const broker = brokerNames[trade.broker] ?? trade.broker;
    notify(
      term !== 'all' && trade.term !== term
        ? `Added ${trade.symbol} to ${TERM_LABELS[trade.term]}. Switch the filter to see it.`
        : `Added ${trade.symbol} at ${broker}: ${trade.side === 'short' ? 'short' : 'buy'} of ${qty(trade.quantity)} at ${price(trade.entryPrice)}`,
    );
  }

  async function exitTrade(trade, exit) {
    const { closed, remaining } = await api.exit(trade.id, exit);
    await load();
    const verb = trade.side === 'short' ? 'Bought back' : 'Sold';
    notify(
      `${verb} ${qty(closed.quantity)} ${closed.symbol}: ${signedMoney(closed.realizedPnl)} realized` +
        (remaining ? `, ${qty(remaining.quantity)} still open` : ''),
    );
  }

  async function saveTrade(id, changes) {
    const trade = await api.update(id, changes);
    setEditing(null);
    await load();
    const reopened = Object.keys(changes).length === 2 && changes.exitPrice === null;
    notify(reopened ? `Reopened ${trade.symbol}` : `Saved changes to ${trade.symbol}`);
  }

  async function deleteTrade(trade) {
    await api.remove(trade.id);
    setEditing(null);
    await load();
    notify(`Deleted the ${trade.symbol} transaction`);
  }

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <div className="masthead__name">
            <h1 className="masthead__title">Trade Tracker</h1>
            {info.testDb && (
              <span
                className="db-flag"
                title="TEST_DB=true in .env. Running npm test clears this database."
              >
                Test database
              </span>
            )}
          </div>
          <p className="masthead__date">{longDate(today)}</p>
        </div>
        <Segmented
          name="term-filter"
          label="Show terms"
          options={FILTERS}
          value={term}
          onChange={setTerm}
          className="segmented--filter"
        />
      </header>

      <SummaryCards summary={summary} today={today} term={term} />

      <section className="panel" aria-label="Transactions">
        <AddTradeForm
          today={today}
          brokers={info.brokers}
          defaultBroker={info.defaultBroker}
          onAdd={addTrade}
        />
        {status === 'error' ? (
          <div className="notice" role="alert">
            <p>
              <strong>Couldn’t load your transactions.</strong> {loadError}
            </p>
            <button type="button" className="btn btn--sm" onClick={retry}>
              Try again
            </button>
          </div>
        ) : (
          <TradesTable
            rows={trades}
            today={today}
            term={term}
            brokerNames={brokerNames}
            loading={status === 'loading'}
            onExit={exitTrade}
            onEdit={setEditing}
          />
        )}
      </section>

      {editing && (
        <EditTradeDialog
          key={editing.id}
          trade={editing}
          today={today}
          brokers={info.brokers}
          onSave={saveTrade}
          onDelete={deleteTrade}
          onClose={() => setEditing(null)}
        />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
