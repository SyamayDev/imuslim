// Hanya ada di build aplikasi Android (dimuat bila __NATIVE__). Menghubungkan aplikasi web
// dengan alarm adzan native: memasang jadwal bulan ini & bulan depan ke AlarmManager,
// mengikuti perubahan kota/pilihan adzan, membuka halaman dari notifikasi, dan memeriksa
// versi APK terbaru.
import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROD_URL } from '../app/site.js';
import { prefsStore } from '../app/stores.js';
import { useToast } from '../components/ui/Toast.jsx';
import { nativeConfig } from '../features/sholat/nativeEvents.js';
import { getMonthlySchedule } from '../services/api/sholat.js';
import { timezoneForCity, wallClock } from '../utils/prayer.js';
import { useStore } from '../utils/storage.js';
import { getNativeState, setNativeApi, setNativeState } from './state.js';

const AdzanAlarm = registerPlugin('AdzanAlarm');
const RESYNC_MS = 12 * 3600000;
const UPDATE_KEY = 'imuslim:update-seen';

async function refresh() {
  const status = await AdzanAlarm.getStatus();
  setNativeState({ status, ready: true });
  return status;
}

/** Jadwal bulan berjalan (wajib) + bulan berikutnya (bila tersedia) untuk kota pilihan. */
async function loadSchedules(cityId) {
  const tz = timezoneForCity(cityId);
  const wc = wallClock(Date.now(), tz);
  const first = await getMonthlySchedule(cityId, wc.year, wc.month);
  const ny = wc.month === 12 ? wc.year + 1 : wc.year;
  const nm = wc.month === 12 ? 1 : wc.month + 1;
  const next = await getMonthlySchedule(cityId, ny, nm).catch(() => null);
  return { schedules: [first.data, next?.data].filter(Boolean), today: wallClock(Date.now(), first.data.timezone).iso };
}

let chain = Promise.resolve();
/** Pasang/ubah/matikan alarm sesuai pilihan pengguna. Dijalankan berurutan. */
function sync(prefs = prefsStore.get()) {
  const run = chain.then(async () => {
    setNativeState({ syncing: true, error: null });
    try {
      const wants = Boolean(prefs.cityId && (prefs.adzanEnabled || prefs.imsakAlert));
      const { schedules, today } = wants ? await loadSchedules(prefs.cityId) : { schedules: [], today: '' };
      const status = await AdzanAlarm.configure(nativeConfig(prefs, schedules, today));
      setNativeState({ status, ready: true, syncing: false, lastSync: Date.now() });
      return status;
    } catch (error) {
      setNativeState({ syncing: false, error: error?.message || 'Jadwal adzan gagal dipasang.' });
      return refresh().catch(() => null);
    }
  });
  chain = run.catch(() => {});
  return run;
}

async function checkUpdate() {
  const app = getNativeState().app ?? (await App.getInfo().catch(() => null));
  const res = await fetch(`${PROD_URL}/download/android.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Server merespons ${res.status}`);
  const info = await res.json();
  const current = Number(app?.build ?? 0);
  const update = Number(info?.versionCode) > current && typeof info?.versionName === 'string' ? { ...info, url: `${PROD_URL}/download/imuslim.apk` } : null;
  setNativeState({ update, app });
  return update;
}

setNativeApi({
  sync,
  refresh,
  checkUpdate,
  stop: () => AdzanAlarm.stop().then(refresh),
  test: (seconds = 10) => AdzanAlarm.test({ seconds }),
  requestNotifications: () => AdzanAlarm.requestNotifications().then((status) => (setNativeState({ status }), status)),
  openSettings: (target) => AdzanAlarm.openSettings({ target }),
});

export default function NativeBridge() {
  const prefs = useStore(prefsStore);
  const navigate = useNavigate();
  const toast = useToast();
  const key = `${prefs.cityId}|${prefs.cityName}|${prefs.adzanEnabled}|${prefs.imsakAlert}`;

  // Pilihan berubah → pasang ulang jadwal (sedikit ditunda agar ketukan beruntun cukup sekali).
  useEffect(() => {
    const t = setTimeout(() => sync(prefsStore.get()), 600);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => {
    const subs = [];
    let alive = true;
    App.getInfo()
      .then((app) => alive && setNativeState({ app }))
      .catch(() => {});
    // Dibuka dari notifikasi adzan → halaman jadwal sholat.
    AdzanAlarm.getLaunchRoute()
      .then(({ route }) => alive && route && navigate(route))
      .catch(() => {});
    subs.push(AdzanAlarm.addListener('route', ({ route }) => route && navigate(route)));
    subs.push(AdzanAlarm.addListener('state', () => refresh().catch(() => {})));
    // Kembali ke aplikasi: perbarui status; pasang ulang jadwal tiap 12 jam.
    subs.push(
      App.addListener('resume', () => {
        if (Date.now() - getNativeState().lastSync > RESYNC_MS) sync(prefsStore.get());
        else refresh().catch(() => {});
      }),
    );
    // Versi baru APK: beri tahu sekali per versi.
    checkUpdate()
      .then((u) => {
        if (!alive || !u) return;
        let seen = null;
        try {
          seen = localStorage.getItem(UPDATE_KEY);
        } catch {
          /* abaikan */
        }
        if (seen === String(u.versionCode)) return;
        try {
          localStorage.setItem(UPDATE_KEY, String(u.versionCode));
        } catch {
          /* abaikan */
        }
        toast.show(`iMuslim versi ${u.versionName} tersedia. Unduh dari menu Pengaturan.`, { duration: 6000 });
      })
      .catch(() => {});
    return () => {
      alive = false;
      subs.forEach((s) => Promise.resolve(s).then((h) => h?.remove?.()));
    };
  }, [navigate, toast]);

  return null;
}
