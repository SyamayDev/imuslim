// Layanan pendukung: harga emas referensi (zakat) dan geocoding OpenStreetMap (lokasi).
import { assert, cachedRequest, fetchJson, HOUR } from './client.js';

export const TROY_OUNCE_GRAMS = 31.1034768;

// Harga spot emas internasional (XAU) dalam Rupiah dari proyek terbuka fawazahmed0/exchange-api.
// Ini bukan harga jual ritel (mis. Antam) — UI wajib menjelaskan perbedaannya.
const GOLD_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.min.json',
  'https://latest.currency-api.pages.dev/v1/currencies/xau.min.json',
];

export function mapGold(json) {
  const idrPerOunce = json?.xau?.idr;
  assert(typeof idrPerOunce === 'number' && Number.isFinite(idrPerOunce) && idrPerOunce > 0, 'Harga emas tidak tersedia');
  assert(typeof json.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(json.date), 'Tanggal harga emas tidak valid');
  return {
    perGram: Math.round(idrPerOunce / TROY_OUNCE_GRAMS),
    perOunce: Math.round(idrPerOunce),
    date: json.date,
    source: 'fawazahmed0/exchange-api (spot XAU→IDR)',
  };
}

export function getGoldReference({ signal, force } = {}) {
  return cachedRequest({
    key: 'zakat:gold',
    ttl: 6 * HOUR,
    force,
    signal,
    load: (s) => fetchJson(GOLD_SOURCES[0], { signal: s, validate: mapGold }),
    fallback: (s) => fetchJson(GOLD_SOURCES[1], { signal: s, validate: mapGold }),
  });
}

// Nominatim (OpenStreetMap). Kebijakan penggunaan: maks. 1 permintaan/detik, hanya atas
// tindakan pengguna, wajib atribusi "© OpenStreetMap contributors".
const NOMINATIM = 'https://nominatim.openstreetmap.org';
let lastNominatimCall = 0;
async function politeDelay() {
  const wait = lastNominatimCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();
}

export async function reverseGeocode(lat, lon, { signal } = {}) {
  await politeDelay();
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&zoom=10&accept-language=id`;
  return fetchJson(url, {
    signal,
    retries: 0,
    validate: (j) => {
      assert(j && typeof j === 'object' && !j.error, j?.error || 'Lokasi tidak dikenali');
      const a = j.address || {};
      return {
        city: a.city || a.town || a.municipality || null,
        county: a.county || a.regency || a.state_district || null,
        state: a.state || null,
        countryCode: a.country_code || null,
        displayName: j.display_name || '',
        addressType: j.addresstype || j.type || null,
        name: j.name || null,
      };
    },
  });
}

export async function searchPlace(query, { signal } = {}) {
  await politeDelay();
  const url = `${NOMINATIM}/search?format=jsonv2&limit=6&accept-language=id&q=${encodeURIComponent(query)}`;
  return fetchJson(url, {
    signal,
    retries: 0,
    validate: (j) => {
      assert(Array.isArray(j), 'Respons pencarian lokasi tidak valid');
      return j
        .map((p) => ({ name: p.name || p.display_name, displayName: p.display_name, lat: Number(p.lat), lon: Number(p.lon) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    },
  });
}
