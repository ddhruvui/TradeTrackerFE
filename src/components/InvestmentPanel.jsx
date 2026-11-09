import { useRef, useState } from 'react';
import { TERM_LABELS, TERM_NAMES, TERMS } from '../labels.js';
import { investmentProblems } from '../checks.js';
import { money } from '../format.js';
import { Field, MoneyInput } from './Controls.jsx';
import { Panel } from './Panel.jsx';

// How much money is invested in each term. All is their sum; profit shows as a share
// of the term you're viewing, or of all three under All.
export function InvestmentPanel({ investment, onSave, onClose }) {
  const initial = Object.fromEntries(TERMS.map((term) => [term, String(investment?.[term] ?? 0)]));
  const [amounts, setAmounts] = useState(initial);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const refs = { short: useRef(null), mid: useRef(null), long: useRef(null) };

  const values = Object.fromEntries(TERMS.map((term) => [term, amounts[term] === '' ? 0 : Number(amounts[term])]));
  const total = TERMS.reduce((sum, term) => sum + (values[term] >= 0 ? values[term] : 0), 0);
  const problems = investmentProblems(amounts);
  const shown = tried ? problems : {};
  const dirty = TERMS.some((term) => amounts[term] !== initial[term]);

  async function save(event) {
    event.preventDefault();
    const keys = Object.keys(problems);
    if (keys.length) {
      setTried(true);
      refs[keys[0]].current?.focus();
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      await onSave(values);
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Invested amounts"
      sub="Profit % uses the term you’re viewing, or all three together under All."
      dirty={dirty}
      onClose={onClose}
      onSubmit={save}
      actions={
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? 'Saving…' : 'Save amounts'}
        </button>
      }
    >
      {TERMS.map((term, i) => (
        <Field key={term} id={`invest-${term}`} label={TERM_NAMES[term]} error={shown[term]}>
          <MoneyInput
            id={`invest-${term}`}
            inputRef={refs[term]}
            value={amounts[term]}
            onChange={(value) => setAmounts((current) => ({ ...current, [term]: value }))}
            onFocus={(e) => e.target.select()}
            invalid={Boolean(shown[term])}
            describedBy={shown[term] ? `invest-${term}-note` : undefined}
            data-autofocus={i === 0 ? '' : undefined}
          />
        </Field>
      ))}

      <section className="box box--sunken" aria-live="polite">
        <div className="result__head">
          <span className="box__title">All terms</span>
          <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>
            {money(total)}
          </span>
        </div>
        {total > 0 && (
          <>
            <div
              className="alloc"
              style={{ height: 10 }}
              role="img"
              aria-label={TERMS.map((t) => `${TERM_LABELS[t]} ${Math.round((Math.max(values[t], 0) / total) * 100)}%`).join(', ')}
            >
              {TERMS.map((t) => (
                <span key={t} style={{ flex: Math.max(values[t], 0) || 0 }} />
              ))}
            </div>
            <p className="alloc-legend" style={{ justifyContent: 'space-between' }}>
              {TERMS.map((t, i) => (
                <span key={t}>
                  <i className={`swatch swatch--${i + 1}`} />
                  {TERM_LABELS[t].replace(' term', '')} {Math.round((Math.max(values[t], 0) / total) * 100)}%
                </span>
              ))}
            </p>
          </>
        )}
      </section>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}
    </Panel>
  );
}
