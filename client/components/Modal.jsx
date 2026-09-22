'use client';

export default function Modal({ open, wide = false, onClose, children }) {
  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className={`modal-card${wide ? ' wide-modal' : ''}`} onClick={(event) => event.stopPropagation()}>
        {onClose && (
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
        <div className="modal-card-body">{children}</div>
      </div>
    </div>
  );
}
