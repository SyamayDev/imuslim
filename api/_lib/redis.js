// Klien Upstash Redis lewat REST API (tanpa dependensi). Semua perintah dikirim sebagai pipeline.
import { config } from './env.js';

export async function redis(commands, c = config()) {
  const res = await fetch(`${c.redisUrl.replace(/\/+$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(`Redis: ${r.error}`);
    return r.result;
  });
}

export async function redis1(command, c) {
  const [r] = await redis([command], c);
  return r;
}
