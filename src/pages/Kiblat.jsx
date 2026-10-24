import { Compass, LocateFixed, MapPin, Navigation, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { qiblaStore } from '../app/stores.js';
import { PageHeader, SourceNote } from '../components/ui/Content.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { describeError } from '../services/api/errors.js';
import { searchPlace } from '../services/api/misc.js';
import { number } from '../utils/format.js';
import { angleDiff, cardinalName, distanceToKaaba, headingFromEvent, isValidCoordinate, KAABA, qiblaBearing } from '../utils/qibla.js';
import { useStore } from '../utils/storage.js';
import './kiblat.css';

const GEO_ERRORS = {
  1: 'Izin lokasi ditolak. Masukkan koordinat atau cari nama tempat secara manual.',
  2: 'Lokasi perangkat tidak tersedia. Gunakan input manual.',
  3: 'Waktu menunggu lokasi habis. Coba lagi atau gunakan input manual.',
};

export default function Kiblat() {
  useDocumentMeta({
    title: 'Arah Kiblat',
    description: "Hitung arah kiblat dari lokasi Anda ke Ka'bah, lengkap dengan derajat, jarak, dan kompas perangkat bila didukung.",
    path: '/kiblat',
  });
  const location = useStore(qiblaStore);
  const bearing = location ? qiblaBearing(location.lat, location.lon) : null;
  const distance = location ? distanceToKaaba(location.lat, location.lon) : null;

  return (
    <div className="page kiblat">
      <PageHeader
        eyebrow="Arah kiblat"
        title="Arah Kiblat"
        description="Arah dihitung di perangkat Anda dari koordinat lokasi menuju Ka'bah. Lokasi hanya diminta setelah Anda menekan tombol."
      />
      <div className="kiblat-layout">
        <CompassPanel bearing={bearing} distance={distance} location={location} />
        <LocationPanel location={location} />
      </div>
      <section className="panel kiblat-howto" aria-labelledby="cara-title">
        <h2 id="cara-title" className="panel__title">
          Cara memakai
        </h2>
        <ol>
          <li>Tentukan lokasi: tekan “Gunakan lokasi saya”, cari nama tempat, atau isi koordinat.</li>
          <li>Tanpa kompas: arah kiblat adalah sudut yang ditampilkan, diukur searah jarum jam dari utara sejati. Cocokkan dengan kompas fisik atau peta.</li>
          <li>Dengan kompas perangkat (ponsel): tekan “Aktifkan kompas”, letakkan ponsel mendatar, jauhkan dari logam/magnet, lalu putar badan sampai penanda Ka'bah berada di atas.</li>
          <li>Bila arah tampak melompat-lompat, kalibrasi kompas dengan menggerakkan ponsel membentuk angka 8.</li>
        </ol>
      </section>
      <SourceNote>
        Rumus: sudut awal lingkaran besar (great-circle) ke Ka'bah ({KAABA.lat}°, {KAABA.lon}°). Kompas perangkat memakai utara magnetik dan dapat terganggu logam atau medan
        magnet; selisih dengan utara sejati beberapa derajat bisa terjadi. Pencarian tempat memakai Nominatim © OpenStreetMap contributors.
      </SourceNote>
    </div>
  );
}

function useCompass() {
  const [state, setState] = useState({ status: 'off', heading: null, message: '' });
  const cleanupRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const start = async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setState({ status: 'unsupported', heading: null, message: 'Browser ini tidak menyediakan sensor orientasi. Gunakan derajat kiblat dengan kompas fisik.' });
      return;
    }
    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        const perm = await window.DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') {
          setState({ status: 'denied', heading: null, message: 'Izin sensor gerak ditolak. Aktifkan dari pengaturan browser bila ingin memakai kompas.' });
          return;
        }
      }
    } catch {
      setState({ status: 'denied', heading: null, message: 'Izin sensor gerak tidak dapat diminta di browser ini.' });
      return;
    }
    setState({ status: 'waiting', heading: null, message: 'Menunggu data kompas… gerakkan ponsel perlahan.' });
    let received = false;
    let relativeOnly = false;
    const onEvent = (e) => {
      const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
      const h = headingFromEvent(e, Number(angle) || 0);
      if (h === null) {
        if (typeof e.alpha === 'number') relativeOnly = true;
        return;
      }
      received = true;
      setState({ status: 'on', heading: h, message: '' });
    };
    const absEvent = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(absEvent, onEvent);
    if (absEvent !== 'deviceorientation') window.addEventListener('deviceorientation', onEvent);
    const timer = setTimeout(() => {
      if (!received) {
        setState({
          status: 'unsupported',
          heading: null,
          message: relativeOnly
            ? 'Sensor perangkat tidak memberikan arah utara absolut, sehingga kompas tidak dapat dipakai. Gunakan derajat kiblat.'
            : 'Tidak ada data kompas dari perangkat (umumnya laptop/desktop tidak memiliki magnetometer). Gunakan derajat kiblat.',
        });
        cleanupRef.current?.();
      }
    }, 3500);
    cleanupRef.current = () => {
      clearTimeout(timer);
      window.removeEventListener(absEvent, onEvent);
      window.removeEventListener('deviceorientation', onEvent);
    };
  };

  const stop = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setState({ status: 'off', heading: null, message: '' });
  };

  return { ...state, start, stop };
}

