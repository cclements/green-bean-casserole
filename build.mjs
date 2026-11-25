// Builds the single self-contained index.html from src/ + vendor/.
// Usage: node build.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const r = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const fmtTemp = (spec, unit) => {
  const plus = spec.endsWith('+');
  const parts = spec.replace('+', '').split('-').map(Number);
  const conv = unit === 'C' ? parts.map((f) => Math.round(((f - 32) * 5) / 9)) : parts;
  return conv.join('–') + (unit === 'C' ? '°C' : '°F') + (plus ? '+' : '');
};
const secs = (str) => {
  let t = 0;
  for (const [, n, u] of str.matchAll(/(\d+)([hms])/g)) t += +n * (u === 'h' ? 3600 : u === 'm' ? 60 : 1);
  return t;
};
const one = (s) => (s >= 3600 && s % 3600 === 0 ? `${s / 3600} h` : s < 120 ? `${s} s` : s % 60 === 0 ? `${s / 60} min` : s % 60 === 30 ? `${Math.floor(s / 60)}½ min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
const span = (a, b) => {
  if (!b) return one(a);
  if (a < 120 && b <= 120) return `${a}–${b} s`;
  if (a % 60 === 0 && b % 60 === 0) return `${a / 60}–${b / 60} min`;
  return `${one(a).replace(' min', '')}–${one(b)}`;
};
const slug = (s) => s.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const icon = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;

let html = await r('src/index.html');
const css = await r('src/styles.css');
const logic = (await r('src/logic.js')).replace(/^export /gm, '');
const app = (await r('src/app.js')).replace(/^import .*$/m, '');

// Templates
html = html.replace(/\{\{t:([\d+-]+)\}\}/g, (_, spec) =>
  `<span class="t" data-f="${spec}"><span class="tf">${fmtTemp(spec, 'F')}</span><span class="tc">${fmtTemp(spec, 'C')}</span></span>`);
html = html.replace(/\{\{timer:([0-9hms]+)(?:-([0-9hms]+))?\|([^}]+)\}\}/g, (_, a, b, label) => {
  const min = secs(a), max = b ? secs(b) : 0;
  return `<button class="tmr js-only" type="button" data-id="${slug(label)}" data-dur="${min}"${max ? ` data-max="${max}"` : ''} data-label="${label}" aria-label="Start timer: ${label}, ${span(min, max)}">${icon('timer')}${span(min, max)}</button>`;
});
html = html.replace(/\{\{icon:([a-z0-9-]+)\}\}/g, (_, n) => icon(n));

// Checkboxes
const counters = {};
const labelFor = (k, n) => (/^s\d+$/.test(k) ? `Step ${k.slice(1)}.${n} done` : k === 'shop' ? 'In the cart' : k.startsWith('ing') ? 'Measured' : 'Done');
html = html.replace(/<li([^>]*?)\sdata-c="([^"]+)"([^>]*)>/g, (_, pre, k, post) => {
  const n = (counters[k] = (counters[k] || 0) + 1);
  const key = `${k}-${n}`;
  const num = /^s\d+$/.test(k) ? n : '';
  return `<li${pre}${post} id="c-${key}"><label class="chk-wrap"><input type="checkbox" class="chk" data-key="${key}" aria-label="${labelFor(k, n)}"><span class="chk-box" aria-hidden="true"><b>${num}</b>${icon('check')}</span></label>`;
});

// Low-quality image placeholders (blur-up + offline fallback)
html = await (async () => {
  let out = html;
  for (const [, name] of html.matchAll(/data-lqip="([a-z-]+)"/g)) {
    const p = new URL(`img/lqip/${name}.webp`, import.meta.url);
    if (!existsSync(p)) continue;
    const b64 = (await readFile(p)).toString('base64');
    out = out.replace(`data-lqip="${name}"`, `data-lqip="${name}" style="background-image:url(data:image/webp;base64,${b64})"`);
  }
  return out;
})();

// Icon sprite (only icons that are used)
const used = new Set([...html.matchAll(/#i-([a-z0-9-]+)/g)].map((m) => m[1]));
for (const [, args] of app.matchAll(/tIcon\(([^)]*)\)/g)) for (const [, n] of args.matchAll(/'([a-z0-9-]+)'/g)) used.add(n);
const symbols = [];
for (const n of [...used].sort()) {
  const p = new URL(`vendor/icons/${n}.svg`, import.meta.url);
  if (!existsSync(p)) throw new Error(`missing icon: ${n}`);
  const inner = (await readFile(p, 'utf8')).replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  symbols.push(`<symbol id="i-${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner.replace(/\s*\n\s*/g, '')}</symbol>`);
}
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${symbols.join('')}</svg>`;

// Fonts
const faces = JSON.parse(await r('vendor/fonts/fonts.json'));
const fontCss = (await Promise.all(faces.map(async (f) => {
  const b64 = (await readFile(new URL(`vendor/fonts/${f.file}`, import.meta.url))).toString('base64');
  return `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${f.range}}`;
}))).join('\n');

html = html
  .replace('/* @fonts */', () => fontCss)
  .replace('/* @inline:css */', () => css)
  .replace('<!-- @inline:sprite -->', () => sprite)
  .replace('/* @inline:js */', () => `${logic}\n${app}`);

const left = html.match(/\{\{[^}]*\}\}/);
if (left) throw new Error(`unexpanded template: ${left[0]}`);
await writeFile(new URL('index.html', import.meta.url), html);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB · ${used.size} icons · ${Object.values(counters).reduce((a, b) => a + b, 0)} checkboxes`);
