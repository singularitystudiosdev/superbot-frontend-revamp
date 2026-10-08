// superbot mark — idle motion for the time-traveler page's vector mascot.
// The page's own CSS owns the bob, the breath, the ears' tilt and the two
// ghosts' breathing (they are pure transforms on markup the CSS already owns).
// This module owns the parts that read live state: the blink/wink timer, the
// pupils that drift toward the pointer, and the click's morph into an emoji
// followed by the happy beat it returns on.
// Zero dependencies.

const BLINK_MIN = 1800, BLINK_MAX = 5000, BLINK_MS = 120, WINK_P = 0.2;
const DRIFT = 2, EASE = 0.14, SETTLE = 0.04, HAPPY_MS = 600;
// The eyes saturate LOOK_REACH mark-half-widths away instead of at the mark's
// own edge: the pointer is followed across ~4x the old range and DRIFT (how far
// the pupils travel) is unchanged. Mirrored from the desktop port
// (superbot-desktop packages/ui/src/marks/mascot-motion.ts, 2026-09-21).
const LOOK_REACH = 4;

const clamp = (v) => (!v || Number.isNaN(v) ? 0 : Math.max(-1, Math.min(1, v)));

// The mark's markup: the kit's face mask (brand/mark.svg geometry) drawn three
// times, teal ghost, magenta ghost, white face, with the class hooks
// mascot-mark.css and mountMascotMark() read. `id` names the mask and must be
// unique on the page. edge/src/mascot.ts markSvg() is the server-side twin of
// this function: change one, change both.
export function markSvg({ id = 'sb-mark-face', label = '', cls = '' } = {}) {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="sb-mark${cls ? ` ${cls}` : ''}" viewBox="0 0 100 100" ${a11y} focusable="false">` +
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-30" y="-30" width="160" height="160">` +
    '<g fill="#fff"><rect x="14" y="32" width="72" height="54" rx="15"/><path class="mark-ear mark-ear-l" d="M14 46V28Q14 20 21 21Q28 24 36 32Z"/><path class="mark-ear mark-ear-r" d="M86 46V28Q86 20 79 21Q72 24 64 32Z"/></g>' +
    '<g fill="#000"><ellipse class="mark-eye mark-eye-l" cx="35" cy="58" rx="8" ry="11"/><ellipse class="mark-eye mark-eye-r" cx="65" cy="58" rx="8" ry="11"/></g>' +
    '<g class="mark-happy" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"><path d="M27 61Q35 53.5 43 61"/><path d="M57 61Q65 53.5 73 61"/></g>' +
    '</mask></defs><g class="mark-body">' +
    `<rect class="sb-mark-a" x="-30" y="-30" width="160" height="160" fill="#00e5c3" mask="url(#${id})"/>` +
    `<rect class="sb-mark-b" x="-30" y="-30" width="160" height="160" fill="#c026d3" mask="url(#${id})"/>` +
    `<rect x="-30" y="-30" width="160" height="160" fill="#ffffff" mask="url(#${id})"/>` +
    '</g></svg>';
}

// Mount the live-state motion on every `svg.sb-mark` under `root` that has not
// been mounted yet (a page may render marks after load).
export function mountAllMarks(root = document, opts = {}) {
  for (const svg of root.querySelectorAll('svg.sb-mark:not([data-mark-live])')) {
    svg.setAttribute('data-mark-live', '');
    mountMascotMark(svg, opts);
  }
}

export function mountMascotMark(svg, opts = {}) {
  if (!svg) return;

  const eyes = [svg.querySelector('.mark-eye-l'), svg.querySelector('.mark-eye-r')].filter(Boolean);
  const base = eyes.map((e) => ({ cx: Number(e.getAttribute('cx')), cy: Number(e.getAttribute('cy')) }));
  const min = opts.blinkMin ?? BLINK_MIN, max = opts.blinkMax ?? BLINK_MAX;

  // blink: both holes squash to a slit for ~120ms; one time in five it is a wink
  // on the right eye only. Each blink re-arms with a fresh random gap, so the
  // rhythm never settles into a beat.
  const blink = () => {
    const shut = Math.random() < WINK_P ? [eyes[1]] : eyes;
    for (const e of shut) if (e) e.setAttribute('ry', '1');
    setTimeout(() => { for (const e of shut) if (e) e.setAttribute('ry', '11'); }, BLINK_MS);
    setTimeout(blink, min + Math.random() * (max - min));
  };
  setTimeout(blink, min + Math.random() * (max - min));

  // pupils: both eye holes drift toward the pointer, up to DRIFT user units,
  // eased by a rAF loop that parks itself once it has settled. A coarse pointer
  // (touch) gets no listener — there is no hover to follow.
  const target = { x: 0, y: 0 }, at = { x: 0, y: 0 };
  let raf = 0;
  const step = () => {
    at.x += (target.x - at.x) * EASE;
    at.y += (target.y - at.y) * EASE;
    for (let i = 0; i < eyes.length; i++) {
      eyes[i].setAttribute('cx', (base[i].cx + at.x).toFixed(2));
      eyes[i].setAttribute('cy', (base[i].cy + at.y).toFixed(2));
    }
    raf = Math.abs(target.x - at.x) > SETTLE || Math.abs(target.y - at.y) > SETTLE ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  if (!matchMedia('(pointer: coarse)').matches) {
    addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      target.x = clamp((e.clientX - r.left - r.width / 2) / ((r.width / 2) * LOOK_REACH)) * DRIFT;
      target.y = clamp((e.clientY - r.top - r.height / 2) / ((r.height / 2) * LOOK_REACH)) * DRIFT;
      kick();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; kick(); });
  }

  // click: the happy beat — both eye holes give way to the ^_^ arcs while the
  // mark takes a quick double bob. Both live in the .is-happy class; the CSS
  // carries the shapes and the bounce, this only holds the 600ms window. This is
  // the deployed landing page's click effect, deliberately: the emoji morph
  // (mascot.js morphToEmoji) is NOT wanted here, the face stays a face.
  let happy = 0;
  svg.addEventListener('click', () => {
    if (happy) return;
    svg.classList.add('is-happy');
    happy = setTimeout(() => { svg.classList.remove('is-happy'); happy = 0; }, HAPPY_MS);
  });
}