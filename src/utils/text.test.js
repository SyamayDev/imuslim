import { matchCity, normalizeCity, prettyCity } from './cityMatch.js';
import { decodeEntities, normalizeSearch, stripArabicDiacritics, stripHtml, tokenizeSimpleHtml, truncate } from './text.js';
import kota from '../test/fixtures/myquran-kota.json';

describe('teks aman dari API', () => {
  it('mengurai <i>, <br>, dan entitas tanpa HTML mentah', () => {
    const tokens = tokenizeSimpleHtml('Surat <i>Al Faatihah</i> (Pembukaan)<br> &amp; lainnya');
    expect(tokens).toEqual([
      { type: 'text', text: 'Surat ', italic: false, bold: false },
      { type: 'text', text: 'Al Faatihah', italic: true, bold: false },
      { type: 'text', text: ' (Pembukaan)', italic: false, bold: false },
      { type: 'br' },
      { type: 'text', text: ' & lainnya', italic: false, bold: false },
    ]);
  });
  it('tag berbahaya tidak menjadi elemen (hanya teks)', () => {
    const tokens = tokenizeSimpleHtml('<script>alert(1)</script><img src=x onerror=alert(2)>ok');
    expect(tokens.every((t) => t.type === 'text' || t.type === 'br')).toBe(true);
    expect(tokens.map((t) => t.text).join('')).toBe('alert(1)ok');
  });
  it('utilitas lain', () => {
    expect(stripHtml('a<br>b<i>c</i>')).toBe('a\nbc');
    expect(decodeEntities('&lt;b&gt;')).toBe('<b>');
    expect(normalizeSearch("Al-Fātiḥah 'Ali")).toBe('alfatihahali');
    expect(stripArabicDiacritics('بِسْمِ')).toBe('بسم');
    expect(truncate('abcdef', 4)).toBe('abc…');
  });
});

describe('pencocokan kota hasil geolokasi', () => {
  const cities = kota.data.map((c) => ({ id: c.id, name: c.lokasi }));
  it('normalisasi nama', () => {
    expect(normalizeCity('Kabupaten Bandung Barat')).toBe('BANDUNG BARAT');
    expect(normalizeCity('KAB. BANDUNG BARAT')).toBe('BANDUNG BARAT');
    expect(normalizeCity('Kota Bekasi')).toBe('BEKASI');
    expect(prettyCity('KAB. LAMPUNG TENGAH')).toBe('Kab. Lampung Tengah');
  });
  it('kota Bekasi (city) → KOTA BEKASI, bukan kabupaten', () => {
    expect(matchCity(cities, { city: 'Bekasi', state: 'Jawa Barat' })?.city.name).toBe('KOTA BEKASI');
  });
  it('kabupaten → KAB.', () => {
    expect(matchCity(cities, { county: 'Kabupaten Bekasi' })?.city.name).toBe('KAB. BEKASI');
  });
  it('Jakarta Selatan dicocokkan ke KOTA JAKARTA (myQuran memakai satu entri)', () => {
    expect(matchCity(cities, { city: 'Jakarta Selatan' })?.city.name).toBe('KOTA JAKARTA');
  });
  it('tidak ada kecocokan → null (tanpa kota bawaan)', () => {
    expect(matchCity(cities, { city: 'Kuala Lumpur' })).toBeNull();
    expect(matchCity(cities, null)).toBeNull();
  });
});
