// Utilitas teks. Deskripsi surah dari API berisi HTML sederhana (<i>, <br>, dsb.).
// Alih-alih dangerouslySetInnerHTML, teks diurai menjadi token aman: hanya teks,
// baris baru, dan penanda miring/tebal yang dipertahankan.

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

export function decodeEntities(s) {
  return s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

/**
 * @returns {Array<{type:'text', text:string, italic:boolean, bold:boolean} | {type:'br'}>}
 */
export function tokenizeSimpleHtml(html) {
  const tokens = [];
  let italic = 0;
  let bold = 0;
  const re = /<\s*(\/?)\s*([a-z0-9]+)[^>]*>/gi;
  let last = 0;
  let m;
  const pushText = (raw) => {
    if (!raw) return;
    const text = decodeEntities(raw);
    if (text) tokens.push({ type: 'text', text, italic: italic > 0, bold: bold > 0 });
  };
  while ((m = re.exec(html))) {
    pushText(html.slice(last, m.index));
    last = re.lastIndex;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (tag === 'br' || (tag === 'p' && closing)) tokens.push({ type: 'br' });
    else if (tag === 'i' || tag === 'em') italic = Math.max(0, italic + (closing ? -1 : 1));
    else if (tag === 'b' || tag === 'strong') bold = Math.max(0, bold + (closing ? -1 : 1));
    // tag lain diabaikan (isinya tetap tampil sebagai teks biasa)
  }
  pushText(html.slice(last));
  return tokens;
}

export function stripHtml(html) {
  return decodeEntities(String(html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''));
}

/** Normalisasi untuk pencarian: huruf kecil, tanpa diakritik/apostrof/spasi/tanda hubung. */
export function normalizeSearch(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s'’‘`ʼ\-–.]/g, '');
}

/** Hapus harakat Arab untuk pencarian teks Arab tanpa tanda baca. */
export function stripArabicDiacritics(s) {
  return String(s ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '');
}

export function truncate(s, n) {
  const str = String(s ?? '');
  return str.length > n ? `${str.slice(0, n - 1).trimEnd()}…` : str;
}
