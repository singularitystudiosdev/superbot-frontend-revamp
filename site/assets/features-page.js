// The /features page's behaviour, scoped to a root (2026-09-25). Two pages run
// it: /features over its own document, and the home page over the copy of
// /features it splices in below the download band (lander-agent.html, #more).
// On the home page an id such as "sync" also names a hero node that comes
// first in document order, so nothing here resolves through
// document.getElementById: every lookup starts at the root.
import { mountAllMarks } from '/site/assets/mascot-mark.js?v=3';
import { armMockJoins } from '/site/assets/mock-join.js?v=2';

const byId = (root, id) => root.querySelector(`#${CSS.escape(id)}`);

/* the index: mark the link for the section in view (aria-current), and on
   the chip row keep that chip scrolled into sight. Under 640px the row is
   one bar (features.css, "the phone bar"): it shows the chip in view and
   opens the whole list as a panel. */
function mountIndex(root) {
  const nav = root.querySelector('.ftoc');
  if (!nav || !('IntersectionObserver' in window)) return;
  const phone = window.matchMedia('(max-width: 640px)');
  const btn = nav.querySelector('.ftoc-btn');
  const cur = nav.querySelector('.ftoc-cur');
  const links = {};
  nav.querySelectorAll('a[href^="#"]').forEach((a) => { links[a.getAttribute('href').slice(1)] = a; });
  const show = (a) => {
    if (!cur) return;
    const icon = a.querySelector('svg');
    const lab = document.createElement('span');
    lab.textContent = a.textContent.trim();
    cur.replaceChildren(icon ? icon.cloneNode(true) : '', lab);
    btn.setAttribute('aria-label', 'on this page: ' + lab.textContent);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const a = links[e.target.id];
      if (!a) continue;
      for (const k of Object.keys(links)) links[k].removeAttribute('aria-current');
      a.setAttribute('aria-current', 'true');
      show(a);
      if (!phone.matches && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    }
  }, { rootMargin: '-35% 0px -55% 0px' });
  for (const id of Object.keys(links)) { const el = byId(root, id); if (el) io.observe(el); }
  // an index link scrolls to ITS section: the browser's own fragment jump
  // resolves the first element with that id, which on the home page can be
  // a hero node above this copy
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const el = a && byId(root, a.getAttribute('href').slice(1));
    if (!el || root === document) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (!btn) return;
  const setOpen = (open) => {
    nav.toggleAttribute('data-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  btn.addEventListener('click', () => setOpen(!nav.hasAttribute('data-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.hasAttribute('data-open')) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (nav.hasAttribute('data-open') && !nav.contains(e.target)) setOpen(false); });
  phone.addEventListener('change', () => { if (!phone.matches) setOpen(false); });
}

/* the #sync phone's handoff (features.html head style, "the phone's two
   states"): arm it on the new chat, hand off to the thread once the phone's
   top is in the upper 60% of the viewport, and re-arm only after it has left
   below the fold, so the handoff replays on the way back down and a scroll
   that hovers at the trigger line never flips it back and forth. */
function mountSyncPhone(root) {
  const ph = root.querySelector('#sync .gs-phone');
  if (!ph || !('IntersectionObserver' in window)) return;
  ph.classList.add('is-live');
  new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) ph.classList.add('is-thread');
  }, { rootMargin: '0px 0px -40% 0px' }).observe(ph);
  new IntersectionObserver((entries) => {
    for (const e of entries) if (!e.isIntersecting && e.boundingClientRect.top > 0) ph.classList.remove('is-thread');
  }).observe(ph);
}

/* the at-a-glance panel (features.css, .f-glance). Two jobs. Its rows link to
   sections by id, and on the home page an id such as "sync" also names a hero
   node that comes first in document order, so a click resolves through the
   root, the way the index does. And its ambient loops (the daemon loop's dot,
   the resumes tag, the tidy chips, the tree pulse, the remote cursor) pause
   while the panel is off screen: data-off flips the --fg-play variable the
   sheet reads, on /features and on the home page's copy alike. */
function mountGlance(root) {
  const g = root.querySelector('.f-glance');
  if (!g) return;
  g.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const el = a && byId(root, a.getAttribute('href').slice(1));
    if (!el || root === document) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver((entries) => {
    for (const e of entries) g.toggleAttribute('data-off', !e.isIntersecting);
  }).observe(g);
}

/* the figures marked data-loop (features.css, "the core, round two": the
   daemon meter, the live dots, the phone's cursor, the voice bars, the ask
   caret) keep their loops only while on screen: data-off flips the
   --loop-play variable the sheet reads, on /features and on the home page's
   copy alike. */
function mountLoops(root) {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.toggleAttribute('data-off', !e.isIntersecting);
  });
  root.querySelectorAll('figure[data-loop]').forEach((f) => io.observe(f));
}

/* the mocks' tap (mock-join.js, 2026-10-05): a tap on a picture of the app
   opens the join. The markup names each mock (data-mock-join="<section>",
   data-mock-line="the one-line prompt"); the sheet is signup-bar.js's, so a
   page that mounts none (a signed-in reader) leaves the mocks as pictures.
   Here, with the rest of the page's behaviour, so /features and the home page's
   copy of it in #more run the one implementation. */

export function initFeatures(root = document) {
  mountIndex(root);
  mountGlance(root);
  mountLoops(root);
  mountSyncPhone(root);
  armMockJoins(root);
  // the #sync desktop mock's one mascot, the small mark left of the HUD's
  // wordmark (SidebarHud.tsx hud-mark, desktop f2fbe329c; the lane rail draws
  // none): the living face's blink and pupils (the bob, breath, ears and
  // ghosts are mascot-mark.css)
  const mark = root.querySelector('article#sync .gs-hud-mark');
  if (mark) mountAllMarks(mark);
}
