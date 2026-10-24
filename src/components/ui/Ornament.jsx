// Bintang delapan sudut (khatam) — motif geometri Islami, dipakai hemat sebagai penanda.
export function StarShape({ className = '', filled = false }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 1.5l2.6 3.5 4.3-.5-.5 4.3 3.5 2.6-3.5 2.6.5 4.3-4.3-.5L12 22.5l-2.6-3.5-4.3.5.5-4.3L2.1 12.6 5.6 10l-.5-4.3 4.3.5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarNumber({ value, label }) {
  return (
    <span className="star-num">
      <StarShape />
      <span aria-hidden={label ? true : undefined}>{value}</span>
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
}

export function Ornament({ className = '' }) {
  return (
    <div className={`ornament ${className}`.trim()} aria-hidden="true">
      <StarShape filled />
    </div>
  );
}
