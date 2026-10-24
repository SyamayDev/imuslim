// Klasifikasi error API agar UI dapat memberi pesan yang jujur dan spesifik.
export const ERROR_KIND = {
  TIMEOUT: 'timeout',
  OFFLINE: 'offline',
  NETWORK: 'network', // gagal koneksi/CORS/TLS — browser tidak membedakan detailnya
  NOT_FOUND: 'not-found',
  RATE_LIMIT: 'rate-limit',
  SERVER: 'server',
  HTTP: 'http',
  SHAPE: 'shape', // bentuk respons berubah / tidak valid
};

export class ApiError extends Error {
  constructor(kind, message, { status = null, url = '', retryAfter = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.url = url;
    this.retryAfter = retryAfter;
  }
}

const MESSAGES = {
  [ERROR_KIND.TIMEOUT]: 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.',
  [ERROR_KIND.OFFLINE]: 'Perangkat sedang offline. Sambungkan ke internet lalu coba lagi.',
  [ERROR_KIND.NETWORK]: 'Tidak dapat terhubung ke layanan data. Layanan mungkin sedang gangguan.',
  [ERROR_KIND.NOT_FOUND]: 'Data yang diminta tidak ditemukan di sumber.',
  [ERROR_KIND.RATE_LIMIT]: 'Terlalu banyak permintaan ke layanan data. Tunggu sebentar lalu coba lagi.',
  [ERROR_KIND.SERVER]: 'Layanan data sedang mengalami gangguan (kesalahan server).',
  [ERROR_KIND.HTTP]: 'Permintaan ke layanan data gagal.',
  [ERROR_KIND.SHAPE]: 'Format data dari sumber berubah atau tidak valid, sehingga tidak ditampilkan.',
};

export function describeError(error) {
  if (!error) return '';
  if (error instanceof ApiError) {
    const base = MESSAGES[error.kind] ?? MESSAGES[ERROR_KIND.HTTP];
    return error.status ? `${base} (HTTP ${error.status})` : base;
  }
  return 'Terjadi kesalahan yang tidak terduga.';
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}
