import { BellRing, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { prefsStore } from '../../app/stores.js';
import { useAudioControls, useAudioState } from '../../app/audio.jsx';
import { ADZAN_AUDIO } from '../../features/sholat/adzan.js';
import { useTodayPrayer } from '../../features/sholat/usePrayerTimes.js';
import { useNow } from '../../hooks/useNow.js';
import { useStore } from '../../utils/storage.js';
import { getPrayerStatus, OBLIGATORY, PRAYER_LABELS, TIMEZONES } from '../../utils/prayer.js';

const BANNER_WINDOW = 10 * 60 * 1000; // banner tampil 10 menit setelah waktu masuk
const SOUND_WINDOW = 2 * 60 * 1000; // audio hanya diputar bila terdeteksi ≤ 2 menit setelahnya

function firedKey(id) {
  return `imuslim:alarm:${id}`;
}
function wasFired(id) {
  try {
    return sessionStorage.getItem(firedKey(id)) === '1';
  } catch {
    return false;
  }
}
function markFired(id) {
  try {
    sessionStorage.setItem(firedKey(id), '1');
  } catch {
    /* abaikan */
  }
}

/**
 * Pengingat waktu sholat selama iMuslim terbuka. Hanya aktif bila pengguna menyalakannya
 * di halaman Jadwal Sholat/Pengaturan. Tidak ada audio yang diputar saat startup.
 */
export function PrayerAlarm() {
  const prefs = useStore(prefsStore);
  const enabled = Boolean((prefs.adzanEnabled || prefs.imsakAlert) && prefs.cityId);
  const schedule = useTodayPrayer(enabled ? prefs.cityId : null);
  const now = useNow(5000);
  const audio = useAudioControls();
  const audioState = useAudioState();
  const [dismissed, setDismissed] = useState(null);
  const playedRef = useRef(new Set());

  const alert = useMemo(() => {
    if (!enabled || !schedule.days.length) return null;
    const status = getPrayerStatus(schedule.days, now, schedule.tz);
    if (!status) return null;
    const watch = [...(prefs.adzanEnabled ? OBLIGATORY : []), ...(prefs.imsakAlert ? ['imsak'] : [])];
    const ev = status.events.find((e) => watch.includes(e.key) && now >= e.at && now - e.at < BANNER_WINDOW);
    if (!ev) return null;
    return { id: `${status.today}:${ev.key}`, key: ev.key, label: ev.label, time: ev.time, at: ev.at };
  }, [enabled, schedule.days, schedule.tz, now, prefs.adzanEnabled, prefs.imsakAlert]);

  const fresh = alert && now - alert.at < SOUND_WINDOW;

  useEffect(() => {
    if (!alert || !fresh || playedRef.current.has(alert.id) || wasFired(alert.id)) return;
    playedRef.current.add(alert.id);
    markFired(alert.id);
    const src = ADZAN_AUDIO[alert.key] ?? ADZAN_AUDIO.default;
    audio.playQueue({
      id: `adzan-${alert.id}`,
      kind: 'adzan',
      title: 'Pengingat waktu sholat',
      tracks: [{ key: alert.key, src, title: alert.key === 'imsak' ? 'Waktu imsak telah tiba' : `Adzan ${alert.label}`, subtitle: prefs.cityName }],
    });
    if (prefs.adzanNotify && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(alert.key === 'imsak' ? 'Waktu imsak telah tiba' : `Waktu ${alert.label} telah tiba`, {
          body: `${alert.time} ${TIMEZONES[schedule.tz]?.label ?? ''} · ${prefs.cityName}`,
          icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          tag: alert.id,
        });
      } catch {
        /* sebagian browser seluler hanya mengizinkan notifikasi via service worker */
      }
    }
  }, [alert, fresh, audio, prefs.adzanNotify, prefs.cityName, schedule.tz]);

  if (!alert || dismissed === alert.id) return null;
  const isAdzanPlaying = audioState.queue?.kind === 'adzan' && audioState.status === 'playing';
  const tzLabel = TIMEZONES[schedule.tz]?.label ?? '';

  return (
    <div className="global-banner global-banner--alarm" role="alert">
      <BellRing aria-hidden="true" width={18} height={18} />
      <span>
        {alert.key === 'imsak' ? 'Waktu imsak telah tiba' : `Waktu ${PRAYER_LABELS[alert.key]} telah tiba`} ({alert.time} {tzLabel}) · {prefs.cityName}
      </span>
      {isAdzanPlaying && (
        <button type="button" className="btn btn--sm" onClick={audio.stop}>
          Hentikan adzan
        </button>
      )}
      <button type="button" className="icon-btn icon-btn--sm" style={{ color: 'inherit' }} onClick={() => setDismissed(alert.id)} aria-label="Tutup pengingat">
        <X />
      </button>
    </div>
  );
}
