// hub-handoff.js: the stage handoff shared by the landing hero variants (W6,
// extracted from the since-deleted hero-xdxd.js so every variant hands #stage to the real app
// through ONE implementation). The contract, in the owner's terms: the intro
// plays, then the tagline's black layer hands the stage to the actual app
// display — the hub grounds in, its inner columns fade up, the intro overlay
// dissolves, the phone beat runs rebased to the handoff, and the story rests
// on the real interface with #replay shown (no auto-loop, no end card).
//
// Exports (all named):
//   PHONE           the beat-5 constants (hub-boot.js 17.0-22.4 rebased to
//                   the handoff, s); a variant spreads them into its TIMING
//   prepStage(stage, heroName)  one-time stage preparation, idempotent:
//                   data-hero on #stage (the shared .stage[data-hero] sheet
//                   rules key on the attribute, hero-chaos.css), the margin
//                   transcript column collapsed, the hub's window and HUD
//                   grounds forced transparent (their stylesheet values are
//                   captured first so revealHub can lerp them back), every
//                   boot-story row and HUD child zeroed, .docked/.perched
//                   cleared, #replay hidden. Returns the resolved refs:
//                   S.hud (#hub nav.hud), S.mark (the HUD's .hud-mark, the
//                   page's one mascot: the small square left of the wordmark
//                   in the title line, superbot-desktop f2fbe329c, drawn as
//                   the bare living head of the default 'plain' skin
//                   (abca8cb9b), no ground; the rail beside the HUD draws
//                   none, so every hero's flying tile lands on it, and S.mark
//                   is where its opacity is written) and S.dropItems (the
//                   .hud-word, then each .hud-disc in order, the things that
//                   drop in with the mark's landing).
//   revealHub(p, opts)          pure of a 0..1 progress: #hub and #hub .hud
//                   opacity ride p, and (unless opts.grounds === false) the
//                   captured window grounds lerp from transparent to their
//                   captured colours on the same progress, with the Superbot
//                   mark (the HUD's bare head) surfacing with them. opts.grounds === false is the
//                   intro-time window (a mid-stage HUD reveal), where the
//                   grounds must stay transparent.
//   revealInners(p)             pure of a 0..1 progress: the .inner columns
//                   fade (hub-boot.css keeps .hub .inner at 0).
//   placeBeam()     the sync beam's geometry (hub-boot.js layout() port)
//   playPhoneFrame(pt)          pure of the rebased phone clock, s
//   still()         the composed end state (the hub fully revealed, the phone
//                   docked, .perched, #replay shown)
//   perch()         the hold: .perched on #stage + #replay shown (idempotent)
//   wireReplay(restart)         #replay -> restart()
//
// One rAF-clock assumption inherited from the variants: every call here is
// driven per frame by the caller's clock, so a paused clock freezes the
// handoff exactly where it stopped. No timers, no WAAPI in this module.

export const PHONE = {
  // beat 5: the phone beat (hub-boot.js 17.0-22.4) rebased to the handoff, s
  FEED0: 0.0, UP0: 1.0, UP1: 1.5, BEAM0: 2.2, BEAM1: 2.5, COMET0: 2.4, COMET1: 4.0,
  LABEL: 4.0, LINE2: 4.2, SYNC0: 4.2, SYNC1: 4.4, BEAM_FADE0: 4.4, BEAM_FADE1: 4.8,
  DOCK: 5.0, LABEL_FADE1: 5.4, END: 5.6, POP: 0.25, POP_DY: 6, LABEL_DY: 4,
  MORPH: 0.6, // the dock morph, DOCK..DOCK+MORPH; lands on END so the hold starts at rest
};

