// QA hasil render: ffprobe (durasi, resolusi, fps, codec, ukuran), loudness EBU R128 dari berkas
// final (filter loudnorm ffmpeg, mode analisis), dan pemeriksaan kedipan (WCAG 2.3.1).
//   node scripts/qa.mjs            → semua MP4 di out/ → out/qa-report.json
import { execFile, spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ffmpegBin } from './ffmpeg-bin.mjs';

const run = promisify(execFile);
const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(motion, 'out');
const FFMPEG = ffmpegBin('ffmpeg');
const FFPROBE = ffmpegBin('ffprobe');

async function probe(file) {
  const { stdout } = await run(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = v.r_frame_rate.split('/').map(Number);
  return {
    duration: +(+j.format.duration).toFixed(3),
    sizeMB: +(statSync(file).size / 1e6).toFixed(1),
    bitrateMbps: +(+j.format.bit_rate / 1e6).toFixed(1),
    video: { codec: v.codec_name, profile: v.profile, width: v.width, height: v.height, fps: +(n / d).toFixed(3), pixFmt: v.pix_fmt, frames: +v.nb_frames || null, colorSpace: v.color_space ?? null },
    audio: a ? { codec: a.codec_name, sampleRate: +a.sample_rate, channels: a.channels, bitrateKbps: Math.round(+a.bit_rate / 1000) } : null,
  };
}

async function loudness(file) {
  const { stderr } = await run(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const m = stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1);
  const j = JSON.parse(m);
  return { integratedLUFS: +j.input_i, truePeakDBTP: +j.input_tp, lraLU: +j.input_lra };
}

/**
 * Kedipan: video diperkecil ke 96 px, luminans relatif per piksel; transisi = perubahan ≥ 0,1
 * dengan sisi gelap < 0,8 (WCAG). Kedipan = sepasang transisi berlawanan. Gagal bila area
 * > 3% layar mengalami > 3 kedipan dalam jendela 1 detik mana pun.
 */
async function flashes(file, width, height, fps = 60) {
  const W = 96;
  const H = Math.max(2, Math.round((W * height) / width / 2) * 2);
  const px = W * H;
  const proc = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area`, '-pix_fmt', 'gray', '-c:v', 'rawvideo', '-f', 'image2pipe', '-']);
  const chunks = [];
  for await (const c of proc.stdout) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const frames = Math.floor(buf.length / px);
  const lin = new Float32Array(256);
  for (let y = 0; y < 256; y++) {
    const v = Math.min(1, Math.max(0, (y - 16) / 219));
    lin[y] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }
  // transisi per piksel: ≥ 0,1 luminans relatif berlawanan arah, sisi gelap < 0,8
  const turn = new Float32Array(px);
  const dir = new Int8Array(px);
  for (let i = 0; i < px; i++) turn[i] = lin[buf[i]];
  const events = Array.from({ length: frames }, () => []);
  for (let f = 1; f < frames; f++) {
    const base = f * px;
    for (let i = 0; i < px; i++) {
      const L = lin[buf[base + i]];
      const T = turn[i];
      if (dir[i] === 1 && L > T) turn[i] = L;
      else if (dir[i] === -1 && L < T) turn[i] = L;
      else if (Math.abs(L - T) >= 0.1 && Math.min(L, T) < 0.8) {
        events[f].push(i);
        dir[i] = L > T ? 1 : -1;
        turn[i] = L;
      }
    }
  }
  // jendela 1 detik (= fps frame)
  const win = Math.round(fps);
  const count = new Uint16Array(px);
  let worst = 0;
  let worstAt = 0;
  const over = [];
  for (let f = 1; f < frames; f++) {
    for (const i of events[f]) count[i]++;
    if (f - win >= 1) for (const i of events[f - win]) count[i]--;
    let bad = 0;
    for (let i = 0; i < px; i++) if (count[i] >= 7) bad++; // ≥ 7 transisi ≈ > 3 kedipan
    const frac = bad / px;
    if (frac > 0.03) {
      const t = +(f / fps).toFixed(2);
      if (!over.length || t - over[over.length - 1][1] > 0.05) over.push([t, t]);
      else over[over.length - 1][1] = t;
    }
    if (frac > worst) {
      worst = frac;
      worstAt = f;
    }
  }
  return { frames, worstAreaPct: +(worst * 100).toFixed(2), worstAtSec: +(worstAt / fps).toFixed(2), windowsOver3pct: over, pass: worst <= 0.03 };
}

const only = process.argv.slice(2);
const files = readdirSync(OUT).filter((f) => f.endsWith('.mp4') && (!only.length || only.some((o) => f.includes(o)))).sort();
const report = { generatedAt: new Date().toISOString(), files: {} };
for (const f of files) {
  const file = resolve(OUT, f);
  const p = await probe(file);
  const l = p.audio ? await loudness(file) : null;
  // kedipan cukup diperiksa sekali per video unik (versi audio lain memakai video yang sama)
  const fl = /-(tanpa-alat-musik|ambience)\.mp4$/.test(f) ? 'sama dengan versi musik' : await flashes(file, p.video.width, p.video.height, p.video.fps);
  report.files[f] = { ...p, loudness: l, flash: fl };
  console.log(`${f}\n  ${p.video.width}×${p.video.height} · ${p.video.fps} fps · ${p.video.codec}/${p.video.pixFmt} · ${p.duration} dtk · ${p.sizeMB} MB · ${p.bitrateMbps} Mbps`);
  if (l) console.log(`  audio ${p.audio.codec} ${p.audio.sampleRate} Hz ${p.audio.channels}ch ${p.audio.bitrateKbps} kbps · ${l.integratedLUFS} LUFS · ${l.truePeakDBTP} dBTP · LRA ${l.lraLU}`);
  console.log(`  kedipan: ${typeof fl === 'string' ? fl : `area terburuk ${fl.worstAreaPct}% @${fl.worstAtSec}s → ${fl.pass ? 'LOLOS' : `PERIKSA ${fl.windowsOver3pct.map(([a, z]) => `${a}–${z}s`).join(', ')}`}`}`);
}
// WAV audio (stem & mix)
const audioDir = resolve(OUT, 'audio');
report.audio = {};
for (const f of readdirSync(audioDir).filter((x) => x.endsWith('.wav'))) {
  report.audio[f] = await loudness(resolve(audioDir, f));
}
await writeFile(resolve(OUT, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log(`laporan: ${resolve(OUT, 'qa-report.json')}`);
