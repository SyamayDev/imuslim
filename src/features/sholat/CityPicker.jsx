import { Check, ChevronDown, LocateFixed, MapPin } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { ErrorState } from '../../components/ui/Status.jsx';
import { describeError } from '../../services/api/errors.js';
import { reverseGeocode } from '../../services/api/misc.js';
import { selectCity, useCities } from './cities.js';
import { matchCity, prettyCity } from '../../utils/cityMatch.js';
import { normalizeSearch } from '../../utils/text.js';
import './city-picker.css';

const GEO_ERRORS = {
  1: 'Izin lokasi ditolak. Anda tetap bisa memilih kota secara manual.',
  2: 'Lokasi perangkat tidak tersedia saat ini. Pilih kota secara manual.',
  3: 'Waktu menunggu lokasi habis. Coba lagi atau pilih kota manual.',
};

/**
 * Pemilih kota: combobox yang bisa diketik + tombol "Gunakan lokasi saya".
 * Izin lokasi baru diminta saat tombol ditekan.
 */
export function CityPicker({ currentId, onPicked }) {
  const cities = useCities();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [geo, setGeo] = useState({ status: 'idle', message: '' });
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef(null);

  const results = useMemo(() => {
    if (!cities.data) return [];
    const q = normalizeSearch(query);
    const list = q ? cities.data.filter((c) => normalizeSearch(c.name).includes(q)) : cities.data;
    return list.slice(0, 60);
  }, [cities.data, query]);

  const choose = (city, source = 'manual', extra = '') => {
    selectCity(city);
    setQuery('');
    setOpen(false);
    setGeo(source === 'gps' ? { status: 'done', message: `Lokasi terdeteksi: ${prettyCity(city.name)}${extra}. Bila kurang tepat, pilih kota lain di bawah.` } : { status: 'idle', message: '' });
    onPicked?.(city);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: 'Browser ini tidak mendukung lokasi perangkat. Pilih kota secara manual.' });
      return;
    }
    if (!cities.data) {
      setGeo({ status: 'error', message: 'Daftar kota belum dimuat. Tunggu sebentar lalu coba lagi.' });
      return;
    }
    setGeo({ status: 'locating', message: 'Meminta lokasi perangkat…' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeo({ status: 'locating', message: 'Mencocokkan lokasi dengan daftar kota…' });
        try {
          const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (place.countryCode && place.countryCode !== 'id') {
            setGeo({ status: 'error', message: 'Lokasi Anda berada di luar Indonesia; jadwal myQuran hanya tersedia untuk kota di Indonesia.' });
            return;
          }
          const match = matchCity(cities.data, place);
          if (match) choose(match.city, 'gps', match.matchedFrom ? ` (dari “${match.matchedFrom}”)` : '');
          else {
            const guess = place.city || place.county || place.name || '';
            setQuery(guess);
            setOpen(true);
            setGeo({ status: 'error', message: `Lokasi “${guess || place.displayName}” tidak ditemukan di daftar kota. Silakan pilih yang terdekat.` });
          }
        } catch (err) {
          setGeo({ status: 'error', message: `Nama lokasi tidak dapat ditentukan: ${describeError(err)} Pilih kota secara manual.` });
        }
      },
      (err) => setGeo({ status: 'error', message: GEO_ERRORS[err.code] ?? 'Lokasi tidak dapat diambil. Pilih kota secara manual.' }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (cities.status === 'error') return <ErrorState error={cities.error} onRetry={cities.reload} title="Daftar kota belum bisa dimuat" compact />;

  return (
    <div className="city-picker">
      <div className="city-picker__row">
        <div className="combo">
          <label htmlFor={inputId} className="visually-hidden">
            Cari kota atau kabupaten
          </label>
          <MapPin className="combo__icon" aria-hidden="true" />
          <input
            id={inputId}
            ref={inputRef}
            className="input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
            placeholder={cities.status === 'loading' ? 'Memuat daftar kota…' : 'Cari kota atau kabupaten'}
            disabled={cities.status === 'loading'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
          <button type="button" className="icon-btn combo__toggle" tabIndex={-1} aria-hidden="true" onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}>
            <ChevronDown />
          </button>
          {open && cities.data && (
            <ul id={listId} role="listbox" className="combo__list" aria-label="Pilihan kota">
              {results.length === 0 && <li className="combo__empty">Tidak ada kota yang cocok.</li>}
              {results.map((c, i) => (
                <li
                  key={c.id}
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={c.id === currentId}
                  className={`combo__option ${i === active ? 'is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                >
                  <span>{prettyCity(c.name)}</span>
                  {c.id === currentId && <Check aria-hidden="true" />}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn" onClick={locate} disabled={geo.status === 'locating' || cities.status !== 'success'}>
          {geo.status === 'locating' ? <span className="spinner" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
          Gunakan lokasi saya
        </button>
      </div>
      <p className="city-picker__status" role="status" aria-live="polite">
        {geo.message}
      </p>
      {geo.status !== 'idle' && geo.status !== 'locating' && (
        <p className="source-note">Nama lokasi ditentukan dengan Nominatim © OpenStreetMap contributors. Koordinat tidak disimpan.</p>
      )}
    </div>
  );
}