const P = PHONE;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const outQuint = (p) => 1 - Math.pow(1 - p, 5);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const inOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const op = (el, v) => { if (el) el.style.opacity = String(clamp01(v)); };
const popIn = (el, t, at, dur = P.POP, dy = P.POP_DY) => {
  if (!el) return;
  const p = seg(t, at, at + dur);
  op(el, p * 2);
  el.style.transform = 'translateY(' + ((1 - outBack(p)) * dy).toFixed(1) + 'px)';
};

// the refs prepStage resolved; null until the first call
let S = null;

export function prepStage(stage, heroName) {
  const $ = (id) => document.getElementById(id);
  // the mark is the HUD's, in its title line left of the wordmark (SidebarHud.tsx
  // hud-mark, f2fbe329c); the rail beside the HUD draws none
  const hub = $('hub'), hud = hub.querySelector('.hud'), mark = hub.querySelector('.hud-mark');
  const dropItems = [hud.querySelector('.hud-word'), ...hud.querySelectorAll('.hud-discs .hud-disc')].filter(Boolean);
  const inners = [...hub.querySelectorAll('.inner')];
  const feed = [1, 2].map((n) => hub.querySelector('.msg[data-m="' + n + '"]'));
  const phone = $('phone'), phoneMsgs = [...phone.querySelectorAll('.msg')];
  const phoneLabel = $('phone-label'), sync = $('sync');
  const beam = $('beam'), beamPath = $('beam-path'), beamRun = $('beam-run-path');
  const beamFade = $('beam-fade'), beamRunGrad = $('beam-run');
  const replay = $('replay'), led = $('led'), margin = $('margin');
  const arena = $('arena') || stage;

  // the stylesheet's own window grounds, captured BEFORE they are forced
  // transparent: revealHub lerps back to exactly these, so a token change in
  // hub-boot.css/site.css stays one edit there (no values duplicated here)
  const hcs = getComputedStyle(hub), dcs = getComputedStyle(hud);
  // the HUD's four border sides share one colour (hub-boot.css .side > .hud:
  // a width-only hairline, right on a column, bottom on a narrow header)
  const C = { hubBg: hcs.backgroundColor, hubBd: hcs.borderColor,
              hudBg: dcs.backgroundColor, hudBd: dcs.borderTopColor };

  // the shared sheet rules (hero-chaos.css .stage[data-hero]) hide the
  // boot-story-only children the variants do not use
  stage.dataset.hero = heroName;
  hub.removeAttribute('aria-hidden');

  // the transcript margin column is dead weight (the boot story is unused):
  // collapse it from the very first frame so the arena and the hub own the
  // full stage width, with no empty panel on the left
  const body = stage.querySelector('.body') || stage;
  body.style.transition = 'none';
  body.style.gridTemplateColumns = '0% minmax(0, 1fr)';
  if (margin) { margin.style.opacity = '0'; margin.style.padding = '0'; margin.style.borderRight = '0'; margin.style.overflow = 'hidden'; }

  // the frontend waits invisible: window and HUD grounds are transparent
  // until the reveal, the HUD's Superbot mark waits (the rail's ground and
  // tiles are .inner, so they wait with the columns), and the rest columns
  // wait for their fade. The stylesheet gives .hub a transition list (background-
  // color, border-color...) that would turn these instant changes into a
  // visible fade, so transitions are off while the stage is set
  hub.style.transition = 'none';
  hud.style.transition = 'none';
  hub.style.background = 'transparent';
  hub.style.borderColor = 'transparent';
  hub.style.boxShadow = 'none';
  hud.style.background = 'transparent';
  hud.style.borderColor = 'transparent';
  hud.style.transform = '';
  hud.classList.remove('menu-open');
  op(hub, 0);
  hub.style.transform = '';

  // the phone cut's rest state (hub-boot.css .phone/.beam): the phone sits
  // below the arena, the beam dark, the label and chip dark, the story's own
  // feed rows and the HUD's children waiting
  const noPhone = getComputedStyle(phone).display === 'none';
  op(phone, 0); phone.style.transform = ''; phone.style.transformOrigin = '0 0';
  hub.style.right = ''; hub.style.bottom = '';
  op(phoneLabel, 0); op(sync, 0); op(beam, 0);
  op(mark, 0);
  feed.forEach((el) => { if (el) { op(el, 0); el.style.transform = ''; } });
  phoneMsgs.forEach((el) => { op(el, 0); el.style.transform = ''; });
  dropItems.forEach((el) => { op(el, 0); el.style.transform = ''; });
  inners.forEach((el) => { op(el, 0); el.style.transform = ''; });
  phone.classList.remove('docked', 'thread', 'replied');
  hub.classList.remove('docked');
  stage.classList.remove('perched');
  replay.hidden = true;

  S = { stage, hero: heroName, arena, hub, hud, mark, dropItems, inners, feed, phone, phoneMsgs,
        phoneLabel, sync, beam, beamPath, beamRun, beamFade, beamRunGrad, replay, led,
        C, noPhone, B: null, G: null };
  return S;
}

