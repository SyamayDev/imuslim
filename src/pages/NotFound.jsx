import { Compass, House } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { NAV } from '../app/nav.js';

export default function NotFound() {
  const { pathname, search, hash } = useLocation();
  useDocumentMeta({ title: 'Halaman tidak ditemukan', description: 'Halaman yang Anda cari tidak ada di iMuslim.', path: null });

  // Alamat lama berakhiran /index.html (situs statis sebelumnya) → route bersih.
  if (/\/index\.html$/.test(pathname)) {
    const clean = pathname.replace(/\/index\.html$/, '') || '/';
    return <Navigate to={`${clean}${search}${hash}`} replace />;
  }

  return (
    <div className="page">
      <div className="state" style={{ marginTop: 24 }}>
        <span className="state__icon">
          <Compass />
        </span>
        <h1 className="state__title" style={{ fontSize: 'var(--fs-2xl)' }}>
          Halaman tidak ditemukan
        </h1>
        <p className="state__text">
          Alamat <code className="kbd">{pathname}</code> tidak tersedia. Mungkin tautannya keliru atau halaman sudah dipindahkan.
        </p>
        <Link to="/" className="btn btn--primary">
          <House aria-hidden="true" /> Kembali ke beranda
        </Link>
      </div>
      <nav aria-label="Fitur iMuslim" style={{ marginTop: 32 }}>
        <ul className="cluster" style={{ listStyle: 'none', justifyContent: 'center' }}>
          {NAV.filter((n) => n.to !== '/').map((n) => (
            <li key={n.to}>
              <Link to={n.to} className="chip">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
