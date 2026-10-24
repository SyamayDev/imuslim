import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { prefsStore } from '../app/stores.js';
import { useResource } from '../hooks/useResource.js';
import { ApiError, ERROR_KIND } from '../services/api/errors.js';
import { FullscreenButton, ThemeToggle } from './layout/AppTools.jsx';
import { Pagination } from './ui/Pagination.jsx';
import { SearchField } from './ui/SearchField.jsx';
import { DataNotice, ErrorState } from './ui/Status.jsx';
import { ToastProvider } from './ui/Toast.jsx';

const wrap = (ui) => render(<ToastProvider>{ui}</ToastProvider>);

describe('tombol layar penuh', () => {
  let fullscreenElement = null;
  beforeEach(() => {
    fullscreenElement = null;
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
    document.documentElement.requestFullscreen = vi.fn(() => {
      fullscreenElement = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    document.exitFullscreen = vi.fn(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
  });

  it('masuk & keluar, label aria ikut berubah', async () => {
    const user = userEvent.setup();
    wrap(<FullscreenButton />);
    const btn = screen.getByRole('button', { name: 'Masuk layar penuh' });
    await user.click(btn);
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Keluar dari layar penuh' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keluar dari layar penuh' }));
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Masuk layar penuh' })).toBeInTheDocument();
  });

  it('penolakan browser ditangani dengan pesan', async () => {
    document.documentElement.requestFullscreen = vi.fn(() => Promise.reject(new Error('denied')));
    const user = userEvent.setup();
    wrap(<FullscreenButton />);
    await user.click(screen.getByRole('button', { name: 'Masuk layar penuh' }));
    expect(await screen.findByText('Browser menolak mode layar penuh.')).toBeInTheDocument();
  });

  it('tidak ditampilkan bila tidak didukung', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    wrap(<FullscreenButton />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('tema', () => {
  it('awalnya mengikuti perangkat, lalu hanya terang ↔ gelap dan tersimpan', async () => {
    prefsStore.set((p) => ({ ...p, theme: 'system' }));
    const user = userEvent.setup();
    wrap(<ThemeToggle />);
    // perangkat (mock) bertema terang → tombol menawarkan mode gelap
    await user.click(screen.getByRole('button', { name: 'Aktifkan mode gelap' }));
    expect(prefsStore.get().theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Aktifkan mode terang' }));
    expect(prefsStore.get().theme).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Aktifkan mode gelap' }));
    expect(JSON.parse(localStorage.getItem('imuslim:prefs')).theme).toBe('dark');
  });

  it('mengikuti perangkat yang bertema gelap sebelum pengguna memilih', async () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ ...original(q), matches: q.includes('dark') });
    prefsStore.set((p) => ({ ...p, theme: 'system' }));
    const user = userEvent.setup();
    wrap(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Aktifkan mode terang' }));
    expect(prefsStore.get().theme).toBe('light');
    window.matchMedia = original;
  });
});

describe('paginasi', () => {
  it('tombol nonaktif di tepi & memanggil onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} totalPages={4} totalItems={114} pageSize={30} label="surah" onChange={onChange} />);
    expect(screen.getByText(/1–30 dari 114 surah/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Halaman sebelumnya' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Halaman berikutnya' }));
    expect(onChange).toHaveBeenCalledWith(2);
    await user.selectOptions(screen.getByRole('combobox'), '4');
    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe('pencarian', () => {
  it('tombol mikrofon disembunyikan bila Web Speech tidak didukung', () => {
    render(<SearchField id="s" label="Cari" value="" onChange={() => {}} />);
    expect(screen.getByRole('searchbox', { name: 'Cari' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suara/ })).toBeNull();
  });
});

describe('status data', () => {
  it('error menampilkan pesan spesifik & tombol coba lagi', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState error={new ApiError(ERROR_KIND.TIMEOUT, 't', { url: 'https://equran.id/api' })} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/terlalu lama/);
    expect(screen.getByText(/equran\.id/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(retry).toHaveBeenCalled();
  });
  it('data usang selalu diberi penanda', () => {
    render(<DataNotice meta={{ stale: true, fetchedAt: Date.UTC(2026, 9, 20) }} error={new ApiError(ERROR_KIND.OFFLINE, 'o')} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Menampilkan data tersimpan/);
    expect(screen.getByRole('status')).toHaveTextContent(/mungkin sudah tidak terbaru/);
  });
});

function ResourceProbe({ loader }) {
  const r = useResource('probe', loader);
  return (
    <div>
      <p data-testid="status">{r.status}</p>
      <p data-testid="data">{r.data ?? ''}</p>
      <button type="button" onClick={r.reload}>
        ulang
      </button>
    </div>
  );
}

describe('useResource', () => {
  it('loading → error → retry → success', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(ERROR_KIND.NETWORK, 'n'))
      .mockResolvedValueOnce({ data: 'ok', stale: false, fetchedAt: 1 });
    const user = userEvent.setup();
    render(<ResourceProbe loader={loader} />);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    await user.click(screen.getByRole('button', { name: 'ulang' }));
    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('ok'));
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ force: true }));
  });
});

describe('halaman daftar surah', () => {
  it('mencari & menampilkan pintasan ayat', async () => {
    const { default: QuranIndex } = await import('../pages/quran/QuranIndex.jsx');
    const user = userEvent.setup();
    wrap(
      <MemoryRouter initialEntries={['/quran']}>
        <QuranIndex />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(30);
    await act(async () => {
      await user.type(screen.getByRole('searchbox', { name: 'Cari surah' }), 'yasin');
    });
    expect(screen.getByRole('link', { name: /Yasin/ })).toHaveAttribute('href', '/quran/36');
    await user.clear(screen.getByRole('searchbox', { name: 'Cari surah' }));
    await user.type(screen.getByRole('searchbox', { name: 'Cari surah' }), '2:255');
    expect(screen.getByRole('link', { name: /Al-Baqarah.*ayat 255/ })).toHaveAttribute('href', '/quran/2?ayat=255');
  });
});
