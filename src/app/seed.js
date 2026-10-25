// Data prerender ("seed"): teks yang diambil dari API saat build (mis. satu doa atau satu hadits
// Arbain) dan ditanam di HTML halaman. Server memakainya saat merender; browser membacanya
// kembali dari <script type="application/json" id="imuslim-seed"> sebelum hydration, sehingga
// HTML statis dan render pertama identik dan teks langsung tampil tanpa menunggu API.
// Nilai: { data, fetchedAt } — fetchedAt = waktu pengambilan saat build.
const store = new Map();

export function setSeed(entries = {}) {
  store.clear();
  for (const [key, value] of Object.entries(entries)) store.set(key, value);
}

export function readSeed(key) {
  return key == null ? undefined : store.get(key);
}

export function loadSeedFromDocument() {
  const el = typeof document !== 'undefined' ? document.getElementById('imuslim-seed') : null;
  if (!el) return;
  try {
    setSeed(JSON.parse(el.textContent));
  } catch {
    /* seed rusak → abaikan; halaman tetap memuat data dari API */
  }
}

// Karakter yang tidak boleh muncul mentah di dalam <script>: "<" (bisa menutup tag) serta
// pemisah baris/paragraf Unicode. Ditulis lewat kode karakter agar sumber tetap ASCII.
const UNSAFE = ['<', String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
const escapeChar = (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;

/** JSON aman untuk disisipkan di dalam <script> (tidak bisa menutup tag lebih awal). */
export function serializeSeed(entries) {
  let json = JSON.stringify(entries);
  for (const ch of UNSAFE) json = json.split(ch).join(escapeChar(ch));
  return json;
}
