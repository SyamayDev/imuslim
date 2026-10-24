import { ArrowLeft, Hash } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/Content.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { DataNotice, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Status.jsx';
import { HadithCard } from '../../features/hadits/HadithCard.jsx';
import { useArbain, useBook } from '../../features/hadits/useHadits.js';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { useResource } from '../../hooks/useResource.js';
import { getHadithPage, HADITH_PAGE_SIZE } from '../../services/api/hadits.js';
import './hadits.css';

export default function HaditsBook() {
  const { kitab } = useParams();
  const info = useBook(kitab);
  const name = info.book?.name ?? kitab;
  useDocumentMeta({
    title: info.isArbain ? 'Hadits Arbain An-Nawawi' : `Hadits ${name}`,
    description: info.isArbain ? '42 hadits Arbain An-Nawawi dengan teks Arab dan terjemahan.' : `Baca hadits riwayat ${name} dengan teks Arab dan terjemahan Indonesia.`,
    path: `/hadits/${info.slug}`,
  });

  const back = (
    <Link to="/hadits" className="back-link">
      <ArrowLeft aria-hidden="true" /> Semua kitab
    </Link>
  );

  if (info.status === 'loading') {
    return (
      <div className="page hadits">
        {back}
        <LoadingBlock label="Memuat kitab…" />
      </div>
    );
  }
  if (info.status === 'error') {
    return (
      <div className="page hadits">
        {back}
        <ErrorState error={info.error} onRetry={info.reload} title="Data kitab belum bisa dimuat" />
      </div>
    );
  }
  if (!info.book) {
    return (
      <div className="page hadits">
        {back}
        <EmptyState title="Kitab tidak ditemukan" text={`Tidak ada kitab dengan kode “${kitab}”.`} action={<Link to="/hadits" className="btn btn--primary">Lihat semua kitab</Link>} />
      </div>
    );
  }
  return info.isArbain ? <ArbainList back={back} /> : <BookPages back={back} book={info.book} />;
}

function NumberJump({ book }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > book.total) {
      setError(`Masukkan nomor 1–${book.total.toLocaleString('id-ID')}.`);
      return;
    }
    setError('');
    navigate(`/hadits/${book.slug}/${n}`);
  };
  return (
    <form className="number-jump" onSubmit={submit} noValidate>
      <label htmlFor="nomor-hadits" className="field__label">
        Lompat ke nomor
      </label>
      <div className="number-jump__row">
        <input
          id="nomor-hadits"
          className="input tabular"
          type="number"
          inputMode="numeric"
          min={1}
          max={book.total}
          placeholder={`1–${book.total}`}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'nomor-hadits-err' : undefined}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn btn--primary">
          <Hash aria-hidden="true" /> Buka
        </button>
      </div>
      {error && (
        <p id="nomor-hadits-err" className="field__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function BookPages({ back, book }) {
  const [params, setParams] = useSearchParams();
  const totalPages = Math.ceil(book.total / HADITH_PAGE_SIZE);
  const page = Math.min(totalPages, Math.max(1, Number(params.get('hal')) || 1));
  const res = useResource(`hadits:${book.slug}:${page}`, ({ signal, force }) => getHadithPage(book, page, { signal, force }), {
    isEmpty: (d) => !d?.items?.length,
    keepPrevious: true,
  });

  return (
    <div className="page hadits">
      {back}
      <PageHeader eyebrow="Kitab hadits" title={`HR. ${book.name}`} description={`${book.total.toLocaleString('id-ID')} hadits · ${HADITH_PAGE_SIZE} per halaman`}>
        <NumberJump book={book} />
      </PageHeader>

      {res.status === 'loading' && !res.data && <LoadingBlock label="Memuat hadits…" rows={4} />}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title={`Halaman ${page} belum bisa dimuat`} />}
      {res.status === 'empty' && <EmptyState title="Halaman ini kosong di sumber" />}
      {res.data && res.status !== 'error' && (
        <div className={res.status === 'loading' ? 'is-refreshing' : ''} aria-busy={res.status === 'loading'}>
          <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} fallbackLabel="api.myquran.com, dimuat per nomor" />
          {res.data.partial && (
            <p className="notice notice--warn" role="status" style={{ marginBottom: 12 }}>
              Sebagian hadits di halaman ini gagal dimuat dari sumber cadangan. Coba muat ulang halaman.
            </p>
          )}
          <div className="hadith-list">
            {res.data.items.map((h) => (
              <HadithCard key={h.number} hadith={h} bookName={book.name} />
            ))}
          </div>
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={book.total}
        pageSize={HADITH_PAGE_SIZE}
        label="hadits"
        onChange={(p) => {
          setParams(p === 1 ? {} : { hal: String(p) });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

function ArbainList({ back }) {
  const res = useArbain();
  const [params, setParams] = useSearchParams();
  const size = 10;
  const total = res.data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(totalPages, Math.max(1, Number(params.get('hal')) || 1));
  return (
    <div className="page hadits">
      {back}
      <PageHeader eyebrow="Koleksi pilihan" title="Arbain An-Nawawi" description="Kumpulan hadits pokok yang dihimpun Imam Yahya bin Syaraf An-Nawawi, lengkap dengan judul tema dari sumber." />
      {res.status === 'loading' && <LoadingBlock label="Memuat Arbain…" />}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Arbain belum bisa dimuat" />}
      {res.status === 'success' && (
        <>
          <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} />
          <div className="hadith-list">
            {res.data.slice((page - 1) * size, page * size).map((h) => (
              <HadithCard key={h.number} hadith={h} bookName="Arbain An-Nawawi" />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={size}
            label="hadits"
            onChange={(p) => {
              setParams(p === 1 ? {} : { hal: String(p) });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
