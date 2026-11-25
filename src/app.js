import { formatTemp, modeForDate, countdown, formatClock, formatRemaining } from './logic.js';

// Everything here enhances static HTML that already reads fine on its own.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const KEY = 'gbc-v1';

/* ─────────── Storage (never throws) ─────────── */
const store = (() => {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { data = {}; }
  data.checks ??= {}; data.settings ??= {}; data.timers ??= [];
  let t;
  const save = () => { clearTimeout(t); t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }, 80); };
  return { data, save };
})();
const S = store.data;

const defaults = { units: 'both', temp: 'F', stock: 'kirkland', batch: 'half', finish: 'A', theme: 'auto', day: 'auto', serve: '16:00' };
const setting = (k) => S.settings[k] ?? defaults[k];

function toast(msg) {
  const host = $('dialog[open]') || document.body;
  const el = document.createElement('div');
  el.className = 'toast'; el.role = 'status'; el.textContent = msg;
  host.append(el);
  setTimeout(() => el.remove(), 2600);
}

// View transitions are polish only: the update must always run, even if a transition is skipped,
// interrupted by another one, or refused because the page is in the background.
let vtBusy = false;
function transition(fn) {
  if (!document.startViewTransition || document.hidden || vtBusy || matchMedia('(prefers-reduced-motion: reduce)').matches) { fn(); return; }
  vtBusy = true;
  let ran = false;
  const run = () => { if (!ran) { ran = true; fn(); } };
  try {
    const vt = document.startViewTransition(run);
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    vt.finished.catch(() => {}).finally(() => { vtBusy = false; run(); });
  } catch { vtBusy = false; run(); }
}

/* ─────────── Settings & segmented controls ─────────── */
function applySettings() {
  for (const k of ['units', 'temp', 'stock', 'batch', 'finish']) root.dataset[k] = setting(k);
  const theme = setting('theme');
  if (theme === 'auto') delete root.dataset.theme; else root.dataset.theme = theme;
  for (const b of $$('[data-set]')) b.setAttribute('aria-checked', String(setting(b.dataset.set) === b.dataset.value));
  applyMode();
  updateTitlesForTemp();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-set]');
  if (!b) return;
  S.settings[b.dataset.set] = b.dataset.value;
  store.save();
  transition(applySettings);
});

function updateTitlesForTemp() {
  const unit = setting('temp');
  for (const t of $$('.t[data-f]')) t.title = formatTemp(t.dataset.f, unit === 'F' ? 'C' : 'F');
}

/* ─────────── Day mode ─────────── */
function currentMode() {
  const o = setting('day');
  if (o === 'prep' || o === 'serve') return o;
  const m = modeForDate(new Date());
  return m === 'day' ? 'serve' : m;
}
const TODAY = {
  prep: ['Today · Wednesday, Nov 25', 'It’s prep day', 'About 110–135 minutes of hands-on work. Everything you make today keeps until tomorrow—start the shallots in cold oil and the rest falls into place.'],
  serve: ['Today · Thanksgiving', 'Finish in 30 minutes', 'Set when you’re eating and the countdown turns into clock times, with an alert at each step.'],
  before: ['Coming up', 'Shop first, then prep on Wednesday', 'Prep day is Wednesday, Nov 25 (about 110–135 minutes). Thanksgiving takes about 25–30 minutes.'],
  after: ['Leftovers', 'Thanks for cooking', 'Refrigerate within 2 hours and enjoy within 3 days of initial prep. Scrape off softened toppings before microwaving and top with reserved dry shallots if available.'],
};
function applyMode() {
  const m = currentMode();
  root.dataset.mode = m;
  const [eyebrow, title, sub] = TODAY[m] || TODAY.before;
  $('[data-today-eyebrow]').textContent = eyebrow;
  $('[data-today-title]').textContent = title;
  $('[data-today-sub]').textContent = sub;
}

