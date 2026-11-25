# First-Principles Thanksgiving Green Bean Casserole

An offline, installable kitchen companion for the v3.3 Production Edition green bean casserole: water-bath Swiss cream emulsion, deeply browned mushrooms and dual crunch.

**Live:** https://cclements.github.io/green-bean-casserole/

## What it does

- **Knows what day it is.** It opens in Prep Day mode on Wed Nov 25 and Thanksgiving mode on Thu Nov 26. Settings → Day overrides that.
- **Cook mode.** One step per screen in large type, with the screen kept awake. Read-aloud and swipe or arrow-key navigation are built in, and "Done" checks the step off on the main page too.
- **Timers on every timed step.** A range timer such as the 60–90 s ice bath chimes once at the start of the range ("check now") and again at the end. Timers survive reloads, and several can run at once in the dock.
- **Shallot-oil safety clock.** One tap starts the 2-hour countdown to refrigerate the infused oil.
- **Serving-time planner.** Enter when you're eating, and the T-30 to T-3 countdown becomes clock times. It can alert you at each step, or start the 30 minutes right now.
- **Checklists that remember.** Shopping list (share or copy what's left), equipment, mise en place and every step.
- **Toggles.** Weights, volumes or both; °F or °C; Kirkland or unsalted stock (unsalted shows the 1.4 g / 2.8 g salt line); half or full sauce batch; no-broil or broil finish; light, dark or auto.
- **Troubleshooting sheet, storage list and print layout.**

Progressive enhancement: all recipe text is static HTML and reads fine with JavaScript off, including in the iOS Files/Quick Look preview.

## Files

| Path | Role |
|---|---|
| `index.html` | **Built output**, fully self-contained (fonts, icons, CSS and JS inlined). Don't edit by hand. |
| `src/index.html` | Content and markup. Templates: `{{t:165-172}}` dual-unit temperature, `{{timer:60s-90s\|Label}}` timer button, `{{icon:name}}` Lucide icon, `<li data-c="key">` checkable row. |
| `src/styles.css` | All styles: light/dark tokens, mobile tab bar, desktop rail, cook mode and print. |
| `src/logic.js` | Pure helpers (°F→°C, day mode, countdown math, durations), covered by tests. |
| `src/app.js` | Interactions: storage, toggles, checklists, timers, planner, cook mode. |
| `build.mjs` | Expands the templates and inlines fonts, the icon sprite, blur-up placeholders, CSS and JS into `index.html`. |
| `scripts/fetch-vendor.mjs` | Refreshes `vendor/` from Google Fonts (Fraunces, Geist, Geist Mono) and Lucide (`lucide-static`, latest from npm). |
| `recipe/source.md` | The source recipe the page must match. |
| `tests/` | `logic.test.mjs` (unit) and `fidelity.test.mjs` (every number+unit in the source is on the page, and vice versa). |
| `img/` | WebP photos (800/1200/1536 w), `og.jpg` link preview, `lqip/` 24-px placeholders. |
| `sw.js`, `manifest.json`, `icon*.{svg,png}` | Offline cache and home-screen install. |

## Working on it

```bash
npm test            # build + unit + fidelity tests
npm run build       # rebuild index.html after editing src/
npm run vendor      # refresh fonts and icons (network)
python3 -m http.server 8417   # preview at http://localhost:8417
```

After changing cached assets, bump `CACHE` in `sw.js` so installed copies refresh.

## Imagery

The six photos were generated on 2026-11-25 with Codex's built-in `image_gen` tool (the Codex imagegen skill, default mode). The tool doesn't report a model name, and the PNGs' C2PA provenance names only "ChatGPT / gpt-image", so the exact model version isn't recorded. Source PNGs live in `assets-src/` (git-ignored); `img/` holds the compressed WebP versions (cwebp q80).
