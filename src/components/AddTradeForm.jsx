import { useEffect, useRef, useState } from 'react';
import { BrokerField, Field, Segmented, SIDE_OPTIONS, TERM_OPTIONS } from './Controls.jsx';

const blankForm = (today, broker) => ({
  symbol: '',
  broker: broker ?? '',
  side: 'buy',
  term: 'short',
  quantity: '',
  entryPrice: '',
  margin: '0',
  entryDate: today,
});

function problemWith(trade) {
  if (!trade.symbol) return 'Enter a stock symbol.';
  if (!(trade.quantity > 0)) return 'Enter a quantity above 0.';
  if (!(trade.entryPrice > 0)) return 'Enter a price above 0.';
  if (!(trade.margin >= 0)) return 'Margin must be $0 or more.';
  if (!trade.entryDate) return 'Pick the date of the trade.';
  return '';
}

export function AddTradeForm({ today, brokers, defaultBroker, onAdd }) {
  const [form, setForm] = useState(() => blankForm(today, defaultBroker));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const symbolRef = useRef(null);

  // The date defaults to today, including after midnight if the page stays open.
  useEffect(() => {
    setForm((current) => ({ ...current, entryDate: today }));
  }, [today]);

  // The default broker arrives from .env after the first render.
  useEffect(() => {
    if (defaultBroker) {
      setForm((current) => (current.broker ? current : { ...current, broker: defaultBroker }));
    }
  }, [defaultBroker]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    const trade = {
      symbol: form.symbol.trim().toUpperCase(),
      broker: form.broker || undefined, // the server falls back to DEFAULT_BROKER
      side: form.side,
      term: form.term,
      quantity: Number(form.quantity),
      entryPrice: Number(form.entryPrice),
      margin: Number(form.margin || 0),
      entryDate: form.entryDate,
    };
    const problem = problemWith(trade);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAdd(trade);
      setForm(blankForm(today, defaultBroker));
      symbolRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="entry" onSubmit={submit} noValidate>
      <div className="entry__head">
        <h2 className="entry__title">New transaction</h2>
        <p className="entry__hint">Sells and buy-backs go on the open row below.</p>
      </div>
      <div className="entry__fields">
        <Field id="new-symbol" label="Stock">
          <input
            id="new-symbol"
            ref={symbolRef}
            className="input input--symbol"
            value={form.symbol}
            onChange={(e) => update('symbol', e.target.value)}
            placeholder="AAPL"
            maxLength={15}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <BrokerField
          idPrefix="new"
          brokers={brokers}
          value={form.broker}
          onChange={(value) => update('broker', value)}
        />
        <Field label="Type">
          <Segmented
            name="new-side"
            label="Type"
            options={SIDE_OPTIONS}
            value={form.side}
            onChange={(value) => update('side', value)}
          />
        </Field>
        <Field label="Term">
          <Segmented
            name="new-term"
            label="Term"
            options={TERM_OPTIONS}
            value={form.term}
            onChange={(value) => update('term', value)}
          />
        </Field>
        <Field id="new-quantity" label="Quantity">
          <input
            id="new-quantity"
            className="input input--qty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field id="new-price" label={form.side === 'short' ? 'Short price' : 'Buy price'}>
          <input
            id="new-price"
            className="input input--price"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.entryPrice}
            onChange={(e) => update('entryPrice', e.target.value)}
            placeholder="$0.00"
          />
        </Field>
        <Field id="new-margin" label="Margin">
          <input
            id="new-margin"
            className="input input--margin"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.margin}
            onChange={(e) => update('margin', e.target.value)}
            onFocus={(e) => e.target.select()}
            title="Comes off this trade's profit when you exit the last shares"
          />
        </Field>
        <Field id="new-date" label="Date">
          <input
            id="new-date"
            className="input input--date"
            type="date"
            max={today}
            value={form.entryDate}
            onChange={(e) => update('entryDate', e.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Adding…' : form.side === 'short' ? 'Add short' : 'Add buy'}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
