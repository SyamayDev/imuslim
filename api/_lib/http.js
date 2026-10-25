// Utilitas HTTP untuk Vercel Functions (signature Web standar: Request → Response).
// Folder berawalan "_" tidak dipublikasikan sebagai endpoint oleh Vercel.

/** Origin yang boleh memanggil API push dari browser. */
const ALLOWED = [
  /^https:\/\/syamaydev\.github\.io$/,
  /^https:\/\/imuslim-seven\.vercel\.app$/,
  /^https:\/\/imuslim-[a-z0-9-]+\.vercel\.app$/, // deployment pratinjau proyek ini
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

export function allowedOrigin(origin) {
  return typeof origin === 'string' && ALLOWED.some((re) => re.test(origin)) ? origin : null;
}

function corsHeaders(request) {
  const origin = allowedOrigin(request.headers.get('origin'));
  return origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : { Vary: 'Origin' };
}

export function json(request, status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(request), ...extra },
  });
}

export function preflight(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Baca body JSON dengan batas ukuran. */
export async function readJson(request, limit = 8 * 1024) {
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, 'Body terlalu besar');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Body bukan JSON yang valid');
  }
}

/** Bungkus handler: error → JSON dengan status yang tepat, tanpa membocorkan detail internal. */
export function handle(fn) {
  return async (request) => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof HttpError) return json(request, error.status, { error: error.message });
      console.error('[api]', error);
      return json(request, 500, { error: 'Kesalahan server' });
    }
  };
}