/* ─────────── Checkboxes ─────────── */
const groups = {
  prep: () => $$('#prep .subs .chk'),
  serve: () => $$('#serve .subs .chk'),
  shop: () => $$('#shop .chk'),
  gear: () => $$('#gear .chk'),
};
function restoreChecks() {
  for (const c of $$('.chk')) c.checked = !!S.checks[c.dataset.key];
}
function setCheck(c, on) {
  c.checked = on;
  if (on) S.checks[c.dataset.key] = Date.now(); else delete S.checks[c.dataset.key];
  store.save();
  refreshProgress();
}
document.addEventListener('change', (e) => {
  const c = e.target.closest('.chk');
  if (c) setCheck(c, c.checked);
});
// Whole-row toggling for lists (not for recipe steps, which hold timers and long text).
document.addEventListener('click', (e) => {
  const row = e.target.closest('.checklist > li, .ings > li');
  if (!row || e.target.closest('.chk-wrap, button, a, input, summary')) return;
  if (getSelection()?.toString()) return;
  const c = $('.chk', row);
  if (c) setCheck(c, !c.checked);
});

function refreshProgress() {
  for (const [name, get] of Object.entries(groups)) {
    const all = get();
    const done = all.filter((c) => c.checked).length;
    for (const p of $$(`[data-progress="${name}"]`)) {
      $('.bar i', p).style.setProperty('--p', all.length ? (done / all.length) * 100 : 0);
      const unit = name === 'shop' ? 'in the cart' : 'done';
      $('.label', p).textContent = `${done} of ${all.length} ${unit}`;
    }
    for (const n of $$(`[data-count="${name}"]`)) n.textContent = done ? `${done}/${all.length}` : '';
  }
  for (const step of $$('.step')) {
    const cs = $$('.subs .chk', step);
    step.classList.toggle('done', cs.length > 0 && cs.every((c) => c.checked));
  }
  const fin = $('[data-finale]');
  if (fin) fin.hidden = !$$('#step-10 .chk').every((c) => c.checked);
}

$('[data-reset]')?.addEventListener('click', () => {
  if (!confirm('Clear every checkmark (shopping, equipment, ingredients and steps)? Settings and timers stay.')) return;
  S.checks = {};
  store.save();
  restoreChecks();
  refreshProgress();
  toast('All checkmarks cleared');
});

/* ─────────── Shopping list: share / copy ─────────── */
function listText() {
  const lines = ['Green bean casserole — still to buy:'];
  for (const g of $$('.shop-group')) {
    const items = $$('li', g).filter((li) => !$('.chk', li).checked);
    if (!items.length) continue;
    lines.push('', g.querySelector('h3').textContent.trim().toUpperCase());
    for (const li of items) {
      const name = $('b', li).textContent.trim();
      const q = $('.q', li)?.textContent.trim();
      lines.push(`☐ ${name}${q ? ` — ${q}` : ''}`);
    }
  }
  return lines.length > 1 ? lines.join('\n') : 'Everything is in the cart!';
}
async function copyList() {
  try { await navigator.clipboard.writeText(listText()); toast('Shopping list copied'); } catch { toast('Couldn’t copy on this device'); }
}
$('[data-copy-list]')?.addEventListener('click', copyList);
$('[data-share-list]')?.addEventListener('click', async () => {
  if (navigator.share) {
    try { await navigator.share({ title: 'Green bean casserole shopping list', text: listText() }); } catch {}
  } else copyList();
});

/* ─────────── Sound, vibration, notifications ─────────── */
let audio;
function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {}
}
function chime(urgent = false) {
  if (!audio) return;
  const now = audio.currentTime;
  const notes = urgent ? [988, 1319, 988, 1319] : [784, 1175];
  notes.forEach((f, i) => {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t = now + i * 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(audio.destination);
    o.start(t); o.stop(t + 0.65);
  });
}
function notify(title, body) {
  try { navigator.vibrate?.([220, 120, 220, 120, 400]); } catch {}
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready.then((r) => r.showNotification(title, { body, icon: 'icon-512.png', tag: title, renotify: true }))
        .catch(() => new Notification(title, { body }));
    }
  } catch {}
}
$('[data-notify]')?.addEventListener('click', async () => {
  unlockAudio(); chime();
  if (!('Notification' in window)) { toast('This browser can’t show alerts; timers will chime here instead'); return; }
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Timer alerts are on' : 'Alerts are off; timers will still chime');
});

