// hero-sphere: the lander's default hero. A PORT of the opening of the ad
// gallery's "I can do that too" spot (superbot-ad-gallery-real-ui,
// animations/do-that-too-superbot-9b4bf902/scenes/tabs.js, itself the
// tabs-chaos sphere-intro made deterministic), from the kill of the tab strip
// up to the frontend reveal, retargeted onto OUR real #hub. Its "All in one
// app" card, its browser act and its vendor-app cuts are not ported (the
// `realui` hero carries those); everything after the reveal is ours.
//
//   the app tiles lift out of a tab strip's favicon row, centre first, and
//   fly onto a Fibonacci sphere that spins up exponentially (1.2 -> 21
//   rad/s, x^1.55) -> it collapses into a ball over its last 450ms -> the
//   superbot tile (brand/superbot-app-icon.png) pops out of the ball with the
//   fv-flip-icon-grow flip -> it shrinks to the HUD mark's own size and moves
//   to the mark's place in the title line, left of the wordmark, centred on
//   the stage -> the REAL sidebar HUD (#hub .hud) stands around it in
//   mid-stage and its 'superbot' wordmark and destination discs drop in beside
//   the tile, left to right -> the whole HUD glides home to the top-left of the
//   sidebar as one while the window's grounds fade in, the tile going with the
//   HUD's mark (the page's one mascot: the small square the title line's height,
//   superbot-desktop f2fbe329c, 2026-10-01; the rail beside the HUD draws none)
//   -> the tile lands on the mark's box and cross-fades into the mark, the bare
//   living head of the default 'plain' skin (superbot-desktop abca8cb9b: no
//   ground of any kind, so the app icon's grey gradient leaves with the tile
//   and only the head stays), and the sidebar's chats, the rail's tiles, lane
//   and composer fade up: the frontend reveal -> hub-handoff.js's phone beat, the
//   perched hold, #replay. The mark is in the HUD at every width, so the narrow
//   cuts (the rail and the chat list hidden, the HUD a slim header) land the
//   tile on it too.
//
// House pattern (hero-chaos.js): ONE requestAnimationFrame clock, every beat a
// pure function of story time t (?t=<s> seeks, &play=1 plays on, #replay
// restarts, offscreen or a hidden tab pauses where it stopped). The spin angle
// is the integral of omega, precomputed once, so render stays pure of t.
// Geometry is the referent's own: a stage 1080 design px tall whose width
// follows the aspect (its ar.js), scaled to fit the stage body. The tiles'
// perspective is the referent's own 2D projection (scale by P/(P-z)); their
// draw order rides translateZ in an orthographic preserve-3d layer instead of
// its per-frame z-index, so every per-frame write is transform, opacity or
// filter. The one layout read (the HUD mark, the HUD's extent about it, the
// hub's own scale) happens in layout(), outside the loop.
//
// Every retimeable constant lives in HS, cited to the tabs.js line it came
// from (local seconds there = ours + T0).

import { PHONE, prepStage, revealHub, revealInners, placeBeam, playPhoneFrame,
         perch, wireReplay } from './hub-handoff.js?v=7';

