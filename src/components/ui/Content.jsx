import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export function PageHeader({ eyebrow, title, description, actions, back, children }) {
  return (
    <header className="page-head">
      {back && (
        <Link to={back.to} className="back-link">
          <ArrowLeft aria-hidden="true" /> {back.label}
        </Link>
      )}
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div className="page-head__row">
        <h1 className="page-head__title">{title}</h1>
        {actions && <div className="page-head__actions">{actions}</div>}
      </div>
      {description && <p className="page-head__desc">{description}</p>}
      {children}
    </header>
  );
}

export function SourceNote({ children }) {
  return <p className="source-note">{children}</p>;
}