/* ─────────── Timers ─────────── */
// A timer: { id, label, end (ms), check (ms|null), total (s), kind: 'timer'|'alarm', paused: remaining-ms|null, fired: 0|1|2 }
const timers = S.timers;
const dock = $('#dock');
const tIcon = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;

function startTimer({ id, label, dur, max, kind = 'timer', end }) {
  unlockAudio();
  const now = Date.now();
  const existing = timers.find((t) => t.id === id);
  if (existing && !existing.fired) { toast(`${label} is already running`); flashChip(id); return; }
  if (existing) timers.splice(timers.indexOf(existing), 1);
  const total = max || dur;
  timers.push({
    id, label, kind, total,
    end: end ?? now + total * 1000,
    check: max ? now + dur * 1000 : null,
    paused: null, fired: 0,
  });
  store.save();
  renderDock(true);
}
function flashChip(id) {
  const el = dock.querySelector(`[data-id="${CSS.escape(id)}"]`);
  el?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 400 });
}
function removeTimer(id) {
  const i = timers.findIndex((t) => t.id === id);
  if (i >= 0) timers.splice(i, 1);
  store.save();
  renderDock(true);
}
function visibleTimers() {
  const alarms = timers.filter((t) => t.kind === 'alarm').sort((a, b) => a.end - b.end);
  const nextAlarm = alarms.find((t) => !t.fired);
  return timers.filter((t) => t.kind !== 'alarm' || t.fired || t === nextAlarm);
}
function renderDock(animate) {
  const draw = () => {
    dock.innerHTML = '';
    for (const t of visibleTimers()) {
      const el = document.createElement('div');
      el.className = 'timer-chip';
      el.dataset.id = t.id;
      el.innerHTML = `<span class="tl"></span><span class="tr"></span>
        <span class="tb">
          ${t.kind === 'timer' ? `<button type="button" data-act="plus" aria-label="Add 30 seconds">+30</button>
          <button type="button" data-act="pause" aria-label="Pause or resume">${tIcon(t.paused ? 'play' : 'pause')}</button>` : ''}
          <button type="button" data-act="x" aria-label="Dismiss timer">${tIcon('x')}</button>
        </span><span class="tbar"><i></i></span>`;
      dock.append(el);
    }
    tick();
  };
  animate ? transition(draw) : draw();
  for (const b of $$('.tmr')) b.classList.toggle('running', timers.some((t) => t.id === b.dataset.id && !t.fired));
}
dock.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.closest('.timer-chip').dataset.id;
  const t = timers.find((x) => x.id === id);
  if (!t) return;
  const now = Date.now();
  if (b.dataset.act === 'x') return removeTimer(id);
  if (b.dataset.act === 'plus') {
    if (t.paused) t.paused += 30000;
    else { const base = Math.max(t.end, now); t.end = base + 30000; if (t.fired) { t.fired = 0; t.check = null; } }
  }
  if (b.dataset.act === 'pause') {
    if (t.paused) { t.end = now + t.paused; if (t.check) t.check = now + t.pausedCheck; t.paused = null; }
    else { t.paused = Math.max(0, t.end - now); t.pausedCheck = t.check ? Math.max(0, t.check - now) : 0; }
  }
  store.save();
  renderDock(false);
});
$$('.tmr').forEach((b) => b.addEventListener('click', () => {
  startTimer({ id: b.dataset.id, label: b.dataset.label, dur: +b.dataset.dur, max: +b.dataset.max || 0 });
}));

