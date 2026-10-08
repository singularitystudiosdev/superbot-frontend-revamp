// hero-wstop (2026-10-01): the hero arm `wstop`, the live stage on top
// (experiments.js hero rev 12; the layout is hero-wstop.css, scoped to
// html[data-hero-arm="wstop"]). It is a thin placement around the wschat
// module, not a fork: wschat's animation, frontend, chat and end card all run
// unchanged inside #stage, which the arm's CSS sizes and scales into a
// fixed-aspect clip box above the headline. The lander loads this module after
// its sheets (HERO_SHEETS.wstop: the three wschat sheets and hero-wstop.css),
// so the stage is already styled when it imports.
//
// 0. The poster. A visitor leaves within ~1.6 s on average, before any module
//    could mount, so the clip box holds a still of the stage's own render from
//    the first paint (.ws-poster in hero-wstop.css; one WebP per crop, made by
//    .tmp/ga-first-65d3cf7b/fix/b1/make-poster.mjs from this very stage at the
//    beat below). A returning or forced visitor's page asks for it from the
//    head; a fresh draw's page starts the fetch the moment it knows, and this
//    module decodes it BEFORE the layout swaps, so the swapped-in box is never
//    blank.
// 1. Layout. A returning or forced visitor already has the layout (the page's
//    pre-paint script sets data-hero-arm before the first frame). A fresh draw
//    does not, so the swap runs here: a transform-compensated FLIP
//    (hero-wstop-layout.js) that scores 0 layout shift.
// 2. The story. wschat mounts on import, opening on FROM (data-ws-from, read
//    by hero-wschat.js) instead of the tab strip: the beat the poster shows.
//    The clock is held (data-ws-hold) until the stage has been revealed (its fade over
//    the poster has ended), so the live frame the poster fades into is the poster's own
//    frame and the motion starts there.
//    Once the sheets that load off the first paint (hub-boot.css, term.css,
//    hero-sphere.css) are in, data-ws-ready fades the stage in over the poster.
// The ?v= on the imports below is the same number the lander uses for the
// same file (edge/test/site-asset-versions.test.ts keeps them one).

import { applyLayout } from './hero-wstop-layout.js?v=1';

const html = document.documentElement;
const stage = document.getElementById('stage');
const SHEETS = ['hub-boot.css', 'term.css', 'hero-sphere.css'];
const LIMIT_MS = 4000;
const POSTER_MS = 3000;

// the story second each crop opens on, the frame its poster is a still of. A phone's
// window holds the thread's bottom ~150px over the composer: it opens on the DoorDash
// turn (the model's name, the whole answer line, the step under way), the one turn
// whose answer is two lines, so its name and its answer fit one window; the wide
// window holds the whole DeepSeek turn (the switch, the model's name, the answer, six
// subreddits, the composer's model chip) as the scrape finishes
const FROM = { phone: 25.56, wide: 21.5 };
const phone = matchMedia('(max-width: 560px)').matches;
stage.dataset.wsFrom = String(phone ? FROM.phone : FROM.wide);
stage.dataset.wsHold = ''; // the clock waits for the reveal (hero-wschat.js reads it at mount)

// the poster's decode: warms the image the CSS paints. A poster that does not
// arrive in POSTER_MS gives up (the stage shows without it, as before the arm)
const posterUrl = window.sbWsPoster?.() ?? `./site/assets/hero-wstop-poster-${phone ? 'phone' : 'wide'}.webp?v=2`;
const posterReady = new Promise((resolve) => {
  const img = new Image();
  img.src = posterUrl;
  img.decode().then(resolve, resolve);
  setTimeout(resolve, POSTER_MS);
});

// the lander links those sheets with media="print" and flips them to "all" on
// load (the off-critical-path pattern), so the stage is revealed when none of
// them is still print; a sheet that never loads gives up at LIMIT_MS and the
// stage shows anyway (the sheets are quiet, the story is the point)
const sheetsIn = () => new Promise((resolve) => {
  const t0 = performance.now();
  const wait = () => {
    const pending = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .some((l) => SHEETS.some((s) => l.href.includes(s)) && l.media === 'print');
    if (!pending || performance.now() - t0 > LIMIT_MS) resolve();
    else requestAnimationFrame(wait);
  };
  wait();
});

// the poster is requested from the page (a sheets' round trip before this module is
// even fetched), so this wait is nearly always nothing; the swap then runs, and the
// story mounts into the arm's layout, as it will stay
await posterReady;
const swap = applyLayout(true);
await import('./hero-wschat.js?v=25');
await sheetsIn();
await swap;
html.dataset.wsReady = '';
// the clock is released when the crossfade has ended, not when it starts: while the live
// stage fades in over the poster the two are the same frame, where a story already moving
// would show the poster's text a few px off beneath it (a double image for ~300 ms)
await new Promise((resolve) => {
  stage.addEventListener('transitionend', (e) => { if (e.target === stage && e.propertyName === 'opacity') resolve(); });
  setTimeout(resolve, 450); // a tab in the background or a transition that never runs
});
delete stage.dataset.wsHold;
window.__heroWorkspace?.freeze(false);