// the window ground is either absent (p = 0) or its captured colour: the hub's
// own opacity (same p) carries the fade. Lerping the colour's alpha per frame
// as well repainted the whole hub on every frame of the 520ms reveal; this
// writes once at each end and the reveal stays compositor-only
function rideGround(style, prop, captured, p) {
  style[prop] = p > 0 ? captured : 'transparent';
}

export function revealHub(p, opts = {}) {
  if (!S) return;
  p = clamp01(p);
  const { hub, hud, mark } = S;
  // per-frame inline opacity, pure of progress. The HUD rides under its
  // parent, so both take the same window (the .inner columns wait for
  // revealInners)
  op(hud, p);
  op(hub, p);
  if (opts.grounds === false) return;
  // the window grounds grow in on the same progress: captured colours lerp
  // from transparent (the boot story's own reveal, hub-boot.js home beat,
  // rides a 520ms CSS transition — the clock-driven variants write per frame)
  rideGround(hub.style, 'background', S.C.hubBg, p);
  rideGround(hub.style, 'borderColor', S.C.hubBd, p);
  rideGround(hud.style, 'background', S.C.hudBg, p);
  rideGround(hud.style, 'borderColor', S.C.hudBd, p);
  // the Superbot mark (the HUD's bare living head, hub-boot.css .hud-mark: no
  // ground of its own) surfaces with the HUD, alive from its first visible
  // frame, so it arrives already in its final look. The rest of the HUD (the
  // wordmark and the discs) rides the same progress unless the caller animates
  // them itself (the sphere intro drops them in one by one, so it passes
  // `items: false`)
  op(mark, p);
  if (opts.items !== false) S.dropItems.forEach((el) => op(el, p));
}

export function revealInners(p) {
  if (!S) return;
  p = clamp01(p);
  S.inners.forEach((el) => op(el, p));
}

// the sync beam's geometry, measured against the arena (hub-boot.js layout()
// port, hero-xdxd.js verbatim)
export function placeBeam() {
  if (!S || S.noPhone) return;
  const { arena, phone, beam, beamPath, beamRun, beamFade, beamRunGrad } = S;
  if (!beam || !beamPath || !beamRun || !beamFade || !beamRunGrad) return;
  const W = arena.clientWidth, H = arena.clientHeight;
  // offset* ignores transforms, so the phone's rest position is read while
  // it still sits below the arena
  const px = phone.offsetLeft, py = phone.offsetTop, pw = phone.offsetWidth;
  const x0 = W * 0.45, y0 = H * 0.62, x1 = px + pw * 0.22, y1 = py + 10;
  const cx = x0 + (x1 - x0) * 0.3, cy = y1 - 14;
  const d = 'M ' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  beamPath.setAttribute('d', d);
  beamRun.setAttribute('d', d);
  S.B = { x0, x1, span: Math.max(90, (x1 - x0) * 0.42) };
  for (const g of [beamFade, beamRunGrad]) { g.setAttribute('y1', '0'); g.setAttribute('y2', '0'); }
  beamFade.setAttribute('x1', x0.toFixed(1));
  beamFade.setAttribute('x2', x1.toFixed(1));
  // the light parked wholly before the rail's start until its run
  beamRunGrad.setAttribute('x1', (S.B.x0 - S.B.span).toFixed(1));
  beamRunGrad.setAttribute('x2', S.B.x0.toFixed(1));
  beam.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
}

