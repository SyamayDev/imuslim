import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { iconForPath } from '../../app/nav.js';
import { Medallion } from './Ornament.jsx';
import { tokenizeSimpleHtml } from '../../utils/text.js';

/** Teks Arab: selalu lang="ar" & dir="rtl". */
export function ArabicText({ children, size = 'md', as: Tag = 'p', className = '', ...rest }) {
  const sizeClass = size === 'lg' ? 'arabic--lg' : size === 'sm' ? 'arabic--sm' : '';
  return (
    <Tag lang="ar" dir="rtl" className={`arabic ${sizeClass} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

/** Render HTML sederhana dari API (miring/tebal/baris baru) tanpa dangerouslySetInnerHTML. */
export function RichText({ html, className = '' }) {
  const tokens = tokenizeSimpleHtml(String(html ?? ''));
  return (
    <p className={className}>
      {tokens.map((t, i) => {
        if (t.type === 'br') return <br key={i} />;
        let node = t.text;
        if (t.bold) node = <strong>{node}</strong>;
        if (t.italic) node = <em>{node}</em>;
        return <span key={i}>{node}</span>;
      })}
    </p>
  );
}

/** Teks multi-baris biasa (\n → paragraf). */
export function Paragraphs({ text, className = '' }) {
  const parts = String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {parts.map((p, i) => (
        <p key={i} style={{ whiteSpace: 'pre-line' }}>
          {p}
        </p>
      ))}
    </div>
  );
}

/**
 * Kepala halaman: medali ikon fitur (bintang delapan), eyebrow, judul, deskripsi.
 * Ikon diambil otomatis dari navigasi sesuai path; `icon={false}` untuk menyembunyikan.
 */
export function PageHeader({ eyebrow, title, description, actions, back, icon, children }) {
  const { pathname } = useLocation();
  const Icon = icon === false ? null : (icon ?? iconForPath(pathname));
  return (
    <header className="page-head">
      <span className="page-head__art" aria-hidden="true" />
      {back && (
        <Link to={back.to} className="back-link">
          <ArrowLeft aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className="page-head__main">
        {Icon && <Medallion icon={Icon} className="page-head__medallion" />}
        <div className="page-head__text">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <div className="page-head__row">
            <h1 className="page-head__title">{title}</h1>
            {actions && <div className="page-head__actions">{actions}</div>}
          </div>
        </div>
      </div>
      {description && <p className="page-head__desc">{description}</p>}
      {children}
    </header>
  );
}

export function SourceNote({ children }) {
  return <p className="source-note">{children}</p>;
}
