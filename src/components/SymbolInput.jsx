import { forwardRef, useState } from 'react';
import { suggestTickers } from '../tickers.js';

// The stock symbol box, with suggestions from the watchlist and symbols traded before.
// Arrow keys move through them, Enter or a click picks one, Escape closes the list.
export const SymbolInput = forwardRef(function SymbolInput({ id, value, onChange, traded }, ref) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const suggestions = open ? suggestTickers(value, traded) : [];
  const showing = suggestions.length > 0;
  const listId = `${id}-suggestions`;

  function pick(symbol) {
    onChange(symbol);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (!showing) {
      if (event.key === 'ArrowDown' && value.trim()) {
        setOpen(true);
        setActive(0);
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + suggestions.length) % suggestions.length);
      event.preventDefault();
    } else if (event.key === 'Enter') {
      pick(suggestions[active].symbol);
      event.preventDefault(); // pick first; the next Enter adds the trade
    } else if (event.key === 'Escape') {
      setOpen(false);
      event.preventDefault();
    }
  }

  return (
    <div className="symbol-box">
      <input
        id={id}
        ref={ref}
        className="input input--symbol"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        placeholder="AAPL"
        maxLength={15}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing ? `${listId}-${active}` : undefined}
      />
      {showing && (
        <ul id={listId} className="suggest" role="listbox" aria-label="Suggested symbols">
          {suggestions.map(({ symbol, traded: before }, i) => (
            <li
              key={symbol}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="suggest__item"
              onMouseDown={(e) => e.preventDefault()} // keep focus in the box
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(symbol)}
            >
              <span className="suggest__symbol">{symbol}</span>
              {before && <span className="suggest__tag">traded</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
