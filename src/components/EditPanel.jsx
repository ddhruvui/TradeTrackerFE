import { useRef, useState } from 'react';
import { calculatedPnl } from '../preview.js';
import { marginCharge } from '../marginCharge.js';
import { groupOpenTrades, targetPrices } from '../openGroups.js';
import { newTradeProblems } from '../checks.js';
import { centsUp, heldFor, money, shortDate, signedMoney } from '../format.js';
import { BrokerField, Field, MoneyInput, Segmented, SIDE_OPTIONS, TERM_OPTIONS } from './Controls.jsx';
import { ChevronIcon } from './Icons.jsx';
import { Panel } from './Panel.jsx';

const asText = (value) => (value == null ? '' : String(value));

// A confirm step inside the More actions list.
function ActionRow({ title, desc, button, confirmText, confirmButton, danger, busy, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="action-row">
      <div className="action-row__text">
        <p className="action-row__title">{confirming ? confirmText : title}</p>
        <p className="action-row__desc">{desc}</p>
      </div>
      {confirming ? (
        <>
          <button type="button" className="btn btn--sm" onClick={() => setConfirming(false)}>
            Keep it
          </button>
          <button
            type="button"
            className={`btn btn--sm ${danger ? 'btn--danger-solid' : 'btn--primary'}`}
            disabled={busy}
            onClick={onConfirm}
            autoFocus
          >
            {confirmButton}
          </button>
        </>
      ) : (
        <button type="button" className={`btn btn--sm${danger ? ' btn--danger' : ''}`} onClick={() => setConfirming(true)}>
          {button}
        </button>
      )}
    </div>
  );
}

