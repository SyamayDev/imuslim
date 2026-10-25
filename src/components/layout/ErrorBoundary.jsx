import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component } from 'react';

/**
 * Menangkap error render halaman agar aplikasi tidak menjadi layar kosong.
 * Navigasi tetap tersedia; berpindah halaman (resetKey berubah) memulihkan tampilan.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, key: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    console.error('Kesalahan tampilan:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunkFailed = /dynamically imported module|Importing a module script failed|Failed to fetch|Loading chunk|Unable to preload/i.test(String(error?.message ?? ''));
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return (
      <div className="page" style={{ maxWidth: 640 }}>
        <div className="state state--error" role="alert" style={{ marginTop: 32 }}>
          <span className="state__icon">
            <AlertTriangle />
          </span>
          <h1 className="state__title">Maaf, halaman ini bermasalah</h1>
          <p className="state__text">
            {chunkFailed && offline
              ? 'Anda sedang offline dan halaman ini belum pernah dibuka sebelumnya, jadi belum tersimpan di perangkat. Sambungkan internet lalu muat ulang.'
              : chunkFailed
                ? 'Bagian aplikasi gagal dimuat — kemungkinan ada versi baru atau koneksi terputus.'
                : 'Terjadi kesalahan tak terduga saat menampilkan halaman. Data Anda tetap aman di perangkat.'}
          </p>
          <div className="cluster" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              <RefreshCw aria-hidden="true" /> Muat ulang
            </button>
            <a className="btn" href={import.meta.env.BASE_URL}>
              Ke beranda
            </a>
          </div>
        </div>
      </div>
    );
  }
}
