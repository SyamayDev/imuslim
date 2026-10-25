import { BellRing, CalendarRange, ChevronLeft, ChevronRight, Clock, Pause, Play, RotateCw, Send, Sunrise, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAudioControls, useAudioState } from '../app/audio.jsx';
import { prefsStore } from '../app/stores.js';
import { ADZAN_AUDIO } from '../features/sholat/adzan.js';
import { PageHeader, SourceNote } from '../components/ui/Content.jsx';
import { DataNotice, EmptyState, ErrorState, LoadingBlock } from '../components/ui/Status.jsx';
import { SwitchRow } from '../components/ui/Switch.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { CityPicker } from '../features/sholat/CityPicker.jsx';
import { isIosBrowserTab, pushSupported, sendTestPush } from '../features/sholat/push.js';
import { pushWant, runPushSync, usePushStatus } from '../features/sholat/usePushSync.js';
import { useMonthSchedule, useTodayPrayer } from '../features/sholat/usePrayerTimes.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { useClientValue } from '../hooks/useHydrated.js';
import { useNow } from '../hooks/useNow.js';
import { DAY_NAMES, formatLongDate, MONTH_NAMES } from '../utils/format.js';
import { formatHijri, toHijri } from '../utils/hijri.js';
import { timezoneForCity, deviceMatchesTz, describeCountdown, formatCountdown, getPrayerStatus, ORDER, PRAYER_LABELS, TIMEZONES, wallClock } from '../utils/prayer.js';
import { useStore } from '../utils/storage.js';
import './sholat.css';

export default function Sholat() {
  useDocumentMeta({
    title: 'Jadwal Sholat & Imsakiyah',
    description: 'Jadwal sholat harian dan imsakiyah bulanan untuk kota/kabupaten di Indonesia, lengkap dengan hitung mundur waktu sholat berikutnya.',
    path: '/sholat',
  });
  const prefs = useStore(prefsStore);
  const [params, setParams] = useSearchParams();
  const view = params.get('tampilan') === 'bulanan' ? 'bulanan' : 'harian';

  return (
    <div className="page sholat">
      <PageHeader
        eyebrow="Waktu sholat"
        title="Jadwal Sholat & Imsakiyah"
        description="Jadwal mengikuti data Kementerian Agama melalui api.myquran.com. Pilih kota secara manual atau izinkan lokasi saat Anda menekan tombolnya."
      />

      <section className="panel sholat-city" aria-labelledby="kota-title">
        <h2 id="kota-title" className="panel__title">
          {prefs.cityId ? (
            <>
              Kota: <span className="sholat-city__name">{prefs.cityName}</span>
            </>
          ) : (
            'Pilih kota Anda'
          )}
        </h2>
        <CityPicker currentId={prefs.cityId} />
      </section>

      {!prefs.cityId ? (
        <EmptyState
          title="Belum ada kota dipilih"
          text="Jadwal tidak ditampilkan sebelum Anda memilih kota, agar tidak ada jadwal kota lain yang terlihat seolah-olah jadwal lokasi Anda."
        />
      ) : (
        <>
          <div className="segmented sholat-tabs" role="tablist" aria-label="Tampilan jadwal">
            <button type="button" role="tab" aria-selected={view === 'harian'} onClick={() => setParams({}, { replace: true })}>
              <Clock aria-hidden="true" /> Hari ini
            </button>
            <button type="button" role="tab" aria-selected={view === 'bulanan'} onClick={() => setParams({ tampilan: 'bulanan' }, { replace: true })}>
              <CalendarRange aria-hidden="true" /> Bulanan (imsakiyah)
            </button>
          </div>
          {view === 'harian' ? <TodayView cityId={prefs.cityId} cityName={prefs.cityName} offset={prefs.hijriOffset} /> : <MonthView cityId={prefs.cityId} offset={prefs.hijriOffset} />}
        </>
      )}

      <AdzanSettings prefs={prefs} />

      <SourceNote>
        Sumber jadwal: <a href="https://api.myquran.com" target="_blank" rel="noopener noreferrer">api.myquran.com</a>. iMuslim tidak menghitung waktu sholat sendiri; bila
        sumber gagal, hanya jadwal yang pernah dimuat yang ditampilkan dengan penanda “mungkin usang”. Waktu ditampilkan dalam zona waktu kota (WIB/WITA/WIT).
      </SourceNote>
    </div>
  );
}

