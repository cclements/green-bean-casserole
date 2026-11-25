// Fidelity: every quantity, temperature and time in the source recipe must appear in the built page,
// and every measured quantity on the page must come from the source (or be a °C conversion we derive).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const md = await readFile(new URL('../recipe/source.md', import.meta.url), 'utf8');
const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

const FRAC = { '¼': '1/4', '½': '1/2', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅛': '1/8' };
function norm(s) {
  return s
    .replace(/\$([^$]*)\$/g, (_, m) => m
      .replace(/\\text\{([^}]*)\}/g, '$1').replace(/\^\\circ/g, '°').replace(/\\rightarrow/g, '→')
      .replace(/\\beta/g, 'β').replace(/\^\{2\+\}/g, '²⁺'))
    .replace(/`/g, '')
    .replace(/(\d)([¼½¾⅓⅔⅛])/g, '$1 $2')
    .replace(/[¼½¾⅓⅔⅛]/g, (c) => FRAC[c])
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ');
}
function pageText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<i>[^<]*<\/i>/g, ' ') // batch labels (½ / Full) on sauce chips
    .replace(/<button class="tmr[\s\S]*?<\/button>/g, ' ') // timer controls are derived from the prose next to them
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, '’');
}

const UNIT = '(?:mg|mL|kg|g|lb|oz|°F|°C|%|minutes|minute|min|seconds|second|sec|hours|hour|Tbsp|tsp|cups|cup|quarts|quart|inches|inch|mm|L)(?![A-Za-z])';
const NUM = '\\d[\\d,.]*(?: \\d/\\d)?|\\d/\\d';
const TOKEN = new RegExp(`(?:${NUM})(?: ?(?:–|to) ?(?:${NUM}))? ?${UNIT}`, 'g');
const tokens = (s) => [...new Set(s.match(TOKEN) || [])].map((t) => t.replace(/ to /, ' to ').trim());
const loose = (s) => s.replace(/ /g, '');

const src = norm(md);
const out = norm(pageText(page));

test('every source quantity appears on the page', () => {
  const hay = loose(out);
  const missing = tokens(src).filter((t) => !hay.includes(loose(t)));
  assert.deepEqual(missing, [], `missing from page: ${missing.join(' | ')}`);
});

test('every page quantity comes from the source (°C conversions allowed)', () => {
  const hay = loose(src);
  const extra = tokens(out).filter((t) => !hay.includes(loose(t)) && !/°C$/.test(t));
  assert.deepEqual(extra, [], `on page but not in source: ${extra.join(' | ')}`);
});