let lastRing = 0;
function tick() {
  const now = Date.now();
  let ringing = false;
  for (const t of timers) {
    const left = t.paused ?? t.end - now;
    // Phase changes fire once each: 1 = "check now" (range start), 2 = time's up.
    if (!t.paused && t.check && now >= t.check && t.fired < 1) { t.fired = 1; chime(); notify(`Check now: ${t.label}`, 'The range has started.'); store.save(); }
    if (!t.paused && left <= 0 && t.fired < 2) { t.fired = 2; chime(true); notify(t.kind === 'alarm' ? t.label : `Time’s up: ${t.label}`, 'Green bean casserole'); store.save(); }
    if (t.fired === 2 && now - t.end < 120000) ringing = true;
  }
  if (ringing && now - lastRing > 5000) { lastRing = now; chime(true); }
  for (const el of dock.children) {
    const t = timers.find((x) => x.id === el.dataset.id);
    if (!t) continue;
    const left = (t.paused ?? t.end - now) / 1000;
    const inCheck = t.check && now >= t.check && left > 0 && !t.paused;
    el.classList.toggle('done', t.fired === 2);
    el.classList.toggle('check', !!inCheck);
    el.classList.toggle('paused', !!t.paused);
    const pb = $('[data-act="pause"]', el);
    if (pb) pb.hidden = t.fired === 2;
    $('.tl', el).textContent = t.fired === 2 ? (t.kind === 'alarm' ? 'Now' : 'Time’s up') + ' · ' + t.label : inCheck ? `Check now · ${t.label}` : t.label;
    const tr = $('.tr', el);
    if (t.fired === 2) tr.innerHTML = t.kind === 'alarm' ? formatClock(new Date(t.end)) : `0:00<small>+${formatRemaining((now - t.end) / 1000)}</small>`;
    else if (t.kind === 'alarm') tr.innerHTML = `${formatRemaining(left)}<small>at ${formatClock(new Date(t.end))}</small>`;
    else tr.innerHTML = inCheck ? `${formatRemaining(left)}<small>until max</small>` : formatRemaining(t.check && !inCheck && !t.paused ? (t.check - now) / 1000 : left) + (t.check && !inCheck ? '<small>to check</small>' : '');
    const pct = t.kind === 'alarm' ? 0 : 100 - (Math.max(0, left) / t.total) * 100;
    $('.tbar i', el).style.setProperty('--p', Math.min(100, pct));
  }
  const due = timers.find((t) => t.fired === 2);
  document.title = due && Math.floor(now / 1000) % 2 ? `⏰ ${due.label}` : 'Green Bean Casserole · v3.3';
  for (const b of $$('.tmr')) b.classList.toggle('running', timers.some((t) => t.id === b.dataset.id && !t.fired));
}
setInterval(tick, 500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

/* ─────────── Serving-time planner ─────────── */
const SHORT = {
  30: 'T-30 · Pull everything to the counter; crush 20 g shallots',
  22: 'T-22 · Start gently reheating the mushroom cream',
  15: 'T-15 · Microwave beans to 165°F; prewarm the dish',
  8: 'T-8 · Blot beans, fold in, verify 165°F+, add acid',
  3: 'T-3 · Transfer, top, scatter shallots',
  0: 'Serve! Carry it uncovered to the table',
};
const serveInput = $('#serve-time');
function serveDate() {
  const [h, m] = (setting('serve') || '16:00').split(':').map(Number);
  const now = new Date();
  const d = currentMode() === 'serve' || setting('day') === 'serve' ? new Date(now) : new Date(2026, 10, 26);
  d.setHours(h, m, 0, 0);
  return d;
}
function renderPlanner() {
  if (!serveInput) return;
  serveInput.value = setting('serve');
  const serve = serveDate();
  const rows = $$('.countdown li');
  const offsets = rows.map((r) => +r.dataset.offset);
  const clocks = countdown(serve, offsets);
  const now = Date.now();
  let nowSet = false;
  rows.forEach((r, i) => {
    const t = clocks[i];
    const tEl = $('.clock', r);
    tEl.textContent = formatClock(t);
    tEl.dateTime = t.toISOString();
    const next = clocks[i + 1];
    const past = now >= t.getTime() && (next ? now >= next.getTime() : now > serve.getTime() + 15 * 60000);
    r.classList.toggle('past', past);
    const isNow = !past && now >= t.getTime() && !nowSet;
    r.classList.toggle('now', isNow);
    if (isNow) nowSet = true;
  });
  const status = $('[data-planner-status]');
  const armed = timers.filter((t) => t.kind === 'alarm' && !t.fired).length;
  const mins = Math.round((serve - now) / 60000);
  status.textContent = armed
    ? `${armed} alert${armed > 1 ? 's' : ''} set — keep this page open (or installed) to hear them.`
    : currentMode() === 'serve' && mins > 30 ? `Start at ${formatClock(clocks[0])}. That’s in ${mins - 30 >= 60 ? `${Math.floor((mins - 30) / 60)} h ${(mins - 30) % 60} min` : `${mins - 30} min`}.`
    : '';
}
serveInput?.addEventListener('change', () => {
  if (!serveInput.value) return;
  S.settings.serve = serveInput.value;
  // Re-time any armed alerts.
  const armed = timers.some((t) => t.kind === 'alarm');
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].kind === 'alarm') timers.splice(i, 1);
  store.save();
  if (armed) armCountdown(false);
  renderPlanner();
});
function armCountdown(say = true) {
  unlockAudio();
  const serve = serveDate();
  const now = Date.now();
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].kind === 'alarm') timers.splice(i, 1);
  let n = 0;
  for (const off of [30, 22, 15, 8, 3, 0]) {
    const at = serve.getTime() - off * 60000;
    if (at <= now) continue;
    timers.push({ id: `cd-${off}`, label: SHORT[off], kind: 'alarm', end: at, check: null, total: 0, paused: null, fired: 0 });
    n++;
  }
  store.save();
  renderDock(true);
  renderPlanner();
  if (say) toast(n ? `${n} alerts set for a ${formatClock(serve)} dinner` : 'That serving time has already passed');
}
$('[data-arm-countdown]')?.addEventListener('click', () => armCountdown());
$('[data-start-now]')?.addEventListener('click', () => {
  const d = new Date(Date.now() + 30 * 60000 + 30000);
  S.settings.serve = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (setting('day') === 'auto' && currentMode() !== 'serve') S.settings.day = 'serve';
  applySettings();
  armCountdown();
});
setInterval(renderPlanner, 20000);

