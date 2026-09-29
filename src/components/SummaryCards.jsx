import { TERM_LABELS } from '../labels.js';
import { fullDate, money, monthYear, signedMoney, weekdayDate } from '../format.js';

const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

function footnote({ count, margin }) {
  const trades =
    count === 0 ? 'No closed trades' : count === 1 ? '1 closed trade' : `${count} closed trades`;
  return margin > 0 ? `${trades} · ${money(margin)} margin` : trades;
}

// The four realized-profit totals, as worked out by the backend (/api/summary).
// `summary` is null until the first load finishes.
export function SummaryCards({ summary, today, term }) {
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

  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="summary__head">
        <h2 id="summary-title">Realized profit</h2>
        <span className="summary__scope">{term === 'all' ? 'All terms' : TERM_LABELS[term]}</span>
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
              </p>
              <p className="stat__foot">{period ? footnote(period) : 'Loading…'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
