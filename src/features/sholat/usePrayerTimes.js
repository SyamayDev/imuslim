import { useResource } from '../../hooks/useResource.js';
import { useNow } from '../../hooks/useNow.js';
import { getMonthlySchedule } from '../../services/api/sholat.js';
import { timezoneForCity, wallClock } from '../../utils/prayer.js';

export function useMonthSchedule(cityId, year, month) {
  return useResource(
    cityId ? `jadwal:${cityId}:${year}-${month}` : null,
    ({ signal, force }) => getMonthlySchedule(cityId, year, month, { signal, force }),
    { isEmpty: (d) => !d?.days?.length },
  );
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Jadwal hari ini (+ besok bila hari ini akhir bulan) untuk kota tertentu, sadar zona waktu kota. */
export function useTodayPrayer(cityId) {
  const now = useNow(30000);
  const tz = cityId ? timezoneForCity(cityId) : 'WIB';
  const wc = wallClock(now, tz);
  const current = useMonthSchedule(cityId, wc.year, wc.month);
  const isLastDay = wc.day === daysInMonth(wc.year, wc.month);
  const ny = wc.month === 12 ? wc.year + 1 : wc.year;
  const nm = wc.month === 12 ? 1 : wc.month + 1;
  const next = useMonthSchedule(isLastDay ? cityId : null, ny, nm);
  const days = [...(current.data?.days ?? []), ...(next.data?.days ?? [])];
  return {
    ...current,
    days,
    tz: current.data?.timezone ?? tz,
    today: wc.iso,
  };
}