// the dock's two boxes, measured once per story: the floating phone and the
// full hub, then the docked + perched phone column and the hub beside it.
// offset* ignores transforms, and the class flip is read and restored in the
// same task, so nothing paints between the two reads
function dockGeometry() {
  if (S.G) return S.G;
  const { stage, hub, phone } = S;
  const box = (el) => {
    const cb = el.offsetParent;
    const x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
    return { x, y, w, h, r: (cb ? cb.clientWidth : 0) - x - w, b: (cb ? cb.clientHeight : 0) - y - h };
  };
  const was = [phone.classList.contains('docked'), hub.classList.contains('docked'), stage.classList.contains('perched')];
  const hr = hub.style.right, hb = hub.style.bottom;
  hub.style.right = ''; hub.style.bottom = '';
  const set = (on) => { phone.classList.toggle('docked', on); hub.classList.toggle('docked', on); stage.classList.toggle('perched', on); };
  set(false);
  const from = { hub: box(hub), phone: box(phone) };
  set(true);
  const to = { hub: box(hub), phone: box(phone) };
  phone.classList.toggle('docked', was[0]); hub.classList.toggle('docked', was[1]); stage.classList.toggle('perched', was[2]);
  hub.style.right = hr; hub.style.bottom = hb;
  S.G = { from, to };
  return S.G;
}

// beat 5, evaluated every frame from the caller's clock, pure of pt (s):
// hub-boot.js's 17.0-22.4 rebased to the handoff (its 17.0, the chat lane
// having landed, is 0 here)
export function playPhoneFrame(t) {
  if (!S) return;
  const { feed, phone, phoneMsgs, phoneLabel, sync, beam } = S;
  popIn(feed[0], t, P.FEED0);
  popIn(feed[1], t, P.LINE2);
  if (S.noPhone) return;
  if (S.B) op(beam, seg(t, P.BEAM0, P.BEAM1) * (1 - seg(t, P.BEAM_FADE0, P.BEAM_FADE1)));
  op(sync, seg(t, P.SYNC0, P.SYNC1));
  const p = outQuint(seg(t, P.UP0, P.UP1));
  op(phone, p * 2);
  if (t < P.DOCK) phone.style.transform = 'translateY(' + ((1 - p) * 120).toFixed(1) + '%)';
  // the app's new-chat hero hands off to the thread as the first turn lands
  // (hub-boot.css .phone.thread: the hero fades, the header takes the title)
  phone.classList.toggle('thread', t >= P.UP1);
  popIn(phoneMsgs[0], t, P.UP1);
  phone.classList.toggle('replied', t >= P.LINE2); // the reply row mounts as it lands, as the app's list appends it
  popIn(phoneMsgs[1], t, P.LINE2);
  if (S.B) {
    // one light, once: swept from wholly before the start to wholly past
    // the end, so it enters and leaves the rail as a comet
    const gx = lerp(S.B.x0 - S.B.span, S.B.x1 + S.B.span, inOut(seg(t, P.COMET0, P.COMET1)));
    S.beamRunGrad.setAttribute('x1', gx.toFixed(1));
    S.beamRunGrad.setAttribute('x2', (gx + S.B.span).toFixed(1));
  }
  // the dock morph (owner 2026-09-08: "the mobile could become like a column"
  // beside the hub). It used to SNAP: .docked and .perched move right/top/
  // bottom/width, layout properties no transition may carry, so the phone
  // teleported from its floating spot to the column and the hub's edge
  // jumped, then both jumped 40px again at the perch. Now both boxes land in
  // their docked + perched layout on the DOCK frame and the difference plays
  // back over MORPH: the phone as a FLIP (translate + scale from the floating
  // box to the column, compositor only), the hub's right and bottom edges as
  // a per-frame inset tween so its main lane reflows through the move instead
  // of stepping (the one layout write per frame, bounded to the hub subtree
  // and to MORPH). Pure of t, so ?t seeks and replay land on the same frame.
  const docked = t >= P.DOCK;
  if (docked && !S.G) dockGeometry();
  phone.classList.toggle('docked', docked);
  S.hub.classList.toggle('docked', docked);
  S.stage.classList.toggle('perched', docked);
  if (!docked) { S.hub.style.right = ''; S.hub.style.bottom = ''; return; }
  const m = outQuint(seg(t, P.DOCK, P.DOCK + P.MORPH));
  const { from, to } = S.G;
  if (m < 1) {
    const sx = lerp(from.phone.w / to.phone.w, 1, m), sy = lerp(from.phone.h / to.phone.h, 1, m);
    const dx = (from.phone.x - to.phone.x) * (1 - m), dy = (from.phone.y - to.phone.y) * (1 - m);
    phone.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
    S.hub.style.right = lerp(from.hub.r, to.hub.r, m).toFixed(1) + 'px';
    S.hub.style.bottom = lerp(from.hub.b, to.hub.b, m).toFixed(1) + 'px';
  } else {
    // at rest the stylesheet owns the geometry again, so a resize at the
    // hold reflows from the classes rather than from stale pixels
    phone.style.transform = 'none';
    S.hub.style.right = '';
    S.hub.style.bottom = '';
  }
  // the label under the phone has no room once it docks flush with the hub's
  // foot; the "synced" chip takes the signal dots' slot once docked
  op(phoneLabel, 1 - seg(t, P.DOCK, P.LABEL_FADE1));
}

