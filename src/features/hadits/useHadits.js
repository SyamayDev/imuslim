import { useResource } from '../../hooks/useResource.js';
import { ARBAIN_BOOK, ARBAIN_SLUG, getArbain, getBooks, LEGACY_BOOK_SLUG } from '../../services/api/hadits.js';

export function useBooks(enabled = true) {
  return useResource(enabled ? 'hadits:books' : null, ({ signal, force }) => getBooks({ signal, force }), { isEmpty: (d) => !d?.length });
}

export function useArbain(enabled = true) {
  return useResource(enabled ? 'hadits:arbain' : null, ({ signal, force }) => getArbain({ signal, force }), { isEmpty: (d) => !d?.length });
}

/** Info kitab untuk slug (termasuk Arbain dan slug lama). */
export function useBook(slug) {
  const clean = LEGACY_BOOK_SLUG[slug] ?? slug;
  const isArbain = clean === ARBAIN_SLUG;
  const books = useBooks(!isArbain);
  if (isArbain) return { status: 'success', book: ARBAIN_BOOK, isArbain, slug: clean, reload: () => {} };
  const book = books.data?.find((b) => b.slug === clean) ?? null;
  return { status: books.status, error: books.error, book, isArbain, slug: clean, reload: books.reload, meta: books.meta };
}