// ---------- constants: the referent's, verbatim, retimed to our t = its lt - T0 ----------
const T0 = 2.50;                 // tabs.js:127 T.K, the kill: our story starts here
const HS = {
  // geometry, stage px (tabs.js:146-148)
  H: 1080, Z: 1.25, STRIP_L: 80, STRIP_R: 44 + 34,
  TILE: 64, R: 240, PERSP: 1500, MARK: 300,
  FIB_AZIMUTH: 2.399963,         // tabs.js:164
  N: 40,                         // tabs.js:111-118 ORDER.length: 40 tiles, repeats on purpose
  FAV: 16, FAV_Y: 23,            // tabs.js:362, 369: a favicon's size and row in the strip, design px
  // the kill: the strip falls away about the centre (tabs.js:282-288)
  PUSH: 0.018, KILL: 0.8, FALL: 0.9,
  // the lift (tabs.js:128, 143): centre of the strip first, 0.28s stagger, 0.6s outCubic flights
  STAGGER: 0.28, FLY: 0.60,
  LIFT_IN: 0.08,                 // ours: no strip is drawn, so a favicon fades in over its first 80ms
  // the spin (tabs.js:149-151, 158): omega = W0 * exp(ln(WMAX/W0) * p^1.55) over K..M, then WMAX
  W0: 1.2, WMAX: 21, SPIN_EXP: 1.55,
  M: 3.92 - T0,                  // tabs.js:129 T.M: the merge lands (our 1.42)
  MERGE: 0.45, MERGE_EXP: 1.7,   // tabs.js:129, 359: the 450ms accelerating window
  MERGE_Z: 10,                   // tabs.js:373: the ball's radius in z
  BLUR_FROM: 0.62,               // tabs.js:360: the smear ramps over the spin's last 38%
  SPIN_BLUR: 3.6, DEPTH_BLUR: 3, // tabs.js:378
  BLUR_CLEAR: 2 / 3,             // ours: the front third keeps its edges (the smear rides the far side)
  BLUR_MIN: 0.1,                 // ours: below this the filter is 'none'
  TILE_OUT: 0.22,                // tabs.js:361: tiles fade under the tile after M
  // the tile pop: fv-flip-icon-grow (tabs.js:130, 399-416)
  FLIP: 0.92, FLIP_AT: 0.76, FLIP_OVER: 1.05, FLIP_BRIGHT: 0.5,
  MARK_IN: [-0.03, 0.06],        // tabs.js:399: the tile's opacity window about M
  MARK_PERSP: 3.6,               // tabs.js:414: perspective = MARK * 3.6
  MARK_TILE: 44,                 // tabs.js:409: the landing tile, design px (ours is measured off #hub .hud-mark)
  LOCKUP: 0.9,                   // ours: the referent's 44 px tile beside its 48 px column stands, here, for this share of the HUD's text column (the title line over the discs) tall, so each child drops DROP_DY by its own share of that height
  // the HUD, on the referent's cascade timings (tabs.js:132-135)
  RISE: 4.90 - T0, RISE_DUR: 0.62,          // 3a: shrink to the lockup tile, move to its place beside the centred HUD
  DROP: 5.52 - T0, DROP_GAP: 0.07, DROP_DUR: 0.48, DROP_DY: -34, // 3b: wordmark, then discs left to right, drop in, overshooting;
                                           // DROP_DY is the referent's for its 44 px tile, so each child drops that share of its own height
  GLIDE: 6.70 - T0, GLIDE_DUR: 0.64,        // 4: the HUD glides home as one, the tile goes with its mark
  GROUND: 0.56,                  // tabs.js:439: the window's grounds, inOutCubic from the glide
  REST: 0.38,                    // tabs.js:136: chats, lane, selection fade in on landing
  MSG: 7.62 - T0,                // tabs.js:136 T.msg: the first reply lands = our phone beat's zero
  XFADE: 0.16,                   // ours: the tile (the app icon, its grey ground) gives way to the HUD mark's bare head
  // easings (tabs.js:40-45)
  FLIP_EASE: [0.3, 0.85, 0.3, 1.04], GLIDE_EASE: [0.45, 0, 0.2, 1],
  DROP_EASE: [0.34, 1.56, 0.64, 1], EASE_OUT: [0, 0, 0.58, 1],

  // the tiles: hero-chaos.js HC.BRANDS (local only), cycled to the referent's 40
  BRAND: '/site/assets/brand/',
  MARK_SRC: '/site/assets/brand/superbot-app-icon.png', // tabs.js:245: the mark's own tile art, its img.tile layer (the app icon since the desktop's 'No background' default skin, 2026-09-25)
  BRANDS: ['chaos/claude.png', 'chaos/gemini-app-icon.png', 'chaos/cursor.png', 'chaos/copilot.svg',
           'chaos/devin.png', 'chaos/hermes.png', 'chaos/kiro.png', 'chaos/vscode.png', 'chaos/chatgpt.png',
           'tiles/windsurf.svg', 'tiles/zed.svg', 'tiles/cline.svg', 'tiles/roo.svg', 'tiles/kilo.svg',
           'tiles/continue.svg', 'tiles/opencode.svg', 'tiles/openclaw.svg', 'tiles/qwen-code.svg',
           'tiles/amazon-q-cli.svg'],
};

