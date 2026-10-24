// Arah kiblat dihitung lokal: bearing lingkaran besar (great-circle initial bearing)
// dari posisi pengguna ke Ka'bah, relatif terhadap utara sejati.

export const KAABA = { lat: 21.422487, lon: 39.826206 };
const R_EARTH_KM = 6371.0088;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

export function isValidCoordinate(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/** Bearing awal (derajat 0–360, searah jarum jam dari utara sejati). */
export function qiblaBearing(lat, lon) {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Jarak lingkaran besar (haversine) ke Ka'bah dalam km. */
export function distanceToKaaba(lat, lon) {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA.lat);
  const Δφ = φ2 - φ1;
  const Δλ = toRad(KAABA.lon - lon);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

const POINTS = ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'];
export function cardinalName(deg) {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Selisih sudut bertanda terkecil (−180..180). */
export function angleDiff(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

/**
 * Ambil heading kompas (derajat dari utara, searah jarum jam) dari event orientasi.
 * Mengembalikan null bila sensor tidak memberi arah absolut.
 */
export function headingFromEvent(event, screenAngle = 0) {
  if (typeof event?.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
    // iOS: sudah heading magnetik searah jarum jam.
    return (event.webkitCompassHeading + screenAngle + 360) % 360;
  }
  if (event?.absolute === true && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    // alpha berlawanan arah jarum jam; konversi ke heading searah jarum jam.
    return (360 - event.alpha + screenAngle + 360) % 360;
  }
  return null;
}
