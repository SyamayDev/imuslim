// Prerender & hydration: render server harus memakai nilai bawaan (bukan localStorage / jam
// perangkat) agar HTML statis identik dengan render pertama di browser.
import { renderToString } from 'react-dom/server';
import { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/layout/ErrorBoundary.jsx';
import { resolveSite } from '../../scripts/site-config.mjs';
import { useNow } from '../hooks/useNow.js';
import { useClientValue } from '../hooks/useHydrated.js';
import { createStore, useStore } from '../utils/storage.js';
import { lazyPage } from './lazyPage.jsx';

const store = createStore('test:ssr', { defaultValue: { name: 'bawaan' }, validate: (v) => v });

function Probe() {
  const value = useStore(store);
  const now = useNow(60000);
  const client = useClientValue(() => 'browser', 'server');
  return <p>{`${value.name}|${now == null ? 'tanpa-jam' : 'ada-jam'}|${client}`}</p>;
}

describe('render server (prerender)', () => {
  beforeEach(() => localStorage.setItem('test:ssr', JSON.stringify({ name: 'pengguna' })));
  afterEach(() => localStorage.removeItem('test:ssr'));

  it('memakai nilai bawaan: store default, jam null, nilai klien = nilai server', () => {
    expect(renderToString(<Probe />)).toContain('bawaan|tanpa-jam|server');
  });

  it('render klien biasa memakai nilai sebenarnya', () => {
    store.reload();
    render(<Probe />);
    expect(screen.getByText('pengguna|ada-jam|browser')).toBeInTheDocument();
  });
});

describe('lazyPage', () => {
  it('setelah preload, halaman dirender sinkron tanpa fallback', async () => {
    const Page = lazyPage(() => Promise.resolve({ default: () => <h1>Halaman siap</h1> }));
    await act(() => Page.preload());
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Halaman siap' })).toBeInTheDocument();
  });

  it('modul gagal dimuat saat render → ErrorBoundary tampil, tanpa percobaan ulang tanpa henti', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const loader = vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
    const Page = lazyPage(loader);
    render(
      <ErrorBoundary resetKey="/x">
        <Suspense fallback={<p>memuat</p>}>
          <Page />
        </Suspense>
      </ErrorBoundary>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/gagal dimuat|offline/);
    await new Promise((r) => setTimeout(r, 50));
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('dirender saat modul masih dimuat (navigasi tanpa prefetch) → fallback lalu halaman', async () => {
    let resolve;
    const Page = lazyPage(() => new Promise((r) => (resolve = r)));
    render(
      <Suspense fallback={<p>memuat</p>}>
        <Page />
      </Suspense>,
    );
    expect(screen.getByText('memuat')).toBeInTheDocument();
    await act(async () => resolve({ default: () => <h2>Kalender</h2> }));
    expect(await screen.findByRole('heading', { name: 'Kalender' })).toBeInTheDocument();
  });

  it('gagal memuat modul → preload tidak melempar & bisa dicoba lagi', async () => {
    let calls = 0;
    const Page = lazyPage(() => (++calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ default: () => <p>ok</p> })));
    await expect(Page.preload()).resolves.toBeUndefined();
    await Page.preload();
    expect(calls).toBe(2);
  });
});

describe('konfigurasi situs (GitHub Pages / Vercel)', () => {
  it('bawaan: GitHub Pages di /imuslim/', () => {
    expect(resolveSite({})).toEqual({ base: '/imuslim/', url: 'https://syamaydev.github.io/imuslim', onVercel: false });
  });
  it('Vercel: base "/" dan URL domain produksi', () => {
    expect(resolveSite({ VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'imuslim.vercel.app' })).toEqual({ base: '/', url: 'https://imuslim.vercel.app', onVercel: true });
  });
  it('BASE_PATH & SITE_URL menimpa keduanya', () => {
    expect(resolveSite({ VERCEL: '1', BASE_PATH: 'app', SITE_URL: 'https://contoh.id/app/' })).toEqual({ base: '/app/', url: 'https://contoh.id/app', onVercel: true });
  });
});
