import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

/**
 * Dialog berbasis elemen <dialog> native: fokus terkelola, Esc menutup, latar inert.
 * `sheet` = tampil sebagai bottom sheet di layar kecil.
 */
export function Dialog({ open, onClose, title, description, children, footer, sheet = false, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${sheet ? 'dialog--sheet' : ''} ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => {
        // klik di area backdrop menutup dialog
        if (e.target === ref.current) onClose?.();
      }}
    >
      {open && (
        <>
          <div className="dialog__head">
            <div>
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
              {description && (
                <p id={descId} className="dialog__desc">
                  {description}
                </p>
              )}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
              <X />
            </button>
          </div>
          <div className="dialog__body">{children}</div>
          {footer && <div className="dialog__foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
