import { TERM_LABELS, TERMS } from '../labels.js';
import { fullDate, money, monthYear, pctArrow, signedMoney, weekdayDate, wholeMoney } from '../format.js';

const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

function footnote({ count, margin }) {
  const trades = count === 0 ? 'No closed trades' : count === 1 ? '1 closed trade' : `${count} closed trades`;
  return margin > 0 ? `${trades} · ${money(margin)} margin` : trades;
}

function Skeleton() {
  return (
    <>
      <span className="sk" style={{ width: 120, height: 26 }} />
      <span className="sk" style={{ width: 90, height: 10 }} />
    </>
  );
}

// The four realized-profit totals worked out by the backend (/api/summary), each also
// as a share of the money invested in the view, plus the Invested amounts with their
// split. `summary` is null until the first load finishes; `failed` means it couldn't load.
export function SummaryStrip({ summary, today, term, failed, onEditInvestment }) {
  const periods = [
    {
      key: 'week',
      label: 'This week',
      range: summary ? `${weekdayDate(summary.week.from)} – ${weekdayDate(summary.week.to)}` : 'Friday to Thursday',
    },
    { key: 'month', label: 'This month', range: monthYear(today) },
    { key: 'year', label: 'This year', range: `Jan 1 – today, ${today.slice(0, 4)}` },
    {
      key: 'overall',
      label: 'Overall',
      range: summary?.firstDate ? `Since ${fullDate(summary.firstDate)}` : 'All time',
    },
  ];
  // investment can be missing while an older API is still deployed
  const investment = summary?.investment;
  const total = investment?.all ?? 0;
  const invested = summary?.invested ?? 0;

  return (
    <div className="summary">
      {periods.map(({ key, label, range }) => {
        const period = summary?.[key];
        return (
          <article key={key} className="stat">
            <div>
              <h3 className="stat__label">{label}</h3>
              <p className="stat__range">{range}</p>
            </div>
            {period ? (
              <>
                <p className={`stat__value tone-${tone(period.pnl)}`}>{signedMoney(period.pnl)}</p>
                {period.pctOfInvestment != null && period.count > 0 && (
                  <p className="stat__share">
                    <span className={`pct-chip tone-${tone(period.pctOfInvestment)}`}>
                      {pctArrow(period.pctOfInvestment)}
                    </span>
                    <span className="stat__share-text">of invested</span>
                  </p>
                )}
                <p className="stat__foot">{footnote(period)}</p>
              </>
            ) : failed ? (
              <>
                <p className="stat__value tone-flat">—</p>
                <p className="stat__foot">Unavailable</p>
              </>
            ) : (
              <Skeleton />
            )}
          </article>
        );
      })}

      <article className="stat stat--invested">
        <div className="stat__top">
          <div>
            <h3 className="stat__label">Invested</h3>
            <p className="stat__range">{term === 'all' ? 'All terms' : TERM_LABELS[term]}</p>
          </div>
          {summary && (
            <button type="button" className="link-btn" onClick={onEditInvestment}>
              {total > 0 ? 'Edit amounts' : 'Set amounts'}
            </button>
          )}
        </div>
        {summary ? (
          invested > 0 || total > 0 ? (
            <>
              <p className="stat__amount">{money(invested)}</p>
              {total > 0 && (
                <>
                  <div
                    className="alloc"
                    role="img"
                    aria-label={TERMS.map((t) => `${TERM_LABELS[t]} ${Math.round((investment[t] / total) * 100)}%`).join(', ')}
                  >
                    {TERMS.map((t) => (
                      <span key={t} style={{ flex: investment[t] }} />
                    ))}
                  </div>
                  <p className="alloc-legend">
                    {TERMS.map((t, i) => (
                      <span key={t}>
                        <i className={`swatch swatch--${i + 1}`} />
                        {TERM_LABELS[t].replace(' term', '')} {wholeMoney(investment[t])}
                      </span>
                    ))}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="stat__foot">
              No investment set. Set it to see profit as a share of it.
            </p>
          )
        ) : failed ? (
          <p className="stat__foot">Unavailable</p>
        ) : (
          <Skeleton />
        )}
      </article>
    </div>
  );
}
