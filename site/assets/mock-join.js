// The product mocks' tap (2026-10-05, ga-audit H3). GA's click_map read 44 of 44
// taps on /features' super mock, 22 of 22 on sync's, 22 of 22 on publish's and
// 193 on the hero's stage as dead: the readers who tap a picture of the app are
// the most engaged ones, and the picture gave them nothing. A tap on a mock now
// opens the site's one join, the sign-in sheet signup-bar.js builds (a bottom
// sheet on a phone, a centred card wider up), with one line saying what the app
// does there. No new surface: this file only wires the mocks to it.
//
// One implementation for every page that draws a mock:
//   armMockJoins(root)                 every [data-mock-join="<section>"] under
//                                      root, its line in data-mock-line
//                                      (features-page.js: /features, and the home
//                                      page's copy of it in #more)
//   armMockJoin(el, { section, line }) one element by hand (hero-wschat.js's stage)
//   provideJoin(open)                  signup-bar.js hands over the sheet's opener
//                                      once the sheet is mounted. A page with no
//                                      sheet (a signed-in or granted reader) never
//                                      calls it, so no mock there claims to be a
//                                      button. An arm made first waits for it, so
//                                      the order of the pages' scripts is free.
// The URL this module is imported by MUST be the same everywhere
// (./site/assets/mock-join.js?v=2): a second URL is a second module with its own
// opener, and the mocks it armed would never find the sheet.
//
// What arming does: the mock gets role=button, a tab stop, an accessible name
// (the line, "try super mode in the app") and the pointer cursor; Enter and
// Space open it like a tap. A mock that already holds a control (the hero's
// stage holds the replay circle) cannot be a button itself, since a button's
// children are presentational and a nested control is an a11y defect: it keeps
// its own role and gets one real, visually hidden <button> as its last child,
// the keyboard and screen reader path, while a tap anywhere else on it opens
// the sheet. A tap that lands on a control inside the mock (a link, the replay
// circle) belongs to that control.
//
// Every figure on /features that DRAWS a control is armed (2026-10-06, ga-audit
// FO-U2): a daemon's Resume now, a seg, a switch, a field, a chip is a picture
// of a control, and a reader taps it. A figure of text only, a terminal, a log
// or a pill someone will want to select is not: a tap handler would take the
// selection from them. edge/test/site-mock-join.test.ts keeps the next drawn
// control from shipping dead.
//
// The tap handler only opens: the pressed state is one class (.is-pressed, set
// on pointerdown or a key press and cleared on lift), the open is the sheet's
// showModal, and nothing else runs in the tap. The sheet's own reporting (waitlist_sheet_open) waits behind its
// settle seam (signup-bar.js).
//
// Looks: mock-join.css, linked the first time a mock is armed, the way
// hero-wschat-end.js carries its sheet.
const SHEET = new URL('./mock-join.css?v=2', import.meta.url).href;
function ensureSheet() {
  if (document.querySelector('link[rel="stylesheet"][href*="mock-join.css"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = SHEET;
  document.head.appendChild(l);
}

// what a tap may land on inside a mock and do its own thing. A control the mock
// only DRAWS (the hero frontend's rail tiles sit under an aria-hidden hub) is
// picture, not control: a tap on it is a tap on the mock.
const CONTROL = 'a[href], button, input, select, textarea, summary, [tabindex]';
const real = (el, c) => c !== el && !c.closest('[aria-hidden="true"]');

let join = null; // signup-bar.js's opener: ({ section, line }) => void
const waiting = []; // arms made before the sheet is mounted
const armed = new WeakSet();

// A mock that is an SVG element (the features hero diagram's tidy switch, a <g>
// inside an aria-hidden <svg>) cannot be a button: it cannot hold a hidden
// button child, and a focusable element inside aria-hidden is an a11y defect.
// Its keyboard and screen reader path is ONE real, visually hidden <button>
// placed after the drawing in the figure that holds it. The same switch drawn
// twice (the wide and the phone diagram) is one control with one key: the key
// is made per (figure, section). An outline does not paint on a <g>, so the
// key's focus and a press light .is-focus / .is-pressed on the drawing, which
// mock-join.css turns into a stroke on the shape it names with .mj-ring.
const svgKeys = new WeakMap(); // the figure -> Map<section, { key, els }>
function outerSvg(el) {
  let s = el.ownerSVGElement ?? null;
  while (s?.ownerSVGElement) s = s.ownerSVGElement;
  return s;
}
function svgKey(el, svg, section, label, go) {
  const home = svg.parentElement;
  let by = svgKeys.get(home);
  if (!by) svgKeys.set(home, (by = new Map()));
  let one = by.get(section);
  if (!one) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'mj-key sb-visually-hidden';
    key.setAttribute('aria-label', label);
    key.setAttribute('aria-haspopup', 'dialog');
    const els = new Set();
    const mark = (cls, on) => els.forEach((e) => e.classList.toggle(cls, on));
    key.addEventListener('click', go);
    key.addEventListener('focus', () => mark('is-focus', key.matches(':focus-visible')));
    key.addEventListener('blur', () => { mark('is-focus', false); mark('is-pressed', false); });
    key.addEventListener('keydown', (e) => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) mark('is-pressed', true); });
    key.addEventListener('keyup', () => mark('is-pressed', false));
    home.append(key);
    by.set(section, (one = { key, els }));
  }
  one.els.add(el);
  return one.key;
}

