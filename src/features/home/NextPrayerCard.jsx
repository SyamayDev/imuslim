import { MapPin, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNow } from '../../hooks/useNow.js';
import { describeError } from '../../services/api/errors.js';
import { describeCountdown, formatCountdown, getPrayerStatus, OBLIGATORY, PRAYER_LABELS, TIMEZONES } from '../../utils/prayer.js';
import { useTodayPrayer } from '../sholat/usePrayerTimes.js';

export function NextPrayerCard({ cityId, cityName }) {
  const schedule = useTodayPrayer(cityId);
  const now = useNow(1000);

  if (!cityId) {
    return (
      <div className="next-prayer next-prayer--empty">
        <p className="next-prayer__label">Jadwal sholat</p>
        <p className="next-prayer__hint">Pilih kota atau gunakan lokasi Anda untuk melihat waktu sholat berikutnya.</p>
        <Link to="/sholat" className="btn btn--sm next-prayer__cta">
          <MapPin aria-hidden="true" /> Pilih kota
        </Link>
      </div>
    );
  }

  if (schedule.status === 'loading' && !schedule.days.length) {
    return (
      <div className="next-prayer" aria-busy="true">
        <p className="next-prayer__label">Memuat jadwal {cityName}…</p>
        <span className="skeleton next-prayer__skeleton" />
      </div>
    );
  }

  if (schedule.status === 'error') {
    return (
      <div className="next-prayer next-prayer--empty" role="alert">
        <p className="next-prayer__label">Jadwal belum bisa dimuat</p>
        <p className="next-prayer__hint">{describeError(schedule.error)}</p>
        <button type="button" className="btn btn--sm next-prayer__cta" onClick={schedule.reload}>
          <RefreshCw aria-hidden="true" /> Coba lagi
        </button>
      </div>
    );
  }

  const status = getPrayerStatus(schedule.days, now, schedule.tz);
  if (!status) {
    return (
      <div className="next-prayer next-prayer--empty">
        <p className="next-prayer__label">Jadwal hari ini tidak tersedia</p>
        <Link to="/sholat" className="btn btn--sm next-prayer__cta">
          Buka jadwal sholat
        </Link>
      </div>
    );
  }
  const tz = TIMEZONES[schedule.tz]?.label ?? '';
  const next = status.next;
  const remaining = next ? next.at - now : 0;
  const mains = status.events.filter((e) => OBLIGATORY.includes(e.key));

  return (
    <Link to="/sholat" className="next-prayer" aria-label={next ? `${next.label} pukul ${next.time} ${tz}, ${describeCountdown(remaining)}. Buka jadwal sholat ${cityName}` : `Jadwal sholat ${cityName}`}>
      <p className="next-prayer__label">
        {next ? (status.nextIsTomorrow ? 'Berikutnya (besok)' : 'Waktu berikutnya') : 'Jadwal hari ini'} · <span className="next-prayer__city">{cityName}</span>
      </p>
      {next && (
        <div className="next-prayer__main">
          <span className="next-prayer__name display">{next.label}</span>
          <span className="next-prayer__time tabular">
            {next.time} <small>{tz}</small>
          </span>
        </div>
      )}
      {next && (
        <p className="next-prayer__countdown tabular" aria-hidden="true">
          <span>{formatCountdown(remaining)}</span> lagi
        </p>
      )}
      {schedule.meta?.stale && <p className="next-prayer__stale">Data tersimpan — mungkin usang</p>}
      <ol className="next-prayer__timeline" aria-hidden="true">
        {mains.map((e) => (
          <li key={e.key} className={`${status.passedKeys.has(e.key) ? 'is-passed' : ''} ${next?.key === e.key ? 'is-next' : ''}`}>
            <span>{PRAYER_LABELS[e.key]}</span>
            <b className="tabular">{e.time}</b>
          </li>
        ))}
      </ol>
    </Link>
  );
}
