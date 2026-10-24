// Mencocokkan hasil reverse-geocoding OpenStreetMap dengan daftar kota/kabupaten myQuran.
// Tidak ada kota bawaan: bila tidak cocok, pengguna diminta memilih manual.

export function normalizeCity(name) {
  return String(name ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(KOTA ADMINISTRASI|KABUPATEN ADMINISTRASI|ADM\.?|KOTA|KABUPATEN|KAB\.?|CITY OF|REGENCY)\b/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const typeOf = (cityName) => (/^KOTA\b/i.test(cityName) ? 'KOTA' : /^KAB/i.test(cityName) ? 'KAB' : null);

function pick(list, preferType) {
  if (!list.length) return null;
  return list.find((c) => typeOf(c.name) === preferType) ?? list[0];
}

/**
 * @param cities [{id, name}]
 * @param place  { city, county, name, addressType } dari reverseGeocode
 * @returns {{ city, matchedFrom } | null}
 */
export function matchCity(cities, place) {
  if (!place || !Array.isArray(cities) || !cities.length) return null;
  const candidates = [
    place.city && { name: place.city, type: 'KOTA' },
    place.county && { name: place.county, type: 'KAB' },
    place.name && { name: place.name, type: place.addressType === 'city' ? 'KOTA' : 'KAB' },
  ].filter(Boolean);

  const normalized = cities.map((c) => ({ c, n: normalizeCity(c.name) }));

  for (const cand of candidates) {
    const n = normalizeCity(cand.name);
    if (!n) continue;
    const exact = normalized.filter((x) => x.n === n).map((x) => x.c);
    const hit = pick(exact, cand.type);
    if (hit) return { city: hit, matchedFrom: cand.name };
  }
  for (const cand of candidates) {
    const n = normalizeCity(cand.name);
    if (n.length < 4) continue;
    const partial = normalized.filter((x) => x.n.length >= 4 && (n.includes(x.n) || x.n.includes(n))).map((x) => x.c);
    const hit = pick(partial, cand.type);
    if (hit) return { city: hit, matchedFrom: cand.name };
  }
  return null;
}

/** Tampilkan nama kota yang lebih manusiawi: "KAB. BANDUNG BARAT" → "Kab. Bandung Barat". */
export function prettyCity(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/(^|[\s.(/-])([a-z])/g, (_, p, ch) => p + ch.toUpperCase());
}
