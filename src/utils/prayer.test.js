import { addDaysIso, describeCountdown, formatCountdown, getPrayerStatus, instantOf, timezoneForCity, timezoneForRegion, wallClock } from './prayer.js';

const day = (date, overrides = {}) => ({
  date,
  times: { imsak: '04:02', subuh: '04:12', terbit: '05:25', dhuha: '05:53', dzuhur: '11:40', ashar: '14:51', maghrib: '17:49', isya: '18:59', ...overrides },
});

describe('zona waktu kota', () => {
  it('provinsi → WIB/WITA/WIT', () => {
    expect(timezoneForRegion('DKI JAKARTA')).toBe('WIB');
    expect(timezoneForRegion('KALIMANTAN BARAT')).toBe('WIB');
    expect(timezoneForRegion('KALIMANTAN TIMUR')).toBe('WITA');
    expect(timezoneForRegion('BALI')).toBe('WITA');
    expect(timezoneForRegion('NUSA TENGGARA TIMUR')).toBe('WITA');
    expect(timezoneForRegion('SULAWESI UTARA')).toBe('WITA');
    expect(timezoneForRegion('MALUKU UTARA')).toBe('WIT');
    expect(timezoneForRegion('PAPUA BARAT')).toBe('WIT');
    expect(timezoneForRegion('')).toBeNull();
  });
  it('fallback prefiks ID kota bila nama provinsi tidak ada', () => {
    expect(timezoneForCity('1301')).toBe('WIB');
    expect(timezoneForCity('1701')).toBe('WITA');
    expect(timezoneForCity('3301')).toBe('WIT');
    expect(timezoneForCity('2001')).toBe('WIB'); // Kalimantan Barat
  });
});

describe('perhitungan waktu', () => {
  it('instan & jam dinding konsisten di WITA', () => {
    const at = instantOf('2026-10-24', '04:36', 'WITA');
    expect(new Date(at).toISOString()).toBe('2026-10-23T20:36:00.000Z');
    expect(wallClock(at, 'WITA')).toMatchObject({ iso: '2026-10-24', hours: 4, minutes: 36 });
  });

  it('menambah hari melewati akhir bulan/tahun', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('menentukan waktu berikutnya & yang sedang berjalan', () => {
    const now = instantOf('2026-10-24', '12:00', 'WIB');
    const s = getPrayerStatus([day('2026-10-24')], now, 'WIB');
    expect(s.next.key).toBe('ashar');
    expect(s.current.key).toBe('dzuhur');
    expect(s.passedKeys.has('subuh')).toBe(true);
    expect(s.passedKeys.has('ashar')).toBe(false);
  });

  it('setelah Isya, berikutnya Imsak besok bila data besok tersedia', () => {
    const now = instantOf('2026-10-24', '21:00', 'WIB');
    const s = getPrayerStatus([day('2026-10-24'), day('2026-10-25', { imsak: '04:01' })], now, 'WIB');
    expect(s.nextIsTomorrow).toBe(true);
    expect(s.next).toMatchObject({ key: 'imsak', time: '04:01' });
  });

  it('mengembalikan null bila jadwal hari ini tidak ada (tanpa mengarang)', () => {
    expect(getPrayerStatus([day('2026-10-20')], instantOf('2026-10-24', '12:00', 'WIB'), 'WIB')).toBeNull();
  });

  it('format hitung mundur', () => {
    expect(formatCountdown(3723000)).toBe('01:02:03');
    expect(formatCountdown(-5)).toBe('00:00:00');
    expect(describeCountdown(65 * 60000)).toBe('1 jam 5 menit lagi');
    expect(describeCountdown(5 * 60000)).toBe('5 menit lagi');
  });
});
