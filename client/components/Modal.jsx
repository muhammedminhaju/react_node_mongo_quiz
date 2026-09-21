'use client';

export default function Modal({ open, wide = false, children }) {
  if (!open) return null;

  return (
    <div className="modal">
      <div className={`modal-card${wide ? ' wide-modal' : ''}`}>{children}</div>
    </div>
  );
}
