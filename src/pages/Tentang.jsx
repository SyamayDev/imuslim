import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { REPO_URL } from '../app/site.js';
import { Mark, Wordmark } from '../components/brand/Logo.jsx';
import { PageHeader } from '../components/ui/Content.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import './tentang.css';

const VERIFIED = '24 Oktober 2026';

const SOURCES = [
  {
    feature: "Al-Qur'an (teks, latin, terjemahan, tafsir, audio)",
    primary: ['equran.id API v2', 'https://equran.id'],
    fallback: 'api.alquran.cloud (Uthmani + terjemahan Indonesia + audio Alafasy)',
    note: 'Indeks 114 surah disimpan statis dari equran.id (total 6.236 ayat tervalidasi).',
  },
  {
    feature: 'Ayat hari ini',
    primary: ['api.alquran.cloud', 'https://alquran.cloud/api'],
    fallback: 'equran.id (detail surah)',
    note: 'Rujukan ayat dipilih manual; teks & terjemahan selalu dari API.',
  },
  {
    feature: 'Jadwal sholat & imsakiyah, daftar kota',
    primary: ['api.myquran.com v2', 'https://api.myquran.com'],
    fallback: 'Cache jadwal yang pernah dimuat (ditandai usang)',
    note: 'Tidak ada perhitungan waktu sholat lokal.',
  },
  {
    feature: 'Doa & dzikir (227)',
    primary: ['equran.id/api/doa', 'https://equran.id/api/doa'],
    fallback: 'Cache',
    note: 'Termasuk transliterasi & keterangan dalil.',
  },
  {
    feature: 'Kumpulan doa (108, koleksi versi lama)',
    primary: ['api.myquran.com/v2/doa', 'https://api.myquran.com/v2/doa/semua'],
    fallback: 'Cache',
    note: 'Skema sumber berubah (field doa/artinya) sehingga halaman doa lama kosong — sudah diperbaiki. Sumber tidak menyediakan latin.',
  },
  {
    feature: 'Hadits 9 kitab',
    primary: ['hadis-api-id.vercel.app', 'https://hadis-api-id.vercel.app/hadith'],
    fallback: 'api.myquran.com/v2/hadits (per nomor, maks. 4 permintaan bersamaan)',
    note: 'API lama api.hadith.gading.dev gagal TLS handshake secara konsisten saat diuji.',
  },
  {
    feature: 'Arbain An-Nawawi',
    primary: ['api.myquran.com/v2/hadits/arbain', 'https://api.myquran.com/v2/hadits/arbain/semua'],
    fallback: 'Cache',
    note: '',
  },
  {
    feature: 'Pembanding tanggal Hijriah',
    primary: ['api.myquran.com/v2/cal/hijr', 'https://api.myquran.com/v2/cal/hijr'],
    fallback: '—',
    note: 'Tanggal Hijriah utama dihitung lokal (Umm al-Qura via Intl).',
  },
  {
    feature: 'Harga emas referensi (zakat)',
    primary: ['fawazahmed0/exchange-api', 'https://github.com/fawazahmed0/exchange-api'],
    fallback: 'Mirror currency-api.pages.dev',
    note: 'Harga spot XAU→IDR, bukan harga ritel. Pengguna bisa mengisi manual.',
  },
  {
    feature: 'Nama lokasi (jadwal & kiblat)',
    primary: ['Nominatim · OpenStreetMap', 'https://nominatim.org'],
    fallback: 'Pilih kota / isi koordinat manual',
    note: 'Hanya dipanggil saat pengguna menekan tombol; maks. 1 permintaan/detik.',
  },
];

