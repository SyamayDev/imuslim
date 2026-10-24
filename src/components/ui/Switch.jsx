import { useId } from 'react';

/** Baris pengaturan dengan switch (role="switch" pada checkbox native). */
export function SwitchRow({ label, description, checked, onChange, disabled = false, id: idProp }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const descId = `${id}-desc`;
  return (
    <div className="setting-row">
      <div className="setting-row__text">
        <label htmlFor={id} className="setting-row__label">
          {label}
        </label>
        {description && (
          <p id={descId} className="setting-row__desc">
            {description}
          </p>
        )}
      </div>
      <span className="switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? descId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch__track" aria-hidden="true" />
      </span>
    </div>
  );
}
