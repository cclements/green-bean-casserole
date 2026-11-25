# Green Bean Casserole Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline, installable companion page for the v3.3 green bean casserole, and publish it on GitHub Pages.

**Architecture:** Hand-authored static HTML holds all of the recipe content. `build.mjs` inlines CSS, JS, the
fonts (base64 woff2) and a Lucide SVG sprite into a single `index.html`. JS is progressive enhancement only.
Pure logic lives in `src/logic.js` so `node --test` can cover it.

**Tech Stack:** HTML, modern CSS (`light-dark()`, oklch, container queries, `:has()`, View Transitions,
scroll-driven animation), vanilla ES modules, Fraunces + Geist + Geist Mono (Google Fonts), Lucide 1.80.0,
cwebp for images, and node:test.

**Spec:** `docs/2026-11-25-casserole-companion-design.md`, source recipe `~/Downloads/first_principles_thanksgiving_green_bean_casserole.md`

## Global Constraints
- Every quantity, temperature and time matches the source markdown exactly.
- Nothing loads from the network at runtime. The only runtime files are the page, the manifest, the service worker, icons and WebP images.
- With JS disabled, every section and step is readable.
- No servings scaler.
- Mobile-first: no horizontal scroll at 375 px; tap targets of at least 44 px.

## Review Focus
1. Reload mid-cook: checked steps, running timers and settings survive (timers store end timestamps, not counters).
2. A serving time past midnight, or "now" later than the T-30 point: the planner shows clock times and doesn't throw.
3. iOS without Notification or Wake Lock support: timers still chime and flash, and no errors are thrown.
4. Private mode with localStorage throwing: the page still works, and progress just isn't saved.
5. Two timers at once (shallots + bean pot): both are shown and both alert independently.

---

### Task 1: Pure logic + tests
**Files:** Create `src/logic.js`, `tests/logic.test.mjs`
**Produces:** `fToC(f:number)->number` (rounded integer); `formatTemp(spec:string, unit:'F'|'C')->string` where spec is
`"165-175"` or `"170"`; `modeForDate(d:Date)->'prep'|'day'|'after'|'before'` (prep = 2026-11-25, day = 2026-11-26, local time);
`countdown(serve:Date, offsets:number[])->Date[]`; `formatClock(d:Date)->string`; `parseDuration(str)->seconds`.
- [ ] Tests: `fToC(165)===74`, `fToC(172)===78`, `fToC(175)===79`, `fToC(176)===80`, `fToC(40)===4`;
  `formatTemp("165-172","C")==="74–78°C"`; `modeForDate(new Date(2026,10,25,9))==="prep"`, `(2026,10,26,23)==="day"`;
  countdown across midnight; `parseDuration("90s")===90`, `("5m")===300`.
- [ ] Implement, then run `node --test tests/` until it passes.

### Task 2: Vendor fetch + build
**Files:** Create `scripts/fetch-vendor.mjs`, `build.mjs`, `vendor/` (git-tracked output)
- [ ] fetch-vendor: Google Fonts CSS2 (latin subset, woff2) for Fraunces (opsz, wght, SOFT), Geist, and Geist Mono → `vendor/fonts/`; Lucide icons from jsDelivr `lucide-static@1.80.0/icons/<name>.svg` → `vendor/icons/`.
- [ ] build: replace `<!-- @inline:css -->`, `<!-- @inline:js -->`, `<!-- @inline:sprite -->` and `/* @fonts */` in `src/index.html` → `index.html`.
- [ ] Verify: `node build.mjs` writes `index.html` with no `https://` asset references except links.

### Task 3: Content (static HTML)
**Files:** Create `src/index.html`
- [ ] All 7 source sections as semantic HTML: hero, intent and guardrails, shopping list, equipment, formulation A–F, prep-day steps 1–5, Thanksgiving countdown and steps 6–10, troubleshooting and storage.
- [ ] Temperatures as `<span class="t" data-f="165-175">165–175°F</span>`; timed actions as `<button class="timer" data-dur="90s" data-label="…">`.
- [ ] Fidelity test `tests/fidelity.test.mjs`: every number+unit token in the markdown appears in the built page text.

### Task 4: Styles
**Files:** Create `src/styles.css`. Light and dark tokens, a mobile tab bar, a desktop side rail, cook mode, a timer dock and print styles.

### Task 5: Interactions
**Files:** Create `src/app.js` (imports logic)
- [ ] Persisted checkboxes, unit/temp/stock/batch toggles, the theme, the date-mode banner, the serving-time planner with a countdown start, the timer dock (Web Audio chime, vibration, Notification, title flash), the 2-hour oil reminder, cook mode (dialog, Wake Lock, read-aloud, swipe and keys), copy/share for the shopping list, and reset.

### Task 6: PWA + images
**Files:** `manifest.json`, `sw.js`, `icon.svg`, `icon-512.png`, `apple-touch-icon.png`, `img/*.webp`
- [ ] cwebp q=78 at 1600w and 800w; precache them in the SW. Rasterize the icons with qlmanage or browser canvas.

### Task 7: Verify + publish
- [ ] Render at 375 px and desktop, light and dark, JS on and off; check the console has no errors.
- [ ] git init, commit, `gh repo create green-bean-casserole --public`, enable Pages, then verify the live URL and assets return 200.
