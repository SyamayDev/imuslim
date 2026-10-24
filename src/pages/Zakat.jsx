import { Calculator, CircleCheck, CircleX, Coins, ExternalLink, RefreshCw, RotateCcw, Wheat } from 'lucide-react';
import { useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, SourceNote } from '../components/ui/Content.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { describeError } from '../services/api/errors.js';
import { getGoldReference } from '../services/api/misc.js';
import { formatShortDate, number, rupiah } from '../utils/format.js';
import {
  FITRAH_KG_PER_PERSON,
  FITRAH_LITER_PER_PERSON,
  formatDigits,
  NISAB_GOLD_GRAMS,
  parseRupiah,
  ZAKAT_RATE,
  zakatFitrah,
  zakatMaal,
  zakatPenghasilan,
} from '../utils/zakat.js';
import './zakat.css';

const TABS = [
  { id: 'penghasilan', label: 'Penghasilan', icon: Coins },
  { id: 'maal', label: 'Maal (harta)', icon: Calculator },
  { id: 'fitrah', label: 'Fitrah', icon: Wheat },
];

function MoneyInput({ label, hint, value, onChange, prefix = 'Rp' }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <div className="input-prefix">
        <span aria-hidden="true">{prefix}</span>
        <input
          id={id}
          className="input tabular"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(formatDigits(e.target.value))}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

function GoldPrice({ value, onChange }) {
  const [ref, setRef] = useState({ status: 'idle', data: null, error: null, stale: false });
  const load = async (force = false) => {
    setRef((r) => ({ ...r, status: 'loading', error: null }));
    try {
      const res = await getGoldReference({ force });
      setRef({ status: 'success', data: res.data, error: res.error ?? null, stale: Boolean(res.stale), fallback: Boolean(res.fallbackUsed) });
    } catch (error) {
      setRef({ status: 'error', data: null, error, stale: false });
    }
  };
  return (
    <section className="gold" aria-labelledby="emas-title">
      <h2 id="emas-title" className="zakat-sub">
        Harga emas acuan nisab
      </h2>
      <MoneyInput label="Harga emas per gram" value={value} onChange={onChange} hint={`Nisab = ${NISAB_GOLD_GRAMS} gram emas × harga ini. Gunakan harga emas murni (24 karat) yang Anda yakini.`} />
      <div className="gold__ref">
        <button type="button" className="btn btn--sm" onClick={() => load(ref.status === 'success')} disabled={ref.status === 'loading'}>
          {ref.status === 'loading' ? <span className="spinner" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />} Ambil harga referensi
        </button>
        <a className="btn btn--sm btn--ghost" href="https://www.logammulia.com/id/harga-emas-hari-ini" target="_blank" rel="noopener noreferrer">
          Harga Antam <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <div aria-live="polite">
        {ref.status === 'success' && (
          <div className="notice notice--neutral">
            <div className="notice__body">
              Harga spot emas internasional <strong>{rupiah(ref.data.perGram)}/gram</strong> per {formatShortDate(ref.data.date)}
              {ref.stale ? ' (data tersimpan, mungkin usang)' : ''}. Sumber: {ref.data.source}. Harga ritel seperti Antam biasanya lebih tinggi.
              <div className="notice__actions">
                <button type="button" className="btn btn--sm btn--soft" onClick={() => onChange(formatDigits(String(ref.data.perGram)))}>
                  Gunakan harga ini
                </button>
              </div>
            </div>
          </div>
        )}
        {ref.status === 'error' && (
          <p className="field__error" role="alert">
            Harga referensi tidak dapat dimuat: {describeError(ref.error)} Silakan isi harga secara manual.
          </p>
        )}
      </div>
    </section>
  );
}

