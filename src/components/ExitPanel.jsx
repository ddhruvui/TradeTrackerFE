import { useRef, useState } from 'react';
import { TERM_NAMES, exitVerb } from '../labels.js';
import { exitMarginSplit, marginCharge } from '../marginCharge.js';
import { targetPrices } from '../openGroups.js';
import { previewExit } from '../preview.js';
import { exitProblems } from '../checks.js';
import { centsUp, money, pctArrow, price, qty, shortDate, signedMoney } from '../format.js';
import { Field, MoneyInput, SidePill } from './Controls.jsx';
import { Panel } from './Panel.jsx';

const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');
const oldestFirst = (trades) => [...trades].sort((a, b) => (a.entryDate < b.entryDate ? -1 : a.entryDate > b.entryDate ? 1 : 0));

// Sell a buy or buy back a short: pick the lot (oldest first), then shares, price and
// date. The result sits right under the inputs and shows its working. Every exit pays
// its share of the lot's margin so far; the shares left keep accruing.
export function ExitPanel({ group, lotId, startPrice, today, invested, brokerNames, onExit, onEditLot, onClose }) {
  const lots = oldestFirst(group.trades);
  const [chosenId, setChosenId] = useState(lotId ?? lots[0].id);
  const lot = lots.find((t) => t.id === chosenId) ?? lots[0];
  const [shares, setShares] = useState(String(lot.quantity));
  const [exitPrice, setExitPrice] = useState(startPrice != null ? startPrice.toFixed(2) : '');
  const [exitDate, setExitDate] = useState(today);
  const [typedMargin, setTypedMargin] = useState(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const refs = { quantity: useRef(null), exitPrice: useRef(null), exitDate: useRef(null), margin: useRef(null) };

  const isShort = group.side === 'short';
  const verb = exitVerb(group.side);
  const quantity = Number(shares);
  const validQty = shares !== '' && quantity > 0 && quantity <= lot.quantity + 1e-9;
  const split = exitMarginSplit(lot, validQty ? quantity : lot.quantity, exitDate || today);
  const margin = typedMargin ?? split.charged.toFixed(2);
  const partial = validQty && split.left != null;
  const lotCharge = marginCharge(lot, exitDate || today);

  const exit = { quantity: shares, exitPrice, exitDate, margin };
  const problems = exitProblems(lot, exit, today);
  // Too many shares shows at once; the rest wait until you try to confirm.
  const shown = tried ? problems : { quantity: problems.quantity?.startsWith('This lot') ? problems.quantity : undefined };
  const result = validQty ? previewExit(lot, { quantity, exitPrice: Number(exitPrice), margin: Number(margin) }) : null;
  const perShare = isShort ? lot.entryPrice - Number(exitPrice) : Number(exitPrice) - lot.entryPrice;
  const dirty = exitPrice !== (startPrice != null ? startPrice.toFixed(2) : '') || shares !== String(lot.quantity) || typedMargin != null || exitDate !== today;

  const brokers = [...new Set(group.trades.map((t) => brokerNames[t.broker] ?? t.broker))];
  const terms = [...new Set(group.trades.map((t) => TERM_NAMES[t.term]))];
  const sub = [
    terms.length === 1 ? terms[0] : 'Mixed terms',
    brokers.length === 1 ? brokers[0] : `${brokers.length} brokers`,
    `${lots.length} open ${lots.length === 1 ? 'lot' : 'lots'}`,
    `break-even ${centsUp(group.finalAvg)}`,
  ].join(' · ');

  function chooseLot(id) {
    const next = lots.find((t) => t.id === id);
    setChosenId(id);
    setShares(String(next.quantity));
    setTypedMargin(null);
    if (exitDate < next.entryDate) setExitDate(next.entryDate);
  }

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
      await onExit(lot, { quantity, exitPrice: Number(exitPrice), exitDate, margin: Number(margin) });
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  const sharesLeft = Math.round((lot.quantity - quantity) * 1e6) / 1e6;
  const pctText = `${Math.round(split.share * 100)}%`;
  let marginHelp;
  if (typedMargin != null) marginHelp = `Your amount (auto: ${money(split.charged)})`;
  else if (partial) marginHelp = `${pctText} of ${money(split.total)} so far (${qty(quantity)} of ${qty(lot.quantity)} shares)`;
  else if (lotCharge.typed) marginHelp = 'This lot’s fixed margin, all of it';
  else marginHelp = `Auto: 6%/yr for ${lotCharge.days} ${lotCharge.days === 1 ? 'day' : 'days'}, all of it`;

  return (
    <Panel
      title={
        <>
          {verb} <span className="ticker">{group.symbol}</span>
        </>
      }
      titleExtra={<SidePill side={group.side} />}
      sub={sub}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? 'Saving…' : validQty ? `${verb} ${qty(quantity)} ${group.symbol}` : verb}
        </button>
      }
    >
      {lots.length > 1 && (
        <fieldset className="field" style={{ gap: 8 }}>
          <legend className="field__label">Which lot</legend>
          {lots.map((t) => {
            const charge = marginCharge(t, exitDate || today);
            return (
              <label key={t.id} className="lot-choice">
                <input type="radio" name="exit-lot" checked={t.id === lot.id} onChange={() => chooseLot(t.id)} />
                <span className="lot-choice__text">
                  <span className="lot-choice__main">
                    <span>
                      {qty(t.quantity)} shares {isShort ? 'shorted' : 'bought'} at {price(t.entryPrice)}
                    </span>
                    <span className="lot-choice__date">{shortDate(t.entryDate, today)}</span>
                  </span>
                  <span className="lot-choice__sub">
                    {brokerNames[t.broker] ?? t.broker} · margin so far {money(charge.amount)}
                    {charge.typed ? ' (fixed)' : ` (${charge.days} ${charge.days === 1 ? 'day' : 'days'}, auto)`}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      <Field
        id="exit-shares"
        label={`Shares to ${verb.toLowerCase()}`}
        error={shown.quantity}
        help={validQty ? (partial ? `Partial: ${qty(sharesLeft)} of ${qty(lot.quantity)} shares stay open.` : `${isShort ? 'Buys back' : 'Sells'} the whole lot.`) : undefined}
      >
        <div className="input-with-chips">
          <input
            id="exit-shares"
            ref={refs.quantity}
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            max={lot.quantity}
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            aria-invalid={Boolean(shown.quantity) || undefined}
            aria-describedby="exit-shares-note"
          />
          <button type="button" className="chip" aria-pressed={validQty && !partial} onClick={() => setShares(String(lot.quantity))}>
            All {qty(lot.quantity)}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={validQty && Math.abs(quantity - lot.quantity / 2) < 1e-9}
            onClick={() => setShares(String(lot.quantity / 2))}
          >
            Half
          </button>
        </div>
      </Field>

      <Field id="exit-price" label={isShort ? 'Buy-back price' : 'Sell price'} error={shown.exitPrice}>
        <MoneyInput
          id="exit-price"
          inputRef={refs.exitPrice}
          value={exitPrice}
          onChange={setExitPrice}
          placeholder="0.00"
          invalid={Boolean(shown.exitPrice)}
          describedBy={shown.exitPrice ? 'exit-price-note' : undefined}
          data-autofocus=""
        />
        <div className="chip-row">
          <span className="chip-row__label">Targets</span>
          {targetPrices(group.side, group.finalAvg).map(({ label, pct, price: target }) => (
            <button
              key={label}
              type="button"
              className="chip"
              aria-pressed={Math.abs(Number(exitPrice) - target) < 0.001}
              onClick={() => setExitPrice(target.toFixed(2))}
              title={`${isShort ? '−' : '+'}${pct}%`}
            >
              <span className="chip__pct">{label}</span>
              {money(target)}
            </button>
          ))}
        </div>
      </Field>

      <div className="row-2">
        <Field id="exit-date" label={isShort ? 'Buy-back date' : 'Sell date'} error={shown.exitDate}>
          <input
            id="exit-date"
            ref={refs.exitDate}
            className="input"
            type="date"
            min={lot.entryDate}
            max={today}
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            aria-invalid={Boolean(shown.exitDate) || undefined}
            aria-describedby={shown.exitDate ? 'exit-date-note' : undefined}
          />
        </Field>
        <Field id="exit-margin" label="Margin charged now" error={shown.margin} help={marginHelp}>
          <MoneyInput
            id="exit-margin"
            inputRef={refs.margin}
            value={margin}
            onChange={setTypedMargin}
            onFocus={(e) => e.target.select()}
            invalid={Boolean(shown.margin)}
            describedBy="exit-margin-note"
          />
        </Field>
      </div>
      {typedMargin != null && (
        <p className="field__help" style={{ marginTop: -12 }}>
          <button type="button" className="link-btn" onClick={() => setTypedMargin(null)}>
            Use the auto amount ({money(split.charged)})
          </button>
        </p>
      )}

      {partial && (
        <section className="box" aria-label="How this lot’s margin splits">
          <p className="box__title">How this lot’s margin splits</p>
          <div className="split-bar" role="img" aria-label={`${qty(quantity)} of ${qty(lot.quantity)} shares pay ${pctText} now; the rest stays with the open shares`}>
            <span style={{ flex: split.share }} />
            <span style={{ flex: 1 - split.share }} />
          </div>
          <dl className="facts split-facts">
            <dt>
              <i className="swatch" style={{ background: 'var(--ink)' }} />
              {qty(quantity)} {isShort ? 'bought back' : 'sold'} ({pctText})
            </dt>
            <dd style={{ fontWeight: 600 }}>{money(Number(margin) || 0)} now</dd>
            <dt>
              <i className="swatch" style={{ background: 'var(--line-strong)' }} />
              {qty(sharesLeft)} still open ({split.left.typed ? 'fixed' : 'auto'})
            </dt>
            <dd>
              {money(split.left.amount)} {split.left.typed ? 'kept' : 'so far'}
            </dd>
          </dl>
          <p className="box__text">
            {split.left.typed
              ? `The ${qty(sharesLeft)} left keep ${money(split.left.amount)} of the fixed margin until they close.`
              : `The ${qty(sharesLeft)} left keep accruing at 6%/yr until you ${verb.toLowerCase()} them; their margin comes off that exit.`}
          </p>
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 12 }} onClick={() => onEditLot(lot)}>
            Change this lot’s margin instead
          </button>
        </section>
      )}

      <section className="result" aria-live="polite" aria-label="Result">
        <div className="result__head">
          <span className="result__label">You’d realize</span>
          <span className={`result__value tone-${result == null ? 'flat' : tone(result)}`}>
            {result == null ? '—' : signedMoney(result)}
          </span>
        </div>
        {result != null && (
          <dl className="facts">
            <dt>
              Price move ({signedMoney(perShare)} × {qty(quantity)})
            </dt>
            <dd>{signedMoney(Math.round(perShare * quantity * 100) / 100)}</dd>
            <dt>Margin ({partial ? `${qty(quantity)} of ${qty(lot.quantity)} shares` : 'all of it'})</dt>
            <dd>{signedMoney(-Number(margin))}</dd>
            <dt className="facts__rule">Return on cost</dt>
            <dd className="facts__rule">{signedPct((result / (quantity * lot.entryPrice)) * 100)}</dd>
            {invested > 0 && (
              <>
                <dt>Of invested ({money(invested)})</dt>
                <dd>{pctArrow((result * 100) / invested)}</dd>
              </>
            )}
          </dl>
        )}
        <p className="result__note">
          {result == null
            ? 'Enter shares and a price to see the result.'
            : partial
              ? `A closed “partial” row for ${qty(quantity)} shares joins Closed trades; ${qty(sharesLeft)} stay open as the ${shortDate(lot.entryDate, today)} lot.`
              : lots.length > 1
                ? 'The lot closes and moves to Closed trades. The other lots stay open.'
                : 'The position closes and moves to Closed trades.'}
        </p>
      </section>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}
    </Panel>
  );
}

const signedPct = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
