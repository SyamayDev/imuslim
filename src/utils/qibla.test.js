import { angleDiff, cardinalName, distanceToKaaba, headingFromEvent, isValidCoordinate, KAABA, qiblaBearing } from './qibla.js';

describe('arah kiblat', () => {
  // Nilai pembanding dari kalkulator kiblat great-circle yang umum dipakai.
  it.each([
    ['Jakarta', -6.2088, 106.8456, 295.15],
    ['London', 51.5074, -0.1278, 118.99],
    ['New York', 40.7128, -74.006, 58.48],
    ['Makassar', -5.1477, 119.4327, 292.5],
  ])('bearing %s mendekati referensi', (_, lat, lon, expected) => {
    expect(qiblaBearing(lat, lon)).toBeCloseTo(expected, 0);
  });

  it('jarak Jakarta–Ka’bah sekitar 7.900 km', () => {
    const km = distanceToKaaba(-6.2088, 106.8456);
    expect(km).toBeGreaterThan(7800);
    expect(km).toBeLessThan(8000);
  });

  it('jarak di Ka’bah = 0', () => {
    expect(distanceToKaaba(KAABA.lat, KAABA.lon)).toBeCloseTo(0, 5);
  });

  it('nama arah mata angin bahasa Indonesia', () => {
    expect(cardinalName(295)).toBe('barat laut');
    expect(cardinalName(0)).toBe('utara');
    expect(cardinalName(359)).toBe('utara');
    expect(cardinalName(135)).toBe('tenggara');
  });

  it('selisih sudut bertanda terkecil', () => {
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(350, 10)).toBe(-20);
    expect(angleDiff(295, 295)).toBe(0);
  });

  it('validasi koordinat', () => {
    expect(isValidCoordinate(-6.2, 106.8)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
  });

  it('heading dari event: iOS, absolut, dan relatif (ditolak)', () => {
    expect(headingFromEvent({ webkitCompassHeading: 90 })).toBe(90);
    expect(headingFromEvent({ absolute: true, alpha: 90 })).toBe(270);
    expect(headingFromEvent({ absolute: false, alpha: 90 })).toBeNull();
    expect(headingFromEvent({})).toBeNull();
  });
});