function ResultRow({ label, value, strong = false }) {
  return (
    <div className={`result-row ${strong ? 'is-strong' : ''}`}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

function Verdict({ ok, yes, no }) {
  return (
    <p className={`verdict ${ok ? 'is-yes' : 'is-no'}`}>
      {ok ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />} {ok ? yes : no}
    </p>
  );
}

export default function Zakat() {
  useDocumentMeta({
    title: 'Kalkulator Zakat',
    description: 'Hitung zakat penghasilan, zakat maal, dan zakat fitrah dengan rumus yang transparan dan nilai acuan yang dapat Anda sesuaikan.',
    path: '/zakat',
  });
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('jenis')) ? params.get('jenis') : 'penghasilan';
  const [gold, setGold] = useState('');
  const [inc, setInc] = useState({ monthly: '', other: '' });
  const [maal, setMaal] = useState({ savings: '', gold: '', investments: '', receivables: '', debts: '', haul: false });
  const [fitrah, setFitrah] = useState({ people: '1', rice: '' });
  const goldPrice = parseRupiah(gold);

  const reset = () => {
    setInc({ monthly: '', other: '' });
    setMaal({ savings: '', gold: '', investments: '', receivables: '', debts: '', haul: false });
    setFitrah({ people: '1', rice: '' });
  };

  return (
    <div className="page zakat">
      <PageHeader
        eyebrow="Zakat"
        title="Kalkulator Zakat"
        description="Perkiraan zakat berdasarkan angka yang Anda masukkan. Semua perhitungan dilakukan di perangkat dan tidak dikirim ke mana pun."
      />
      <div className="segmented" role="tablist" aria-label="Jenis zakat" style={{ marginBottom: 'var(--space-5)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'penghasilan' ? {} : { jenis: id }, { replace: true })}>
            <Icon aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className="zakat-layout">
        <div className="panel zakat-form">
          {tab !== 'fitrah' && <GoldPrice value={gold} onChange={setGold} />}

          {tab === 'penghasilan' && (
            <section aria-labelledby="inc-title" className="stack">
              <h2 id="inc-title" className="zakat-sub">
                Penghasilan bulanan
              </h2>
              <MoneyInput label="Gaji / penghasilan per bulan" value={inc.monthly} onChange={(v) => setInc((s) => ({ ...s, monthly: v }))} />
              <MoneyInput label="Pendapatan lain per bulan (jika ada)" hint="Bonus, honor, usaha sampingan, dll." value={inc.other} onChange={(v) => setInc((s) => ({ ...s, other: v }))} />
            </section>
          )}

          {tab === 'maal' && (
            <section aria-labelledby="maal-title" className="stack">
              <h2 id="maal-title" className="zakat-sub">
                Harta yang dimiliki
              </h2>
              <MoneyInput label="Tabungan, deposito & uang tunai" value={maal.savings} onChange={(v) => setMaal((s) => ({ ...s, savings: v }))} />
              <MoneyInput label="Nilai emas/perak yang disimpan" value={maal.gold} onChange={(v) => setMaal((s) => ({ ...s, gold: v }))} />
              <MoneyInput label="Investasi (saham, reksa dana, dll.)" value={maal.investments} onChange={(v) => setMaal((s) => ({ ...s, investments: v }))} />
              <MoneyInput label="Piutang yang dapat ditagih" value={maal.receivables} onChange={(v) => setMaal((s) => ({ ...s, receivables: v }))} />
              <MoneyInput label="Utang jatuh tempo (pengurang)" value={maal.debts} onChange={(v) => setMaal((s) => ({ ...s, debts: v }))} />
              <label className="check">
                <input type="checkbox" checked={maal.haul} onChange={(e) => setMaal((s) => ({ ...s, haul: e.target.checked }))} />
                <span>Harta ini sudah dimiliki minimal satu tahun hijriah (haul)</span>
              </label>
            </section>
          )}

          {tab === 'fitrah' && (
            <section aria-labelledby="fitrah-title" className="stack">
              <h2 id="fitrah-title" className="zakat-sub">
                Zakat fitrah
              </h2>
              <div className="field">
                <label htmlFor="jiwa" className="field__label">
                  Jumlah jiwa
                </label>
                <input
                  id="jiwa"
                  className="input tabular"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  value={fitrah.people}
                  onChange={(e) => setFitrah((s) => ({ ...s, people: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                />
              </div>
              <MoneyInput
                label="Harga beras per kg"
                hint="Gunakan harga beras yang biasa Anda konsumsi, atau nilai yang ditetapkan BAZNAS/lembaga zakat di daerah Anda."
                value={fitrah.rice}
                onChange={(v) => setFitrah((s) => ({ ...s, rice: v }))}
              />
            </section>
          )}

          <button type="button" className="btn btn--ghost btn--sm" onClick={reset} style={{ justifySelf: 'start' }}>
            <RotateCcw aria-hidden="true" /> Kosongkan isian
          </button>
        </div>

        <aside className="panel zakat-result" aria-live="polite" aria-labelledby="hasil-title">
          <h2 id="hasil-title" className="zakat-sub">
            Hasil perhitungan
          </h2>
          {tab === 'penghasilan' && <IncomeResult goldPrice={goldPrice} inc={inc} />}
          {tab === 'maal' && <MaalResult goldPrice={goldPrice} maal={maal} />}
          {tab === 'fitrah' && <FitrahResult fitrah={fitrah} />}
        </aside>
      </div>

      <section className="panel zakat-notes" aria-labelledby="catatan-title">
        <h2 id="catatan-title" className="zakat-sub">
          Dasar & asumsi perhitungan
        </h2>
        <ul>
          <li>
            Kadar zakat penghasilan dan maal: <strong>2,5%</strong>. Nisab: setara <strong>{NISAB_GOLD_GRAMS} gram emas</strong> per tahun (zakat penghasilan bulanan memakai 1/12-nya), sebagaimana
            dirujuk Peraturan Menteri Agama No. 31 Tahun 2019 dan Fatwa MUI No. 3 Tahun 2003 yang juga dipakai versi lama aplikasi ini.
          </li>
          <li>Zakat penghasilan dihitung dari penghasilan bruto per bulan. Sebagian ulama dan lembaga menghitung dari penghasilan bersih; ikuti pendapat yang Anda pegang.</li>
          <li>Zakat maal wajib bila harta bersih mencapai nisab dan telah dimiliki satu tahun (haul).</li>
          <li>
            Zakat fitrah: {FITRAH_KG_PER_PERSON} kg atau {FITRAH_LITER_PER_PERSON} liter beras per jiwa; dapat dibayarkan dalam bentuk uang senilai beras tersebut sesuai ketetapan lembaga zakat setempat.
          </li>
          <li>Hasil ini adalah alat bantu, bukan fatwa. Untuk kondisi khusus, konsultasikan dengan ustadz atau lembaga amil zakat resmi seperti BAZNAS.</li>
        </ul>
      </section>
      <SourceNote>
        iMuslim tidak menanam nilai nisab rupiah di kode karena harga emas berubah setiap hari. Tombol “Ambil harga referensi” memuat harga spot emas dari proyek terbuka
        fawazahmed0/exchange-api beserta tanggalnya; Anda tetap bisa mengganti angkanya.
      </SourceNote>
    </div>
  );
}

function NeedGold() {
  return <p className="muted">Isi harga emas per gram untuk menghitung nisab.</p>;
}

function IncomeResult({ goldPrice, inc }) {
  if (!goldPrice) return <NeedGold />;
  const r = zakatPenghasilan({ goldPricePerGram: goldPrice, monthlyIncome: parseRupiah(inc.monthly), otherIncome: parseRupiah(inc.other) });
  return (
    <>
      <dl className="result">
        <ResultRow label={`Nisab per tahun (${NISAB_GOLD_GRAMS} g × harga emas)`} value={rupiah(r.nisabYear)} />
        <ResultRow label="Nisab per bulan (÷ 12)" value={rupiah(r.nisabMonth)} />
        <ResultRow label="Total penghasilan per bulan" value={rupiah(r.income)} />
      </dl>
      {r.income > 0 ? (
        <>
          <Verdict ok={r.obligated} yes="Penghasilan mencapai nisab — wajib zakat penghasilan." no="Penghasilan belum mencapai nisab — belum wajib zakat penghasilan." />
          {r.obligated ? (
            <dl className="result">
              <ResultRow label={`Zakat per bulan (${number(ZAKAT_RATE * 100, 1)}%)`} value={rupiah(r.zakat)} strong />
              <ResultRow label="Setara per tahun" value={rupiah(r.zakatYear)} />
            </dl>
          ) : (
            <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
              Anda tetap dapat berinfak atau bersedekah sesuai kemampuan.
            </p>
          )}
        </>
      ) : (
        <p className="muted">Isi penghasilan untuk melihat hasil.</p>
      )}
    </>
  );
}

function MaalResult({ goldPrice, maal }) {
  if (!goldPrice) return <NeedGold />;
  const r = zakatMaal({
    goldPricePerGram: goldPrice,
    savings: parseRupiah(maal.savings),
    gold: parseRupiah(maal.gold),
    investments: parseRupiah(maal.investments),
    receivables: parseRupiah(maal.receivables),
    debts: parseRupiah(maal.debts),
    haul: maal.haul,
  });
  return (
    <>
      <dl className="result">
        <ResultRow label={`Nisab (${NISAB_GOLD_GRAMS} g emas)`} value={rupiah(r.nisab)} />
        <ResultRow label="Total harta" value={rupiah(r.assets)} />
        <ResultRow label="Harta bersih (setelah utang)" value={rupiah(r.net)} />
      </dl>
      {r.assets > 0 ? (
        <>
          {!r.reachesNisab && <Verdict ok={false} no="Harta bersih belum mencapai nisab — belum wajib zakat maal." />}
          {r.reachesNisab && !r.haul && <Verdict ok={false} no="Sudah mencapai nisab, tetapi belum genap satu tahun (haul) — belum wajib dikeluarkan." />}
          {r.obligated && (
            <>
              <Verdict ok yes="Mencapai nisab dan haul — wajib zakat maal." />
              <dl className="result">
                <ResultRow label={`Zakat maal (${number(ZAKAT_RATE * 100, 1)}%)`} value={rupiah(r.zakat)} strong />
              </dl>
            </>
          )}
        </>
      ) : (
        <p className="muted">Isi nilai harta untuk melihat hasil.</p>
      )}
    </>
  );
}

function FitrahResult({ fitrah }) {
  const people = Number(fitrah.people);
  const r = zakatFitrah({ people: Number.isInteger(people) ? people : 0, ricePricePerKg: parseRupiah(fitrah.rice) });
  if (!r.people) return <p className="muted">Isi jumlah jiwa (minimal 1).</p>;
  return (
    <dl className="result">
      <ResultRow label="Beras yang dikeluarkan" value={`${number(r.kg, 1)} kg (≈ ${number(r.liters, 1)} liter)`} strong />
      {r.money > 0 ? <ResultRow label="Setara uang" value={rupiah(r.money)} strong /> : <ResultRow label="Setara uang" value="isi harga beras" />}
    </dl>
  );
}
