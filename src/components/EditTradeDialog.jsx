import { useEffect, useRef, useState } from 'react';
import { BrokerField, Field, Segmented, SIDE_OPTIONS, TERM_OPTIONS } from './Controls.jsx';
import { calculatedPnl } from '../preview.js';
import { signedMoney } from '../format.js';

const asText = (value) => (value == null ? '' : String(value));

export function EditTradeDialog({ trade, today, brokers, onSave, onDelete, onClose }) {
  // Keep a broker that was removed from .env selectable for trades that still use it.
  const brokerChoices =
    !trade.broker || brokers.some(({ code }) => code === trade.broker)
      ? brokers
      : [...brokers, { code: trade.broker, name: `${trade.broker} (not in .env)` }];
  const dialogRef = useRef(null);
  const pressedBackdrop = useRef(false);
  const closed = trade.exitPrice != null;
  const isShort = trade.side === 'short';
  const [form, setForm] = useState(() => ({
    symbol: trade.symbol,
    broker: trade.broker ?? '',
    side: trade.side,
    term: trade.term,
    quantity: asText(trade.quantity),
    entryPrice: asText(trade.entryPrice),
    entryDate: trade.entryDate,
    margin: asText(trade.margin ?? 0),
    exitPrice: asText(trade.exitPrice),
    exitDate: trade.exitDate ?? '',
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Realized P&L follows the calculation until you type your own final amount.
  const edited = trade.pnlOverride != null;
  const [pnlMode, setPnlMode] = useState(edited ? 'custom' : 'calculated');
  const [pnlText, setPnlText] = useState(edited ? trade.pnlOverride.toFixed(2) : '');
  const livePnl = calculatedPnl({
    side: form.side,
    quantity: Number(form.quantity),
    entryPrice: Number(form.entryPrice),
    exitPrice: Number(form.exitPrice),
    margin: form.margin === '' ? 0 : Number(form.margin),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => dialogRef.current?.close();

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function save(event) {
    event.preventDefault();
    const changes = {
      symbol: form.symbol.trim().toUpperCase(),
      ...(form.broker ? { broker: form.broker } : {}),
      side: form.side,
      term: form.term,
      quantity: Number(form.quantity),
      entryPrice: Number(form.entryPrice),
      entryDate: form.entryDate,
      margin: form.margin === '' ? 0 : Number(form.margin),
    };
    if (closed) {
      changes.exitPrice = form.exitPrice === '' ? null : Number(form.exitPrice);
      changes.exitDate = form.exitDate || null;
      // Your own final amount, or null to use the calculated one.
      changes.pnlOverride =
        pnlMode === 'custom' && pnlText.trim() !== '' ? Number(pnlText) : null;
    }
    run(() => onSave(trade.id, changes));
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="edit-title"
      onClose={onClose}
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) close();
      }}
    >
      <form className="dialog__body" onSubmit={save} noValidate>
        <div className="dialog__head">
          <h2 id="edit-title" className="dialog__title">
            Edit {trade.symbol}
          </h2>
          <span className={`status-chip ${closed ? '' : 'status-chip--open'}`}>
            {closed ? 'Closed' : 'Open'}
          </span>
        </div>

        <div className="dialog__grid">
          <Field id="edit-symbol" label="Stock">
            <input
              id="edit-symbol"
              className="input input--symbol"
              value={form.symbol}
              onChange={(e) => update('symbol', e.target.value)}
              maxLength={15}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <BrokerField
            idPrefix="edit"
            brokers={brokerChoices}
            value={form.broker}
            onChange={(value) => update('broker', value)}
          />
          <Field label="Type">
            <Segmented
              name="edit-side"
              label="Type"
              options={SIDE_OPTIONS}
              value={form.side}
              onChange={(value) => update('side', value)}
            />
          </Field>
          <Field label="Term">
            <Segmented
              name="edit-term"
              label="Term"
              options={TERM_OPTIONS}
              value={form.term}
              onChange={(value) => update('term', value)}
            />
          </Field>
          <Field id="edit-quantity" label="Quantity">
            <input
              id="edit-quantity"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
          </Field>
          <Field id="edit-entry-price" label={form.side === 'short' ? 'Short price' : 'Buy price'}>
            <input
              id="edit-entry-price"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.entryPrice}
              onChange={(e) => update('entryPrice', e.target.value)}
            />
          </Field>
          <Field id="edit-entry-date" label="Date">
            <input
              id="edit-entry-date"
              className="input"
              type="date"
              max={today}
              value={form.entryDate}
              onChange={(e) => update('entryDate', e.target.value)}
            />
          </Field>
          <Field id="edit-margin" label="Margin">
            <input
              id="edit-margin"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.margin}
              onChange={(e) => update('margin', e.target.value)}
            />
            <span className="dialog__hint">
              {closed
                ? 'Comes off this trade’s realized profit.'
                : 'Charged when the last shares close.'}
            </span>
          </Field>
        </div>

        {closed && (
          <fieldset className="dialog__section">
            <legend className="dialog__section-title">{isShort ? 'Buy-back' : 'Sale'}</legend>
            <div className="dialog__grid">
              <Field id="edit-exit-price" label={form.side === 'short' ? 'Buy price' : 'Sell price'}>
                <input
                  id="edit-exit-price"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.exitPrice}
                  onChange={(e) => update('exitPrice', e.target.value)}
                />
              </Field>
              <Field id="edit-exit-date" label={form.side === 'short' ? 'Buy date' : 'Sell date'}>
                <input
                  id="edit-exit-date"
                  className="input"
                  type="date"
                  min={form.entryDate}
                  max={today}
                  value={form.exitDate}
                  onChange={(e) => update('exitDate', e.target.value)}
                />
              </Field>
              <Field id="edit-pnl" label="Realized P&L">
                <input
                  id="edit-pnl"
                  className="input"
                  type="number"
                  step="any"
                  value={pnlMode === 'custom' ? pnlText : livePnl == null ? '' : livePnl.toFixed(2)}
                  onChange={(e) => {
                    setPnlMode('custom');
                    setPnlText(e.target.value);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </Field>
              <p className="dialog__hint dialog__hint--pnl">
                {pnlMode === 'custom' ? (
                  <>
                    Your final amount; it’s what counts in the totals. Calculated:{' '}
                    {livePnl == null ? '—' : signedMoney(livePnl)}.{' '}
                    <button type="button" className="link-btn" onClick={() => setPnlMode('calculated')}>
                      Use calculated
                    </button>
                  </>
                ) : (
                  'Calculated from the prices, shares and margin. Type a different amount if your broker’s figure differs.'
                )}
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn--sm"
                disabled={busy}
                onClick={() => run(() => onSave(trade.id, { exitPrice: null, exitDate: null }))}
              >
                Reopen position
              </button>
              <p className="dialog__hint">Moves it back to Open and out of realized profit.</p>
            </div>
          </fieldset>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <footer className="dialog__foot">
          {confirmingDelete ? (
            <div className="confirm">
              <span>Delete this transaction for good?</span>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                disabled={busy}
                onClick={() => run(() => onDelete(trade))}
              >
                Delete
              </button>
              <button type="button" className="btn btn--sm" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--sm btn--quiet-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete…
            </button>
          )}
          <span className="dialog__spacer" />
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Save changes
          </button>
        </footer>
      </form>
    </dialog>
  );
}