function CompassPanel({ bearing, distance, location }) {
  const compass = useCompass();
  const heading = compass.status === 'on' ? compass.heading : null;
  const rotation = heading === null ? 0 : -heading;
  const diff = heading !== null && bearing !== null ? angleDiff(bearing, heading) : null;
  const aligned = diff !== null && Math.abs(diff) <= 4;
  const wasAligned = useRef(false);

  useEffect(() => {
    if (aligned && !wasAligned.current) navigator.vibrate?.(40);
    wasAligned.current = aligned;
  }, [aligned]);

  if (bearing === null) {
    return (
      <section className="panel compass-panel compass-panel--empty" aria-label="Kompas kiblat">
        <Compass aria-hidden="true" className="compass-panel__placeholder" />
        <p className="state__title">Tentukan lokasi terlebih dahulu</p>
        <p className="muted">Arah kiblat akan muncul di sini setelah lokasi diketahui.</p>
      </section>
    );
  }

  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <section className="panel compass-panel" aria-labelledby="arah-title">
      <div className="compass-readout">
        <h2 id="arah-title" className="visually-hidden">
          Hasil arah kiblat
        </h2>
        <p className="compass-readout__deg tabular">
          {number(bearing, 1)}°
        </p>
        <p className="compass-readout__desc">
          dari utara sejati, ke arah <strong>{cardinalName(bearing)}</strong>
        </p>
        <p className="compass-readout__meta">
          Jarak ke Ka'bah ± {number(distance, 0)} km · {location.label || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`}
        </p>
      </div>

      <div className={`compass ${aligned ? 'is-aligned' : ''}`}>
        {heading !== null && <span className="compass__device" aria-hidden="true" />}
        <svg viewBox="-160 -160 320 320" role="img" aria-label={`Dial kompas: kiblat ${number(bearing, 1)} derajat dari utara`} style={{ transform: `rotate(${rotation}deg)` }}>
          <circle r="150" className="compass__ring" />
          <circle r="118" className="compass__inner" />
          {ticks.map((t) => (
            <line key={t} x1="0" y1={t % 30 === 0 ? -150 : -150} x2="0" y2={t % 30 === 0 ? -134 : -142} className={t % 30 === 0 ? 'compass__tick compass__tick--major' : 'compass__tick'} transform={`rotate(${t})`} />
          ))}
          {[
            ['U', 0],
            ['T', 90],
            ['S', 180],
            ['B', 270],
          ].map(([label, deg]) => (
            <text key={label} className={`compass__card ${label === 'U' ? 'is-north' : ''}`} transform={`rotate(${deg}) translate(0 -100) rotate(${-deg - rotation})`} textAnchor="middle" dominantBaseline="central">
              {label}
            </text>
          ))}
          <g transform={`rotate(${bearing})`} className="compass__qibla">
            <line x1="0" y1="0" x2="0" y2="-112" className="compass__needle" />
            <g transform="translate(0 -128)">
              <rect x="-10" y="-10" width="20" height="20" rx="2" className="compass__kaaba" transform={`rotate(${-bearing - rotation})`} />
              <rect x="-10" y="-5" width="20" height="3" className="compass__kaaba-band" transform={`rotate(${-bearing - rotation})`} />
            </g>
          </g>
          <circle r="7" className="compass__hub" />
        </svg>
      </div>

      <div className="compass-actions">
        {compass.status === 'on' || compass.status === 'waiting' ? (
          <button type="button" className="btn" onClick={compass.stop}>
            Matikan kompas
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={compass.start}>
            <Navigation aria-hidden="true" /> Aktifkan kompas
          </button>
        )}
        <p className="compass-status" role="status" aria-live="polite">
          {compass.status === 'on'
            ? aligned
              ? 'Anda sudah menghadap kiblat.'
              : `Arah perangkat ${number(heading, 0)}° — putar ${diff > 0 ? 'ke kanan' : 'ke kiri'} ${number(Math.abs(diff), 0)}°.`
            : compass.message}
        </p>
      </div>
    </section>
  );
}

