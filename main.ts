// Vice City Platinum Log — a working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json (55 trophies, 1 platinum). The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// The guide itself: every trophy has its official name, description and grade, a guide in our own words with cited
// steps, a missable flag, and a source matrix — see app/data/trophies.json and app/data/roadmap.json.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight (M5, revisi ke-2 main.ts): fail the build with a clear message
// before copying anything, so a bad data file or an over-cap screenshot can
// never ship. Checks: trophies.json exists + parses + 55 trophies + every
// guide non-empty; screenshots/ holds exactly 4 whole PNG/JPEG files, each
// at most 256 KiB (262144 bytes, the scorer's screenshots cap).
function preflightFail(msg: string): never {
  throw new Error(`Vice City Platinum Log pre-flight FAILED: ${msg}`);
}

let trophyData;
try {
  trophyData = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
} catch (err) {
  preflightFail(`app/data/trophies.json is missing or not valid JSON (${(err as Error).message}).`);
}
if (!Array.isArray(trophyData.trophies) || trophyData.trophies.length !== 55) {
  preflightFail(`app/data/trophies.json must hold 55 trophies, found ${Array.isArray(trophyData.trophies) ? trophyData.trophies.length : 'no trophies array'}.`);
}
const emptyGuides = trophyData.trophies
  .filter((t) => typeof t.guide !== 'string' || !t.guide.trim())
  .map((t) => t.id ?? t.name ?? '(unknown)');
if (emptyGuides.length) {
  preflightFail(`trophies with an empty guide: ${emptyGuides.join(', ')}.`);
}

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) preflightFail('screenshots/ is missing — take the 4 screenshots first.');
const shotFiles = readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
if (shotFiles.length !== 4) {
  preflightFail(`expected 4 screenshots in screenshots/, found ${shotFiles.length}: ${shotFiles.join(', ') || '(none)'}.`);
}
for (const f of shotFiles) {
  const buf = readFileSync(join(shotsDir, f));
  const isPng = buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isPng && !isJpeg) preflightFail(`${f} is not a whole PNG or JPEG file.`);
  if (buf.length > 262144) preflightFail(`${f} is ${buf.length} bytes — over the 256 KiB (262144 B) screenshots cap.`);
}

// Vice City Platinum Log: report the guide's trophy count at build time so a wrong data file is visible immediately.
console.log(`Vice City Platinum Log: ${trophyData.trophies.length} trophies, ${trophyData.sources.length} sources.`);
console.log(`Pre-flight OK: 55 trophies with guides, 4 screenshots ≤256 KiB (${shotFiles.join(', ')}).`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
