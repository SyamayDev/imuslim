import fixture from '../../test/fixtures/myquran-jadwal-0105-2026-10.json' with { type: 'json' };
import { mapSchedule } from '../../services/api/sholat.js';
import { nativeConfig, nativeEvents } from './nativeEvents.js';

const sched = mapSchedule(fixture, '0105', 2026, 10);

describe('jadwal → alarm adzan native', () => {
  it('imsak + 5 waktu wajib per hari, mulai tanggal tertentu, urut waktu', () => {
    const ev = nativeEvents([sched], '2026-10-30');
    expect(ev).toHaveLength(2 * 6); // 30 & 31 Oktober
    expect(ev.slice(0, 6).map((e) => e.key)).toEqual(['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']);
    expect(ev.every((e, i) => i === 0 || e.at > ev[i - 1].at)).toBe(true);
  });
  it('instan = jam dinding kota (WIB) dalam UTC, sama dengan server push', () => {
    const ashar = nativeEvents([sched], '2026-10-24').find((e) => e.date === '2026-10-24' && e.key === 'ashar');
    expect(ashar.time).toBe('15:37');
    expect(new Date(ashar.at).toISOString()).toBe('2026-10-24T08:37:00.000Z');
  });
  it('konfigurasi: zona & offset dari jadwal; dimatikan bila adzan & imsak mati atau tanpa kota', () => {
    const on = nativeConfig({ cityId: '0105', cityName: 'KAB. ACEH SELATAN', adzanEnabled: true, imsakAlert: false }, [sched], '2026-10-31');
    expect(on).toMatchObject({ enabled: true, adzan: true, imsak: false, cityId: '0105', tz: 'WIB', offsetHours: 7 });
    expect(on.events).toHaveLength(6);
    expect(nativeConfig({ cityId: '0105', adzanEnabled: false, imsakAlert: false }, [sched], '2026-10-31')).toMatchObject({ enabled: false, events: [] });
    expect(nativeConfig({ cityId: '', adzanEnabled: true }, [], '')).toMatchObject({ enabled: false, events: [] });
  });
});
