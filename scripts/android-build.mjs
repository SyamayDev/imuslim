// Membuat aplikasi Android iMuslim (APK) dari kode web yang sama, dibungkus Capacitor.
//
//   npm run android:build                    APK rilis bertanda tangan → public/download/imuslim.apk
//                                            (+ info versinya di public/download/android.json)
//   npm run android:build -- --debug         APK debug (WebView bisa diperiksa lewat chrome://inspect)
//   npm run android:build -- --new-keystore  buat kunci tanda tangan rilis baru — HANYA sekali di awal
//
// Butuh JDK 17–24 (otomatis memakai JBR bawaan Android Studio) dan Android SDK dengan platform 36.
// Kunci tanda tangan disimpan di ~/.imuslim/android/ (di luar repo). Cadangkan folder itu:
// tanpa kunci yang sama, pembaruan tidak bisa dipasang di atas aplikasi yang sudah terpasang.
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { copyFile, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const args = new Set(process.argv.slice(2));
const DEBUG = args.has('--debug');
const WIN = process.platform === 'win32';
const KEY_DIR = join(homedir(), '.imuslim', 'android');
const KEY_FILE = join(KEY_DIR, 'imuslim-release.jks');
const KEY_PROPS = join(KEY_DIR, 'keystore.properties');
const FULL_OUT = 'dist-native-full';
const WEB_DIR = join(root, 'dist-native');
const MIN_ANDROID = '7.0'; // minSdk 24 (android/variables.gradle)

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: WIN && !cmd.includes('\\'), ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} gagal (kode ${r.status ?? r.error?.message})`);
  return r;
}

function javaVersion(home) {
  const java = join(home, 'bin', WIN ? 'java.exe' : 'java');
  if (!existsSync(java)) return 0;
  const out = spawnSync(java, ['-version'], { encoding: 'utf8' });
  const m = /version "(\d+)/.exec(`${out.stderr}${out.stdout}`);
  return m ? Number(m[1]) : 0;
}

function findJdk() {
  const candidates = [
    process.env.JAVA_HOME_ANDROID,
    'C:/Program Files/Android/Android Studio/jbr',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    '/opt/android-studio/jbr',
    process.env.JAVA_HOME,
  ].filter(Boolean);
  for (const c of candidates) {
    const v = javaVersion(c);
    if (v >= 17 && v <= 24) return c;
  }
  throw new Error('JDK 17–24 tidak ditemukan (Gradle 8.14 belum mendukung Java 25). Pasang Android Studio atau set JAVA_HOME_ANDROID.');
}

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    join(homedir(), 'Library', 'Android', 'sdk'),
    join(homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(join(c, 'platforms', 'android-36'))) return c;
  throw new Error('Android SDK dengan "platforms;android-36" tidak ditemukan. Pasang lewat Android Studio → SDK Manager, atau set ANDROID_HOME.');
}

function parseProps(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

async function ensureKeystore(jdk) {
  const keytool = join(jdk, 'bin', WIN ? 'keytool.exe' : 'keytool');
  if (!existsSync(KEY_FILE)) {
    if (!args.has('--new-keystore')) {
      throw new Error(
        `Kunci tanda tangan tidak ditemukan di ${KEY_FILE}.\n` +
          '  • Bila iMuslim sudah pernah dirilis: kembalikan folder ~/.imuslim/android dari cadangan.\n' +
          '  • Bila ini rilis pertama: jalankan "npm run android:build -- --new-keystore".',
      );
    }
    await mkdir(KEY_DIR, { recursive: true });
    const pass = randomBytes(24).toString('base64url');
    run(keytool, ['-genkeypair', '-keystore', KEY_FILE, '-storetype', 'PKCS12', '-alias', 'imuslim', '-keyalg', 'RSA', '-keysize', '4096', '-validity', '36500', '-storepass', pass, '-keypass', pass, '-dname', 'CN=iMuslim, OU=SyamayDev, C=ID'], { shell: false });
    await writeFile(KEY_PROPS, `# Kunci tanda tangan rilis iMuslim Android — RAHASIA, cadangkan bersama .jks\nstorePassword=${pass}\nkeyPassword=${pass}\nkeyAlias=imuslim\n`);
    console.log(`\n✔ Kunci tanda tangan baru dibuat di ${KEY_DIR}\n  CADANGKAN folder ini (mis. ke penyimpanan pribadi). Jangan dimasukkan ke Git.\n`);
  }
  const props = parseProps(await readFile(KEY_PROPS, 'utf8'));
  // android/keystore.properties (diabaikan Git) menunjuk ke kunci di luar repo.
  await writeFile(
    join(androidDir, 'keystore.properties'),
    `storeFile=${KEY_FILE.replace(/\\/g, '/')}\nstorePassword=${props.storePassword}\nkeyPassword=${props.keyPassword}\nkeyAlias=${props.keyAlias}\n`,
  );
  const list = spawnSync(keytool, ['-list', '-v', '-keystore', KEY_FILE, '-storepass', props.storePassword, '-alias', props.keyAlias], { encoding: 'utf8' });
  const fp = /SHA256:\s*([0-9A-F:]+)/.exec(list.stdout ?? '');
  if (!fp) throw new Error('Sidik jari sertifikat tidak terbaca dari kunci tanda tangan.');
  return fp[1];
}

