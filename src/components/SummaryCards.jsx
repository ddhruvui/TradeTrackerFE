import { TERM_LABELS } from '../labels.js';
import { fullDate, money, monthYear, pctArrow, signedMoney, weekdayDate } from '../format.js';

const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

function footnote({ count, margin }) {
  const trades =
    count === 0 ? 'No closed trades' : count === 1 ? '1 closed trade' : `${count} closed trades`;
  return margin > 0 ? `${trades} · ${money(margin)} margin` : trades;
}

// "Short $1,000 + Mid $2,500 + Long $6,500", shown on hover over the All amount.
const breakdown = (investment) =>
  ['short', 'mid', 'long']
    .map((term) => `${TERM_LABELS[term].replace(' term', '')} ${money(investment[term])}`)
    .join(' + ');

// The four realized-profit totals, as worked out by the backend (/api/summary), each
// also as a share of the money invested in the view. `summary` is null until the
// first load finishes.
export function SummaryCards({ summary, today, term, onEditInvestment }) {
  const cards = [
    {
      key: 'week',
      label: 'This week',
      range: summary
        ? `${weekdayDate(summary.week.from)} – ${weekdayDate(summary.week.to)}`
        : 'Friday to Thursday',
    },
    { key: 'month', label: 'This month', range: monthYear(today) },
    { key: 'year', label: 'This year', range: `Jan 1 – today, ${today.slice(0, 4)}` },
    {
      key: 'overall',
      label: 'Overall',
      range: summary?.firstDate ? `Since ${fullDate(summary.firstDate)}` : 'All time',
    },
  ];
  const invested = summary?.invested ?? 0;

  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="summary__head">
        <h2 id="summary-title">Realized profit</h2>
        <span className="summary__scope">{term === 'all' ? 'All terms' : TERM_LABELS[term]}</span>
        {summary && (
          <span className="summary__invested">
            {invested > 0 ? (
              <span title={term === 'all' ? breakdown(summary.investment) : undefined}>
                Invested <strong>{money(invested)}</strong>
              </span>
            ) : (
              <span>No investment set{term === 'all' ? '' : ' for this term'}</span>
            )}
            <button type="button" className="link-btn" onClick={onEditInvestment}>
              {summary.investment.all > 0 ? 'Edit' : 'Set amounts'}
            </button>
          </span>
        )}
      </div>
      <div className="summary__grid">
        {cards.map(({ key, label, range }) => {
          const period = summary?.[key];
          return (
            <article key={key} className="stat">
              <h3 className="stat__label">{label}</h3>
              <p className="stat__range">{range}</p>
              <p className={`stat__value tone-${period ? tone(period.pnl) : 'flat'}`}>
                {period ? signedMoney(period.pnl) : '—'}
                {period?.pctOfInvestment != null && period.count > 0 && (
                  <span className="stat__pct" title="Share of the investment">
                    {pctArrow(period.pctOfInvestment)}
                  </span>
                )}
              </p>
              <p className="stat__foot">{period ? footnote(period) : 'Loading…'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
