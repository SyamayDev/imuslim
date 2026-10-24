import { CalendarPlus, ChevronLeft, ChevronRight, Info, Pencil, Share2, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsStore, prefsStore } from '../app/stores.js';
import { PageHeader, SourceNote } from '../components/ui/Content.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { useNow } from '../hooks/useNow.js';
import { useResource } from '../hooks/useResource.js';
import { useShare } from '../hooks/useShare.js';
import { getHijriReference } from '../services/api/sholat.js';
import { DAY_NAMES, formatLongDate, localIso, MONTH_NAMES } from '../utils/format.js';
import { formatHijri, HIJRI_MONTHS, hijriMethod, islamicDayFor, METHOD_LABEL, offsetToMatch, toHijri, upcomingIslamicDays } from '../utils/hijri.js';
import { useStore } from '../utils/storage.js';
import './kalender.css';

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function daysBetween(fromIso, toIso) {
  const [a, b, c] = fromIso.split('-').map(Number);
  const [x, y, z] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86400000);
}

export default function Kalender() {
  useDocumentMeta({
    title: 'Kalender Masehi & Hijriah',
    description: 'Kalender Masehi dan Hijriah berdampingan, perkiraan hari besar Islam, serta catatan acara pribadi.',
    path: '/kalender',
  });
  const now = useNow(60000);
  const today = localIso(new Date(now));
  const [ty, tm] = today.split('-').map(Number);
  const prefs = useStore(prefsStore);
  const events = useStore(eventsStore);
  const offset = prefs.hijriOffset;
  const [cursor, setCursor] = useState({ y: ty, m: tm });
  const [selected, setSelected] = useState(today);
  const [editor, setEditor] = useState(null); // { date, event? }
  const gridRef = useRef(null);

  const move = (delta) =>
    setCursor(({ y, m }) => {
      const t = new Date(Date.UTC(y, m - 1 + delta, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
    });

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m - 1, 1)).getUTCDay();
    const count = new Date(Date.UTC(cursor.y, cursor.m, 0)).getUTCDate();
    const list = [];
    for (let i = 0; i < first; i++) list.push(null);
    for (let d = 1; d <= count; d++) {
      const iso = isoOf(cursor.y, cursor.m, d);
      const h = toHijri(cursor.y, cursor.m, d, offset);
      list.push({ d, iso, h, islamic: islamicDayFor(h), dow: (first + d - 1) % 7 });
    }
    while (list.length % 7) list.push(null);
    return list;
  }, [cursor, offset]);

  const hijriSpan = useMemo(() => {
    const days = cells.filter(Boolean);
    const a = days[0].h;
    const b = days[days.length - 1].h;
    return a.month === b.month ? `${HIJRI_MONTHS[a.month - 1]} ${a.year} H` : `${HIJRI_MONTHS[a.month - 1]}${a.year !== b.year ? ` ${a.year}` : ''} – ${HIJRI_MONTHS[b.month - 1]} ${b.year} H`;
  }, [cells]);

  const years = useMemo(() => Array.from({ length: 101 }, (_, i) => ty - 50 + i), [ty]);

  const focusDay = (iso) => {
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-iso="${iso}"]`)?.focus());
  };
  const onGridKey = (e) => {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in steps)) return;
    e.preventDefault();
    const [y, m, d] = selected.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + steps[e.key]));
    const iso = isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    setSelected(iso);
    if (t.getUTCFullYear() !== cursor.y || t.getUTCMonth() + 1 !== cursor.m) setCursor({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 });
    focusDay(iso);
  };

  return (
    <div className="page kalender">
      <PageHeader eyebrow="Kalender" title="Kalender Masehi & Hijriah" description="Tanggal Hijriah dihitung di perangkat Anda. Tekan tanggal untuk melihat detail atau menambah acara." />

      <div className="kal-layout">
        <section className="kal-main panel" aria-labelledby="kal-title">
          <div className="kal-head">
            <button type="button" className="icon-btn icon-btn--outline" onClick={() => move(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft />
            </button>
            <div className="kal-head__title">
              <h2 id="kal-title" aria-live="polite">
                {MONTH_NAMES[cursor.m - 1]} {cursor.y}
              </h2>
              <p>{hijriSpan}</p>
            </div>
            <button type="button" className="icon-btn icon-btn--outline" onClick={() => move(1)} aria-label="Bulan berikutnya">
              <ChevronRight />
            </button>
          </div>
          <div className="kal-controls">
            <label>
              <span className="visually-hidden">Bulan</span>
              <select className="select" value={cursor.m} onChange={(e) => setCursor((c) => ({ ...c, m: Number(e.target.value) }))}>
                {MONTH_NAMES.map((n, i) => (
                  <option key={n} value={i + 1}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Tahun</span>
              <select className="select" value={cursor.y} onChange={(e) => setCursor((c) => ({ ...c, y: Number(e.target.value) }))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setCursor({ y: ty, m: tm });
                setSelected(today);
              }}
            >
              Hari ini
            </button>
          </div>

          <table className="kal-grid" ref={gridRef} onKeyDown={onGridKey}>
            <caption className="visually-hidden">
              Kalender {MONTH_NAMES[cursor.m - 1]} {cursor.y}. Gunakan tombol panah untuk berpindah tanggal.
            </caption>
            <thead>
              <tr>
                {DAY_NAMES.map((d, i) => (
                  <th key={d} scope="col" className={i === 5 ? 'is-friday' : ''}>
                    <abbr title={d}>{d.slice(0, 3)}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((c, i) =>
                    c ? (
                      <td key={c.iso}>
                        <button
                          type="button"
                          data-iso={c.iso}
                          tabIndex={c.iso === selected ? 0 : -1}
                          className={`kal-day ${c.iso === today ? 'is-today' : ''} ${c.iso === selected ? 'is-selected' : ''} ${c.dow === 5 ? 'is-friday' : ''}`}
                          aria-pressed={c.iso === selected}
                          aria-current={c.iso === today ? 'date' : undefined}
                          onClick={() => setSelected(c.iso)}
                        >
                          <span className="kal-day__g" aria-hidden="true">
                            {c.d}
                          </span>
                          <span className="kal-day__h" aria-hidden="true">
                            {c.h.day === 1 ? `1 ${HIJRI_MONTHS[c.h.month - 1].slice(0, 6)}` : c.h.day}
                          </span>
                          <span className="visually-hidden">
                            {formatLongDate(c.iso)}, {formatHijri(c.h)}
                            {c.islamic ? `, ${c.islamic.name} (perkiraan)` : ''}
                            {events[c.iso]?.length ? `, ${events[c.iso].length} acara` : ''}
                          </span>
                          <span className="kal-day__marks" aria-hidden="true">
                            {c.islamic && <i className="mark-islamic" />}
                            {events[c.iso]?.length > 0 && <i className="mark-event" />}
                          </span>
                        </button>
                      </td>
                    ) : (
                      <td key={`e${row}-${i}`} aria-hidden="true" />
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="kal-legend" aria-label="Keterangan">
            <li>
              <i className="mark-event" /> Acara Anda
            </li>
            <li>
              <i className="mark-islamic" /> Hari besar Islam (perkiraan)
            </li>
            <li>
              <span className="kal-legend__today" /> Hari ini
            </li>
          </ul>
        </section>

        <aside className="kal-side">
          <DayPanel iso={selected} offset={offset} events={events[selected] ?? []} onAdd={() => setEditor({ date: selected })} onEdit={(ev) => setEditor({ date: selected, event: ev })} today={today} />
          <HijriInfo today={today} offset={offset} />
        </aside>
      </div>

      <div className="kal-lists">
        <UpcomingEvents events={events} today={today} offset={offset} onPick={(iso) => {
          const [y, m] = iso.split('-').map(Number);
          setCursor({ y, m });
          setSelected(iso);
        }} />
        <IslamicDays today={today} offset={offset} onPick={(iso) => {
          const [y, m] = iso.split('-').map(Number);
          setCursor({ y, m });
          setSelected(iso);
        }} />
      </div>

      <EventEditor state={editor} onClose={() => setEditor(null)} offset={offset} />

      <SourceNote>
        Tanggal Hijriah: {METHOD_LABEL[hijriMethod()]}, dihitung di perangkat. Awal bulan Hijriah di Indonesia ditetapkan melalui sidang isbat (rukyat & hisab) sehingga bisa berbeda ±1 hari;
        atur penyesuaian di <Link to="/pengaturan">Pengaturan</Link>. Acara tersimpan hanya di perangkat ini.
      </SourceNote>
    </div>
  );
}

function DayPanel({ iso, offset, events, onAdd, onEdit, today }) {
  const [y, m, d] = iso.split('-').map(Number);
  const h = toHijri(y, m, d, offset);
  const islamic = islamicDayFor(h);
  const { share } = useShare();
  const toast = useToast();
  const diff = daysBetween(today, iso);
  const rel = diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : diff === -1 ? 'Kemarin' : diff > 0 ? `${diff} hari lagi` : `${-diff} hari lalu`;

  return (
    <section className="panel day-panel" aria-labelledby="day-title">
      <p className="eyebrow">{rel}</p>
      <h2 id="day-title" className="day-panel__title">
        {formatLongDate(iso)}
      </h2>
      <p className="day-panel__hijri">{formatHijri(h)}</p>
      {islamic && (
        <p className="day-panel__islamic">
          <Sparkles aria-hidden="true" /> {islamic.name} <span className="subtle">(perkiraan)</span>
        </p>
      )}
      <div className="day-panel__events">
        <h3 className="day-panel__sub">Acara</h3>
        {events.length === 0 ? (
          <p className="subtle">Belum ada acara pada tanggal ini.</p>
        ) : (
          <ul>
            {events.map((ev) => (
              <li key={ev.id} className="event-row">
                <span className="event-row__text">
                  <strong>{ev.name}</strong>
                  <span className="subtle">{ev.time ? `Pukul ${ev.time}` : 'Sepanjang hari'}</span>
                </span>
                <button type="button" className="icon-btn icon-btn--sm" aria-label={`Ubah acara ${ev.name}`} onClick={() => onEdit(ev)}>
                  <Pencil />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label={`Bagikan acara ${ev.name}`}
                  onClick={() => share({ title: ev.name, text: `Acara: ${ev.name}\nTanggal: ${formatLongDate(iso)} (${formatHijri(h)})${ev.time ? `\nPukul: ${ev.time}` : ''}` })}
                >
                  <Share2 />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label={`Hapus acara ${ev.name}`}
                  onClick={() => {
                    eventsStore.set((all) => {
                      const list = (all[iso] ?? []).filter((x) => x.id !== ev.id);
                      const next = { ...all };
                      if (list.length) next[iso] = list;
                      else delete next[iso];
                      return next;
                    });
                    toast.show('Acara dihapus', { type: 'info', duration: 1600 });
                  }}
                >
                  <Trash2 />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn--soft btn--sm" onClick={onAdd}>
          <CalendarPlus aria-hidden="true" /> Tambah acara
        </button>
      </div>
    </section>
  );
}

function EventEditor({ state, onClose, offset }) {
  const open = Boolean(state);
  return (
    <Dialog open={open} onClose={onClose} title={state?.event ? 'Ubah acara' : 'Tambah acara'} description={state ? `${formatLongDate(state.date)} · ${formatHijri(toHijri(...state.date.split('-').map(Number), offset))}` : ''} sheet>
      {state && <EventForm key={`${state.date}-${state.event?.id ?? 'baru'}`} state={state} onDone={onClose} />}
    </Dialog>
  );
}

function EventForm({ state, onDone }) {
  const [name, setName] = useState(state.event?.name ?? '');
  const [time, setTime] = useState(state.event?.time ?? '');
  const [error, setError] = useState('');
  const toast = useToast();
  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError('Nama acara wajib diisi.');
    if (clean.length > 80) return setError('Nama acara maksimal 80 karakter.');
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return setError('Format waktu tidak valid.');
    eventsStore.set((all) => {
      const list = [...(all[state.date] ?? [])];
      if (state.event) {
        const i = list.findIndex((x) => x.id === state.event.id);
        if (i >= 0) list[i] = { ...list[i], name: clean, time };
      } else {
        list.push({ id: `${state.date}-${Date.now().toString(36)}`, name: clean, time });
      }
      list.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
      return { ...all, [state.date]: list };
    });
    toast.show(state.event ? 'Acara diperbarui' : 'Acara ditambahkan');
    onDone();
    return undefined;
  };
  return (
    <form onSubmit={submit} className="stack" noValidate>
      <div className="field">
        <label htmlFor="ev-name" className="field__label">
          Nama acara
        </label>
        <input
          id="ev-name"
          className="input"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(error) && !name.trim()}
          aria-describedby={error ? 'ev-err' : undefined}
          placeholder="mis. Kajian rutin, Puasa Ayyamul Bidh"
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="ev-time" className="field__label">
          Waktu <span className="subtle">(opsional)</span>
        </label>
        <input id="ev-time" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {error && (
        <p id="ev-err" className="field__error" role="alert">
          {error}
        </p>
      )}
      <div className="cluster" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onDone}>
          Batal
        </button>
        <button type="submit" className="btn btn--primary">
          Simpan
        </button>
      </div>
    </form>
  );
}

function UpcomingEvents({ events, today, onPick }) {
  const list = Object.entries(events)
    .flatMap(([date, evs]) => evs.map((ev) => ({ ...ev, date })))
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 8);
  const past = Object.entries(events).filter(([d]) => d < today).reduce((n, [, evs]) => n + evs.length, 0);
  return (
    <section className="panel" aria-labelledby="acara-title">
      <h2 id="acara-title" className="panel__title">
        Acara mendatang
      </h2>
      {list.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          Belum ada acara mendatang. Pilih tanggal di kalender lalu tekan “Tambah acara”.
        </p>
      ) : (
        <ul className="agenda">
          {list.map((e, i) => {
            const diff = daysBetween(today, e.date);
            return (
              <li key={e.id}>
                <button type="button" className="agenda__item" onClick={() => onPick(e.date)}>
                  <span className={`agenda__when ${i === 0 ? 'is-first' : ''}`}>{diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : `${diff} hari lagi`}</span>
                  <span className="agenda__name">{e.name}</span>
                  <span className="agenda__date">
                    {formatLongDate(e.date)}
                    {e.time ? ` · ${e.time}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {past > 0 && <p className="subtle" style={{ fontSize: 'var(--fs-xs)', marginTop: 10 }}>{past} acara lampau masih tersimpan dan terlihat di kalender.</p>}
    </section>
  );
}

