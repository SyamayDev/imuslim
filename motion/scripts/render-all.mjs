// Render semua deliverable video ke motion/out/.
//   node scripts/render-all.mjs                 → film, reel, teaser, ident
//   node scripts/render-all.mjs film            → hanya film
//   node scripts/render-all.mjs --encode-only   → lewati render Remotion, hanya encode/mux ulang
//   node scripts/render-all.mjs film --frames=0-119 --out=<dir>   → uji cepat
//
// Alur: Remotion → master (film: ProRes 4444 4K; lainnya: ProRes 422 HQ) → ffmpeg:
// H.264 (yuv420p, BT.709) + AAC 320 kbps dari WAV hasil scripts/audio/render-audio.mjs.
import { execFile } from 'node:child_process';
import { renameSync, statSync, unlinkSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { VARIANTS } from '../src/timeline.js';
import { ffmpegBin } from './ffmpeg-bin.mjs';

const run = promisify(execFile);
const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}`))?.split('=')[1] ?? (args.includes(`--${name}`) ? true : undefined);
const keys = args.filter((a) => !a.startsWith('--'));
const OUT = resolve(flag('out') ?? resolve(motion, 'out'));
const AUDIO = resolve(motion, 'out/audio');
const encodeOnly = Boolean(flag('encode-only'));
const frames = flag('frames')?.split('-').map(Number);
// --patch=a-b: render ulang hanya frame a..b lalu sambungkan ke master yang ada (ProRes = intra-frame,
// jadi penyambungan -c copy tepat per frame), kemudian encode/mux ulang seperti biasa.
const patch = flag('patch')?.split('-').map(Number);

const FFMPEG = ffmpegBin('ffmpeg');

/** Rencana keluaran tiap varian. */
const PLAN = {
  film: { scale: 2, master: { profile: '4444', pix: 'yuv444p10le' }, crf: 14, extra1080: true, audio: ['musik', 'tanpa-alat-musik', 'ambience'], label: '4k' },
  // Reel Instagram 90 dtk: versi 60 fps + versi 30 fps (frame rate yang dianjurkan Instagram).
  reel: { scale: 1, master: { profile: 'hq', pix: 'yuv422p10le' }, crf: 14, audio: ['musik', 'tanpa-alat-musik'], label: '1080x1920', extra30: true },
  teaser: { scale: 1, master: { profile: 'hq', pix: 'yuv422p10le' }, crf: 14, audio: ['musik', 'tanpa-alat-musik'], label: '1080x1080' },
  ident: { scale: 2, master: { profile: 'hq', pix: 'yuv422p10le' }, crf: 14, audio: ['musik', 'tanpa-alat-musik'], label: '4k' },
  // Loop hero web: tanpa suara, ≤ 2 MB → encode 2-pass dengan bitrate tetap.
  hero: { id: 'IMuslimHeroLoop', scale: 1, master: { profile: 'hq', pix: 'yuv422p10le' }, label: '1080p', loop: true },
};

const COLOR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

async function ff(argv) {
  const t0 = Date.now();
  await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { maxBuffer: 1 << 26 });
  return ((Date.now() - t0) / 1000).toFixed(0);
}
const mb = (f) => `${(statSync(f).size / 1e6).toFixed(1)} MB`;

const variants = keys.length ? keys : ['film', 'reel', 'teaser', 'ident'];
await mkdir(resolve(OUT, 'master'), { recursive: true });
let serveUrl;
for (const key of variants) {
  const plan = PLAN[key];
  const v = VARIANTS[key] ?? { id: plan.id };
  const name = `imuslim-${key}`;
  const master = resolve(OUT, 'master', `${name}-${plan.label}-master.mov`);
  if (!encodeOnly) {
    serveUrl ??= await bundle({ entryPoint: resolve(motion, 'src/index.js'), publicDir: resolve(motion, 'public') });
    const composition = await selectComposition({ serveUrl, id: v.id });
    const t0 = Date.now();
    let last = -1;
    await renderMedia({
      serveUrl,
      composition,
      codec: 'prores',
      proResProfile: plan.master.profile,
      pixelFormat: plan.master.pix,
      imageFormat: 'png',
      scale: plan.scale,
      muted: true,
      concurrency: plan.scale > 1 ? 12 : 16,
      frameRange: patch ?? frames ?? null,
      outputLocation: patch ? master.replace(/\.mov$/, '-patch.mov') : master,
      timeoutInMilliseconds: 120000,
      chromiumOptions: { gl: 'angle' },
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const pct = Math.floor(progress * 20) * 5;
        if (pct !== last) {
          last = pct;
          const el = (Date.now() - t0) / 1000;
          console.log(`  ${key} ${pct}% · render ${renderedFrames} · encode ${encodedFrames} · ${el.toFixed(0)} dtk`);
        }
      },
    });
    if (patch) {
      const piece = master.replace(/\.mov$/, '-patch.mov');
      const joined = master.replace(/\.mov$/, '-joined.mov');
      const list = master.replace(/\.mov$/, '-concat.txt');
      const fwd = (p) => p.split('\\').join('/');
      const parts = [];
      if (patch[0] > 0) parts.push(`file '${fwd(master)}'`, `outpoint ${(patch[0] / 60).toFixed(6)}`);
      parts.push(`file '${fwd(piece)}'`);
      if (patch[1] + 1 < v.durationInFrames) parts.push(`file '${fwd(master)}'`, `inpoint ${((patch[1] + 1) / 60).toFixed(6)}`);
      await writeFile(list, `${parts.join('\n')}\n`);
      await ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
      const { stdout } = await promisify(execFile)(ffmpegBin('ffprobe'), ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', joined]);
      if (Number(stdout.trim()) !== v.durationInFrames) throw new Error(`patch ${key}: ${stdout.trim()} frame, seharusnya ${v.durationInFrames}`);
      renameSync(joined, master);
      unlinkSync(piece);
      unlinkSync(list);
      console.log(`master ${key} ditambal (frame ${patch[0]}–${patch[1]}): ${mb(master)}`);
    } else console.log(`master ${key}: ${mb(master)} (${((Date.now() - t0) / 60000).toFixed(1)} mnt)`);
  }
  if (frames) continue; // uji cepat: tanpa mux audio

  if (plan.loop) {
    const passlog = resolve(OUT, 'master', `${name}-2pass`);
    const nul = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const mp4 = resolve(OUT, `${name}-${plan.label}.mp4`);
    const x264 = ['-c:v', 'libx264', '-preset', 'slow', '-b:v', '1600k', '-pix_fmt', 'yuv420p', '-profile:v', 'high', ...COLOR, '-an'];
    await ff(['-i', master, ...x264, '-pass', '1', '-passlogfile', passlog, '-f', 'mp4', nul]);
    await ff(['-i', master, ...x264, '-pass', '2', '-passlogfile', passlog, '-movflags', '+faststart', mp4]);
    console.log(`${mp4} ${mb(mp4)}`);
    const webm = resolve(OUT, `${name}-${plan.label}.webm`);
    const vp9 = ['-c:v', 'libvpx-vp9', '-b:v', '1500k', '-deadline', 'good', '-cpu-used', '1', '-row-mt', '1', '-pix_fmt', 'yuv420p', ...COLOR, '-an'];
    await ff(['-i', master, ...vp9, '-pass', '1', '-passlogfile', `${passlog}-vp9`, '-f', 'webm', nul]);
    await ff(['-i', master, ...vp9, '-pass', '2', '-passlogfile', `${passlog}-vp9`, webm]);
    console.log(`${webm} ${mb(webm)}`);
    continue;
  }

  // H.264 utama + audio pertama; versi audio lain menyalin video (tanpa encode ulang).
  const [first, ...rest] = plan.audio;
  const main = resolve(OUT, `${name}-${plan.label}.mp4`);
  const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(plan.crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high', ...COLOR, '-g', '120', '-bf', '3', '-movflags', '+faststart'];
  const aac = ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000'];
  let s = await ff(['-i', master, '-i', resolve(AUDIO, `${name}-${first}.wav`), '-map', '0:v:0', '-map', '1:a:0', ...enc, ...aac, '-shortest', main]);
  console.log(`${main} ${mb(main)} (${s} dtk)`);
  for (const ver of rest) {
    const out = resolve(OUT, `${name}-${plan.label}-${ver}.mp4`);
    s = await ff(['-i', main, '-i', resolve(AUDIO, `${name}-${ver}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', ...aac, '-shortest', '-movflags', '+faststart', out]);
    console.log(`${out} ${mb(out)} (${s} dtk)`);
  }
  if (plan.extra30) {
    const out = resolve(OUT, `${name}-${plan.label}-30fps.mp4`);
    s = await ff(['-i', master, '-i', resolve(AUDIO, `${name}-${first}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-r', '30', ...enc.map((x) => (x === '120' ? '60' : x)), ...aac, '-shortest', out]);
    console.log(`${out} ${mb(out)} (${s} dtk)`);
  }
  if (plan.extra1080) {
    const out = resolve(OUT, `${name}-1080p.mp4`);
    s = await ff(['-i', master, '-i', resolve(AUDIO, `${name}-${first}.wav`), '-map', '0:v:0', '-map', '1:a:0', '-vf', 'scale=1920:1080:flags=lanczos', ...enc.map((x) => (x === String(plan.crf) ? '17' : x)), ...aac, '-shortest', out]);
    console.log(`${out} ${mb(out)} (${s} dtk)`);
  }
}
