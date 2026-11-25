// Pure helpers shared by the page and the tests. No DOM access here.

export const PREP_DAY = [2026, 10, 25]; // Wed 25 Nov 2026 (month is 0-based)
export const SERVE_DAY = [2026, 10, 26]; // Thanksgiving, Thu 26 Nov 2026

/** °F → °C, rounded to the nearest whole degree (matches the recipe's printed values). */
export function fToC(f) {
  return Math.round(((f - 32) * 5) / 9);
}

/**
 * Format a temperature spec in °F or °C.
 * spec: "165-175" (range), "170" (single) or "165+" (at least).
 */
export function formatTemp(spec, unit) {
  const plus = spec.endsWith('+');
  const parts = spec.replace('+', '').split('-').map(Number);
  const conv = unit === 'C' ? parts.map(fToC) : parts;
  const sym = unit === 'C' ? '°C' : '°F';
  return conv.join('–') + sym + (plus ? '+' : '');
}

function dayKey(d) {
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

/** Which part of the plan a local date falls in. */
export function modeForDate(d) {
  const k = dayKey(d);
  const prep = PREP_DAY[0] * 10000 + PREP_DAY[1] * 100 + PREP_DAY[2];
  const serve = SERVE_DAY[0] * 10000 + SERVE_DAY[1] * 100 + SERVE_DAY[2];
  if (k < prep) return 'before';
  if (k === prep) return 'prep';
  if (k === serve) return 'day';
  return 'after';
}

/** Clock times for each "T-minus N minutes" offset before the serving time. */
export function countdown(serve, offsets) {
  return offsets.map((m) => new Date(serve.getTime() - m * 60000));
}

/** "3:05 PM" */
export function formatClock(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

/** "1m30s" → 90. Unknown input → 0. */
export function parseDuration(str) {
  const re = /(\d+(?:\.\d+)?)\s*([hms])/g;
  let total = 0;
  let matched = false;
  for (const [, n, u] of String(str).matchAll(re)) {
    matched = true;
    total += Number(n) * (u === 'h' ? 3600 : u === 'm' ? 60 : 1);
  }
  return matched ? Math.round(total) : 0;
}

/** Seconds → "m:ss" or "h:mm:ss" (never negative). */
export function formatRemaining(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
