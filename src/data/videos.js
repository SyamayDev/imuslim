// Rekomendasi kajian dari versi lama (4 video YouTube yang sama).
// Judul & kanal diverifikasi lewat YouTube oEmbed pada 24 Oktober 2026 — judul di versi
// lama hanya parafrase, sehingga diganti dengan judul asli dari YouTube. Thumbnail sengaja tidak
// ditampilkan: salah satunya memuat ilustrasi sosok Nabi yang sensitif, dan kartu teks tidak
// mengirim permintaan gambar ke server pihak ketiga.
export const VIDEOS_VERIFIED_AT = '2026-10-24';

export const VIDEOS = [
  {
    id: '_t0sVn8-c3k',
    title: 'Balasan Untukmu yang Selalu Membaca Al Quran - Ustadz Abdul Somad | religiOne tvOne',
    channel: 'Damai Indonesiaku tvOne',
    topic: "Keutamaan membaca Al-Qur'an",
  },
  {
    id: 'CSaICTZDI2Y',
    title: 'Keindahan Rasulullah: Kisah Indah Tentang Nabi Muhammad, Ciri-ciri Fisik & ahlaknya',
    channel: 'TEMAN BERCERITA',
    topic: 'Sirah Nabi Muhammad SAW',
  },
  {
    id: 'jXXIzE0xyKw',
    title: 'Jangan Malu Untuk Kembali Ke Jalan Allah - Ustadz Adi Hidayat',
    channel: 'Adi Hidayat Official',
    topic: 'Taubat & mendekatkan diri kepada Allah',
  },
  {
    id: 'gYexUTza1EM',
    title: 'ALLAH KASIH UJIAN DULU, BARU ALLAH KASIH SUKSES.||.Ust.Hanan Attaki.,Lc',
    channel: 'Hafiz Dakwah',
    topic: 'Hikmah di balik ujian',
  },
];

export const youtubeUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