// the hold: the boot hero's terminal-collapsed state — the same `perched`
// stage class the boot story settles in placeParked() (hub-boot.js:344, 444),
// which lifts the hub off the foot and takes .replay-park to the centred
// placement under the window (hub-boot.css .stage.perched). Idempotent.
export function perch() {
  if (!S) return;
  S.stage.classList.add('perched');
  S.replay.hidden = false;
}

// the composed end state: the hub fully revealed with the phone docked and
// .perched, no clock (the state hub-boot.js's story settles into at its end)
export function still() {
  if (!S) return;
  const { hub, hud, mark, dropItems, inners, feed, phone, phoneMsgs, phoneLabel, sync, beam, led, replay } = S;
  op(hub, 1);
  hub.style.transition = '';
  hud.style.transition = '';
  hub.style.background = '';
  hub.style.borderColor = '';
  hub.style.boxShadow = '';
  hud.style.background = '';
  hud.style.borderColor = '';
  hud.style.transform = '';
  op(hud, 1);
  dropItems.forEach((el) => { op(el, 1); el.style.transform = ''; });
  op(mark, 1);
  inners.forEach((el) => { op(el, 1); el.style.transform = ''; });
  feed.forEach((el) => { if (el) { op(el, 1); el.style.transform = ''; } });
  if (led) led.classList.add('on');
  perch();
  if (S.noPhone) return;
  phoneMsgs.forEach((el) => { op(el, 1); el.style.transform = ''; });
  op(phone, 1);
  op(sync, 1); op(phoneLabel, 0); op(beam, 0);
  hub.style.right = ''; hub.style.bottom = '';
  phone.style.transform = 'none';
  phone.classList.add('docked', 'thread', 'replied');
  hub.classList.add('docked');
}

// #replay restarts the caller's whole story
export function wireReplay(restart) {
  if (!S) return;
  S.replay.addEventListener('click', restart);
}