/* ─────────── Cook mode ─────────── */
const cook = $('#cook');
let slides = [];
let at = 0;
let wake = null;
let speak = false;

function buildSlides(day) {
  const sec = $(`[data-cook="${day}"]`);
  return $$('.step', sec).flatMap((step) => {
    const num = step.dataset.step;
    const title = $('h3', step).childNodes[0].textContent.trim();
    return $$('.subs > li', step).map((li, i, arr) => ({ li, num, title, idx: i + 1, of: arr.length }));
  });
}
function speechText(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll(setting('temp') === 'C' ? '.tf' : '.tc').forEach((n) => n.remove());
  c.querySelectorAll('.tmr, .chk-wrap, svg').forEach((n) => n.remove());
  return c.textContent.replace(/(\d)\s*–\s*(\d)/g, '$1 to $2').replace(/\s+/g, ' ').trim();
}
function renderSlide(dir = 1) {
  const s = slides[at];
  if (!s) return;
  const draw = () => {
    cook.style.setProperty('--vt-dir', dir > 0 ? '-28px' : '28px');
    $('[data-cook-kicker]', cook).textContent = `Step ${s.num} · ${s.title}`;
    $('[data-cook-count]', cook).textContent = `${s.idx} of ${s.of} · ${at + 1}/${slides.length} overall`;
    $('[data-cook-title]', cook).textContent = s.title;
    const body = $('[data-cook-body]', cook);
    body.innerHTML = '';
    body.append($('div', s.li).cloneNode(true));
    const tbox = $('[data-cook-timers]', cook);
    tbox.innerHTML = '';
    for (const b of $$('.tmr', s.li)) {
      const nb = b.cloneNode(true);
      const lab = document.createElement('span');
      lab.className = 'tmr-label';
      lab.textContent = b.dataset.label;
      nb.prepend(lab);
      nb.addEventListener('click', () => startTimer({ id: b.dataset.id, label: b.dataset.label, dur: +b.dataset.dur, max: +b.dataset.max || 0 }));
      tbox.append(nb);
    }
    const done = $('.chk', s.li).checked;
    const next = $('[data-cook-next]', cook);
    next.innerHTML = at === slides.length - 1 ? `Finish ${tIcon('party-popper')}` : done ? `Next ${tIcon('chevron-right')}` : `Done ${tIcon('check')}`;
    $('[data-cook-prev]', cook).disabled = at === 0;
    $('.cook-progress i', cook).style.setProperty('--p', ((slides.filter((x) => $('.chk', x.li).checked).length) / slides.length) * 100);
    tick();
  };
  transition(draw);
  if (speak) say(`${s.title}. ${speechText($('div', s.li))}`);
}
function say(text) {
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1; speechSynthesis.speak(u); } catch {}
}
async function keepAwake() {
  try { wake = await navigator.wakeLock?.request('screen'); $('[data-cook-wake]', cook).hidden = !wake; } catch { wake = null; }
}
function openCook(day) {
  const d = day || (currentMode() === 'serve' || currentMode() === 'after' ? 'serve' : 'prep');
  slides = buildSlides(d);
  at = Math.max(0, slides.findIndex((s) => !$('.chk', s.li).checked));
  if (at < 0) at = 0;
  cook.append(dock);
  cook.showModal();
  unlockAudio();
  keepAwake();
  renderSlide(1);
}
function closeCook() {
  if (cook.open) cook.close();
}
cook.addEventListener('close', () => {
  document.body.append(dock);
  wake?.release?.(); wake = null;
  try { speechSynthesis.cancel(); } catch {}
  const s = slides[at];
  s?.li.scrollIntoView({ block: 'center' });
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && cook.open) keepAwake(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open-cook]');
  if (b) openCook(b.dataset.openCook);
});
$('[data-cook-close]', cook).addEventListener('click', closeCook);
function next() {
  const s = slides[at];
  const c = $('.chk', s.li);
  if (!c.checked) setCheck(c, true);
  if (at < slides.length - 1) { at++; renderSlide(1); }
  else { closeCook(); toast(slides[0]?.num === '1' ? 'Prep day done — see tonight’s storage list' : 'Served. Happy Thanksgiving!'); }
}
function prev() { if (at > 0) { at--; renderSlide(-1); } }
$('[data-cook-next]', cook).addEventListener('click', next);
$('[data-cook-prev]', cook).addEventListener('click', prev);
$('[data-cook-speak]', cook).addEventListener('click', (e) => {
  speak = !speak;
  e.currentTarget.setAttribute('aria-pressed', String(speak));
  if (speak) renderSlide(0); else try { speechSynthesis.cancel(); } catch {}
});
cook.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
});
let sx = null, sy = null;
const card = $('[data-cook-card]', cook);
card.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
card.addEventListener('pointerup', (e) => {
  if (sx == null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
});

/* ─────────── Settings dialog ─────────── */
const settings = $('#settings');
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open="settings"]');
  if (b) settings.showModal();
});
settings.addEventListener('click', (e) => { if (e.target === settings) settings.close(); });

