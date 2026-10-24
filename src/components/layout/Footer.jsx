import { Link } from 'react-router-dom';
import { REPO_URL } from '../../app/site.js';
import { Mark, Wordmark } from '../brand/Logo.jsx';



export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <Link to="/" aria-label="iMuslim — beranda" className="footer__logo">
            <Mark />
            <Wordmark />
          </Link>
          <p>Teman ibadah harian: Al-Qur'an, jadwal sholat, doa, hadits, kalender Hijriah, kiblat, dan zakat — ringan, tanpa iklan, tanpa pelacakan.</p>
        </div>
        <ul className="footer__links">
          <li>
            <Link to="/tentang">Tentang & sumber data</Link>
          </li>
          <li>
            <Link to="/pengaturan">Pengaturan</Link>
          </li>
          <li>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Kode sumber
            </a>
          </li>
          <li>
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
              Laporkan masalah
            </a>
          </li>
        </ul>
      </div>
      <div className="footer__bottom">
        <span>© 2025–2026 iMuslim · dikembangkan oleh SyamayDev</span>
        <span>Versi {__APP_VERSION__}</span>
      </div>
    </footer>
  );
}