// ---------- derived beats (s, our clock) ----------
const N = HS.N, M = HS.M;
const FLIP1 = M + HS.FLIP;
const RISE1 = HS.RISE + HS.RISE_DUR;
const LAND = HS.GLIDE + HS.GLIDE_DUR;      // tabs.js:139: the tile sits on the HUD's mark
const REST1 = LAND + HS.REST;              // the frontend is revealed
const HANDOFF = HS.MSG;                    // the phone beat's zero (hub-handoff.js)
const END = HANDOFF + PHONE.END;           // the hold
const MID = (N - 1) / 2;
const liftAt = (k) => HS.STAGGER * (Math.abs(k - MID) / MID); // tabs.js:143

// ---------- math (tabs.js:12-45) ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function bezier([x1, y1, x2, y2]) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      if (Math.abs(e) < 1e-6) return sy(u);
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1; u = x;
    for (let i = 0; i < 30; i++) { const v = sx(u); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = u; else hi = u; u = (lo + hi) / 2; }
    return sy(u);
  };
}
const flipEase = bezier(HS.FLIP_EASE);
const glideEase = bezier(HS.GLIDE_EASE);
const dropEase = bezier(HS.DROP_EASE);
const easeOut = bezier(HS.EASE_OUT);

// the spin angle (tabs.js:151-160), tabled once at 1ms so render stays pure of t
const omega = (t) => HS.W0 * Math.exp(Math.log(HS.WMAX / HS.W0) * Math.pow(seg(t, 0, M), HS.SPIN_EXP));
const DT = 0.001;
const ANG = new Float64Array(Math.ceil(M / DT) + 2);
for (let i = 1; i < ANG.length; i++) ANG[i] = ANG[i - 1] + ((omega((i - 1) * DT) + omega(i * DT)) / 2) * DT;
const angleAt = (t) => {
  if (t <= 0) return 0;
  const f = Math.min(t, M) / DT, i = Math.min(ANG.length - 2, Math.floor(f));
  return lerp(ANG[i], ANG[i + 1], f - i) + (t > M ? (t - M) * HS.WMAX : 0);
};
// the Fibonacci sphere (tabs.js:161-166)
const FIB = Array.from({ length: N }, (_, i) => {
  const y = 1 - (2 * i + 1) / N;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const th = HS.FIB_AZIMUTH * i;
  return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
});

// ---------- DOM ----------
const stage = document.getElementById('stage');
const root = document.createElement('div');
root.className = 'hero-sphere';
root.id = 'hero-sphere';
root.setAttribute('role', 'figure');
root.setAttribute('aria-label', 'the apps you already use lift into a spinning sphere, collapse into the superbot tile, and it becomes the app');
root.innerHTML =
  `<div class="hs-ground"></div>` +
  `<div class="hs-canvas"><div class="hs-orb"></div>` +
  `<img class="hs-mark" src="${HS.MARK_SRC}" alt="" draggable="false"></div>`;
const ground = root.querySelector('.hs-ground');
const canvas = root.querySelector('.hs-canvas');
const orb = root.querySelector('.hs-orb');
const mark = root.querySelector('.hs-mark');
const replayEl = document.getElementById('replay');

