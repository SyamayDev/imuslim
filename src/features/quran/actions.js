import { quranStore } from '../../app/stores.js';

export function toggleFavorite(number) {
  quranStore.set((q) => ({
    ...q,
    favorites: q.favorites.includes(number) ? q.favorites.filter((n) => n !== number) : [...q.favorites, number].sort((a, b) => a - b),
  }));
}
