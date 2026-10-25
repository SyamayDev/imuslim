import { Database, Download, ExternalLink, Maximize, Moon, Smartphone, Sun, Trash2, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALL_STORES, prefsStore } from '../app/stores.js';
import { setTheme, useResolvedTheme } from '../app/theme.js';
import { ArabicText, PageHeader } from '../components/ui/Content.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';
import { SwitchRow } from '../components/ui/Switch.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { REPO_URL } from '../app/site.js';
import { CityPicker } from '../features/sholat/CityPicker.jsx';
import { useInstallPrompt } from '../hooks/useBrowser.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { useFullscreen } from '../hooks/useFullscreen.js';
import { cacheClear } from '../services/api/cache.js';
import { QARI } from '../services/api/quran-constants.js';
import { localIso } from '../utils/format.js';
import { useNow } from '../hooks/useNow.js';
import { formatHijri, toHijri } from '../utils/hijri.js';
import { useStore } from '../utils/storage.js';
import './pengaturan.css';

// Dua pilihan saja; sebelum memilih, tema mengikuti perangkat.
const THEMES = [
  { id: 'light', label: 'Terang', icon: Sun },
  { id: 'dark', label: 'Gelap', icon: Moon },
];

function Section({ id, title, description, children }) {
  return (
    <section className="panel settings-section" aria-labelledby={id}>
      <h2 id={id} className="settings-section__title">
        {title}
      </h2>
      {description && <p className="settings-section__desc">{description}</p>}
      {children}
    </section>
  );
}

