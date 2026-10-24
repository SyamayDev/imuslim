import { prefsStore } from '../../app/stores.js';
import { useResource } from '../../hooks/useResource.js';
import { getCities } from '../../services/api/sholat.js';
import { prettyCity } from '../../utils/cityMatch.js';

export function useCities() {
  return useResource('cities', ({ signal, force }) => getCities({ signal, force }), { isEmpty: (d) => !d?.length });
}

export function selectCity(city) {
  prefsStore.set((p) => ({ ...p, cityId: city.id, cityName: prettyCity(city.name) }));
}
