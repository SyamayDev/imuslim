// Konversi Masehi → Hijriah secara lokal.
// Metode utama: kalender Umm al-Qura (Arab Saudi) melalui Intl (ICU) bawaan browser.
// Cadangan: kalender Hijriah tabular (aritmetika "islamic-civil") bila browser tidak
// mendukung Umm al-Qura. Penetapan resmi di Indonesia (sidang isbat/rukyat) bisa berbeda
// ±1 hari; karena itu pengguna dapat mengatur penyesuaian hari (offset).

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jumadilawal',
  'Jumadilakhir',
  'Rajab',
  'Syakban',
  'Ramadan',
  'Syawal',
  'Zulkaidah',
  'Zulhijah',
];

let formatter = null;
let method = null;

function getFormatter() {
  if (formatter !== null) return formatter;
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    if (f.resolvedOptions().calendar === 'islamic-umalqura') {
      formatter = f;
      method = 'umalqura';
      return formatter;
    }
  } catch {
    /* tidak didukung */
  }
  formatter = false;
  method = 'tabular';
  return formatter;
}

export function hijriMethod() {
  getFormatter();
  return method;
}

export const METHOD_LABEL = {
  umalqura: 'Umm al-Qura (perhitungan astronomis Arab Saudi)',
  tabular: 'Hijriah tabular (aritmetika)',
};

/** Hijriah tabular (civil): algoritma aritmetika standar berbasis Julian Day. */
// Epoch kalender Hijriah sipil: Jumat, 16 Juli 622 M (Julian) = JD 1948439.5.
const ISLAMIC_EPOCH = 1948439.5;

function gregorianToJd(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn - 0.5; // awal hari (tengah malam)
}

function islamicToJd(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1;
}

export function tabularHijri(y, m, d) {
  const jd = Math.floor(gregorianToJd(y, m, d)) + 0.5;
  const year = Math.floor((30 * (jd - ISLAMIC_EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + islamicToJd(year, 1, 1))) / 29.5) + 1);
  const day = jd - islamicToJd(year, month, 1) + 1;
  return { year, month, day };
}

/**
 * @param {number} y tahun Masehi
 * @param {number} m bulan 1–12
 * @param {number} d tanggal
 * @param {number} offset penyesuaian hari (−2..+2)
 */
export function toHijri(y, m, d, offset = 0) {
  const base = new Date(Date.UTC(y, m - 1, d + offset, 12));
  const f = getFormatter();
  if (f) {
    const parts = f.formatToParts(base);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    const result = { year: get('year'), month: get('month'), day: get('day') };
    if ([result.year, result.month, result.day].every(Number.isFinite)) return result;
  }
  return tabularHijri(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

export function formatHijri(h, { withYear = true } = {}) {
  if (!h) return '';
  const name = HIJRI_MONTHS[h.month - 1] ?? '';
  return withYear ? `${h.day} ${name} ${h.year} H` : `${h.day} ${name}`;
}

/** Hari-hari besar Islam (tanggal Hijriah); tanggal Masehinya selalu berstatus perkiraan. */
export const ISLAMIC_DAYS = [
  { month: 1, day: 1, name: 'Tahun Baru Islam (1 Muharram)' },
  { month: 1, day: 10, name: 'Hari Asyura' },
  { month: 3, day: 12, name: 'Maulid Nabi Muhammad SAW' },
  { month: 7, day: 27, name: "Isra Mi'raj" },
  { month: 8, day: 15, name: "Nisfu Sya'ban" },
  { month: 9, day: 1, name: 'Awal Ramadan' },
  { month: 9, day: 17, name: "Nuzulul Qur'an" },
  { month: 10, day: 1, name: 'Idulfitri (1 Syawal)' },
  { month: 12, day: 9, name: 'Hari Arafah' },
  { month: 12, day: 10, name: 'Iduladha' },
];

export function islamicDayFor(h) {
  return ISLAMIC_DAYS.find((e) => e.month === h.month && e.day === h.day) ?? null;
}

/** Cari perkiraan tanggal Masehi untuk hari besar Islam dalam rentang tahun Masehi tertentu. */
export function upcomingIslamicDays(fromIso, count = 6, offset = 0) {
  const [y, m, d] = fromIso.split('-').map(Number);
  const out = [];
  for (let i = 0; i < 400 && out.length < count; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12));
    const gy = dt.getUTCFullYear();
    const gm = dt.getUTCMonth() + 1;
    const gd = dt.getUTCDate();
    const h = toHijri(gy, gm, gd, offset);
    const ev = islamicDayFor(h);
    if (ev) out.push({ ...ev, hijri: h, date: `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`, daysFromNow: i });
  }
  return out;
}

/** Selisih hari antara dua tanggal Hijriah yang berdekatan (hanya untuk mencocokkan referensi). */
export function offsetToMatch(gy, gm, gd, target, range = 3) {
  for (let off = -range; off <= range; off++) {
    const h = toHijri(gy, gm, gd, off);
    if (h.year === target.year && h.month === target.month && h.day === target.day) return off;
  }
  return null;
}
