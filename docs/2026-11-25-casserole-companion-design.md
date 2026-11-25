# Green Bean Casserole Companion: design (approved 2026-11-25)

## Intent
A showpiece companion web app for the v3.3 "First-Principles Thanksgiving Green Bean Casserole"
recipe, used by Chris and family on iPhones in the kitchen. Prep day is 2026-11-25 and serving day is
Thanksgiving, 2026-11-26. It should anticipate what a cook needs mid-recipe and be a joy to use.

## Goals
- Faithful to the source recipe: every quantity, temperature and time matches the markdown.
- Works offline as one self-contained page (fonts, icons, CSS, JS inlined), installable as a PWA, shared on GitHub Pages.
- Opens in the right mode for the date: Prep Day on 11-25 and Thanksgiving on 11-26, with a manual switch.
- Cook mode: one step per screen, large type, screen kept awake, timers on every timed step, and a 2-hour reminder to refrigerate the shallot oil.
- A serving-time planner that turns the T-30 to T-3 countdown into clock times.
- Persistent checklists: shopping list (copy and share), mise en place, steps and make-ahead status.
- Toggles: grams or cups and spoons, °F or °C, Kirkland or unsalted stock (unsalted adds the 1.4 g / 2.8 g salt line).
- A "Something's wrong?" troubleshooting sheet, a print stylesheet, and light and dark themes.

## Non-goals and anti-goals
- No servings scaler: the sauce is calibrated to the jar geometry and the stock's sodium.
- No client-rendered framework. All recipe content ships as static HTML and JS only enhances it.
  A JS-gated reveal once blanked a section in the iOS Files/Quick Look webview.
- Not a rewrite of the recipe. Two source fixes only: LaTeX becomes plain text, and the
  "1:4 Oil-to-Xanthan" label is corrected to 1 xanthan : 4 oil, which is what the numbers say.

## Approaches considered
1. **Static HTML + modern CSS + small vanilla JS modules, with CDN assets inlined at build time (chosen).**
   Works offline and in Quick Look, has the fastest first paint, and needs nothing at runtime.
2. A client framework such as Preact or Lit rendering from data. Rejected: content would be invisible
   without JS, and it adds weight for no gain.
3. Live CDN links. Rejected: these break offline use in the kitchen and in Files previews.

## Decided
- Images: about six photoreal editorial shots made with Codex's built-in `image_gen`. The model is whatever
  the tool reports (the user asked for gpt-image-2.6, which can't be pinned on the built-in path).
  They ship as separate WebP files precached by the service worker, and the page reads fine without them.
- Publish as public repo `cclements/green-bean-casserole` on GitHub Pages (main, root).
- Repo layout mirrors ribs and basil-oil: `index.html`, `manifest.json`, `sw.js`, `icon.svg`,
  `icon-512.png`, `apple-touch-icon.png`, `.gitignore`, `README.md`.

## Left to the builder
Exact typography and palette, icon set (Lucide), layout and motion, and which modern platform features to use
(View Transitions, `:has()`, container queries, `light-dark()`, popover, Wake Lock, Notifications),
always as progressive enhancement.
