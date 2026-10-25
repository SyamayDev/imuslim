import { useVideoConfig } from 'remotion';

/** Ukuran relatif terhadap sisi terpendek (1080 = 1 unit) + orientasi komposisi. */
export function useLayout() {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const landscape = width > height * 1.2;
  // Safe area media sosial (reel & teaser): 14% atas dan 20% bawah bebas teks penting.
  const safeTop = landscape ? height * 0.06 : height * 0.14;
  const safeBottom = landscape ? height * 0.05 : height * 0.2;
  return { width, height, fps, durationInFrames, u, portrait: height > width * 1.2, square: Math.abs(width - height) < 2, landscape, safeTop, safeBottom };
}