function TodayView({ cityId, cityName, offset }) {
  const schedule = useTodayPrayer(cityId);
  const now = useNow(1000);

  if (schedule.status === 'loading' && !schedule.days.length) return <LoadingBlock label="Memuat jadwal sholat…" rows={3} />;
  if (schedule.status === 'error') return <ErrorState error={schedule.error} onRetry={schedule.reload} title={`Jadwal ${cityName} belum bisa dimuat`} />;

  const status = getPrayerStatus(schedule.days, now, schedule.tz);
  if (!status) return <EmptyState title="Jadwal hari ini tidak ada di data sumber" text="Coba muat ulang atau lihat tampilan bulanan." />;
  const tz = TIMEZONES[schedule.tz];
  const [y, m, d] = status.today.split('-').map(Number);
  const hijri = toHijri(y, m, d, offset);
  const next = status.next;
  const remaining = next ? next.at - now : 0;
  // progres dari waktu sebelumnya ke waktu berikutnya
  const prevEvent = [...status.events].reverse().find((e) => e.at <= now);
  const span = next && prevEvent ? next.at - prevEvent.at : 0;
  const progress = span > 0 ? Math.min(1, Math.max(0, (now - prevEvent.at) / span)) : 0;

  return (
    <div className="sholat-today">
      <DataNotice meta={schedule.meta} error={schedule.error} onRetry={schedule.reload} />
      <section className="today-hero" aria-labelledby="today-title">
        <div>
          <p className="today-hero__date">
            {formatLongDate(status.today)} · {formatHijri(hijri)}
          </p>
          <h2 id="today-title" className="today-hero__title">
            {next ? (
              <>
                <span className="muted">{status.nextIsTomorrow ? 'Besok,' : 'Berikutnya,'}</span> {next.label} <span className="tabular">{next.time}</span>{' '}
                <small>{tz.label}</small>
              </>
            ) : (
              'Seluruh waktu hari ini telah berlalu'
            )}
          </h2>
          {next && (
            <p className="today-hero__countdown">
              <span className="tabular" aria-hidden="true">
                {formatCountdown(remaining)}
              </span>
              <span className="visually-hidden">{describeCountdown(remaining)}</span>
            </p>
          )}
          {next && (
            <div className="today-progress" aria-hidden="true">
              <i style={{ transform: `scaleX(${progress})` }} />
            </div>
          )}
        </div>
        {!deviceMatchesTz(schedule.tz, now) && (
          <p className="notice notice--neutral today-hero__tz">
            Zona waktu perangkat berbeda dengan {cityName}. Jam di bawah adalah waktu setempat ({tz.label}); hitung mundur sudah disesuaikan.
          </p>
        )}
      </section>

      <ol className="times" aria-label={`Waktu sholat ${cityName} hari ini`}>
        {ORDER.map((key) => {
          const ev = status.events.find((e) => e.key === key);
          // Bila waktu berikutnya jatuh besok (setelah Isya), semua waktu hari ini sudah lewat.
          const isNext = next?.key === key && !status.nextIsTomorrow;
          const passed = status.passedKeys.has(key) && !isNext;
          const isCurrent = status.current?.key === key && !isNext;
          return (
            <li key={key} className={`time ${passed ? 'is-passed' : ''} ${isNext ? 'is-next' : ''} ${isCurrent ? 'is-current' : ''} ${['terbit', 'dhuha', 'imsak'].includes(key) ? 'is-minor' : ''}`}>
              <span className="time__icon" aria-hidden="true">
                {key === 'terbit' ? <Sunrise /> : <Clock />}
              </span>
              <span className="time__label">{PRAYER_LABELS[key]}</span>
              <span className="time__value tabular">{ev.time}</span>
              <span className="time__state">{isNext ? 'Berikutnya' : isCurrent ? 'Sedang berlangsung' : passed ? 'Sudah lewat' : ''}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MonthView({ cityId, offset }) {
  const now = useNow(60000);
  const prefs = useStore(prefsStore);
  const tzKey = timezoneForCity(cityId);
  const wc = wallClock(now, tzKey);
  const [cursor, setCursor] = useState({ y: wc.year, m: wc.month });
  const res = useMonthSchedule(cityId, cursor.y, cursor.m);
  const move = (delta) =>
    setCursor(({ y, m }) => {
      const t = new Date(Date.UTC(y, m - 1 + delta, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
    });
  const todayIso = res.data ? wallClock(now, res.data.timezone).iso : wc.iso;
  const isCurrentMonth = cursor.y === wc.year && cursor.m === wc.month;

  return (
    <section className="month" aria-labelledby="bulan-title">
      <div className="month__head">
        <button type="button" className="icon-btn icon-btn--outline" onClick={() => move(-1)} aria-label="Bulan sebelumnya">
          <ChevronLeft />
        </button>
        <h2 id="bulan-title" className="month__title">
          {MONTH_NAMES[cursor.m - 1]} {cursor.y}
          <span className="month__sub">{prefs.cityName}</span>
        </h2>
        <button type="button" className="icon-btn icon-btn--outline" onClick={() => move(1)} aria-label="Bulan berikutnya">
          <ChevronRight />
        </button>
        {!isCurrentMonth && (
          <button type="button" className="btn btn--sm" onClick={() => setCursor({ y: wc.year, m: wc.month })}>
            Bulan ini
          </button>
        )}
      </div>
      {res.status === 'loading' && <LoadingBlock label="Memuat jadwal bulanan…" rows={5} />}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Jadwal bulanan belum bisa dimuat" />}
      {res.status === 'success' && (
        <>
          <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} />
          <div className="table-wrap month__table" tabIndex={0} role="region" aria-label={`Tabel jadwal ${MONTH_NAMES[cursor.m - 1]} ${cursor.y}`}>
            <table className="table">
              <caption className="visually-hidden">
                Jadwal sholat dan imsakiyah {res.data.city} {MONTH_NAMES[cursor.m - 1]} {cursor.y}, zona waktu {TIMEZONES[res.data.timezone].label}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  {ORDER.map((k) => (
                    <th key={k} scope="col">
                      {PRAYER_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.data.days.map((day) => {
                  const [yy, mm, dd] = day.date.split('-').map(Number);
                  const dow = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
                  const h = toHijri(yy, mm, dd, offset);
                  const today = day.date === todayIso;
                  return (
                    <tr key={day.date} className={today ? 'is-today' : ''} aria-current={today ? 'date' : undefined}>
                      <th scope="row">
                        <span className="month__day">
                          {DAY_NAMES[dow].slice(0, 3)}, {dd}
                        </span>
                        <span className="month__hijri">{formatHijri(h, { withYear: false })}</span>
                      </th>
                      {ORDER.map((k) => (
                        <td key={k}>{day.times[k]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="source-note">
            Zona waktu: {TIMEZONES[res.data.timezone].label} ({res.data.region}). Kolom Hijriah dihitung lokal (Umm al-Qura{offset ? `, penyesuaian ${offset > 0 ? '+' : ''}${offset} hari` : ''}).
          </p>
        </>
      )}
    </section>
  );
}

const notificationsSupported = () => 'Notification' in window;
const iosTab = () => isIosBrowserTab();

/** Teks status notifikasi saat iMuslim ditutup (jujur soal apa yang sedang terjadi). */
function pushStatusText(status, { prefs, supported, ios }) {
  if (!prefs.adzanNotify) return null;
  if (ios) return { tone: 'warn', text: 'Di iPhone/iPad, pasang iMuslim ke Layar Utama dulu (Bagikan → Tambah ke Layar Utama), lalu nyalakan dari aplikasi itu.' };
  if (!supported) return { tone: 'warn', text: 'Browser ini belum mendukung notifikasi saat ditutup. Pengingat tetap berjalan selama iMuslim terbuka.' };
  if (!prefs.adzanEnabled && !prefs.imsakAlert) return { tone: 'warn', text: 'Nyalakan adzan atau imsak di atas agar ada pengingat yang dikirim.' };
  switch (status.state) {
    case 'active':
      return { tone: 'ok', text: `Aktif untuk ${prefs.cityName}. Server iMuslim mengirim notifikasi tepat waktu walau aplikasi ditutup.` };
    case 'syncing':
    case 'idle':
      return { tone: 'muted', text: 'Menyambungkan ke server notifikasi…' };
    case 'server-off':
      return { tone: 'warn', text: 'Server notifikasi belum aktif. Pengingat tetap berjalan selama iMuslim terbuka.' };
    case 'no-permission':
      return { tone: 'warn', text: 'Izin notifikasi belum diberikan. Aktifkan dari pengaturan situs browser.' };
    case 'error':
      return { tone: 'error', text: `Gagal menyambungkan: ${status.error}` };
    default:
      return null;
  }
}

function AdzanSettings({ prefs }) {
  const toast = useToast();
  const audio = useAudioControls();
  const audioState = useAudioState();
  const set = (patch) => prefsStore.set((p) => ({ ...p, ...patch }));
  const notifSupported = useClientValue(notificationsSupported, false);
  const supported = useClientValue(pushSupported, false);
  const ios = useClientValue(iosTab, false);
  const pushStatus = usePushStatus();
  const [testing, setTesting] = useState(false);
  const previewKey = audioState.queue?.kind === 'adzan' && audioState.queue.id.startsWith('preview') ? audioState.queue.id : null;

  const preview = (id, src, title) => {
    if (previewKey === id) return audio.stop();
    return audio.playQueue({ id, kind: 'adzan', title: 'Contoh audio', tracks: [{ key: id, src, title, subtitle: 'Audio dari iMuslim versi sebelumnya' }] });
  };

  const toggleNotify = async (on) => {
    if (!on) {
      set({ adzanNotify: false });
      runPushSync(null);
      return undefined;
    }
    if (!notifSupported) return toast.show('Browser ini tidak mendukung notifikasi.', { type: 'error' });
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast.show('Izin notifikasi ditolak. Aktifkan dari pengaturan situs browser bila ingin memakainya.', { type: 'error', duration: 4200 });
      return undefined;
    }
    set({ adzanNotify: true });
    const want = pushWant({ ...prefs, adzanNotify: true });
    if (want && supported && !ios && import.meta.env.PROD) {
      const r = await runPushSync(want, { force: true });
      if (r.state === 'active') toast.show('Notifikasi aktif, juga saat iMuslim ditutup.');
      else if (r.state === 'error') toast.show(`Notifikasi saat ditutup gagal diaktifkan: ${r.error}`, { type: 'error', duration: 5000 });
    }
    return undefined;
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await sendTestPush();
      toast.show('Notifikasi uji dikirim. Coba juga dengan iMuslim ditutup.');
    } catch (error) {
      toast.show(error.message || 'Notifikasi uji gagal dikirim.', { type: 'error', duration: 4500 });
    } finally {
      setTesting(false);
    }
  };

  const status = pushStatusText(pushStatus, { prefs, supported, ios });

  return (
    <section className="panel sholat-adzan" aria-labelledby="adzan-title">
      <h2 id="adzan-title" className="panel__title">
        <BellRing aria-hidden="true" /> Pengingat & adzan
      </h2>
      <p className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 4 }}>
        Saat iMuslim terbuka, adzan diputar tepat waktu. Saat ditutup, iMuslim mengirim notifikasi berbunyi; ketuk notifikasinya untuk memutar adzan. Browser tidak mengizinkan
        situs memutar audio sendiri saat ditutup.
      </p>
      <SwitchRow
        label="Putar adzan saat masuk waktu sholat"
        description={prefs.cityId ? `Untuk ${prefs.cityName}: Subuh, Dzuhur, Ashar, Maghrib, Isya.` : 'Pilih kota terlebih dahulu.'}
        checked={prefs.adzanEnabled}
        disabled={!prefs.cityId}
        onChange={(v) => set({ adzanEnabled: v })}
      />
      <SwitchRow label="Peringatan waktu imsak" description="Memutar pengumuman singkat saat imsak (berguna saat Ramadan)." checked={prefs.imsakAlert} disabled={!prefs.cityId} onChange={(v) => set({ imsakAlert: v })} />
      <SwitchRow
        label="Notifikasi walau iMuslim ditutup"
        description={notifSupported ? 'Notifikasi tepat waktu dengan suara notifikasi perangkat. Meminta izin notifikasi saat dinyalakan.' : 'Tidak didukung di browser ini.'}
        checked={prefs.adzanNotify}
        disabled={!notifSupported || !prefs.cityId}
        onChange={toggleNotify}
      />
      {status && (
        <div className={`push-status push-status--${status.tone}`} role="status">
          <span>{status.text}</span>
          {status.tone === 'error' && (
            <button type="button" className="btn btn--sm" onClick={() => runPushSync(pushWant(prefs), { force: true })}>
              <RotateCw aria-hidden="true" /> Coba lagi
            </button>
          )}
          {pushStatus.state === 'active' && (
            <button type="button" className="btn btn--sm" onClick={sendTest} disabled={testing} aria-busy={testing}>
              <Send aria-hidden="true" /> {testing ? 'Mengirim…' : 'Kirim notifikasi uji'}
            </button>
          )}
        </div>
      )}
      {prefs.adzanNotify && (
        <details className="push-tips">
          <summary>Agar suara adzan langsung terdengar dari notifikasi (Android)</summary>
          <ol>
            <li>
              Unduh file adzan:{' '}
              <a href={ADZAN_AUDIO.default} download="adzan-imuslim.mp3">
                adzan
              </a>{' '}
              ·{' '}
              <a href={ADZAN_AUDIO.subuh} download="adzan-subuh-imuslim.mp3">
                adzan Subuh
              </a>
              .
            </li>
            <li>Buka Pengaturan HP → Aplikasi → iMuslim (atau Chrome bila iMuslim belum dipasang) → Notifikasi.</li>
            <li>Pilih kategori notifikasi iMuslim → Suara → pilih file adzan yang tadi diunduh.</li>
            <li>Agar tidak tertunda, matikan pengoptimalan/penghemat baterai untuk iMuslim atau Chrome.</li>
          </ol>
          <p className="muted">Nama menu berbeda di tiap merek HP, dan sebagian HP tidak mengizinkan suara khusus per aplikasi. iPhone memakai suara notifikasi bawaan.</p>
        </details>
      )}
      <div className="adzan-preview">
        <span className="field__label">
          <Volume2 aria-hidden="true" width={16} height={16} /> Dengarkan contoh
        </span>
        <div className="cluster">
          {[
            ['preview-umum', ADZAN_AUDIO.default, 'Adzan'],
            ['preview-subuh', ADZAN_AUDIO.subuh, 'Adzan Subuh'],
            ['preview-imsak', ADZAN_AUDIO.imsak, 'Pengumuman imsak'],
          ].map(([id, src, label]) => (
            <button key={id} type="button" className={`btn btn--sm ${previewKey === id ? 'btn--soft' : ''}`} onClick={() => preview(id, src, label)} aria-pressed={previewKey === id}>
              {previewKey === id ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
