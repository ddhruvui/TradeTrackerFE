import { useRef, useState } from 'react';
import { TERM_LABELS } from '../labels.js';
import { defaultTerm, newTradeProblems } from '../checks.js';
import { useStoredChoice } from '../hooks.js';
import { money, price, qty } from '../format.js';
import { BrokerField, Field, MoneyInput, Segmented, TERM_OPTIONS } from './Controls.jsx';
import { BuyArrow, CheckIcon, ShortArrow } from './Icons.jsx';
import { Panel } from './Panel.jsx';
import { SymbolInput } from './SymbolInput.jsx';

const blank = (today, broker, term) => ({
  side: 'buy',
  symbol: '',
  quantity: '',
  entryPrice: '',
  entryDate: today,
  broker: broker ?? '',
  term,
  fixedMargin: false,
  margin: '',
});

// Record a new buy or short. The term starts on the one you're viewing, so the trade
// shows up in the list. Margin is auto (6%/yr) unless you set a fixed amount.
export function NewTradePanel({ today, brokers, defaultBroker, tradedSymbols, filterTerm, onAdd, onClose }) {
  const start = blank(today, defaultBroker, defaultTerm(filterTerm));
  const [form, setForm] = useState(start);
  const [keepOpen, setKeepOpen] = useStoredChoice('tradeTracker.keepNewTradeOpen', ['no', 'yes']);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [added, setAdded] = useState('');
  const refs = { symbol: useRef(null), quantity: useRef(null), entryPrice: useRef(null), entryDate: useRef(null), margin: useRef(null) };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const isShort = form.side === 'short';
  const problems = newTradeProblems(form);
  const shown = tried ? problems : {};
  const quantity = Number(form.quantity);
  const entryPrice = Number(form.entryPrice);
  const total = quantity > 0 && entryPrice > 0 ? quantity * entryPrice : null;
  const perDay = total ? Math.ceil((total * 6) / 360) / 100 : null;
  const dirty = ['symbol', 'quantity', 'entryPrice', 'margin'].some((key) => form[key] !== start[key]);
  const symbol = form.symbol.trim().toUpperCase();

  async function submit(event) {
    event.preventDefault();
    const keys = Object.keys(problems);
    if (keys.length) {
      setTried(true);
      refs[keys[0]]?.current?.focus();
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const trade = await onAdd(
        {
          symbol,
          broker: form.broker || undefined, // the server falls back to DEFAULT_BROKER
          side: form.side,
          term: form.term,
          quantity,
          entryPrice,
          entryDate: form.entryDate,
          margin: form.fixedMargin ? Number(form.margin || 0) : 0,
        },
        { keepOpen: keepOpen === 'yes' },
      );
      if (keepOpen === 'yes') {
        setAdded(`Added ${trade.symbol}: ${trade.side === 'short' ? 'short' : 'buy'} of ${qty(trade.quantity)} at ${price(trade.entryPrice)}`);
        setForm((current) => ({ ...blank(today, current.broker, current.term), side: current.side, entryDate: current.entryDate }));
        setTried(false);
        setBusy(false);
        refs.symbol.current?.focus();
      }
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  const marginHint = form.fixedMargin
    ? `Fixed: ${money(Number(form.margin) || 0)}, taken off profit as you exit. A partial exit pays its share.`
    : perDay
      ? `Auto: about ${money(perDay)} a day at 6%/yr, taken off profit as you exit. A partial exit pays its share.`
      : 'Auto: 6%/yr from the trade date, taken off profit as you exit. A partial exit pays its share.';

  return (
    <Panel
      title="New trade"
      sub="Sells and buy-backs go on the position’s Sell button."
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? 'Adding…' : isShort ? 'Add short' : 'Add buy'}
        </button>
      }
    >
      {added && (
        <p className="box box--sunken" role="status" style={{ flexDirection: 'row', alignItems: 'center', color: 'var(--gain)', fontWeight: 500, fontSize: 13 }}>
          <CheckIcon />
          {added}
        </p>
      )}

      <fieldset className="field">
        <legend className="field__label">Type</legend>
        <div className="side-cards">
          <label className="side-card side-card--buy">
            <input type="radio" name="new-side" checked={!isShort} onChange={() => update('side', 'buy')} />
            <span className="side-card__title">
              <BuyArrow size={14} />
              Buy
            </span>
            <span className="side-card__hint">Profit when the price rises</span>
          </label>
          <label className="side-card side-card--short">
            <input type="radio" name="new-side" checked={isShort} onChange={() => update('side', 'short')} />
            <span className="side-card__title">
              <ShortArrow size={14} />
              Short
            </span>
            <span className="side-card__hint">Sell first, buy back later</span>
          </label>
        </div>
      </fieldset>

      <Field id="new-symbol" label="Stock" error={shown.symbol}>
        <SymbolInput
          id="new-symbol"
          ref={refs.symbol}
          value={form.symbol}
          onChange={(value) => update('symbol', value)}
          traded={tradedSymbols}
          invalid={Boolean(shown.symbol)}
          autoFocus
        />
      </Field>

      <div className="row-2">
        <Field id="new-quantity" label="Shares" error={shown.quantity}>
          <input
            id="new-quantity"
            ref={refs.quantity}
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            aria-invalid={Boolean(shown.quantity) || undefined}
            aria-describedby={shown.quantity ? 'new-quantity-note' : undefined}
          />
        </Field>
        <Field id="new-price" label={isShort ? 'Short price' : 'Buy price'} error={shown.entryPrice}>
          <MoneyInput
            id="new-price"
            inputRef={refs.entryPrice}
            value={form.entryPrice}
            onChange={(value) => update('entryPrice', value)}
            placeholder="0.00"
            invalid={Boolean(shown.entryPrice)}
            describedBy={shown.entryPrice ? 'new-price-note' : undefined}
          />
        </Field>
      </div>

      <div className="row-2">
        <Field id="new-date" label="Date" error={shown.entryDate}>
          <input
            id="new-date"
            ref={refs.entryDate}
            className="input"
            type="date"
            max={today}
            value={form.entryDate}
            onChange={(e) => update('entryDate', e.target.value)}
            aria-invalid={Boolean(shown.entryDate) || undefined}
          />
        </Field>
        <Field label="Margin" error={shown.margin}>
          <div className="chip-row" style={{ marginTop: 0 }} role="group" aria-label="Margin">
            <button type="button" className="chip" aria-pressed={!form.fixedMargin} onClick={() => update('fixedMargin', false)}>
              Auto 6%/yr
            </button>
            <button type="button" className="chip" aria-pressed={form.fixedMargin} onClick={() => update('fixedMargin', true)}>
              Fixed $
            </button>
          </div>
          {form.fixedMargin && (
            <div style={{ marginTop: 8 }}>
              <MoneyInput
                id="new-margin"
                inputRef={refs.margin}
                value={form.margin}
                onChange={(value) => update('margin', value)}
                placeholder="0.00"
                aria-label="Fixed margin in dollars"
                invalid={Boolean(shown.margin)}
              />
            </div>
          )}
        </Field>
      </div>

      <BrokerField idPrefix="new" brokers={brokers} value={form.broker} onChange={(value) => update('broker', value)} />

      <Field
        label="Term"
        help={filterTerm === 'all' ? undefined : `Starts on ${TERM_LABELS[filterTerm]}, the term you’re viewing.`}
      >
        <Segmented
          name="new-term"
          label="Term"
          className="seg--full seg--tall seg--wrap-phone"
          options={TERM_OPTIONS}
          value={form.term}
          onChange={(value) => update('term', value)}
        />
      </Field>

      <section className="box box--sunken num" aria-live="polite">
        <div className="result__head">
          <span style={{ fontWeight: 600 }}>
            {isShort ? 'Short' : 'Buy'} {quantity > 0 ? qty(quantity) : '—'} {symbol || '—'} at{' '}
            {entryPrice > 0 ? price(entryPrice) : '—'}
          </span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{total ? money(total) : '—'}</span>
        </div>
        <p className="box__text" style={{ color: 'var(--muted)' }}>
          {marginHint}
        </p>
      </section>

      <label className="check-row">
        <input type="checkbox" checked={keepOpen === 'yes'} onChange={(e) => setKeepOpen(e.target.checked ? 'yes' : 'no')} />
        Keep this panel open to add another
      </label>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}
    </Panel>
  );
}
