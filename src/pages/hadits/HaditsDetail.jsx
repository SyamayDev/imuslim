import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { DataNotice, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Status.jsx';
import { HadithCard } from '../../features/hadits/HadithCard.jsx';
import { useBook } from '../../features/hadits/useHadits.js';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { useResource } from '../../hooks/useResource.js';
import { ERROR_KIND } from '../../services/api/errors.js';
import { getArbainItem, getHadith, HADITH_PAGE_SIZE } from '../../services/api/hadits.js';
import './hadits.css';

export default function HaditsDetail() {
  const { kitab, nomor } = useParams();
  const info = useBook(kitab);
  const n = Number(nomor);
  const validNumber = Number.isInteger(n) && n >= 1;
  const name = info.book?.name ?? kitab;
  useDocumentMeta({
    title: `Hadits ${name} No. ${nomor}`,
    description: `Hadits riwayat ${name} nomor ${nomor} dengan teks Arab dan terjemahan Indonesia.`,
    path: `/hadits/${info.slug}/${nomor}`,
  });

  const backTo = info.book && validNumber && !info.isArbain ? `/hadits/${info.slug}${n > HADITH_PAGE_SIZE ? `?hal=${Math.ceil(n / HADITH_PAGE_SIZE)}` : ''}` : `/hadits/${info.slug}`;
  const back = (
    <Link to={backTo} className="back-link">
      <ArrowLeft aria-hidden="true" /> {info.book ? (info.isArbain ? 'Arbain An-Nawawi' : `HR. ${info.book.name}`) : 'Kitab'}
    </Link>
  );

  let body;
  if (info.status === 'loading') body = <LoadingBlock label="Memuat…" rows={2} />;
  else if (info.status === 'error') body = <ErrorState error={info.error} onRetry={info.reload} />;
  else if (!info.book) body = <EmptyState title="Kitab tidak ditemukan" />;
  else if (!validNumber || n > info.book.total) body = <EmptyState title="Nomor hadits tidak valid" text={`Kitab ini memiliki nomor 1–${info.book.total.toLocaleString('id-ID')}.`} />;
  else body = info.isArbain ? <ArbainItem n={n} /> : <BookItem book={info.book} n={n} />;

  const canNav = info.book && validNumber && n <= info.book.total;
  return (
    <div className="page page--reading hadits">
      {back}
      <div className="hadith-detail">{body}</div>
      {canNav && (
        <nav className="prevnext" aria-label="Hadits sebelum & sesudah">
          {n > 1 ? (
            <Link to={`/hadits/${info.slug}/${n - 1}`} className="prevnext__link">
              <ArrowLeft aria-hidden="true" />
              <span>
                <small>Sebelumnya</small>No. {n - 1}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {n < info.book.total && (
            <Link to={`/hadits/${info.slug}/${n + 1}`} className="prevnext__link prevnext__link--next">
              <span>
                <small>Berikutnya</small>No. {n + 1}
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function BookItem({ book, n }) {
  const res = useResource(`hadits:${book.slug}:item:${n}`, ({ signal, force }) => getHadith(book.slug, n, { signal, force }));
  if (res.status === 'loading') return <LoadingBlock label="Memuat hadits…" rows={2} />;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} title={`Hadits ${book.name} no. ${n} belum bisa dimuat`} />;
  return (
    <>
      <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} fallbackLabel="api.myquran.com" />
      <p className="eyebrow" style={{ marginBottom: 8 }}>
        HR. {book.name}
      </p>
      <HadithCard hadith={res.data} bookName={book.name} headingLevel={1} linkToDetail={false} expanded />
    </>
  );
}

function ArbainItem({ n }) {
  const res = useResource(`hadits:arbain:item:${n}`, ({ signal, force }) => getArbainItem(n, { signal, force }));
  if (res.status === 'loading') return <LoadingBlock label="Memuat hadits…" rows={2} />;
  if (res.status === 'error' && res.error?.kind === ERROR_KIND.NOT_FOUND) return <EmptyState title="Hadits tidak ditemukan" />;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  return (
    <>
      <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} />
      <p className="eyebrow" style={{ marginBottom: 8 }}>
        Arbain An-Nawawi
      </p>
      <HadithCard hadith={res.data} bookName="Arbain An-Nawawi" headingLevel={1} linkToDetail={false} expanded />
    </>
  );
}