// Edit an open lot (its margin first: auto at 6%/yr or a fixed amount, with the effect
// on the position before you save) or a closed trade (its sale, and your broker's final
// profit or loss). Reopen and Delete sit under More actions, each with a confirm.
export function EditPanel({ trade, group, today, brokers, onSave, onDelete, onClose }) {
  const closed = trade.exitPrice != null;
  const isShortSide = trade.side === 'short';
  // Keep a broker that was removed from .env selectable for trades that still use it.
  const brokerChoices =
    !trade.broker || brokers.some(({ code }) => code === trade.broker)
      ? brokers
      : [...brokers, { code: trade.broker, name: `${trade.broker} (not in .env)` }];

  const initial = {
    symbol: trade.symbol,
    broker: trade.broker ?? '',
    side: trade.side,
    term: trade.term,
    quantity: asText(trade.quantity),
    entryPrice: asText(trade.entryPrice),
    entryDate: trade.entryDate,
    fixedMargin: closed || trade.margin > 0,
    margin: trade.margin > 0 || closed ? asText(trade.margin ?? 0) : '',
    exitPrice: asText(trade.exitPrice),
    exitDate: trade.exitDate ?? '',
    useOverride: trade.pnlOverride != null,
    pnl: trade.pnlOverride != null ? trade.pnlOverride.toFixed(2) : '',
  };
  const [form, setForm] = useState(initial);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const refs = { symbol: useRef(null), quantity: useRef(null), entryPrice: useRef(null), entryDate: useRef(null), margin: useRef(null), exitPrice: useRef(null), exitDate: useRef(null) };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const dirty = Object.keys(initial).some((key) => form[key] !== initial[key]);

  const marginValue = form.fixedMargin ? Number(form.margin || 0) : 0;
  const problems = newTradeProblems({ ...form, fixedMargin: form.fixedMargin });
  if (closed) {
    if (!(Number(form.exitPrice) > 0)) problems.exitPrice = isShortSide ? 'Enter the buy-back price.' : 'Enter the sell price.';
    if (!form.exitDate) problems.exitDate = 'Pick the date.';
    else if (form.exitDate < form.entryDate) problems.exitDate = 'The date can’t be before the entry date.';
  }
  const shown = tried ? problems : {};

  // Realized P&L follows the calculation until you switch to your broker's figure.
  const livePnl = calculatedPnl({
    side: form.side,
    quantity: Number(form.quantity),
    entryPrice: Number(form.entryPrice),
    exitPrice: Number(form.exitPrice),
    margin: Number(form.margin || 0),
  });

  // An open lot: the auto amount so far, and the position before and after the change.
  const auto = closed ? null : marginCharge({ ...trade, margin: 0 }, today);
  let effect = null;
  if (!closed && group) {
    const edited = {
      ...trade,
      margin: marginValue,
      quantity: Number(form.quantity) > 0 ? Number(form.quantity) : trade.quantity,
      entryPrice: Number(form.entryPrice) > 0 ? Number(form.entryPrice) : trade.entryPrice,
      entryDate: form.entryDate || trade.entryDate,
    };
    const [after] = groupOpenTrades(
      group.trades.map((t) => (t.id === trade.id ? edited : t)),
      today,
    );
    effect = { before: group, after };
  }
  const changed = effect && Math.abs(effect.after.finalAvg - effect.before.finalAvg) > 1e-9;

  async function run(action) {
    setBusy(true);
    setServerError('');
    try {
      await action();
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  function save(event) {
    event.preventDefault();
    const keys = Object.keys(problems);
    if (keys.length) {
      setTried(true);
      refs[keys[0]]?.current?.focus();
      return;
    }
    const changes = {
      symbol: form.symbol.trim().toUpperCase(),
      ...(form.broker ? { broker: form.broker } : {}),
      side: form.side,
      term: form.term,
      quantity: Number(form.quantity),
      entryPrice: Number(form.entryPrice),
      entryDate: form.entryDate,
      margin: marginValue,
    };
    if (closed) {
      changes.exitPrice = Number(form.exitPrice);
      changes.exitDate = form.exitDate;
      changes.pnlOverride = form.useOverride && form.pnl.trim() !== '' ? Number(form.pnl) : null;
    }
    run(() => onSave(trade.id, changes));
  }

  const subParts = closed
    ? [`${isShortSide ? 'Short' : 'Buy'}`, `sold ${shortDate(trade.exitDate, today)} after ${heldFor(trade.daysHeld)}`]
    : [
        `${isShortSide ? 'Shorted' : 'Bought'} ${shortDate(trade.entryDate, today)}`,
        group && group.trades.length > 1 ? `1 of ${group.trades.length} ${trade.symbol} lots` : 'open',
      ];

  const marginSection = (
    <fieldset className="panel-section">
      <legend className="panel-section__title">Margin</legend>
      {closed ? (
        <Field id="edit-margin" label="Margin" help="Comes off this trade’s realized profit." error={shown.margin}>
          <MoneyInput id="edit-margin" inputRef={refs.margin} value={form.margin} onChange={(v) => update('margin', v)} describedBy="edit-margin-note" invalid={Boolean(shown.margin)} />
        </Field>
      ) : (
        <>
          <Segmented
            name="edit-margin-mode"
            label="Margin"
            className="seg--full seg--tall"
            options={[
              ['auto', 'Auto · 6%/yr'],
              ['fixed', 'Fixed amount'],
            ]}
            value={form.fixedMargin ? 'fixed' : 'auto'}
            onChange={(mode) => update('fixedMargin', mode === 'fixed')}
          />
          {form.fixedMargin ? (
            <Field
              id="edit-margin"
              label="Fixed margin"
              error={shown.margin}
              help={
                Number(form.margin) === 0 && form.margin !== ''
                  ? `$0 means Auto: it goes back to 6%/yr (${money(auto.amount)} so far).`
                  : `Replaces the 6%/yr accrual and stays as typed. Each sale pays its share of it. Auto would be ${money(auto.amount)} today.`
              }
            >
              <MoneyInput
                id="edit-margin"
                inputRef={refs.margin}
                value={form.margin}
                onChange={(v) => update('margin', v)}
                placeholder="0.00"
                invalid={Boolean(shown.margin)}
                describedBy="edit-margin-note"
              />
            </Field>
          ) : (
            <p className="box box--sunken box__text">
              <span>
                <strong className="num" style={{ color: 'var(--ink)' }}>
                  {money(auto.amount)} so far
                </strong>{' '}
                for {auto.days} {auto.days === 1 ? 'day' : 'days'}. It keeps growing until the shares close; a partial sale
                pays its share and the rest keeps growing.
              </span>
            </p>
          )}
          {effect && (
            <section className="box" aria-live="polite" aria-label={`Effect on the ${trade.symbol} position`}>
              <p className="box__title">
                Effect on the {trade.symbol} position ({effect.after.shares} shares)
              </p>
              <dl className="facts">
                <dt>Margin to date</dt>
                <dd>
                  {changed && <span className="facts__was">{money(effect.before.margin)}</span>}
                  {changed && ' → '}
                  <strong>{money(effect.after.margin)}</strong>
                </dd>
                <dt>Break-even</dt>
                <dd>
                  {changed && <span className="facts__was">{centsUp(effect.before.finalAvg)}</span>}
                  {changed && ' → '}
                  <strong>{centsUp(effect.after.finalAvg)}</strong>
                </dd>
                <dt>Targets</dt>
                <dd>
                  <strong>
                    {targetPrices(trade.side, effect.after.finalAvg)
                      .map((t) => money(t.price))
                      .join(' / ')}
                  </strong>
                </dd>
              </dl>
              <p className="box__text" style={{ color: 'var(--muted)' }}>
                Realized profit doesn’t change until you exit.
              </p>
            </section>
          )}
        </>
      )}
    </fieldset>
  );

  return (
    <Panel
      title={
        <>
          Edit <span className="ticker">{trade.symbol}</span>
          {closed ? '' : ' lot'}
        </>
      }
      titleExtra={<span className={`status-chip${closed ? '' : ' status-chip--open'}`}>{closed ? 'Closed' : 'Open'}</span>}
      sub={subParts.join(' · ')}
      dirty={dirty}
      onClose={onClose}
      onSubmit={save}
      actions={
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      }
    >
      {!closed && marginSection}

      <fieldset className="panel-section">
        <legend className="panel-section__title">Entry</legend>
        <div className="row-2">
          <Field label="Type">
            <Segmented
              name="edit-side"
              label="Type"
              className="seg--full seg--tall"
              options={SIDE_OPTIONS}
              value={form.side}
              onChange={(v) => update('side', v)}
            />
          </Field>
          <Field id="edit-symbol" label="Stock" error={shown.symbol}>
            <input
              id="edit-symbol"
              ref={refs.symbol}
              className="input input--symbol"
              value={form.symbol}
              onChange={(e) => update('symbol', e.target.value.toUpperCase())}
              maxLength={15}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(shown.symbol) || undefined}
            />
          </Field>
        </div>
        <BrokerField idPrefix="edit" brokers={brokerChoices} value={form.broker} onChange={(v) => update('broker', v)} />
        <Field label="Term">
          <Segmented
            name="edit-term"
            label="Term"
            className="seg--full seg--tall seg--wrap-phone"
            options={TERM_OPTIONS}
            value={form.term}
            onChange={(v) => update('term', v)}
          />
        </Field>
        <div className="row-3">
          <Field id="edit-quantity" label="Shares" error={shown.quantity}>
            <input
              id="edit-quantity"
              ref={refs.quantity}
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              aria-invalid={Boolean(shown.quantity) || undefined}
            />
          </Field>
          <Field id="edit-entry-price" label={form.side === 'short' ? 'Short price' : 'Buy price'} error={shown.entryPrice}>
            <MoneyInput
              id="edit-entry-price"
              inputRef={refs.entryPrice}
              value={form.entryPrice}
              onChange={(v) => update('entryPrice', v)}
              invalid={Boolean(shown.entryPrice)}
            />
          </Field>
          <Field id="edit-entry-date" label="Date" error={shown.entryDate}>
            <input
              id="edit-entry-date"
              ref={refs.entryDate}
              className="input"
              type="date"
              max={today}
              value={form.entryDate}
              onChange={(e) => update('entryDate', e.target.value)}
              aria-invalid={Boolean(shown.entryDate) || undefined}
            />
          </Field>
        </div>
        {!closed && <p className="field__help" style={{ marginTop: -4 }}>To sell some or all of this lot, use Sell on the position.</p>}
      </fieldset>

      {closed && marginSection}

      {closed && (
        <fieldset className="panel-section">
          <legend className="panel-section__title">{isShortSide ? 'Buy-back' : 'Sale'}</legend>
          <div className="row-2">
            <Field id="edit-exit-price" label={form.side === 'short' ? 'Buy-back price' : 'Sell price'} error={shown.exitPrice}>
              <MoneyInput
                id="edit-exit-price"
                inputRef={refs.exitPrice}
                value={form.exitPrice}
                onChange={(v) => update('exitPrice', v)}
                invalid={Boolean(shown.exitPrice)}
              />
            </Field>
            <Field id="edit-exit-date" label={form.side === 'short' ? 'Buy-back date' : 'Sell date'} error={shown.exitDate}>
              <input
                id="edit-exit-date"
                ref={refs.exitDate}
                className="input"
                type="date"
                min={form.entryDate}
                max={today}
                value={form.exitDate}
                onChange={(e) => update('exitDate', e.target.value)}
                aria-invalid={Boolean(shown.exitDate) || undefined}
              />
            </Field>
          </div>
          <div className="box box--sunken">
            <div className="switch-row">
              <div>
                <p className="box__title" id="edit-override-label">
                  Use my broker’s figure
                </p>
                <p className="box__text" style={{ color: 'var(--muted)' }}>
                  For fractional shares or rounded prices
                </p>
              </div>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={form.useOverride}
                aria-labelledby="edit-override-label"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    useOverride: !current.useOverride,
                    pnl: current.pnl || (livePnl == null ? '' : livePnl.toFixed(2)),
                  }))
                }
              />
            </div>
            <Field
              id="edit-pnl"
              label="Realized P&L"
              help={
                form.useOverride
                  ? `Calculated: ${livePnl == null ? '—' : signedMoney(livePnl)}. Your figure counts in every total and shows as “edited”.`
                  : 'Calculated from the prices, shares and margin.'
              }
            >
              <MoneyInput
                id="edit-pnl"
                value={form.useOverride ? form.pnl : livePnl == null ? '' : livePnl.toFixed(2)}
                onChange={(v) => setForm((current) => ({ ...current, useOverride: true, pnl: v }))}
                min={undefined}
                describedBy="edit-pnl-note"
              />
            </Field>
            {form.useOverride && (
              <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 12 }} onClick={() => update('useOverride', false)}>
                Use the calculated amount
              </button>
            )}
          </div>
        </fieldset>
      )}

      <details className="more">
        <summary>
          More actions
          <ChevronIcon size={14} />
        </summary>
        {closed && (
          <ActionRow
            title="Reopen position"
            desc="Moves it back to Open positions and out of realized profit. An edited P&L is dropped."
            button="Reopen…"
            confirmText="Reopen this trade?"
            confirmButton="Reopen"
            busy={busy}
            onConfirm={() => run(() => onSave(trade.id, { exitPrice: null, exitDate: null }))}
          />
        )}
        <ActionRow
          title={closed ? 'Delete transaction' : 'Delete this lot'}
          desc="Removes it from every list and total. This can’t be undone."
          button="Delete…"
          confirmText="Delete it for good?"
          confirmButton="Delete"
          danger
          busy={busy}
          onConfirm={() => run(() => onDelete(trade))}
        />
      </details>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}
    </Panel>
  );
}