export default function Tentang() {
  useDocumentMeta({ title: 'Tentang & Sumber Data', description: 'Tentang iMuslim, sumber data API, metode perhitungan, privasi, dan kredit.', path: '/tentang' });
  return (
    <div className="page tentang">
      <PageHeader eyebrow="Tentang" title="Tentang iMuslim" />

      <section className="about-hero">
        <div className="about-hero__logo" aria-hidden="true">
          <Mark />
          <Wordmark />
        </div>
        <p>
          iMuslim adalah aplikasi web ringan untuk ibadah harian: membaca Al-Qur'an dengan audio dan tafsir, melihat jadwal sholat dan imsakiyah, membaca doa dan hadits, memantau
          kalender Hijriah, menentukan arah kiblat, dan menghitung zakat. Tanpa akun, tanpa iklan, tanpa pelacak.
        </p>
        <p className="about-hero__logo-note">
          Logo: lengkung mihrab sebagai ruang ibadah, bulan sabit sebagai titik huruf “i”, dan buku terbuka sebagai ilmu — dirancang khusus untuk iMuslim.
        </p>
      </section>

      <section className="section" aria-labelledby="src-title">
        <div className="section__head">
          <h2 id="src-title" className="section__title">
            Sumber data
          </h2>
          <span className="badge badge--brand">Diuji {VERIFIED}</span>
        </div>
        <p className="muted" style={{ marginBottom: 14 }}>
          Semua endpoint diuji langsung (status HTTP, CORS, bentuk JSON) sebelum dipakai. Konten agama ditampilkan apa adanya dari sumber; iMuslim tidak mengarang ayat, hadits,
          terjemahan, waktu sholat, atau tanggal. Bila sumber gagal, data yang pernah dimuat ditandai “mungkin usang”.
        </p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabel sumber data">
          <table className="table sources">
            <thead>
              <tr>
                <th scope="col">Fitur</th>
                <th scope="col">Sumber utama</th>
                <th scope="col">Cadangan</th>
                <th scope="col">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.feature}>
                  <th scope="row">{s.feature}</th>
                  <td>
                    <a href={s.primary[1]} target="_blank" rel="noopener noreferrer">
                      {s.primary[0]}
                    </a>
                  </td>
                  <td>{s.fallback}</td>
                  <td>{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section about-grid" aria-label="Metode">
        <article className="panel">
          <h2 className="panel__title">Arah kiblat</h2>
          <p className="muted">
            Sudut awal lingkaran besar dari koordinat Anda ke Ka'bah (21,4225° LU, 39,8262° BT), diukur searah jarum jam dari utara sejati. Mode kompas memakai sensor perangkat dan hanya
            aktif bila sensor memberi arah utara absolut.
          </p>
        </article>
        <article className="panel">
          <h2 className="panel__title">Kalender Hijriah</h2>
          <p className="muted">
            Dihitung di perangkat dengan kalender Umm al-Qura (Intl/ICU), dengan cadangan kalender tabular. Penetapan resmi di Indonesia melalui sidang isbat bisa berbeda ±1 hari, sehingga
            tersedia penyesuaian di <Link to="/pengaturan">Pengaturan</Link>. Hari besar Islam selalu berlabel perkiraan.
          </p>
        </article>
        <article className="panel">
          <h2 className="panel__title">Zakat</h2>
          <p className="muted">Kadar 2,5%, nisab 85 gram emas (penghasilan: 1/12 per bulan), zakat fitrah 2,5 kg beras per jiwa. Nilai harga diisi pengguna; hasil adalah alat bantu, bukan fatwa.</p>
        </article>
        <article className="panel">
          <h2 className="panel__title">
            <ShieldCheck aria-hidden="true" /> Privasi
          </h2>
          <p className="muted">
            Bookmark, pengaturan, dan acara disimpan di localStorage perangkat Anda. Lokasi hanya diminta saat tombol ditekan, tidak disimpan di server mana pun, dan untuk kiblat koordinat
            disimpan di perangkat agar tidak perlu meminta ulang. Tidak ada analitik atau cookie pelacak.
          </p>
        </article>
      </section>

      <section className="section" aria-labelledby="kredit-title">
        <h2 id="kredit-title" className="section__title">
          Kredit
        </h2>
        <ul className="credits">
          <li>Huruf: Plus Jakarta Sans (Tokotype), Fraunces (Undercase Type), Amiri Quran (Khaled Hosny) — SIL Open Font License, di-host sendiri.</li>
          <li>Ikon: Lucide (lisensi ISC).</li>
          <li>Audio murattal: cdn.equran.id dan cdn.islamic.network. Audio adzan berasal dari iMuslim versi sebelumnya.</li>
          <li>Data peta & nama lokasi: © OpenStreetMap contributors (ODbL).</li>
          <li>Rekomendasi kajian: tautan ke YouTube; judul & kanal diverifikasi lewat YouTube oEmbed.</li>
        </ul>
        <p style={{ marginTop: 16 }}>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn btn--sm">
            Kode sumber di GitHub <ExternalLink aria-hidden="true" />
          </a>
        </p>
      </section>
    </div>
  );
}
