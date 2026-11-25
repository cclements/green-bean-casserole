// Fetches the latest fonts (Google Fonts, latin subset, woff2) and Lucide icons into vendor/.
// Run once when bumping versions: `npm run vendor`. The page itself never touches the network.
import { mkdir, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const root = new URL('../vendor/', import.meta.url);
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36';

const FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..800,0..100;1,9..144,300..800,0..100' +
  '&family=Geist:wght@300..700' +
  '&family=Geist+Mono:wght@400..600' +
  '&display=swap';

export const ICONS = [
  'flame', 'timer', 'timer-reset', 'thermometer', 'check', 'circle-check', 'shopping-basket',
  'chef-hat', 'utensils', 'clock', 'alarm-clock', 'moon', 'sun', 'sun-moon', 'list-checks', 'scale',
  'flask-conical', 'droplets', 'snowflake', 'bean', 'refrigerator', 'share', 'copy', 'printer',
  'rotate-ccw', 'chevron-left', 'chevron-right', 'chevron-down', 'x', 'play', 'pause', 'volume-2',
  'volume-x', 'info', 'triangle-alert', 'lightbulb', 'calendar-clock', 'arrow-right', 'wheat',
  'cooking-pot', 'microwave', 'sparkles', 'sliders-horizontal', 'bell-ring', 'hand-platter',
  'party-popper', 'life-buoy', 'shield-check', 'maximize-2', 'plus', 'minus', 'house', 'leaf',
  'square-check-big', 'square', 'notebook-pen', 'wrench', 'gauge', 'circle-help', 'eye', 'zap',
  'blend', 'milk', 'layers', 'scroll-text', 'sparkle', 'heart-handshake', 'smartphone',
];

async function fonts() {
  const css = await (await fetch(FONTS, { headers: { 'User-Agent': UA } })).text();
  // Keep only the /* latin */ blocks (smallest subset covering the recipe's characters).
  const blocks = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter((b) => b.startsWith('/* latin */'));
  await mkdir(new URL('fonts/', root), { recursive: true });
  const faces = [];
  for (const b of blocks) {
    const family = b.match(/font-family: '([^']+)'/)[1];
    const style = b.match(/font-style: (\w+)/)[1];
    const weight = b.match(/font-weight: ([\d ]+)/)[1].trim();
    const url = b.match(/url\((https:[^)]+)\)/)[1];
    const range = b.match(/unicode-range: ([^;]+);/)[1];
    const file = `${family.replace(/\s+/g, '')}-${style}.woff2`;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(new URL(`fonts/${file}`, root), buf);
    faces.push({ family, style, weight, file, range, bytes: buf.length });
  }
  await writeFile(new URL('fonts/fonts.json', root), JSON.stringify(faces, null, 2));
  console.log('fonts', faces.map((f) => `${f.file} ${(f.bytes / 1024).toFixed(0)}KB`).join(', '));
}

async function icons() {
  const version = execSync('npm view lucide-static version').toString().trim();
  await mkdir(new URL('icons/', root), { recursive: true });
  const missing = [];
  for (const name of ICONS) {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@${version}/icons/${name}.svg`);
    if (!res.ok) { missing.push(name); continue; }
    await writeFile(new URL(`icons/${name}.svg`, root), await res.text());
  }
  await writeFile(new URL('icons/VERSION', root), `lucide-static@${version}\n`);
  console.log(`lucide-static@${version}: ${ICONS.length - missing.length} icons`, missing.length ? `missing: ${missing}` : '');
}

await Promise.all([fonts(), icons()]);
