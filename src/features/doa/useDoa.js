import { useResource } from '../../hooks/useResource.js';
import { getDoaList, MYQURAN_CATEGORY_LABEL } from '../../services/api/doa.js';

export function useDoaList(collection) {
  return useResource(collection ? `doa:${collection}` : null, ({ signal, force }) => getDoaList(collection, { signal, force }), {
    isEmpty: (d) => !d?.length,
  });
}

export const categoryLabel = (doa) => (doa.collection === 'myquran' ? (MYQURAN_CATEGORY_LABEL[doa.category] ?? doa.category) : doa.category);