function wire(el, section, line) {
  const label = line.replace(/\.$/, '');
  el.classList.add('mj');
  const go = () => join?.({ section, line });
  const svg = outerSvg(el);
  if (svg) {
    el.classList.add('mj-svg');
    svgKey(el, svg, section, label, go);
    // nothing inside a drawn switch is a control of its own: a tap anywhere on it opens
    el.addEventListener('click', go);
    el.addEventListener('pointerdown', () => el.classList.add('is-pressed'));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => el.classList.remove('is-pressed'));
    return;
  }
  const nested = [...el.querySelectorAll(CONTROL)].some((c) => real(el, c));
  let key = null;
  if (nested) {
    key = document.createElement('button');
    key.type = 'button';
    key.className = 'mj-key sb-visually-hidden';
    key.setAttribute('aria-label', label);
    key.setAttribute('aria-haspopup', 'dialog');
    el.append(key);
  } else {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', label);
    el.setAttribute('aria-haspopup', 'dialog');
    el.removeAttribute('aria-hidden'); // a button is not hidden from a screen reader
  }
  const own = (e) => { // a real control inside the mock keeps its own tap
    const hit = e.target.closest?.(CONTROL);
    return !!hit && hit !== key && real(el, hit) && el.contains(hit);
  };
  el.addEventListener('click', (e) => { if (!own(e)) go(); });
  // the acknowledgement: the pressed ring, on the frame after the finger lands
  // (a class, not :active, so a control inside the mock does not press the mock)
  const press = (e) => { if (!own(e)) el.classList.add('is-pressed'); };
  const lift = () => el.classList.remove('is-pressed');
  el.addEventListener('pointerdown', press);
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, lift);
  if (nested) return;
  // Enter opens on keydown and Space on keyup, as a native button does
  let space = false;
  el.addEventListener('keydown', (e) => {
    if (e.target !== el || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); // Space would scroll the page
    el.classList.add('is-pressed');
    if (e.key === ' ') space = true;
    else go();
  });
  const rest = () => { space = false; lift(); };
  el.addEventListener('keyup', (e) => {
    const open = space && e.key === ' ';
    rest();
    if (open) go();
  });
  el.addEventListener('blur', rest);
}

/** Make `el` a tap target that opens the join; `section` is the id the open is
 *  reported under, `line` the one-line prompt the sheet shows ("try super mode
 *  in the app."). Safe to call twice and before provideJoin. */
export function armMockJoin(el, { section, line = 'try it in the app.' } = {}) {
  if (!el || armed.has(el)) return;
  armed.add(el);
  const arm = () => { ensureSheet(); wire(el, section || 'mock', line); };
  if (join) arm();
  else waiting.push(arm);
}

/** Arm every [data-mock-join="<section>"] under `root`. */
export function armMockJoins(root = document) {
  for (const el of root.querySelectorAll('[data-mock-join]')) {
    armMockJoin(el, { section: el.dataset.mockJoin, line: el.dataset.mockLine || undefined });
  }
}

/** signup-bar.js: the sheet is mounted, here is how to open it. */
export function provideJoin(open) {
  join = open;
  ensureSheet();
  for (const arm of waiting.splice(0)) arm();
}
