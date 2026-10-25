// Pengaturan adzan di aplikasi Android: adzan diputar oleh alarm sistem (AlarmManager +
// layanan latar depan), jadi tetap berbunyi walau iMuslim ditutup atau HP terkunci.
// Tidak mengimpor Capacitor; aksi native lewat nativeApi() (diisi NativeBridge).
import { AlertTriangle, BellRing, CheckCircle2, Play, RotateCw, Square } from 'lucide-react';
import { useState } from 'react';
import { prefsStore } from '../../app/stores.js';
import { SwitchRow } from '../../components/ui/Switch.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { nativeApi, useNativeState } from '../../native/state.js';
import { formatShortDate } from '../../utils/format.js';
import { addDaysIso, PRAYER_LABELS, TIMEZONES, wallClock } from '../../utils/prayer.js';

function whenText(next, tz) {
  if (!next) return '';
  const today = wallClock(Date.now(), tz).iso;
  const day = next.date === today ? 'hari ini' : next.date === addDaysIso(today, 1) ? 'besok' : formatShortDate(next.date);
  return `${PRAYER_LABELS[next.key] ?? next.key} ${day} pukul ${next.time.replace(':', '.')} ${TIMEZONES[tz]?.label ?? ''}`.trim();
}

function Check({ ok, label, okText, todo, action }) {
  return (
    <li className={`native-check ${ok ? 'is-ok' : 'is-todo'}`}>
      {ok ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
      <span className="native-check__text">
        <strong>{label}</strong>
        <span>{ok ? okText : todo}</span>
      </span>
      {!ok && action}
    </li>
  );
}

export function NativeAdzanSettings({ prefs }) {
  const toast = useToast();
  const native = useNativeState();
  const [busy, setBusy] = useState(false);
  const st = native.status;
  const set = (patch) => prefsStore.set((p) => ({ ...p, ...patch }));
  const api = nativeApi();
  const tz = TIMEZONES[st?.tz] ? st.tz : 'WIB';

  // Menyalakan adzan/imsak: pastikan izin notifikasi (Android 13+) lebih dulu.
  const toggle = async (patch) => {
    const on = Object.values(patch).some(Boolean);
    if (on && api && st && !st.notifications) {
      const after = await api.requestNotifications().catch(() => null);
      if (after && !after.notifications) toast.show('Izin notifikasi ditolak. Adzan tetap berbunyi, tetapi tanpa notifikasi untuk menghentikannya — izinkan dari pengaturan.', { type: 'error', duration: 6000 });
    }
    set(patch);
  };

  const runTest = async () => {
    if (!api) return;
    setBusy(true);
    try {
      await api.test(10);
      toast.show('Adzan uji berbunyi dalam 10 detik. Coba kunci layar atau tutup iMuslim untuk memastikannya.', { duration: 6000 });
    } catch (error) {
      toast.show(error?.message || 'Uji adzan gagal dijadwalkan.', { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const enabled = Boolean(prefs.cityId && (prefs.adzanEnabled || prefs.imsakAlert));
  let status = null;
  if (enabled) {
    if (native.error) status = { tone: 'error', text: `Jadwal adzan gagal dipasang: ${native.error}` };
    else if (native.syncing || !native.ready) status = { tone: 'muted', text: 'Memasang jadwal adzan di perangkat…' };
    else if (st?.next) {
      const until = st.eventsUntil ? ` Jadwal tersimpan sampai ${formatShortDate(wallClock(st.eventsUntil, tz).iso)}; iMuslim memperbaruinya sendiri dari myQuran.` : '';
      status = { tone: 'ok', text: `Aktif untuk ${prefs.cityName}. Adzan berikutnya: ${whenText(st.next, tz)}.${until}` };
    } else status = { tone: 'warn', text: 'Belum ada jadwal tersimpan. Pastikan tersambung internet, lalu coba lagi.' };
  }

  return (
    <section className="panel sholat-adzan" aria-labelledby="adzan-title">
      <h2 id="adzan-title" className="panel__title">
        <BellRing aria-hidden="true" /> Pengingat & adzan
      </h2>
      <p className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 4 }}>
        Aplikasi Android iMuslim memutar adzan tepat waktu walau aplikasi ditutup atau HP terkunci. Adzan mengikuti mode HP: saat senyap hanya muncul notifikasi, saat mode getar HP
        bergetar.
      </p>
      <SwitchRow
        label="Putar adzan saat masuk waktu sholat"
        description={prefs.cityId ? `Untuk ${prefs.cityName}: Subuh, Dzuhur, Ashar, Maghrib, Isya.` : 'Pilih kota terlebih dahulu.'}
        checked={prefs.adzanEnabled}
        disabled={!prefs.cityId}
        onChange={(v) => toggle({ adzanEnabled: v })}
      />
      <SwitchRow
        label="Peringatan waktu imsak"
        description="Memutar pengumuman singkat saat imsak (berguna saat Ramadan)."
        checked={prefs.imsakAlert}
        disabled={!prefs.cityId}
        onChange={(v) => toggle({ imsakAlert: v })}
      />

      {status && (
        <div className={`push-status push-status--${status.tone}`} role="status">
          <span>{status.text}</span>
          {(status.tone === 'error' || status.tone === 'warn') && (
            <button type="button" className="btn btn--sm" onClick={() => api?.sync()}>
              <RotateCw aria-hidden="true" /> Coba lagi
            </button>
          )}
        </div>
      )}

      {enabled && st && (
        <>
          <ul className="native-checks" aria-label="Kesiapan adzan di perangkat ini">
            <Check
              ok={st.notifications}
              label="Notifikasi"
              okText="Diizinkan — notifikasi adzan punya tombol Hentikan."
              todo="Belum diizinkan. Tanpanya tidak ada tombol untuk menghentikan adzan."
              action={
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={async () => {
                    const after = await api?.requestNotifications().catch(() => null);
                    if (after && !after.notifications) api?.openSettings('notifications');
                  }}
                >
                  Izinkan
                </button>
              }
            />
            <Check
              ok={st.exactAlarm}
              label="Alarm tepat waktu"
              okText="Diizinkan — adzan berbunyi tepat di menitnya."
              todo="Belum diizinkan, adzan bisa terlambat beberapa menit."
              action={
                <button type="button" className="btn btn--sm" onClick={() => api?.openSettings('exactAlarm')}>
                  Izinkan
                </button>
              }
            />
            <Check
              ok={st.batteryUnrestricted}
              label="Penghemat baterai"
              okText="iMuslim tidak dibatasi penghemat baterai."
              todo="iMuslim masih dibatasi. Di sebagian HP ini bisa membuat adzan tidak berbunyi."
              action={
                <button type="button" className="btn btn--sm" onClick={() => api?.openSettings('battery')}>
                  Izinkan
                </button>
              }
            />
          </ul>

          <div className="cluster" style={{ marginBottom: 14 }}>
            {st.playing ? (
              <button type="button" className="btn btn--sm btn--soft" onClick={() => api?.stop()}>
                <Square aria-hidden="true" /> Hentikan adzan
              </button>
            ) : (
              <button type="button" className="btn btn--sm" onClick={runTest} disabled={busy} aria-busy={busy}>
                <Play aria-hidden="true" /> Uji adzan (10 detik lagi)
              </button>
            )}
          </div>

          <details className="push-tips">
            <summary>Adzan tidak berbunyi di HP Xiaomi, Oppo, Vivo, realme, Infinix, atau Samsung?</summary>
            <ol>
              <li>Buka Pengaturan HP → Aplikasi → iMuslim → Baterai, lalu pilih “Tanpa batasan” / “Izinkan aktivitas latar belakang”.</li>
              <li>Nyalakan “Mulai otomatis” (Autostart) untuk iMuslim bila menu itu ada.</li>
              <li>Jangan “paksa berhenti” iMuslim; menutupnya dari daftar aplikasi terbaru tidak masalah, tetapi kunci aplikasinya bila HP menyediakan.</li>
              <li>Setelah HP dinyalakan ulang, buka kunci layar sekali agar alarm adzan terpasang kembali.</li>
            </ol>
          </details>
        </>
      )}
    </section>
  );
}

