import { useEffect } from 'react';
import { AlertIcon, CheckIcon } from './Icons.jsx';

// One message at a time, bottom-right (bottom-center on phones). A toast with an
// action stays a little longer so there's time to use it.
export function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDone, toast.action ? 8000 : 4500);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`}>
          {toast.tone === 'error' ? <AlertIcon /> : <CheckIcon />}
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action.onClick();
                onDone();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