function LocationPanel({ location }) {
  const [geo, setGeo] = useState({ status: 'idle', message: '' });
  const [lat, setLat] = useState(location ? String(location.lat) : '');
  const [lon, setLon] = useState(location ? String(location.lon) : '');
  const [manualError, setManualError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ status: 'idle', results: [], message: '' });

  const save = (loc) => {
    qiblaStore.set(loc);
    setLat(String(Number(loc.lat.toFixed(6))));
    setLon(String(Number(loc.lon.toFixed(6))));
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: 'Browser tidak mendukung lokasi perangkat. Gunakan input manual.' });
      return;
    }
    setGeo({ status: 'locating', message: 'Meminta lokasi perangkat…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        save({ lat: latitude, lon: longitude, label: `Lokasi perangkat (akurasi ± ${Math.round(accuracy)} m)`, source: 'gps' });
        setGeo({ status: 'done', message: 'Lokasi diperbarui dari perangkat.' });
      },
      (err) => setGeo({ status: 'error', message: GEO_ERRORS[err.code] ?? 'Lokasi tidak dapat diambil.' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const submitManual = (e) => {
    e.preventDefault();
    const la = Number(String(lat).replace(',', '.'));
    const lo = Number(String(lon).replace(',', '.'));
    if (!isValidCoordinate(la, lo) || lat === '' || lon === '') {
      setManualError('Lintang harus −90 s.d. 90 dan bujur −180 s.d. 180 (contoh Jakarta: −6.2, 106.82).');
      return;
    }
    setManualError('');
    save({ lat: la, lon: lo, label: `Koordinat ${la.toFixed(4)}, ${lo.toFixed(4)}`, source: 'manual' });
  };

  const runSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3) {
      setSearch({ status: 'error', results: [], message: 'Ketik minimal 3 huruf.' });
      return;
    }
    setSearch({ status: 'loading', results: [], message: 'Mencari…' });
    try {
      const results = await searchPlace(query.trim());
      setSearch({ status: 'done', results, message: results.length ? '' : 'Tempat tidak ditemukan. Coba nama kota atau kabupaten.' });
    } catch (err) {
      setSearch({ status: 'error', results: [], message: describeError(err) });
    }
  };

  return (
    <section className="panel location-panel" aria-labelledby="lokasi-title">
      <h2 id="lokasi-title" className="panel__title">
        <MapPin aria-hidden="true" /> Lokasi
      </h2>
      <button type="button" className="btn btn--primary btn--block" onClick={locate} disabled={geo.status === 'locating'}>
        {geo.status === 'locating' ? <span className="spinner" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />} Gunakan lokasi saya
      </button>
      <p className={`location-panel__status ${geo.status === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
        {geo.message}
      </p>

      <form onSubmit={runSearch} className="location-search" role="search">
        <label htmlFor="cari-tempat" className="field__label">
          Cari nama tempat
        </label>
        <div className="location-search__row">
          <input id="cari-tempat" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="mis. Makassar, Kab. Sleman" autoComplete="off" />
          <button type="submit" className="btn" disabled={search.status === 'loading'} aria-label="Cari tempat">
            {search.status === 'loading' ? <span className="spinner" aria-hidden="true" /> : <Search aria-hidden="true" />}
          </button>
        </div>
        {search.message && (
          <p className={`field__hint ${search.status === 'error' ? 'field__error' : ''}`} role="status">
            {search.message}
          </p>
        )}
        {search.results.length > 0 && (
          <ul className="place-results">
            {search.results.map((p) => (
              <li key={`${p.lat},${p.lon}`}>
                <button
                  type="button"
                  onClick={() => {
                    save({ lat: p.lat, lon: p.lon, label: p.displayName, source: 'search' });
                    setSearch({ status: 'idle', results: [], message: '' });
                  }}
                >
                  <strong>{p.name}</strong>
                  <span>{p.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <form onSubmit={submitManual} className="manual-coords" noValidate>
        <fieldset>
          <legend className="field__label">Atau isi koordinat</legend>
          <div className="manual-coords__grid">
            <div className="field">
              <label htmlFor="lat" className="field__hint">
                Lintang (latitude)
              </label>
              <input id="lat" className="input tabular" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-6.2088" aria-invalid={Boolean(manualError)} />
            </div>
            <div className="field">
              <label htmlFor="lon" className="field__hint">
                Bujur (longitude)
              </label>
              <input id="lon" className="input tabular" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="106.8456" aria-invalid={Boolean(manualError)} />
            </div>
          </div>
          {manualError && (
            <p className="field__error" role="alert">
              {manualError}
            </p>
          )}
          <button type="submit" className="btn btn--block" style={{ marginTop: 10 }}>
            Hitung arah kiblat
          </button>
        </fieldset>
      </form>
    </section>
  );
}
