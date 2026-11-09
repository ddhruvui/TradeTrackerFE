import { TERM_LEVEL, TERM_NAMES, sideLabel } from '../labels.js';
import { AlertIcon, BuyArrow, ShortArrow } from './Icons.jsx';

// Radio buttons drawn as a segmented control, so arrow keys work natively.
// Options are [value, text] or [value, text, tooltip]; text may be any node.
export function Segmented({ name, label, options, value, onChange, className = '' }) {
  return (
    <fieldset className={`seg ${className}`}>
      <legend className="visually-hidden">{label}</legend>
      {options.map(([key, text, title]) => (
        <label key={key} className="seg__opt" title={title}>
          <input
            type="radio"
            name={name}
            value={key}
            checked={value === key}
            onChange={() => onChange(key)}
          />
          <span>{text}</span>
        </label>
      ))}
    </fieldset>
  );
}

// A labelled field with its help text or error under it. Pass `id` for one input
// (the label points at it); without `id` the label names a group of controls.
export function Field({ id, label, help, error, className = '', children }) {
  const describedBy = id && (error || help) ? `${id}-note` : undefined;
  return (
    <div className={`field ${className}`}>
      {id ? (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className="field__label">{label}</span>
      )}
      {typeof children === 'function' ? children({ describedBy, invalid: Boolean(error) }) : children}
      {error ? (
        <p className="field__error" id={describedBy} role="alert">
          <AlertIcon size={14} />
          {error}
        </p>
      ) : help ? (
        <p className="field__help" id={describedBy}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

// A dollar amount: "$" sits inside the box.
export function MoneyInput({ id, value, onChange, invalid, describedBy, inputRef, ...rest }) {
  return (
    <div className="input-wrap">
      <span className="input-wrap__prefix" aria-hidden="true">
        $
      </span>
      <input
        id={id}
        ref={inputRef}
        className="input"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </div>
  );
}

// Broker choice from BROKERS in .env: full names side by side for a few brokers,
// a dropdown once the list grows. Renders nothing until the list has loaded.
export function BrokerField({ idPrefix, brokers, value, onChange }) {
  if (!brokers.length) return null;
  const id = `${idPrefix}-broker`;
  if (brokers.length > 4) {
    return (
      <Field id={id} label="Broker">
        <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          {brokers.map(({ code, name }) => (
            <option key={code} value={code}>
              {name} ({code})
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label="Broker">
      <Segmented
        name={id}
        label="Broker"
        className="seg--full seg--tall seg--wrap-phone"
        options={brokers.map(({ code, name }) => [code, name, code])}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

// Buy reads blue with a rising arrow, Short reads amber with a falling one.
export function SidePill({ side }) {
  return (
    <span className={`side-pill side-pill--${side}`}>
      {side === 'short' ? <ShortArrow /> : <BuyArrow />}
      {sideLabel(side)}
    </span>
  );
}

export function TermBars({ term }) {
  const level = TERM_LEVEL[term] ?? 0;
  return (
    <span className="term-bars" aria-hidden="true">
      {[1, 2, 3].map((step) => (
        <i key={step} className={step <= level ? 'on' : undefined} />
      ))}
    </span>
  );
}

// "Short-term" with the bars glyph: one bar short, two mid, three long.
export function TermTag({ term }) {
  return (
    <span className="term-tag">
      <TermBars term={term} />
      {TERM_NAMES[term] ?? term}
    </span>
  );
}

export const TERM_OPTIONS = ['short', 'mid', 'long'].map((term) => [
  term,
  <>
    <TermBars term={term} />
    {TERM_NAMES[term]}
  </>,
]);

export const SIDE_OPTIONS = [
  ['buy', 'Buy'],
  ['short', 'Short'],
];
