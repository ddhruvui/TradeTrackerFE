// Radio buttons drawn as a segmented control, so arrow keys work natively.
// Options are [value, text] or [value, text, tooltip].
export function Segmented({ name, label, options, value, onChange, className = '' }) {
  return (
    <fieldset className={`segmented ${className}`}>
      <legend className="visually-hidden">{label}</legend>
      {options.map(([key, text, title]) => (
        <label key={key} className="segmented__option" title={title}>
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

// A labelled form field. Pass `id` for a single input, or omit it for a segmented control.
export function Field({ id, label, children }) {
  return (
    <div className="field">
      {id ? (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className="field__label" aria-hidden="true">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

// Broker choice from BROKERS in .env: short codes side by side for a few brokers,
// a dropdown once the list grows. Renders nothing until the list has loaded.
export function BrokerField({ idPrefix, brokers, value, onChange }) {
  if (!brokers.length) return null;
  const id = `${idPrefix}-broker`;
  const asDropdown = brokers.length > 4;
  return (
    <Field id={asDropdown ? id : undefined} label="Broker">
      {asDropdown ? (
        <select
          id={id}
          className="input input--select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {brokers.map(({ code, name }) => (
            <option key={code} value={code}>
              {code} · {name}
            </option>
          ))}
        </select>
      ) : (
        <Segmented
          name={id}
          label="Broker"
          options={brokers.map(({ code, name }) => [code, code, name])}
          value={value}
          onChange={onChange}
        />
      )}
    </Field>
  );
}

export const SIDE_OPTIONS = [
  ['buy', 'Buy'],
  ['short', 'Short'],
];

export const TERM_OPTIONS = [
  ['short', 'Short'],
  ['mid', 'Mid'],
  ['long', 'Long'],
];