const tiles = Array.from({ length: N }, (_, k) => {
  const el = document.createElement('div');
  el.className = 'hs-tile';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<img src="${HS.BRAND}${HS.BRANDS[k % HS.BRANDS.length]}" alt="" draggable="false">`;
  orb.appendChild(el);
  return { k, el, dir: FIB[k], lift: liftAt(k), shown: true };
});

// ---------- layout (outside the loop) ----------
// The referent's stage: 1080 px tall, as wide as the aspect makes it, so
// k = h / 1080 and W = w / k. The HUD geometry is read here once per size
// (and on replay), at rest: seat, the HUD's mark (the small square left of the
// wordmark in the title line, the page's one mascot), its centre and size in
// root px: the lockup the tile flies in is the HUD itself with the tile on
// the mark's seat, and the landing is the same box (null where no HUD is on
// screen: the tile dissolves in place instead); span = the centre of the
// lockup's drawn box (the mark, the wordmark and every disc) less the seat's
// centre, root px, so centring the HUD on the stage puts the lockup tile at
// stage centre minus span; and hk, the hub's own px per root px, so the HUD's
// translate is written in its px. The wordmark's box is its glyphs' (a
// Range), not the block that stretches to the sidebar's edge, so the HUD
// centres on what is drawn.
const L = { w: 0, h: 0, k: 1, W: 1920, cx: 960, cy: 540, seat: null, span: { x: 0, y: 0 }, hk: 1, fav: [], dy: [] };
let S = null; // prepStage's refs
function layout(force = false) {
  const w = root.clientWidth, h = root.clientHeight;
  if (!w || !h) return;
  if (!force && w === L.w && h === L.h) return;
  L.w = w; L.h = h;
  L.k = h / HS.H; L.W = w / L.k; L.cx = L.W / 2; L.cy = HS.H / 2;
  canvas.style.width = `${L.W.toFixed(2)}px`;
  canvas.style.transform = `scale(${L.k.toFixed(6)})`;
  // the strip's favicon x at the kill (tabs.js:293-305, 368: every tab open, sharing the width)
  const BW = L.W / HS.Z, avail = BW - HS.STRIP_L - HS.STRIP_R;
  const wFull = Math.min(240, avail / N), favL = Math.min(12, (wFull - 16) / 2);
  L.fav = tiles.map((tl) => HS.STRIP_L + tl.k * wFull + favL + 8);
  measureHud();
}
function measureHud() {
  L.seat = null;
  if (!S || !S.mark) return;
  const { hud, mark: hm, dropItems } = S;
  // read at rest: the HUD home, its children off their drop offsets
  const tr = hud.style.transform, itr = dropItems.map((n) => n.style.transform);
  hud.style.transform = '';
  dropItems.forEach((n) => { n.style.transform = ''; });
  const rr = root.getBoundingClientRect();
  const Zs = rr.width / L.w || 1;
  const sr = hm.getBoundingClientRect(); // the HUD's mark, in the title line
  let x0 = sr.left, x1 = sr.right, y0 = sr.top, y1 = sr.bottom;
  let c0 = Infinity, c1 = -Infinity; // the text column's own extent, the wordmark and the discs: the drop's reference height
  for (const n of dropItems) {
    let q = n.getBoundingClientRect();
    if (n.classList.contains('hud-word')) {
      const g = document.createRange();
      g.selectNodeContents(n);
      q = g.getBoundingClientRect();
    }
    if (!(q.width > 0)) continue;
    x0 = Math.min(x0, q.left); x1 = Math.max(x1, q.right);
    y0 = Math.min(y0, q.top); y1 = Math.max(y1, q.bottom);
    c0 = Math.min(c0, q.top); c1 = Math.max(c1, q.bottom);
  }
  const hw = hud.getBoundingClientRect().width, hOff = hud.offsetWidth;
  hud.style.transform = tr;
  dropItems.forEach((n, i) => { n.style.transform = itr[i]; });
  if (!(sr.width > 0) || !(c1 > c0) || !(hOff > 0)) return; // no HUD on screen: the tile dissolves in place instead
  L.hk = (hw / Zs) / hOff;
  // the lockup tile IS the HUD's mark seat: centred on the title line
  const scx = sr.left + sr.width / 2, scy = sr.top + sr.height / 2;
  L.span = { x: ((x0 + x1) / 2 - scx) / Zs, y: ((y0 + y1) / 2 - scy) / Zs };
  L.seat = { x: (scx - rr.left) / Zs, y: (scy - rr.top) / Zs, s: sr.width / Zs };
  // a disc is shorter than the column: a full drop would carry it through the
  // wordmark above it, so each drops the referent's share of its own height
  const ms = ((c1 - c0) * HS.LOCKUP) / Zs / L.hk;
  L.dy = dropItems.map((n) => HS.DROP_DY * ((n.offsetHeight || ms) / ms));
}
new ResizeObserver(() => layout()).observe(root);

// the captured window grounds (prepStage), written with an alpha through the
// glide as the referent does (tabs.js:439-446); cached so each writes once per change
const rgba = (c, a) => {
  const m = String(c).match(/[\d.]+/g);
  if (!m || m.length < 3) return 'transparent';
  const base = m.length > 3 ? +m[3] : 1;
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${(base * a).toFixed(3)})`;
};
let lastGround = -1;
function writeGrounds(a) {
  if (a === lastGround || !S) return;
  lastGround = a;
  const { hub, hud, C } = S;
  const v = (c) => (a <= 0 ? 'transparent' : a >= 1 ? c : rgba(c, a));
  hub.style.background = v(C.hubBg);
  hub.style.borderColor = v(C.hubBd);
  hud.style.background = v(C.hudBg);
  hud.style.borderColor = v(C.hudBd);
}

// ---------- the renderer: one story time -> every write ----------
function render(t) {
  if (t < HANDOFF) renderOverlay(t);
  root.style.display = t >= HANDOFF ? 'none' : 'block';
  renderHub(t);
  if (t >= HANDOFF) {
    if (!beamPlaced) { placeBeam(); beamPlaced = true; }
    playPhoneFrame(t - HANDOFF);
  }
  if (t >= END) perch();
  replayEl.hidden = t < END;
}

const show = (tl, on) => { if (tl.shown !== on) { tl.shown = on; tl.el.style.visibility = on ? '' : 'hidden'; } };

function renderOverlay(t) {
  const { W, cx, cy } = L;
  // the stage's own ground until the real HUD stands in it
  ground.style.opacity = t < HS.DROP ? '1' : '0';

  // ---- the strip falls away as the favicons lift (tabs.js:282-288) ----
  const push = Math.min(HS.PUSH, 8 / cx);
  const s1 = 1 + push, s2 = lerp(1, HS.FALL, outCubic(seg(t, 0, HS.KILL)));
  const cam = s1 * s2, offX = cx + (cx * (1 - s1) - cx) * s2, offY = cy - cy * s2;

  // ---- the sphere (tabs.js:358-389) ----
  const ang = angleAt(t), ca = Math.cos(ang), sa = Math.sin(ang);
  const mergeT = Math.pow(seg(t, M - HS.MERGE, M), HS.MERGE_EXP);
  const blurT = seg(t, HS.BLUR_FROM * M, M);
  const tileFade = 1 - seg(t, M, M + HS.TILE_OUT);
  const favS = HS.FAV * HS.Z * cam;
  const rz = lerp(HS.R, HS.MERGE_Z, mergeT);
  for (const tl of tiles) {
    if (t < tl.lift || tileFade <= 0) { show(tl, false); continue; }
    show(tl, true);
    const fx = offX + HS.Z * L.fav[tl.k] * cam, fy = offY + HS.Z * HS.FAV_Y * cam;
    const d = tl.dir;
    const vx = d.x * ca + d.z * sa, vy = d.y, vz = -d.x * sa + d.z * ca;
    const sx3 = lerp(vx * HS.R, 0, mergeT), sy3 = lerp(vy * HS.R, 0, mergeT), sz3 = vz * rz;
    const ps = HS.PERSP / (HS.PERSP - sz3);
    const depth = (vz * (rz / HS.R) * 175 + 190) / 380;
    const sOp = Math.min(1, 0.16 + 0.84 * depth);
    // the smear rides the far side only; the referent's depth blur as is
    const far = clamp01((HS.BLUR_CLEAR - depth) / HS.BLUR_CLEAR);
    const sBlur = (Math.pow(blurT, 2) * HS.SPIN_BLUR * far + (depth < 0.5 ? (0.5 - depth) * HS.DEPTH_BLUR : 0)) * (HS.TILE / 54);
    const e = outCubic(seg(t, tl.lift, tl.lift + HS.FLY));
    const px = lerp(fx, cx + sx3 * ps, e), py = lerp(fy, cy + sy3 * ps, e);
    const size = lerp(favS, HS.TILE * ps, e);
    const zs = lerp(HS.R + 60, sz3, e); // the referent's z-index, as an orthographic translateZ
    tl.el.style.transform =
      `translate3d(${(px - size / 2).toFixed(2)}px, ${(py - size / 2).toFixed(2)}px, ${zs.toFixed(2)}px) scale(${(size / HS.TILE).toFixed(4)})`;
    tl.el.style.opacity = (lerp(1, sOp, e) * tileFade * seg(t, tl.lift, tl.lift + HS.LIFT_IN)).toFixed(3);
    const b = e * sBlur;
    tl.el.style.filter = b >= HS.BLUR_MIN ? `blur(${b.toFixed(2)}px)` : 'none';
  }

  // ---- the tile: fv-flip-icon-grow, then the HUD mark's place in the centred HUD, then home (tabs.js:393-416) ----
  const mOp = seg(t, M + HS.MARK_IN[0], M + HS.MARK_IN[1]);
  if (mOp <= 0 || t >= LAND + (L.seat ? HS.XFADE : 0)) { mark.style.visibility = 'hidden'; return; }
  mark.style.visibility = 'visible';
  const u = (t - M) / HS.FLIP;
  const s0 = (HS.TILE * HS.PERSP / (HS.PERSP - HS.MERGE_Z)) / HS.MARK;
  let rot, sc, br;
  if (u < HS.FLIP_AT) { const p = flipEase(clamp01(u / HS.FLIP_AT)); rot = 180 * (1 - p); sc = lerp(s0, HS.FLIP_OVER, p); br = lerp(HS.FLIP_BRIGHT, 1, p); }
  else { const p = easeOut(clamp01((u - HS.FLIP_AT) / (1 - HS.FLIP_AT))); rot = 0; sc = lerp(HS.FLIP_OVER, 1, p); br = 1; }
  const pRise = glideEase(seg(t, HS.RISE, RISE1));
  const pGl = glideEase(seg(t, HS.GLIDE, LAND));
  let mx = cx, my = cy, mo = mOp;
  if (L.seat) {
    const k = L.k, seatX = L.seat.x / k, seatY = L.seat.y / k;
    // the mark's place in the HUD when the HUD's box is centred on the stage
    const headX = cx - L.span.x / k, headY = cy - L.span.y / k;
    const seatS = (L.seat.s / k) / HS.MARK;
    mx = lerp(cx, headX, pRise);
    my = lerp(cy, headY, pRise);
    sc *= lerp(1, seatS, pRise);
    // the glide: the HUD goes home and the tile goes with its mark, already its
    // size, to the mark's rest place, where it stays for the cross-fade into
    // the mark's bare head
    mx = lerp(mx, seatX, pGl);
    my = lerp(my, seatY, pGl);
    mo *= 1 - seg(t, LAND, LAND + HS.XFADE);
  } else {
    mo *= 1 - seg(t, HS.GLIDE, LAND);
  }
  mark.style.opacity = mo.toFixed(3);
  mark.style.transform =
    `translate(${(mx - HS.MARK / 2).toFixed(2)}px, ${(my - HS.MARK / 2).toFixed(2)}px)` +
    ` perspective(${(HS.MARK * HS.MARK_PERSP).toFixed(0)}px) rotateY(${rot.toFixed(3)}deg) scale(${sc.toFixed(5)})`;
  mark.style.filter = br < 0.999 ? `brightness(${br.toFixed(3)})` : 'none';
}

// the REAL HUD stands around the tile in mid-stage, its wordmark and discs
// drop in beside it left to right, it glides home to the sidebar's top-left
// as one, the window grounds in, the rest fades up (tabs.js:425-456, the
// referent's column cascade turned on its side)
function renderHub(t) {
  if (!S) return;
  const { hud, mark: hm, dropItems } = S;
  if (t < HS.DROP) {
    revealHub(0);
    revealInners(0);
    hud.style.transform = '';
      lastGround = -1;
    return;
  }
  // hub and HUD at full opacity, the grounds and the HUD's wordmark and discs are ours
  revealHub(1, { grounds: false, items: false });
  const pGl = glideEase(seg(t, HS.GLIDE, LAND));
  if (L.seat && t < LAND) {
    const rx = (L.w / 2 - L.span.x - L.seat.x) / L.hk, ry = (L.h / 2 - L.span.y - L.seat.y) / L.hk;
    hud.style.transform = `translate(${(rx * (1 - pGl)).toFixed(3)}px, ${(ry * (1 - pGl)).toFixed(3)}px)`;
  } else {
    hud.style.transform = '';
  }
  dropItems.forEach((n, i) => {
    const a = HS.DROP + i * HS.DROP_GAP;
    const e = dropEase(seg(t, a, a + HS.DROP_DUR));
    n.style.opacity = clamp01(e).toFixed(3);
    n.style.transform = e >= 1 ? '' : `translateY(${((L.dy[i] ?? HS.DROP_DY) * (1 - e)).toFixed(3)}px)`;
  });
  writeGrounds(inOutCubic(seg(t, HS.GLIDE, HS.GLIDE + HS.GROUND)));
  // landed: the tile cross-fades into the mark's bare head over XFADE (the
  // head fades in under it, so the tile's ground leaves and only the head
  // stays); then the sidebar's chats, lane and composer come up (without a
  // HUD mark on screen the mark rides the glide instead)
  const from = L.seat ? LAND : HS.GLIDE;
  hm.style.opacity = seg(t, from, from + HS.XFADE).toFixed(3);
  revealInners(easeOut(seg(t, LAND, REST1)));
}

// ---------- the clock (house pattern: one rAF, pause where it stopped, hold at end) ----------
let t0 = 0, paused = false, pausedAt = 0, visible = true, beamPlaced = false, held = false, frozen = false;
function setPaused(v) {
  v = v || frozen;
  if (v === paused) return;
  paused = v;
  if (v) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
}
const storyT = (now) => Math.min(((paused ? pausedAt : now) - t0) / 1000, END);
function tick(now) {
  requestAnimationFrame(tick);
  if (paused) return;
  const t = storyT(now);
  if (t >= END) {
    if (!held) { held = true; render(END); }
    return;
  }
  held = false;
  render(t);
}
function prep() {
  S = prepStage(stage, 'sphere');
  lastGround = -1;
}
// #replay: the overlay returns, prepStage re-zeroes the hub, the HUD is
// re-measured at rest, and the clock restarts
function reset() {
  beamPlaced = false;
  held = false;
  prep();
  root.style.display = 'block';
  layout(true);
}
function restart() {
  reset();
  t0 = performance.now();
}

const BEATS = { T0, M, FLIP1, RISE: HS.RISE, DROP: HS.DROP, GLIDE: HS.GLIDE, LAND, REST1, HANDOFF, END };

// ---------- mount: self-boot on import, inside #stage ----------
function mount() {
  const q = new URLSearchParams(location.search);
  prep();
  stage.querySelector('.body').appendChild(root);
  layout(true);
  const hold = q.get('t') !== null && q.get('play') !== '1';
  if (hold) {
    const t = Math.max(0, Math.min(Number(q.get('t')) || 0, END));
    render(t);
    // the wordmark's glyph box moves when the webfont lands: re-measure, redraw
    document.fonts?.ready.then(() => { layout(true); render(t); });
    window.__heroSphere = { t: () => t, render, B: BEATS };
    return;
  }
  const start = Math.max(0, Math.min(Number(q.get('t') ?? 0) || 0, END));
  t0 = performance.now() - start * 1000;
  wireReplay(restart);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; setPaused(!visible || document.hidden); }, { threshold: 0.15 }).observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(!visible || document.hidden));
  requestAnimationFrame(tick);
  // the wordmark's glyph box moves when the webfont lands: re-measure (the clock redraws)
  document.fonts?.ready.then(() => layout(true));
  // freeze(true) stops the story clock where it is (QA: a capture of a beat at rest)
  const freeze = (v) => { frozen = !!v; setPaused(frozen || !visible || document.hidden); };
  window.__heroSphere = { t: () => storyT(performance.now()), render, restart, freeze, B: BEATS };
}

// hosted (#stage[data-hero-host], hero-workspace.js): the host owns the clock,
// the gate and #replay; it mounts us and drives render(t) with our story time
export const sphere = {
  root, HS, T0, L, BEATS, END, liftAt, render, reset, layout,
  mount() {
    prep(); stage.querySelector('.body').appendChild(root); layout(true);
    document.fonts?.ready.then(() => layout(true)); // the host's clock redraws
  },
};

if (!stage.hasAttribute('data-hero-host')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}