/* ─────────── Section highlighting ─────────── */
const navLinks = $$('[data-nav]');
const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const id = en.target.id === 'top' ? 'today' : en.target.id;
    for (const a of navLinks) a.classList.toggle('on', a.dataset.nav === id || (id === 'idea' && a.dataset.nav === 'today' && a.closest('.tabs')) || (id === 'gear' && a.dataset.nav === 'shop' && a.closest('.tabs')) || (id === 'help' && a.dataset.nav === 'serve' && a.closest('.tabs')));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
if (io) for (const s of $$('main > section[id]')) io.observe(s);

/* ─────────── Odds and ends ─────────── */
$('[data-print]')?.addEventListener('click', () => window.print());
addEventListener('beforeprint', () => $$('details').forEach((d) => { d.dataset.wasOpen = d.open; d.open = true; }));
addEventListener('afterprint', () => $$('details').forEach((d) => { d.open = d.dataset.wasOpen === 'true'; }));
for (const img of $$('img')) {
  const hide = () => { img.style.visibility = 'hidden'; };
  if (img.complete && !img.naturalWidth) hide(); else img.addEventListener('error', hide);
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
document.addEventListener('pointerdown', unlockAudio, { once: true });

/* ─────────── Boot ─────────── */
restoreChecks();
applySettings();
refreshProgress();
renderPlanner();
renderDock(false);
