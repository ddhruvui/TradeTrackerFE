import { useEffect, useId, useRef, useState } from 'react';
import { CloseIcon } from './Icons.jsx';

// The one side panel every action opens in: New trade, Sell / Buy back, Edit and
// Invested. A modal <dialog>, so focus stays inside and Esc closes it; on phones the
// styles turn it into a bottom sheet. With unsaved changes (`dirty`), closing asks first.
// `actions` are the buttons after Cancel; the form submits on Enter.
export function Panel({ title, titleExtra, sub, dirty = false, onClose, onSubmit, actions, children }) {
  const dialogRef = useRef(null);
  const pressedBackdrop = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const headingId = useId();

  // React's autoFocus runs before the dialog opens, so it can't land; a field marked
  // data-autofocus takes focus once it's open (otherwise the dialog picks the first one).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();
  }, []);

  const close = () => dialogRef.current?.close();
  const requestClose = () => (dirty ? setConfirming(true) : close());

  return (
    <dialog
      ref={dialogRef}
      className="panel"
      aria-labelledby={headingId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (confirming) setConfirming(false);
        else requestClose();
      }}
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) requestClose();
      }}
    >
      <form className="panel__form" onSubmit={onSubmit} noValidate>
        <div className="panel__grabber" aria-hidden="true" />
        <header className="panel__head">
          <div className="panel__titles">
            <div className="panel__title-line">
              <h2 id={headingId} className="panel__title">
                {title}
              </h2>
              {titleExtra}
            </div>
            {sub && <p className="panel__sub">{sub}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={requestClose}>
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="panel__body">{children}</div>
        <footer className="panel__foot">
          {confirming ? (
            <div className="panel__discard" role="alert">
              <span>Discard your changes?</span>
              <button type="button" className="btn" onClick={() => setConfirming(false)} autoFocus>
                Keep editing
              </button>
              <button type="button" className="btn btn--danger-solid" onClick={close}>
                Discard
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="btn btn--lg" onClick={requestClose}>
                Cancel
              </button>
              {actions}
            </>
          )}
        </footer>
      </form>
    </dialog>
  );
}