function IslamicDays({ today, offset, onPick }) {
  const list = useMemo(() => upcomingIslamicDays(today, 6, offset), [today, offset]);
  return (
    <section className="panel" aria-labelledby="harbes-title">
      <h2 id="harbes-title" className="panel__title">
        Hari besar Islam <span className="badge badge--gold">perkiraan</span>
      </h2>
      <ul className="agenda">
        {list.map((e) => (
          <li key={e.date}>
            <button type="button" className="agenda__item" onClick={() => onPick(e.date)}>
              <span className="agenda__when">{e.daysFromNow === 0 ? 'Hari ini' : `${e.daysFromNow} hari lagi`}</span>
              <span className="agenda__name">{e.name}</span>
              <span className="agenda__date">
                {formatLongDate(e.date)} · {formatHijri(e.hijri)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HijriInfo({ today, offset }) {
  const ref = useResource(`hijri-ref:${today}`, ({ signal, force }) => getHijriReference(today, { signal, force }));
  const [y, m, d] = today.split('-').map(Number);
  const local = toHijri(y, m, d, offset);
  const match = ref.data ? offsetToMatch(y, m, d, ref.data) : null;
  const differs = ref.data && (ref.data.day !== local.day || ref.data.month !== local.month || ref.data.year !== local.year);
  return (
    <section className="panel hijri-info" aria-labelledby="hijri-title">
      <h2 id="hijri-title" className="panel__title">
        <Info aria-hidden="true" /> Tanggal Hijriah hari ini
      </h2>
      <p className="hijri-info__value">{formatHijri(local)}</p>
      <p className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
        {METHOD_LABEL[hijriMethod()]}
        {offset ? ` · penyesuaian ${offset > 0 ? '+' : ''}${offset} hari` : ''}
      </p>
      {ref.status === 'success' && (
        <div className={`notice ${differs ? 'notice--warn' : 'notice--success'}`} style={{ marginTop: 10 }}>
          <div className="notice__body">
            Pembanding myQuran: <strong>{ref.data.label}</strong>
            {differs ? ' — berbeda dengan perhitungan di atas.' : ' — sama.'}
            {differs && match !== null && (
              <div className="notice__actions">
                <button type="button" className="btn btn--sm" onClick={() => prefsStore.set((p) => ({ ...p, hijriOffset: Math.max(-2, Math.min(2, match)) }))}>
                  Samakan (penyesuaian {match > 0 ? '+' : ''}
                  {match} hari)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {ref.status === 'error' && <p className="subtle" style={{ fontSize: 'var(--fs-xs)', marginTop: 8 }}>Pembanding myQuran tidak dapat dimuat saat ini.</p>}
    </section>
  );
}
