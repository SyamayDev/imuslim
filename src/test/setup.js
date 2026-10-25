import '@testing-library/jest-dom/vitest';

// jsdom belum menyediakan matchMedia; nilai bawaan: perangkat bertema terang.
// (Tes API server berjalan di lingkungan node tanpa window.)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