function latestBuildTools(sdk) {
  const dir = join(sdk, 'build-tools');
  const versions = readdirSync(dir).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
  versions.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return join(dir, versions.at(-1));
}

const t0 = Date.now();
const jdk = findJdk();
const sdk = findSdk();
console.log(`JDK: ${jdk}\nSDK: ${sdk}\nMode: ${DEBUG ? 'debug' : 'rilis'}`);
await writeFile(join(androidDir, 'local.properties'), `sdk.dir=${sdk.replace(/\\/g, '/')}\n`);
const certSha256 = DEBUG ? null : await ensureKeystore(jdk);

// 1. Build web versi aplikasi (base "/", kode native aktif) ke folder terpisah agar dist/ web tidak tertimpa.
const env = { ...process.env, CAP_BUILD: '1', OUT_DIR: FULL_OUT, PRERENDER_DATA: '0' };
delete env.VERCEL;
delete env.BASE_PATH;
run('npm', ['run', 'build'], { env });

// 2. Aplikasi selalu dibuka dari "/" lalu bernavigasi di klien: cukup beranda + aset.
//    (Tanpa 500+ halaman prerender, sitemap, service worker, dan APK lama di download/.)
await rm(WEB_DIR, { recursive: true, force: true });
await mkdir(WEB_DIR, { recursive: true });
for (const name of ['index.html', 'assets', 'audio', 'brand', 'icons', 'favicon.svg', 'manifest.webmanifest']) {
  const from = join(root, FULL_OUT, name);
  if (existsSync(from)) await cp(from, join(WEB_DIR, name), { recursive: true });
}
await rm(join(root, FULL_OUT), { recursive: true, force: true });

// 3. Salin ke proyek Android & perbarui plugin.
run('npx', ['cap', 'sync', 'android']);

// 4. Kompilasi.
const gradlew = join(androidDir, WIN ? 'gradlew.bat' : 'gradlew');
run(gradlew, [DEBUG ? 'assembleDebug' : 'assembleRelease', '--console=plain'], { cwd: androidDir, env: { ...process.env, JAVA_HOME: jdk }, shell: WIN });

const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', DEBUG ? 'debug' : 'release', DEBUG ? 'app-debug.apk' : 'app-release.apk');
if (!existsSync(apk)) throw new Error(`APK tidak ditemukan: ${apk}`);

if (DEBUG) {
  console.log(`\n✔ APK debug: ${apk} (${((await stat(apk)).size / 1048576).toFixed(1)} MB, ${Math.round((Date.now() - t0) / 1000)} dtk)`);
} else {
  // 5. Verifikasi tanda tangan, lalu terbitkan bersama info versinya.
  const apksigner = join(latestBuildTools(sdk), WIN ? 'apksigner.bat' : 'apksigner');
  const verify = spawnSync(apksigner, ['verify', '--print-certs', apk], { encoding: 'utf8', shell: WIN, env: { ...process.env, JAVA_HOME: jdk, PATH: `${join(jdk, 'bin')}${WIN ? ';' : ':'}${process.env.PATH}` } });
  const signedFp = /SHA-256 digest:\s*([0-9a-f]+)/.exec(verify.stdout ?? '')?.[1];
  if (verify.status !== 0 || !signedFp || signedFp.toUpperCase() !== certSha256.replace(/:/g, '')) {
    throw new Error(`Verifikasi tanda tangan APK gagal:\n${verify.stdout}${verify.stderr}`);
  }
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const [maj, min, patch] = pkg.version.split('.').map((n) => parseInt(n, 10));
  const bytes = await readFile(apk);
  const info = {
    versionName: pkg.version,
    versionCode: maj * 10000 + min * 100 + patch,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    minAndroid: MIN_ANDROID,
    certSha256,
    builtAt: new Date().toISOString(),
  };
  await mkdir(join(root, 'public', 'download'), { recursive: true });
  await copyFile(apk, join(root, 'public', 'download', 'imuslim.apk'));
  await writeFile(join(root, 'public', 'download', 'android.json'), `${JSON.stringify(info, null, 2)}\n`);
  console.log(
    `\n✔ APK rilis ${info.versionName} (versionCode ${info.versionCode}) — ${(info.size / 1048576).toFixed(1)} MB, ${Math.round((Date.now() - t0) / 1000)} dtk\n` +
      `  public/download/imuslim.apk · sha256 ${info.sha256}\n  sertifikat ${certSha256}`,
  );
}
