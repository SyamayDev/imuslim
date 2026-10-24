import { formatHijri, hijriMethod, islamicDayFor, offsetToMatch, tabularHijri, toHijri, upcomingIslamicDays } from './hijri.js';

describe('kalender Hijriah', () => {
  it('memakai Umm al-Qura di lingkungan dengan ICU lengkap', () => {
    expect(hijriMethod()).toBe('umalqura');
  });

  it('tanggal acuan Umm al-Qura', () => {
    // 1 Syawal 1446 (Umm al-Qura) = 30 Maret 2025; 1 Ramadan 1447 = 18 Februari 2026
    expect(toHijri(2025, 3, 30)).toEqual({ year: 1446, month: 10, day: 1 });
    expect(toHijri(2026, 2, 18)).toEqual({ year: 1447, month: 9, day: 1 });
  });

  it('penyesuaian −1 hari menggeser tanggal (contoh: Idulfitri 1446 di Indonesia 31 Maret 2025)', () => {
    expect(toHijri(2025, 3, 31, -1)).toEqual({ year: 1446, month: 10, day: 1 });
  });

  it('aritmetika tabular sama dengan kalender islamic-civil ICU', () => {
    const civil = new Intl.DateTimeFormat('en-u-ca-islamic-civil-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
    for (let i = 0; i < 800; i += 7) {
      const dt = new Date(Date.UTC(2020, 0, 1 + i * 3, 12));
      const parts = Object.fromEntries(civil.formatToParts(dt).map((p) => [p.type, p.value]));
      expect(tabularHijri(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())).toEqual({
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
      });
    }
  });

  it('format nama bulan Indonesia', () => {
    expect(formatHijri({ year: 1448, month: 5, day: 13 })).toBe('13 Jumadilawal 1448 H');
    expect(formatHijri({ year: 1447, month: 9, day: 1 }, { withYear: false })).toBe('1 Ramadan');
  });

  it('hari besar Islam terdeteksi & daftar mendatang berurutan', () => {
    expect(islamicDayFor({ month: 10, day: 1 })?.name).toMatch(/Idulfitri/);
    const list = upcomingIslamicDays('2026-10-24', 5);
    expect(list).toHaveLength(5);
    for (let i = 1; i < list.length; i++) expect(list[i].daysFromNow).toBeGreaterThan(list[i - 1].daysFromNow);
  });

  it('mencari offset yang cocok dengan referensi', () => {
    const ref = toHijri(2026, 10, 24, -1);
    expect(offsetToMatch(2026, 10, 24, ref)).toBe(-1);
    expect(offsetToMatch(2026, 10, 24, { year: 1, month: 1, day: 1 })).toBeNull();
  });
});
