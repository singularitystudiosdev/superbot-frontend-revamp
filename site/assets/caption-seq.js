// The sequenced caption arms (experiments.js caption.fx, 2026-09-30): the h1
// plays two or three of the winning captions one after another, each arm with
// its own transition (caption-seq.css: roll, rise, zoom). lander-agent.html
// imports this module, and links the stylesheet, only when the drawn arm names
// an fx, so no other visitor pays for either.
//
// It is the rotating arms' rotateCaption (lander-agent.html) with a caption
// split into rows of words (rise staggers the words; roll and zoom move the
// caption as one piece): every caption stacked in one grid cell (the slot is as
// wide and as tall as its biggest caption, so nothing around the h1 moves), the
// first shown at once, the next swap armed a --cap-dwell after a caption lands,
// only while the h1 is on screen and the tab is visible. Scrolling away or
// hiding the tab pauses it; coming back starts a fresh dwell. A swap only
// flips classes (is-in on the next caption, is-out on the old one); the motion
// is CSS. When the landing animation ends the next caption drops back to the
// plain is-on state (its end frame is the same picture, minus the animation's
// fill) and the old one to the hidden base class.
//
// Screen readers get the whole sequence once, as the h1's visually hidden
// text; the animated stack is aria-hidden and there is no live region, so a
// swap announces nothing.

const FX = new Set(['roll', 'rise', 'zoom']);
// the element whose animation ends last in a caption (the stagger runs in
// document order), so its animationend is the landing; roll and zoom animate
// the caption itself
const TAIL = { roll: '', rise: '.cap-row:last-child .cap-w:last-child', zoom: '' };
// the longest landing is rise's (a word per --dur-1 across a seven-word
// caption, then --dur-5); if animationend never comes (a tab hidden mid-swap)
// this lets the next dwell start anyway
const LANDING_MAX = 3000;

/**
 * @param {HTMLElement} el the hero h1
 * @param {string[]} lines the captions in order, each with <br/> between its rows
 * @param {string} fx one of roll, rise, zoom
 * @returns {boolean} false when nothing was mounted (the caller falls back)
 */
export function mountCaptionSeq(el, lines, fx) {
  if (!FX.has(fx) || lines.length < 2) return false;
  const text = (html) => html.replaceAll('<br/>', ' ');
  const rows = (html) => {
    let i = 0;
    return html.split('<br/>').map((row) => `<span class="cap-row">${row.split(' ').map((w) => `<span class="cap-w" style="--i:${i++}">${w}</span>`).join(' ')}</span>`).join('');
  };
  el.innerHTML = `<span class="sb-visually-hidden">${lines.map(text).join(' ')}</span><span class="cap-seq" data-fx="${fx}" aria-hidden="true">${lines.map((l, k) => `<span class="cap-line${k ? '' : ' is-on'}">${rows(l)}</span>`).join('')}</span>`;
  const stack = el.querySelector('.cap-seq');
  const slots = [...stack.children];
  const dwell = parseFloat(getComputedStyle(stack).getPropertyValue('--cap-dwell')) || 3000;
  let at = 0, timer = 0, inView = false, landing = false;
  const arm = () => {
    clearTimeout(timer);
    timer = inView && !document.hidden && !landing ? setTimeout(swap, dwell) : 0;
  };
  function swap() {
    const out = slots[at];
    at = (at + 1) % slots.length;
    const next = slots[at];
    out.className = 'cap-line is-out';
    next.className = 'cap-line is-in';
    landing = true;
    const end = new AbortController();
    const safety = setTimeout(() => land(), LANDING_MAX); /* settle-seam: only the fallback for animationend, which is the real landing */
    const land = () => {
      end.abort();
      clearTimeout(safety);
      next.className = 'cap-line is-on';
      out.className = 'cap-line';
      landing = false;
      arm();
    };
    (TAIL[fx] ? next.querySelector(TAIL[fx]) : next).addEventListener('animationend', land, { signal: end.signal });
  }
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; arm(); }).observe(el);
  document.addEventListener('visibilitychange', arm);
  return true;
}
