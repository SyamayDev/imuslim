// Memastikan pasangan warna teks/latar di design tokens memenuhi WCAG 2.2 AA (≥ 4,5:1 teks normal,
// ≥ 3:1 untuk komponen UI/garis fokus) pada tema terang dan gelap.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

function tokens(selector) {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const light = tokens(':root {');
const dark = { ...light, ...tokens(":root[data-theme='dark'] {") };

const TEXT_PAIRS = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink-2', 'bg'],
  ['ink-2', 'surface'],
  ['ink-2', 'surface-2'],
  ['ink-3', 'bg'],
  ['ink-3', 'surface'],
  ['ink-3', 'surface-2'],
  ['brand-ink', 'bg'],
  ['brand-ink', 'surface'],
  ['brand-ink', 'brand-soft'],
  ['on-brand', 'brand'],
  ['gold', 'bg'],
  ['gold', 'surface'],
  ['gold', 'gold-soft'],
  ['danger', 'danger-soft'],
  ['danger', 'surface'],
  ['success', 'success-soft'],
  ['ink', 'warn-soft'],
  ['ink', 'info-soft'],
  ['hero-ink', 'hero-bg'],
  ['hero-ink-2', 'hero-bg'],
  ['hero-ink-2', 'hero-bg-2'],
];

describe.each([
  ['terang', light],
  ['gelap', dark],
])('kontras tema %s', (_, t) => {
  it.each(TEXT_PAIRS)('%s di atas %s ≥ 4,5:1', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it('garis fokus ≥ 3:1 terhadap latar', () => {
    expect(ratio(t.focus, t.bg)).toBeGreaterThanOrEqual(3);
    expect(ratio(t.focus, t.surface)).toBeGreaterThanOrEqual(3);
  });
});
