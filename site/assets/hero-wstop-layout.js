// hero-wstop-layout: the swap between the incumbent hero layout and the wstop
// one (hero-wstop.css), for a visitor whose arm is known only AFTER the first
// paint. A returning or forced visitor never gets here: the page's pre-paint
// script sets html[data-hero-arm="wstop"] before the first frame.
//
// The swap is a FLIP (first, last, invert, play) so the page does not jump:
//   first   the rect of every visible box the new layout moves
//   last    set (or clear) data-hero-arm, which re-lays the hero out at once
//   invert  each moved box gets `translate` equal to the inverse of its move,
//           so this frame paints exactly where the last one did: the layout
//           shifted, nothing visible did
//   play    two frames later the translate eases back to none
// It runs in ONE task, so no frame shows the new layout un-compensated, and
// the whole move is transform-only: a PerformanceObserver 'layout-shift'
// scores 0 (.tmp/ga-first-65d3cf7b/cls-load.mjs, flip-check.mjs). Boxes nest,
// so each one's own offset is its total move less its parent's (the parent's
// translate already carries it). The tracker compares a box's start corner, so
// the corner is what is compensated. The copy block keeps its width through the
// swap (see applyLayout), so every box and line of text centred inside it keeps
// its x and only y moves. The mark changes size, which a compensating scale
// cannot hide exactly (its idle bob scales with it), so it is out of sight
// (opacity 0) for the swap frame and fades in as it eases home; the stage's
// clip box has no old position to compensate from, so it is hidden the same way.
//
// Two columns (1100px and up): the copy column is left-aligned there (one axis
// with the sign-in stack), where the incumbent centres it, so lines of text move
// INSIDE boxes that do not move, which a box's translate cannot undo. The copy
// block as a whole then takes the mark's way out: out of sight (opacity 0) for
// the swap frame, fading in as the layout it lands in settles. The poster has
// been decoded before the swap (hero-wstop.js), so the clip box that appears
// beside it is never blank.

const html = document.documentElement;
// [selector, parent selector, mode]: 'tl' lines the start corner up, 'mark' is
// the fade-and-shrink
const TREE = [
  ['.hero .hero-copy', null, 'tl'],
  ['.hero .sb-lockup', '.hero .hero-copy', 'tl'],
  ['.hero .sb-glitch', '.hero .sb-lockup', 'mark'],
  ['.hero h1', '.hero .sb-lockup', 'tl'],
  ['.hero .hero-subline', '.hero .hero-copy', 'tl'],
  ['.hero .hero-cta', '.hero .hero-copy', 'tl'],
  ['#dock', null, 'tl'],
];
const EASE = 'translate var(--dur-4) var(--ease-out), scale var(--dur-4) var(--ease-out), opacity var(--dur-4) var(--ease-out)';
// the two-column layout re-aligns the copy (see above): its block fades instead of sliding
const TWO_COL = '(min-width: 1100px)';

const zoomOf = () => parseFloat(getComputedStyle(html).zoom) || 1;

/** Swap to (on) or away from (off) the wstop layout. Resolves once the eased
 *  move has played; a layout that is already in the asked state is a no-op. */
export function applyLayout(on) {
  if ((html.dataset.heroArm === 'wstop') === on) return Promise.resolve();
  const fade = matchMedia(TWO_COL).matches;
  const items = TREE
    .filter(([sel]) => !fade || sel === '.hero .hero-copy' || sel === '#dock')
    .map(([sel, parent, mode]) => ({ sel, parent, mode: fade && sel === '.hero .hero-copy' ? 'fade' : mode, el: document.querySelector(sel) }))
    .filter((i) => i.el);
  items.forEach((i) => { i.first = i.el.getBoundingClientRect(); });
  // the copy block keeps the width it has now: its children (the subline, the
  // form, the lockup) are centred in it, so with the same width they land on
  // the same x in both layouts and only their y has to be compensated. It sits
  // centred in its column, overflowing evenly where the old one was wider; a
  // resize lets it go. Swapping away leaves the incumbent's own natural width,
  // since a narrower pinned block would wrap its headline
  // (the two-column layout has its own column width and moves the copy's lines
  // anyway, so it pins nothing)
  const hc = items[0]?.el;
  if (hc && on && !fade) {
    hc.style.width = `${(items[0].first.width / zoomOf()).toFixed(2)}px`;
    addEventListener('resize', () => { hc.style.width = ''; }, { once: true });
  }
  html.dataset.wsSwap = '';
  if (on) html.dataset.heroArm = 'wstop';
  else delete html.dataset.heroArm;
  const z = zoomOf(); // a rect is in viewport px, `translate` in the page's zoomed px
  const total = new Map();
  items.forEach((i) => {
    const b = i.el.getBoundingClientRect();
    i.last = b;
    total.set(i.sel, { dx: (i.first.left - b.left) / z, dy: (i.first.top - b.top) / z });
  });
  items.forEach((i) => {
    const t = total.get(i.sel), p = (i.parent && total.get(i.parent)) || { dx: 0, dy: 0 };
    i.el.style.transformOrigin = '0 0';
    if (i.mode === 'fade') { i.el.style.opacity = '0'; return; }
    i.el.style.translate = `${(t.dx - p.dx).toFixed(2)}px ${(t.dy - p.dy).toFixed(2)}px`;
    if (i.mode === 'mark' && i.last.width) {
      i.el.style.scale = (i.first.width / i.last.width).toFixed(4);
      i.el.style.opacity = '0';
    }
  });
  return new Promise((resolve) => {
    // two frames: the compensated frame must paint before the ease starts
    requestAnimationFrame(() => requestAnimationFrame(() => {
      delete html.dataset.wsSwap;
      items.forEach((i) => {
        i.el.style.transition = EASE;
        i.el.style.translate = '';
        i.el.style.scale = '';
        i.el.style.opacity = '';
      });
      // the ease's real end: the headline's translate finishes (a layout that moved
      // nothing never fires it, so a fallback timer ends the wait)
      const lead = items.find((i) => i.sel === '.hero h1') ?? items.find((i) => i.mode === 'fade');
      const h1 = lead?.el, prop = lead?.mode === 'fade' ? 'opacity' : 'translate';
      let over = false;
      const end = () => {
        if (over) return;
        over = true;
        items.forEach((i) => { i.el.style.transition = ''; i.el.style.transformOrigin = ''; });
        resolve();
      };
      h1?.addEventListener('transitionend', (e) => { if (e.propertyName === prop) end(); });
      setTimeout(end, 700);
    }));
  });
}
