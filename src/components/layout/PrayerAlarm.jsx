import { BellRing, Play, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { prefsStore } from '../../app/stores.js';
import { useAudioControls, useAudioState } from '../../app/audio.jsx';
import { ADZAN_AUDIO } from '../../features/sholat/adzan.js';
import { pushWant, usePushStatus, usePushSync } from '../../features/sholat/usePushSync.js';
import { useTodayPrayer } from '../../features/sholat/usePrayerTimes.js';
import { useNow } from '../../hooks/useNow.js';
import { useStore } from '../../utils/storage.js';
import { getPrayerStatus, OBLIGATORY, PRAYER_LABELS, TIMEZONES } from '../../utils/prayer.js';

const BANNER_WINDOW = 10 * 60 * 1000; // banner tampil 10 menit setelah waktu masuk
const SOUND_WINDOW = 2 * 60 * 1000; // audio otomatis hanya bila terdeteksi ≤ 2 menit setelahnya
const TAP_WINDOW = 30 * 60 * 1000; // notifikasi yang diketuk ≤ 30 menit setelah waktu masuk tetap memutar adzan
const KEYS = ['imsak', ...OBLIGATORY];

// Permintaan "putar adzan" dari notifikasi yang diketuk (URL atau pesan service worker).
// Disimpan di store kecil (bukan setState di dalam effect) agar render tetap murni.
let request = null;
const requestListeners = new Set();
function setRequest(v) {
  request = v;
  requestListeners.forEach((l) => l());
}
function subscribeRequest(l) {
  requestListeners.add(l);
  return () => requestListeners.delete(l);
}

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
 * Pengingat waktu sholat.
 * - Saat iMuslim terbuka: memutar adzan tepat waktu (hanya bila dinyalakan pengguna).
 * - Saat ditutup: server mengirim notifikasi push; mengetuknya membuka iMuslim dengan
 *   ?adzan=…&at=… (atau pesan dari service worker bila sudah terbuka) → adzan diputar di sini.
 * Tidak ada audio yang diputar saat startup tanpa permintaan.
 */
export function PrayerAlarm() {
  const prefs = useStore(prefsStore);
  usePushSync(prefs);
  const pushStatus = usePushStatus();
  const enabled = Boolean((prefs.adzanEnabled || prefs.imsakAlert) && prefs.cityId);
  const schedule = useTodayPrayer(enabled ? prefs.cityId : null);
  const now = useNow(5000);
  const audio = useAudioControls();
  const audioState = useAudioState();
  const [dismissed, setDismissed] = useState(null);
  const requested = useSyncExternalStore(subscribeRequest, () => request, () => null);
  const playedRef = useRef(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  const play = useMemo(
    () => (id, key, label) => {
      const src = ADZAN_AUDIO[key] ?? ADZAN_AUDIO.default;
      audio.playQueue({
        id,
        kind: 'adzan',
        title: 'Pengingat waktu sholat',
        tracks: [{ key, src, title: key === 'imsak' ? 'Waktu imsak telah tiba' : `Adzan ${label}`, subtitle: prefs.cityName }],
      });
    },
    [audio, prefs.cityName],
  );

  // Notifikasi diketuk saat iMuslim tertutup → parameter URL.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const key = params.get('adzan');
    if (!key) return;
    const at = Number(params.get('at'));
    params.delete('adzan');
    params.delete('at');
    const rest = params.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
    if (KEYS.includes(key) && Number.isFinite(at)) setRequest({ key, at });
  }, [location.search, location.pathname, navigate]);

  // Notifikasi diketuk saat iMuslim sudah terbuka → pesan dari service worker.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMessage = (e) => {
      const d = e.data;
      if (d?.type === 'imuslim:adzan' && KEYS.includes(d.key) && Number.isFinite(d.at)) setRequest({ key: d.key, at: d.at });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const reqId = requested ? `req:${requested.at}:${requested.key}` : null;
  useEffect(() => {
    if (!requested || playedRef.current.has(reqId)) return;
    playedRef.current.add(reqId);
    const age = Date.now() - requested.at;
    if (age < -60000 || age > TAP_WINDOW) return; // terlalu lama: hanya tampilkan banner
    markFired(reqId);
    play(`adzan-${reqId}`, requested.key, PRAYER_LABELS[requested.key]);
  }, [requested, reqId, play]);

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
  const pushActive = Boolean(pushWant(prefs)) && pushStatus.state === 'active';

  useEffect(() => {
    if (!alert || !fresh || playedRef.current.has(alert.id) || wasFired(alert.id)) return;
    // Sudah diputar karena notifikasinya diketuk? Jangan diulang.
    if (requested && requested.key === alert.key && Math.abs(requested.at - alert.at) < 60000) return;
    playedRef.current.add(alert.id);
    markFired(alert.id);
    play(`adzan-${alert.id}`, alert.key, alert.label);
    // Notifikasi lokal hanya bila notifikasi server (push) tidak aktif — tag sama, jadi tidak dobel.
    if (prefs.adzanNotify && !pushActive && 'Notification' in window && Notification.permission === 'granted') {
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
  }, [alert, fresh, requested, play, pushActive, prefs.adzanNotify, prefs.cityName, schedule.tz]);

  const isAdzan = audioState.queue?.kind === 'adzan' && !audioState.queue.id.startsWith('preview');
  const isPlaying = isAdzan && audioState.status === 'playing';
  const blocked = isAdzan && audioState.status === 'paused' && Boolean(audioState.error);

  // Banner dari notifikasi yang diketuk (prioritas), lalu banner jadwal biasa.
  if (requested && dismissed !== reqId) {
    const label = requested.key === 'imsak' ? 'Waktu imsak' : `Waktu ${PRAYER_LABELS[requested.key]}`;
    const tooLate = now - requested.at > TAP_WINDOW;
    return (
      <div className="global-banner global-banner--alarm" role="alert">
        <BellRing aria-hidden="true" width={18} height={18} />
        <span>
          {label} telah tiba{prefs.cityName ? ` · ${prefs.cityName}` : ''}
          {tooLate ? ' (notifikasi lama — adzan tidak diputar otomatis)' : ''}
        </span>
        {(blocked || tooLate) && !isPlaying && (
          <button type="button" className="btn btn--sm" onClick={() => (blocked ? audio.toggle() : play(`adzan-${reqId}-manual`, requested.key, PRAYER_LABELS[requested.key]))}>
            <Play aria-hidden="true" width={16} height={16} /> {requested.key === 'imsak' ? 'Putar pengumuman' : 'Putar adzan'}
          </button>
        )}
        {isPlaying && (
          <button type="button" className="btn btn--sm" onClick={audio.stop}>
            Hentikan adzan
          </button>
        )}
        <button type="button" className="icon-btn icon-btn--sm" style={{ color: 'inherit' }} onClick={() => setDismissed(reqId)} aria-label="Tutup pengingat">
          <X />
        </button>
      </div>
    );
  }

  if (!alert || dismissed === alert.id) return null;
  const tzLabel = TIMEZONES[schedule.tz]?.label ?? '';

  return (
    <div className="global-banner global-banner--alarm" role="alert">
      <BellRing aria-hidden="true" width={18} height={18} />
      <span>
        {alert.key === 'imsak' ? 'Waktu imsak telah tiba' : `Waktu ${PRAYER_LABELS[alert.key]} telah tiba`} ({alert.time} {tzLabel}) · {prefs.cityName}
      </span>
      {blocked && (
        <button type="button" className="btn btn--sm" onClick={audio.toggle}>
          <Play aria-hidden="true" width={16} height={16} /> Putar adzan
        </button>
      )}
      {isPlaying && (
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