export default function Pengaturan() {
  useDocumentMeta({ title: 'Pengaturan', description: 'Atur tema, ukuran teks Arab, qari, kota jadwal sholat, pengingat adzan, dan data lokal iMuslim.', path: '/pengaturan' });
  const prefs = useStore(prefsStore);
  const theme = useResolvedTheme();
  const set = (patch) => prefsStore.set((p) => ({ ...p, ...patch }));
  const fs = useFullscreen();
  const install = useInstallPrompt();
  const toast = useToast();
  const nameId = useId();
  const now = useNow(60000);
  const today = now == null ? null : localIso(new Date(now));
  const [y, m, d] = today ? today.split('-').map(Number) : [];

  return (
    <div className="page settings">
      <PageHeader eyebrow="Pengaturan" title="Pengaturan" description="Semua pengaturan tersimpan di perangkat ini saja. iMuslim tidak memiliki akun, tidak mengirim data pribadi, dan tidak memakai pelacak." />

      <div className="settings-grid">
        <Section
          id="s-tampilan"
          title="Tampilan"
          description={
            prefs.theme === 'system'
              ? 'Tema saat ini mengikuti pengaturan perangkat Anda. Pilih salah satu untuk menetapkannya.'
              : 'Pilihan tema Anda tersimpan di perangkat ini.'
          }
        >
          <div className="theme-picker" role="radiogroup" aria-label="Tema">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <label key={id} className={`theme-option theme-option--${id} ${theme === id ? 'is-checked' : ''}`}>
                <input type="radio" name="theme" value={id} checked={theme === id} onChange={() => setTheme(id)} />
                <span className="theme-option__preview" aria-hidden="true">
                  <i />
                  <i />
                </span>
                <span className="theme-option__label">
                  <Icon aria-hidden="true" /> {label}
                </span>
              </label>
            ))}
          </div>
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">Layar penuh</span>
              <p className="setting-row__desc">
                {fs.supported
                  ? 'Sembunyikan bilah browser untuk membaca lebih fokus. Tekan Esc atau tombol yang sama untuk keluar.'
                  : 'Browser ini tidak mendukung mode layar penuh untuk halaman web (mis. Safari di iPhone). Alternatifnya: tambahkan iMuslim ke layar utama.'}
              </p>
            </div>
            {fs.supported && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => fs.toggle().catch(() => toast.show('Browser menolak mode layar penuh.', { type: 'error' }))}
              >
                <Maximize aria-hidden="true" /> {fs.isFullscreen ? 'Keluar' : 'Masuk'}
              </button>
            )}
          </div>
        </Section>

        <Section id="s-bacaan" title="Bacaan" description="Berlaku untuk Al-Qur'an, doa, dan hadits.">
          <div className="field">
            <label htmlFor="arabic-size" className="field__label">
              Ukuran teks Arab · {Math.round(prefs.arabicScale * 100)}%
            </label>
            <input id="arabic-size" className="range" type="range" min="0.8" max="1.8" step="0.05" value={prefs.arabicScale} onChange={(e) => set({ arabicScale: Number(e.target.value) })} />
            <ArabicText className="arabic-preview">إِنَّ مَعَ الْعُسْرِ يُسْرًا</ArabicText>
          </div>
          <SwitchRow label="Tampilkan transliterasi latin" checked={prefs.showLatin} onChange={(v) => set({ showLatin: v })} />
          <SwitchRow label="Tampilkan terjemahan" checked={prefs.showTranslation} onChange={(v) => set({ showTranslation: v })} />
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="qari" className="field__label">
              Qari murattal
            </label>
            <select id="qari" className="select" value={prefs.qari} onChange={(e) => set({ qari: e.target.value })}>
              {Object.entries(QARI).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section id="s-sholat" title="Kota & pengingat sholat">
          <p className="settings-section__desc">{prefs.cityId ? `Kota saat ini: ${prefs.cityName}` : 'Belum ada kota dipilih.'}</p>
          <CityPicker currentId={prefs.cityId} onPicked={() => toast.show('Kota disimpan')} />
          <SwitchRow label="Putar adzan saat masuk waktu" description="Hanya selama iMuslim terbuka." checked={prefs.adzanEnabled} disabled={!prefs.cityId} onChange={(v) => set({ adzanEnabled: v })} />
          <SwitchRow label="Peringatan imsak" checked={prefs.imsakAlert} disabled={!prefs.cityId} onChange={(v) => set({ imsakAlert: v })} />
          <Link to="/sholat" className="section__link" style={{ marginTop: 8 }}>
            Notifikasi & contoh audio ada di halaman Jadwal Sholat
          </Link>
        </Section>

        <Section id="s-kalender" title="Kalender Hijriah" description="Awal bulan Hijriah di Indonesia bisa berbeda ±1 hari dari perhitungan Umm al-Qura. Sesuaikan bila perlu.">
          <div className="field">
            <label htmlFor="hijri-offset" className="field__label">
              Penyesuaian tanggal
            </label>
            <select id="hijri-offset" className="select" value={prefs.hijriOffset} onChange={(e) => set({ hijriOffset: Number(e.target.value) })}>
              {[-2, -1, 0, 1, 2].map((o) => (
                <option key={o} value={o}>
                  {`${o === 0 ? 'Tanpa penyesuaian' : `${o > 0 ? '+' : ''}${o} hari`}${today ? ` — hari ini ${formatHijri(toHijri(y, m, d, o))}` : ''}`}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section id="s-profil" title="Sapaan">
          <div className="field">
            <label htmlFor={nameId} className="field__label">
              Nama panggilan <span className="subtle">(opsional)</span>
            </label>
            <input id={nameId} className="input" maxLength={40} value={prefs.name} placeholder="Dipakai untuk sapaan di beranda" onChange={(e) => set({ name: e.target.value })} />
            <p className="field__hint">Hanya disimpan di perangkat ini.</p>
          </div>
        </Section>

        <Section id="s-aplikasi" title="Aplikasi">
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">Pasang iMuslim</span>
              <p className="setting-row__desc">
                {install.installed
                  ? 'iMuslim sedang berjalan sebagai aplikasi terpasang.'
                  : install.available
                    ? 'Tambahkan ke layar utama agar terbuka seperti aplikasi, termasuk saat koneksi terputus untuk data yang pernah dimuat.'
                    : 'Bila tombol tidak muncul, gunakan menu browser “Tambahkan ke layar utama” / “Install app”.'}
              </p>
            </div>
            {install.available && (
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={async () => {
                  const r = await install.prompt();
                  if (r === 'accepted') toast.show('iMuslim dipasang');
                }}
              >
                <Smartphone aria-hidden="true" /> Pasang
              </button>
            )}
          </div>
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">Cache data</span>
              <p className="setting-row__desc">Data API yang tersimpan (surah, jadwal, doa, hadits). Menghapusnya memaksa pemuatan ulang dari sumber.</p>
            </div>
            <button
              type="button"
              className="btn btn--sm"
              onClick={async () => {
                await cacheClear();
                toast.show('Cache data dihapus');
              }}
            >
              <Database aria-hidden="true" /> Hapus cache
            </button>
          </div>
        </Section>

        <DataSection />

        <Section id="s-bantuan" title="Bantuan">
          <ul className="help-links">
            <li>
              <Link to="/tentang">Tentang iMuslim & sumber data</Link>
            </li>
            <li>
              <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer">
                Laporkan masalah di GitHub <ExternalLink aria-hidden="true" />
              </a>
            </li>
          </ul>
          <p className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
            Versi {__APP_VERSION__} · dibangun {new Date(__BUILD_DATE__).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </Section>
      </div>
    </div>
  );
}

function DataSection() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [confirm, setConfirm] = useState(false);

  const exportData = () => {
    const payload = { app: 'iMuslim', version: 1, exportedAt: new Date().toISOString(), data: Object.fromEntries(ALL_STORES.map((s) => [s.key, s.get()])) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imuslim-data-${localIso()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show('Data diekspor ke file JSON');
  };

  const importData = async (file) => {
    try {
      if (file.size > 2_000_000) throw new Error('File terlalu besar');
      const json = JSON.parse(await file.text());
      if (json?.app !== 'iMuslim' || typeof json.data !== 'object') throw new Error('Bukan file ekspor iMuslim');
      let count = 0;
      for (const store of ALL_STORES) {
        if (store.key in json.data) {
          store.set(json.data[store.key]); // validator store membersihkan data yang tidak valid
          count += 1;
        }
      }
      toast.show(`Berhasil mengimpor ${count} bagian data`);
    } catch (e) {
      toast.show(`Impor gagal: ${e.message}`, { type: 'error', duration: 4000 });
    }
  };

  const clearAll = () => {
    ALL_STORES.forEach((s) => s.reset());
    cacheClear();
    setConfirm(false);
    toast.show('Semua data lokal iMuslim dihapus');
  };

  return (
    <Section id="s-data" title="Data pribadi" description="Bookmark, favorit, doa & hadits tersimpan, acara kalender, dan pengaturan.">
      <div className="cluster">
        <button type="button" className="btn btn--sm" onClick={exportData}>
          <Download aria-hidden="true" /> Ekspor
        </button>
        <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden="true" /> Impor
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirm(true)}>
          <Trash2 aria-hidden="true" /> Hapus semua
        </button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Hapus semua data lokal?"
        description="Bookmark, favorit, doa & hadits tersimpan, acara kalender, kota, dan pengaturan akan dihapus dari perangkat ini. Tindakan ini tidak dapat dibatalkan."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Batal
            </button>
            <button type="button" className="btn btn--danger" onClick={clearAll}>
              Ya, hapus
            </button>
          </>
        }
      >
        <p className="muted">Saran: ekspor data terlebih dahulu bila ingin menyimpannya.</p>
      </Dialog>
    </Section>
  );
}
