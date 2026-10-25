import { Compass, LocateFixed, MapPin, Navigation, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { qiblaStore } from '../app/stores.js';
import { PageHeader, SourceNote } from '../components/ui/Content.jsx';
import { Medallion, Rosette } from '../components/ui/Ornament.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { describeError } from '../services/api/errors.js';
import { searchPlace } from '../services/api/misc.js';
import { number } from '../utils/format.js';
import { angleDiff, cardinalName, distanceToKaaba, headingFromEvent, KAABA, qiblaBearing } from '../utils/qibla.js';
import { useStore } from '../utils/storage.js';
import './kiblat.css';

const GEO_ERRORS = {
  1: 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser, atau ketik nama kota Anda di bawah.',
  2: 'Lokasi perangkat belum bisa ditemukan. Coba lagi (sebaiknya dekat jendela atau di luar ruangan), atau ketik nama kota Anda.',
  3: 'Menunggu lokasi terlalu lama. Coba lagi, atau ketik nama kota Anda.',
};

/** Lokasi perangkat — hanya diminta saat tombol ditekan, disimpan di perangkat ini saja. */
function useLocator() {
  const [geo, setGeo] = useState({ status: 'idle', message: '' });
  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: 'Browser ini tidak dapat membaca lokasi. Ketik nama kota Anda di bawah.' });
      return;
    }
    setGeo({ status: 'locating', message: 'Mencari lokasi Anda…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        qiblaStore.set({ lat: latitude, lon: longitude, label: 'Lokasi Anda saat ini', source: 'gps' });
        setGeo({ status: 'done', message: '' });
      },
      (err) => setGeo({ status: 'error', message: GEO_ERRORS[err.code] ?? 'Lokasi tidak dapat diambil. Ketik nama kota Anda di bawah.' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  };
  return { geo, locate };
}

export default function Kiblat() {
  useDocumentMeta({
    title: 'Arah Kiblat',
    description: "Ketahui arah kiblat dari tempat Anda dengan satu tombol: derajat, jarak ke Ka'bah, dan kompas perangkat bila didukung.",
    path: '/kiblat',
  });
  const location = useStore(qiblaStore);
  const locator = useLocator();
  const bearing = location ? qiblaBearing(location.lat, location.lon) : null;
  const distance = location ? distanceToKaaba(location.lat, location.lon) : null;

  return (
    <div className="page kiblat">
      <PageHeader
        eyebrow="Arah kiblat"
        title="Arah Kiblat"
        description="Tekan satu tombol, lalu iMuslim menunjukkan arah Ka'bah dari tempat Anda. Lokasi hanya dipakai di perangkat ini."
      />
      <div className="kiblat-layout">
        {location ? <CompassPanel bearing={bearing} distance={distance} location={location} locator={locator} /> : <StartPanel locator={locator} />}
        <section className="panel kiblat-howto" aria-labelledby="cara-title">
          <h2 id="cara-title" className="panel__title">
            Cara memakai
          </h2>
          <ol>
            <li>Tekan “Gunakan lokasi saya”, lalu pilih “Izinkan” saat browser meminta lokasi.</li>
            <li>Arah kiblat tampil dalam derajat dari arah utara, lengkap dengan penanda Ka'bah pada lingkaran kompas.</li>
            <li>Di ponsel, tekan “Aktifkan kompas”, letakkan ponsel mendatar, jauhkan dari logam/magnet, lalu putar badan sampai penanda Ka'bah berada di atas.</li>
            <li>Bila arah tampak melompat-lompat, gerakkan ponsel membentuk angka 8 untuk mengkalibrasi kompas.</li>
          </ol>
        </section>
      </div>
      <SourceNote>
        Arah dihitung di perangkat dengan rumus lingkaran besar (great-circle) menuju Ka'bah ({KAABA.lat}°, {KAABA.lon}°). Kompas perangkat memakai utara magnetik dan dapat
        terganggu logam atau medan magnet, sehingga selisih beberapa derajat bisa terjadi. Pencarian kota memakai Nominatim © OpenStreetMap contributors.
      </SourceNote>
    </div>
  );
}

/** Belum ada lokasi: satu tombol besar; pencarian kota hanya bila lokasi tidak bisa dipakai. */
function StartPanel({ locator }) {
  const { geo, locate } = locator;
  const [wantSearch, setWantSearch] = useState(false);
  const searchOpen = wantSearch || geo.status === 'error';
  return (
    <section className="panel qibla-start" aria-labelledby="mulai-title">
      <span className="qibla-start__art" aria-hidden="true">
        <Rosette className="qibla-start__rosette" />
        <Medallion icon={Compass} className="qibla-start__medallion" />
      </span>
      <h2 id="mulai-title" className="qibla-start__title">
        Ke mana arah kiblat dari sini?
      </h2>
      <p className="qibla-start__text">Tekan tombol di bawah. Arah ke Ka'bah langsung dihitung di ponsel Anda — lokasi tidak dikirim ke mana pun.</p>
      <button type="button" className="btn btn--primary btn--lg qibla-start__cta" onClick={locate} disabled={geo.status === 'locating'}>
        {geo.status === 'locating' ? <span className="spinner" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />} Gunakan lokasi saya
      </button>
      <p className={`location-status ${geo.status === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
        {geo.message}
      </p>
      {searchOpen ? (
        <PlaceSearch autoFocus={wantSearch} />
      ) : (
        <button type="button" className="link-btn qibla-start__alt" onClick={() => setWantSearch(true)}>
          Tidak bisa memakai lokasi? Ketik nama kota
        </button>
      )}
    </section>
  );
}

/** Pencarian kota/kabupaten (tanpa istilah koordinat). */
function PlaceSearch({ autoFocus = false, onPicked }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ status: 'idle', results: [], message: '' });
  const inputRef = useRef(null);

  // Fokus otomatis hanya setelah pengguna sendiri memilih untuk mengetik nama kota.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3) {
      setSearch({ status: 'error', results: [], message: 'Ketik minimal 3 huruf nama kota.' });
      return;
    }
    setSearch({ status: 'loading', results: [], message: 'Mencari…' });
    try {
      const results = await searchPlace(query.trim());
      setSearch({ status: 'done', results, message: results.length ? 'Pilih yang sesuai:' : 'Kota tidak ditemukan. Coba nama kota atau kabupaten lain.' });
    } catch (err) {
      setSearch({ status: 'error', results: [], message: describeError(err) });
    }
  };

  return (
    <form onSubmit={runSearch} className="place-search" role="search">
      <label htmlFor="cari-kota" className="field__label">
        Nama kota atau kabupaten
      </label>
      <div className="place-search__row">
        <input ref={inputRef} id="cari-kota" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="mis. Medan" autoComplete="off" enterKeyHint="search" />
        <button type="submit" className="btn btn--primary" disabled={search.status === 'loading'} aria-label="Cari kota">
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
                  qiblaStore.set({ lat: p.lat, lon: p.lon, label: p.displayName, source: 'search' });
                  setSearch({ status: 'idle', results: [], message: '' });
                  onPicked?.();
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

function CompassPanel({ bearing, distance, location, locator }) {
  const compass = useCompass();
  const [changing, setChanging] = useState(false);
  const heading = compass.status === 'on' ? compass.heading : null;
  const rotation = heading === null ? 0 : -heading;
  const diff = heading !== null && bearing !== null ? angleDiff(bearing, heading) : null;
  const aligned = diff !== null && Math.abs(diff) <= 4;
  const wasAligned = useRef(false);

  useEffect(() => {
    if (aligned && !wasAligned.current) navigator.vibrate?.(40);
    wasAligned.current = aligned;
  }, [aligned]);

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
        <p className="compass-readout__meta">Jarak ke Ka'bah ± {number(distance, 0)} km</p>
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

      <div className="qibla-place">
        <p className="qibla-place__label">
          <MapPin aria-hidden="true" />
          <span>{location.label || 'Lokasi tersimpan'}</span>
        </p>
        <div className="qibla-place__actions">
          <button type="button" className="btn btn--sm" onClick={locator.locate} disabled={locator.geo.status === 'locating'}>
            {locator.geo.status === 'locating' ? <span className="spinner" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />} Perbarui lokasi
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => setChanging((v) => !v)} aria-expanded={changing}>
            <Search aria-hidden="true" /> Ganti kota
          </button>
        </div>
        {locator.geo.message && (
          <p className={`location-status ${locator.geo.status === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
            {locator.geo.message}
          </p>
        )}
        {(changing || locator.geo.status === 'error') && <PlaceSearch autoFocus={changing} onPicked={() => setChanging(false)} />}
      </div>
    </section>
  );
}
