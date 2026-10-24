import { AlertTriangle, CloudOff, History, Inbox, RefreshCw, SearchX } from 'lucide-react';
import { describeError } from '../../services/api/errors.js';
import { formatDateTime } from '../../utils/format.js';

export function Skeleton({ width = '100%', height = 16, radius, className = '', style }) {
  return <span className={`skeleton ${className}`.trim()} style={{ display: 'block', width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Memuat data…', rows = 4, children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="loading-block">
      <span className="visually-hidden">{label}</span>
      {children ?? (
        <div style={{ display: 'grid', gap: 12 }}>
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} height={64} radius={14} style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Data belum bisa dimuat', compact = false }) {
  const offline = error?.kind === 'offline';
  return (
    <div className={`state state--error ${compact ? 'state--compact' : ''}`} role="alert">
      <span className="state__icon">{offline ? <CloudOff /> : <AlertTriangle />}</span>
      <p className="state__title">{title}</p>
      <p className="state__text">{describeError(error)}</p>
      {error?.url && <p className="state__detail">Sumber: {safeHost(error.url)}</p>}
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Belum ada data', text, icon = 'inbox', action }) {
  const Icon = icon === 'search' ? SearchX : Inbox;
  return (
    <div className="state" role="status">
      <span className="state__icon">
        <Icon />
      </span>
      <p className="state__title">{title}</p>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  );
}

/** Penanda jujur bila data berasal dari cache lama atau sumber cadangan. */
export function DataNotice({ meta, error, onRetry, fallbackLabel }) {
  if (!meta || (!meta.stale && !meta.fallbackUsed)) return null;
  if (meta.stale) {
    return (
      <div className="notice notice--warn" role="status">
        <History aria-hidden="true" />
        <div className="notice__body">
          <strong>Menampilkan data tersimpan</strong> dari {meta.fetchedAt ? formatDateTime(meta.fetchedAt) : 'sebelumnya'} karena sumber
          data tidak dapat dihubungi{error ? ` (${describeError(error).replace(/\.$/, '')})` : ''}. Data mungkin sudah tidak terbaru.
          {onRetry && (
            <div className="notice__actions">
              <button type="button" className="btn btn--sm" onClick={onRetry}>
                <RefreshCw aria-hidden="true" /> Coba muat ulang
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="notice notice--neutral" role="status">
      <History aria-hidden="true" />
      <div className="notice__body">
        <strong>Memakai sumber cadangan</strong>
        {fallbackLabel ? ` (${fallbackLabel})` : ''} karena sumber utama sedang tidak dapat diakses. Beberapa detail mungkin berbeda.
        {onRetry && (
          <div className="notice__actions">
            <button type="button" className="btn btn--sm" onClick={onRetry}>
              <RefreshCw aria-hidden="true" /> Coba sumber utama lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
