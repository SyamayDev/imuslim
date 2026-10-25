// Baris "Aplikasi" di Pengaturan.
//  - Web: unduh aplikasi Android (APK) + cara memasangnya. Info versi dibaca dari download/android.json
//    di server yang sama (ditulis scripts/android-build.mjs bersama APK-nya, jadi selalu cocok).
//  - Aplikasi Android: versi terpasang + periksa pembaruan ke situs produksi.
import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useClientValue } from '../../hooks/useHydrated.js';
import { nativeApi, useNativeState } from '../../native/state.js';

const BASE = import.meta.env.BASE_URL;
const mb = (bytes) => `${(Number(bytes) / 1048576).toFixed(1).replace('.', ',')} MB`;
const isAndroid = () => /Android/i.test(navigator.userAgent);

/** Info APK yang tersedia di server ini: null = memuat, false = tidak tersedia. */
function useRelease() {
  const [release, setRelease] = useState(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${BASE}download/android.json`, { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRelease(j && typeof j.versionName === 'string' && Number(j.size) > 0 ? j : false))
      .catch((e) => e?.name !== 'AbortError' && setRelease(false));
    return () => ctrl.abort();
  }, []);
  return release;
}

export function AndroidAppRow() {
  const android = useClientValue(isAndroid, false);
  const release = useRelease();
  if (release === false) {
    return (
      <div className="setting-row">
        <div className="setting-row__text">
          <span className="setting-row__label">Aplikasi Android</span>
          <p className="setting-row__desc">Berkas aplikasi Android belum tersedia di server ini. Coba lagi nanti.</p>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="setting-row">
        <div className="setting-row__text">
          <span className="setting-row__label">Aplikasi Android</span>
          <p className="setting-row__desc">
            Aplikasi sungguhan (APK): adzan tetap berbunyi tepat waktu walau iMuslim ditutup atau HP terkunci.
            {release ? ` Versi ${release.versionName} · ${mb(release.size)} · Android ${release.minAndroid} ke atas.` : ' Memuat info versi…'}
          </p>
        </div>
        <a className={`btn btn--sm ${android ? 'btn--primary' : ''}`} href={`${BASE}download/imuslim.apk`} download={release ? `iMuslim-${release.versionName}.apk` : 'iMuslim.apk'}>
          <Download aria-hidden="true" /> Unduh APK
        </a>
      </div>
      <details className="apk-steps">
        <summary>Cara memasang aplikasi Android</summary>
        <ol>
          <li>Ketuk “Unduh APK” di HP Android. Bila browser bertanya soal berkas APK, pilih “Tetap unduh”.</li>
          <li>Buka berkas iMuslim dari notifikasi unduhan. Bila diminta, izinkan “Instal aplikasi tidak dikenal” untuk browser Anda.</li>
          <li>
            Ketuk “Instal”. Google Play Protect bisa menyebut iMuslim “aplikasi tidak dikenal” karena belum ada di Play Store — pilih “Detail selengkapnya” lalu “Tetap instal”.
          </li>
          <li>Buka iMuslim → Jadwal Sholat → nyalakan “Putar adzan”, lalu ketuk “Uji adzan”. Versi web yang pernah dipasang sebaiknya dihapus (atau matikan “Notifikasi walau iMuslim ditutup” di sana) agar ikon dan pengingatnya tidak dobel.</li>
        </ol>
        <p className="subtle">
          Pembaruan cukup diunduh dan dipasang di atas versi lama; jadwal, bookmark, dan pengaturan tetap tersimpan.
          {release?.certSha256 && (
            <>
              {' '}
              Sidik jari sertifikat (SHA-256): <code className="apk-steps__fp">{release.certSha256}</code>
            </>
          )}
        </p>
      </details>
    </>
  );
}

export function NativeAppRow() {
  const native = useNativeState();
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const { app, update } = native;

  const check = async () => {
    setChecking(true);
    try {
      await nativeApi()?.checkUpdate();
      setChecked(true);
    } catch (error) {
      toast.show(`Gagal memeriksa pembaruan: ${error?.message || 'tidak tersambung'}`, { type: 'error' });
    } finally {
      setChecking(false);
    }
  };

  let desc = 'Adzan diputar oleh alarm sistem, juga saat aplikasi ditutup.';
  if (update) desc = `Versi ${update.versionName} tersedia (${mb(update.size)}). Unduh lalu pasang di atas versi ini — data dan pengaturan tetap tersimpan.`;
  else if (checked) desc = 'Anda sudah memakai versi terbaru.';

  return (
    <div className="setting-row">
      <div className="setting-row__text">
        <span className="setting-row__label">Aplikasi Android iMuslim</span>
        <p className="setting-row__desc">
          {app ? `Versi ${app.version} (build ${app.build}). ` : ''}
          {desc}
        </p>
      </div>
      {update ? (
        <a className="btn btn--sm btn--primary" href={update.url} target="_blank" rel="noopener noreferrer">
          <Download aria-hidden="true" /> Unduh {update.versionName}
        </a>
      ) : (
        <button type="button" className="btn btn--sm" onClick={check} disabled={checking} aria-busy={checking}>
          <RefreshCw aria-hidden="true" /> {checking ? 'Memeriksa…' : 'Periksa pembaruan'}
        </button>
      )}
    </div>
  );
}
