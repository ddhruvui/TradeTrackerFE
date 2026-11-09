import { AlertIcon, BrandMark } from './Icons.jsx';

// A message where a list would be, with the next step as buttons.
export function Empty({ title, text, mark = false, children }) {
  return (
    <div className="empty">
      {mark && <BrandMark className="empty__mark" size={44} />}
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {children && <div className="empty__actions">{children}</div>}
    </div>
  );
}

// Rows in the shape of the list, while it loads.
export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="list-scroll" aria-busy="true" aria-label="Loading your trades">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 16, height: 60, padding: '0 20px', borderTop: i ? '1px solid var(--line)' : 0 }}
        >
          <span className="sk" style={{ width: 90 + (i % 2) * 14, height: 14 }} />
          <span className="sk" style={{ width: 70, height: 12 }} />
          <span className="sk" style={{ width: 60, height: 12, marginLeft: 'auto' }} />
          <span className="sk" style={{ width: 'min(220px, 30%)', height: 24, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

// The page-wide error: what went wrong and a way to try again.
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="notice" role="alert">
      <AlertIcon size={18} />
      <div className="notice__text">
        <p className="notice__title">Can’t load your trades</p>
        <p className="notice__detail">{message}</p>
      </div>
      <button type="button" className="btn btn--sm" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
