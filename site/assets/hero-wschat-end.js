// hero-workspace-end: the hero's final frame. After the chat beat the stage
// settles on a black card holding one lockup, the 'superbot' wordmark with the
// living mark to its right, and a circular replay control under it. Nothing
// else: no tagline, no CTA.
//
//   const end = createEnd(stage, { onReplay });
//   stage.appendChild(end.el);
//   end.render(t);   // t = seconds since the end card starts; pure of t
//   end.IN;          // seconds until the card is fully in and the control live
//   end.reset();     // forget every cached write (a replay, a scrub back)
//
// The entrance is the .hw-card's (hero-wschat.js): the black comes in over
// CARD_IN with outCubic, then each lockup part rises WORD_DY em and unblurs
// from WORD_BLUR px over WORD_DUR, WORD_GAP apart, the same numbers as the
// "All the agents in one" words; the replay control fades in last.
// The control is inert (not focusable, not clickable) until t >= IN.
// The card is hidden (opacity 0, visibility hidden) until t > 0: render() puts
// .is-on on it beside the visibility write, and hero-wschat-end.css removes the
// mark's six infinite loops (animation: none) while it is not on, so a hidden
// card keeps nothing in the animation timeline.
//
// The mark is the site's live vector mascot: markSvg() markup, its idle
// motion from mascot-mark.css (.sb-mark: bob, breath, ears, ghosts) and
// mountMascotMark() for the blink, the pupils and the click's happy beat.
// Imported by the SAME url the lander and hub-boot.js use so the page holds
// one copy of the module. Motion is unconditional: no reduced-motion guard
// (.cursor/rules/motion-always-on.mdc).

import { markSvg, mountMascotMark } from '../../site/assets/mascot-mark.js?v=3';

const E = {
  CARD_IN: 0.4,                          // hw-card's black (HW.CARD_IN)
  WORD_AT: 0.3, WORD_GAP: 0.08,          // HW.WORD_AT / HW.WORD_GAP
  WORD_DUR: 0.55, WORD_DY: 0.36, WORD_BLUR: 8, // HW.WORD_DUR / WORD_DY (em) / WORD_BLUR (px)
  ACT_GAP: 0.15,                         // after the mark lands, the control starts
  ACT_DUR: 0.4, ACT_DY: 8,               // its fade and rise (px, --sp-2)
};
const PARTS = 2;                          // the word, then the mark
const LANDED = E.WORD_AT + (PARTS - 1) * E.WORD_GAP + E.WORD_DUR;
const ACT_AT = LANDED + E.ACT_GAP;
const IN = Math.round((ACT_AT + E.ACT_DUR) * 1000) / 1000; // 1.48
export const END_IN = IN; // for a host that lays its timeline out at import, before createEnd()

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const r3 = (x) => Math.round(x * 1000) / 1000;

// lucide rotate-ccw (ISC), stroke drawn in the control's currentColor
const REPLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

// the sheet rides with the module so a caller only has to import the js; a
// page that already links it (any ?v=) is left alone
const SHEET = new URL('./hero-wschat-end.css?v=2', import.meta.url).href;
function ensureSheet() {
  if (document.querySelector('link[rel="stylesheet"][href*="hero-wschat-end.css"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = SHEET;
  document.head.appendChild(l);
}

let seq = 0;

export function createEnd(stage, { onReplay } = {}) {
  ensureSheet();

  const el = document.createElement('div');
  el.className = 'hwe-card';
  el.innerHTML =
    '<div class="hwe-body">' +
      '<p class="hwe-lockup">' +
        '<span class="hwe-word">superbot</span>' +
        `<span class="hwe-mark" aria-hidden="true">${markSvg({ id: `hwe-mark-face-${++seq}` })}</span>` +
      '</p>' +
      '<div class="hwe-act">' +
        `<button type="button" class="hwe-replay" aria-label="Replay">${REPLAY_ICON}</button>` +
      '</div>' +
    '</div>';
  const parts = [el.querySelector('.hwe-word'), el.querySelector('.hwe-mark')];
  const act = el.querySelector('.hwe-act');
  const btn = el.querySelector('.hwe-replay');
  mountMascotMark(el.querySelector('.sb-mark'));

  btn.addEventListener('click', () => {
    if (!live) return;
    onReplay?.();
  });

  // cached writes: render(t) computes everything from t and only touches a
  // style whose value moved, so a 60fps clock and a scrub cost the same
  let cardOp, partE, actE, live;
  function reset() {
    cardOp = -1; partE = []; actE = -1; live = null;
    el.style.opacity = ''; el.style.visibility = ''; el.style.pointerEvents = ''; el.classList.remove('is-on');
    for (const p of parts) { p.style.opacity = ''; p.style.transform = ''; p.style.filter = ''; }
    act.style.opacity = ''; act.style.transform = '';
    setLive(false);
  }
  function setLive(on) {
    if (live === on) return;
    live = on;
    act.inert = !on;
    btn.tabIndex = on ? 0 : -1;
    act.style.pointerEvents = on ? '' : 'none';
    if (!on && document.activeElement === btn) btn.blur();
  }

  function render(t) {
    // the black: in over CARD_IN; the card blocks the stage under it once up
    const op = t < 0 ? 0 : r3(outCubic(seg(t, 0, E.CARD_IN)));
    if (op !== cardOp) {
      cardOp = op;
      el.style.opacity = String(op);
      el.style.visibility = op > 0 ? 'visible' : 'hidden';
      el.classList.toggle('is-on', op > 0); // hero-wschat-end.css: a hidden card holds no animation
      el.style.pointerEvents = op > 0 ? 'auto' : 'none';
    }
    // the lockup: the word, then the mark, each the .hw-w rise and unblur
    parts.forEach((p, i) => {
      const a = E.WORD_AT + i * E.WORD_GAP;
      const e = r3(outCubic(seg(t, a, a + E.WORD_DUR)));
      if (partE[i] === e) return;
      partE[i] = e;
      p.style.opacity = String(e);
      p.style.transform = e >= 1 ? '' : `translateY(${(E.WORD_DY * (1 - e)).toFixed(3)}em)`;
      p.style.filter = e >= 1 || e <= 0 ? '' : `blur(${(E.WORD_BLUR * (1 - e)).toFixed(2)}px)`;
    });
    // the control: last, then live
    const f = r3(outCubic(seg(t, ACT_AT, ACT_AT + E.ACT_DUR)));
    if (f !== actE) {
      actE = f;
      act.style.opacity = String(f);
      act.style.transform = f >= 1 ? '' : `translateY(${(E.ACT_DY * (1 - f)).toFixed(2)}px)`;
    }
    setLive(t >= IN);
  }

  reset();
  return { el, IN, render, reset };
}
