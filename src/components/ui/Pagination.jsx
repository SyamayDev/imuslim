import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/** Paginasi aksesibel: tombol pertama/sebelumnya/berikutnya/terakhir + lompat ke halaman. */
export function Pagination({ page, totalPages, onChange, totalItems, pageSize, label = 'item' }) {
  if (!totalPages || totalPages <= 1) {
    return totalItems ? <p className="pager__info" style={{ paddingTop: 16 }}>{totalItems} {label}</p> : null;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems ?? page * pageSize);
  const many = totalPages > 300;
  return (
    <nav className="pager" aria-label="Navigasi halaman">
      <p className="pager__info tabular">
        {totalItems ? (
          <>
            {from}–{to} dari {totalItems.toLocaleString('id-ID')} {label}
          </>
        ) : (
          <>
            Halaman {page} dari {totalPages}
          </>
        )}
      </p>
      <div className="pager__controls">
        <button type="button" className="icon-btn icon-btn--outline" onClick={() => onChange(1)} disabled={page <= 1} aria-label="Halaman pertama">
          <ChevronsLeft />
        </button>
        <button type="button" className="icon-btn icon-btn--outline" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
          <ChevronLeft />
        </button>
        <label className="pager__jump">
          <span className="visually-hidden">Pilih halaman</span>
          {many ? (
            <input
              className="input tabular"
              style={{ width: 84, minHeight: 40, textAlign: 'center' }}
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              defaultValue={page}
              key={page}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = Math.min(totalPages, Math.max(1, Number(e.currentTarget.value) || 1));
                  onChange(v);
                }
              }}
              onBlur={(e) => {
                const v = Math.min(totalPages, Math.max(1, Number(e.currentTarget.value) || page));
                if (v !== page) onChange(v);
              }}
            />
          ) : (
            <select className="select tabular" value={page} onChange={(e) => onChange(Number(e.target.value))}>
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          )}
          <span aria-hidden="true" className="tabular">
            / {totalPages}
          </span>
        </label>
        <button type="button" className="icon-btn icon-btn--outline" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Halaman berikutnya">
          <ChevronRight />
        </button>
        <button type="button" className="icon-btn icon-btn--outline" onClick={() => onChange(totalPages)} disabled={page >= totalPages} aria-label="Halaman terakhir">
          <ChevronsRight />
        </button>
      </div>
    </nav>
  );
}
