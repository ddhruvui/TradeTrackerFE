import { useEffect, useRef, useState } from 'react';
import { Field } from './Controls.jsx';
import { money } from '../format.js';
import { TERM_LABELS } from '../labels.js';

const TERMS = ['short', 'mid', 'long'];

// Edit how much money is invested in each term. All is their sum.
export function InvestmentDialog({ investment, onSave, onClose }) {
  const dialogRef = useRef(null);
  const pressedBackdrop = useRef(false);
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries(TERMS.map((term) => [term, String(investment?.[term] ?? 0)])),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  const close = () => dialogRef.current?.close();
  const values = Object.fromEntries(
    TERMS.map((term) => [term, amounts[term] === '' ? 0 : Number(amounts[term])]),
  );
  const total = TERMS.reduce(
    (sum, term) => sum + (Number.isFinite(values[term]) ? values[term] : 0),
    0,
  );

  async function save(event) {
    event.preventDefault();
    if (TERMS.some((term) => !(values[term] >= 0))) {
      setError('Each amount must be $0 or more.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(values);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="investment-title"
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
          <h2 id="investment-title" className="dialog__title">
            Investment
          </h2>
        </div>
        <p className="dialog__intro">
          How much money you’ve put into each term. Realized profit is also shown as a share of it:
          the selected term’s amount, or all three together under All.
        </p>
        <div className="dialog__grid dialog__grid--three">
          {TERMS.map((term) => (
            <Field key={term} id={`invest-${term}`} label={TERM_LABELS[term]}>
              <input
                id={`invest-${term}`}
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amounts[term]}
                onChange={(e) => setAmounts((current) => ({ ...current, [term]: e.target.value }))}
                onFocus={(e) => e.target.select()}
              />
            </Field>
          ))}
        </div>
        <p className="investment-total">
          All terms <strong>{money(total)}</strong>
        </p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <footer className="dialog__foot">
          <span className="dialog__spacer" />
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}
