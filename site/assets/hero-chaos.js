// hero-chaos: landing hero variant A, cut from the ad-gallery chaos spot
// (icons-chaos-slam-superbot). The story is the ad's beat sheet up to the
// tagline, then it hands the stage to the real app (owner, 2026-09-09: the
// same ending as the sphere intro — load the actual app display, show the
// real grid, rest on it; no auto-loop, no end card):
//
//   120 seeded skill-file bubbles + app-brand tiles drift like a screensaver
//   (DVD fold bounce, three depth tiers, time-warp, wobble) -> the superbot
//   tile slams in from above with a rotateY flip, a white flash and a ripple
//   -> the field freezes and is sucked into the tile farthest-first -> four
//   cards spit into the quadrants ('your agents' / 'your ides' / 'your skills'
//   / 'your tools') -> the tagline dips in over them ('the agent to manage
//   your agents.') -> the tag layer is black at tagOut and the HANDOFF
//   happens (hub-handoff.js, the shared implementation the sphere variant
//   uses): the hub grounds under the black layer (revealHub 520ms,
//   revealInners 380ms, both pure of t) while the whole chaos overlay (field,
//   cards, tag layer) fades out over tagOut..HANDOFF and display:none's ->
//   the phone beat plays rebased to the handoff (playPhoneFrame(t-HANDOFF))
//   -> the story rests on the real interface (the docked hold) with #replay
//   restarting the whole chaos story. The overlay stays in the DOM so ?t
//   seeks and replay work.
//
// House pattern, mirroring hub-boot.js: ONE requestAnimationFrame clock that
// renders every display frame (the ad's 30fps quantisation read as dropped
// frames on 60/120Hz screens: a sucked-in chip crossed ~90px per step); every
// beat is a TWEEN, a pure function of the clock, so pausing (offscreen via
// IntersectionObserver, hidden tab via visibilitychange) freezes the whole
// scene and resumes it exactly where it stopped. Motion is transform/opacity
// only (plus a brightness filter on the slam tile, which the beat spec itself
// asks for, dropped the moment it reaches 1).
//
// The module self-boots on import: it preps #stage via the shared
// prepStage(stage, 'chaos') and mounts its overlay root into #stage's .body
// (absolute, inset 0, above the hub), holding the 1920x1080 canvas scaled to
// fit with k = min(w/1920, h/1080) and centred (the stage is 16:10; the
// letterbox is black on black). It leaves #dock and everything else
// untouched.
//
// Every retimeable constant lives in the HC table below; the render code reads
// HC and nothing else, so a beat can be retimed without reading the render.

// ---------- constants: retime a beat here, not in the render code ----------
const HC = {
  // the beat sheet (story seconds, verbatim from the ad's source)
  // (the ad's end card and loop dip are cut: the story leaves the tag layer
  // through the handoff, so `end` is derived below)
  B: { first: 0.2, last: 3.2, slamIn: 4.0, slamLand: 4.3, suck: 4.6, spit: 5.8,
       tagDip: 8.22, tagIn: 8.55, tagOut: 10.22 },
  FPS: 30,      // the ad ran at 30fps: the unit of the spec's per-frame beats (squash, dip)

  // the handoff (W6): starting at tagOut the hub grounds under the black tag
  // layer (hub over 520ms, inner columns over 380ms, both pure of t) while
  // the whole chaos overlay fades out over `fade` and then display:none's;
  // HANDOFF is the phone beat's rebased zero and the story rests at
  // HANDOFF + PHONE.END (derived below)
  HANDOFF: { fade: 0.5, hub: 0.52, inners: 0.38 },

  // stage: the spec's numbers apply verbatim inside a 1920x1080 canvas
  W: 1920, H: 1080,
  CX: 960, CY: 540,
  BG: '#000000',

  // field: seeded so every load (and every capture) scatters identically
  N: 120,
  SEED: 0x544078ab,
  P_FILE: 0.3,                // rng() < P_FILE -> a skill-file bubble, else a brand tile
  TIER_A: 0.34, TIER_B: 0.5,  // tier = rng()<TIER_A ? 0 : rng()<TIER_B ? 1 : 2
  TIER_S: [[84, 96], [64, 80], [52, 62]],            // side px per tier (big = near = fast)
  TIER_SPEED: [[300, 340], [210, 260], [140, 170]],  // px/s per tier
  TIER_BOX: [[70, 1850, 110, 970], [110, 1810, 140, 940], [150, 1770, 170, 910]], // [xlo,xhi,ylo,yhi]
  BOX_PAD: 8,                 // + half the item's drawn size, measured at mount
  POP: [0.30, 0.38],          // pop-in duration lerp bounds; outBack scale from .6

  // time-warp: e = et + w*sin(et*2pi/wp + wph)
  TW: { w: [0.10, 0.16], wp: [1.4, 2.8] },

  // angles: 18% near-horizontal, 15% near-vertical, rest free
  ANG_H: 0.18, ANG_V: 0.15, ANG_JITTER: 0.4,

  // rotation wobble: amp deg (files/tiles), period s; 30% get a constant spin deg/s
  WOB: { files: [3, 6], tiles: [4, 10], period: [1.7, 2.9], spin: [9, 16] },

  // slam: the superbot tile, 260x260 spec px
  TILE: 260,
  SLAM: { p: 1.8, ty: -560, ts: [1.9, 1.05], flip: 180, bright: [0.5, 1],
          sqy: [0.93, 0.97, 0.995, 1], sqx: [1.055, 1.03, 1.008, 1], settle: 0.2 },
  FLASH: { rise: 0.3, peak: 0.25 },   // white flash after slamLand
  RIPPLE: { amp: 42, speed: 565, sigma: 70, window: 0.68 },

  // suck: farthest-first, inhale 0.32s, staggered by frozen rank
  SUCK: { stagger: 0.0045, inhale: 0.32, pull: 0.85, fade: 0.7 },
  GULP: 0.1,                          // tile swell during the suck window
  BREATHE: { amp: 0.015, period: 3 }, // tile idle breathe after spit

  // spit: four cards into the quadrants (card top-left homes, spec px)
  CARD_W: 360,
  HOMES: [[250, 118], [1210, 118], [250, 700], [1210, 700]],
  SPIT: { stagger: 0.1, glide: 0.55, tilt: 8, from: 0.2 },
  ROW: { stagger: 0.2, step: 0.067, run: 0.42, move: 24, from: 0.7 },

  // tagline: the dip lifts after tagIn, the text leaves before tagOut, and
  // the tag layer itself STAYS black — the handoff carries the story out
  TAG_LIFT: 0.35,        // dip lifts over this after tagIn (one frame to complete)
  TAG_OUT: 0.25,         // tagline out completes before tagOut
  TAG: ['the agent to manage ', 'your agents.'],  // second phrase in the storm gradient

  // copy pools (verbatim from the spec; the dot before a bubble's name is keyed
  // by extension: md storm-0, json storm-1, mdc storm-3, ts storm-4, mcp storm-2)
  FILES: ['SKILL.md', '.mcp.json', 'agents.md', 'rules.mdc', 'CLAUDE.md', 'subagent.md',
          'prompt.md', 'workflow.json', 'talent.ts', 'server.mcp', 'scraper.md',
          'release-notes.md', 'inbox-triage.md', 'deploy-approval.md'],
  // only clients superbot really wires (superbot-helper src/clients/clients.ts:
  // claude code/desktop, cursor, vs code, devin, hermes, gemini cli, codex and
  // chatgpt desktop, copilot cli, kiro), 2026-09-23. The spec's replit,
  // lovable, bolt, base44, v0, warp, jetbrains and grok tiles were dropped:
  // none is a client superbot installs into. 2026-09-24: the field carries the
  // rest of the client strip too (windsurf, zed, cline, roo, kilo, continue,
  // opencode, openclaw, qwen code, amazon q), as the desktop app's own provider
  // tiles (brand/tiles/, copied from superbot-desktop packages/ui marks/tiles).
  // Paths are relative to BRAND.
  BRANDS: ['chaos/claude.png', 'chaos/gemini-app-icon.png', 'chaos/cursor.png', 'chaos/copilot.svg',
           'chaos/devin.png', 'chaos/hermes.png', 'chaos/kiro.png', 'chaos/vscode.png', 'chaos/chatgpt.png',
           'tiles/windsurf.svg', 'tiles/zed.svg', 'tiles/cline.svg', 'tiles/roo.svg', 'tiles/kilo.svg',
           'tiles/continue.svg', 'tiles/opencode.svg', 'tiles/openclaw.svg', 'tiles/qwen-code.svg',
           'tiles/amazon-q-cli.svg'],
  BRAND: '/site/assets/brand/',              // local only, never external at runtime
  SLAM_TILE: '/site/assets/brand/tile.svg',  // the slam tile, already local

  // cards: heading + rows (the spec's copy list; 2026-09-24 the ides card
  // names real editors instead of 'editor' and 'git', and tools gains cline
  // and openclaw, so the cards carry the client strip's breadth too)
  CARDS: [
    { heading: ['your ', 'agents'], rows: ['chatgpt', 'claude', 'gemini', 'cursor', 'copilot'] },
    { heading: ['your ', 'ides'],   rows: ['cursor', 'vscode', 'windsurf', 'zed', 'terminal'] },
    { heading: ['your ', 'skills'], rows: ['build', 'fix', 'data', 'run'] },
    { heading: ['your ', 'tools'],  rows: ['devin', 'hermes', 'kiro', 'cline', 'openclaw'] },
  ],
  BRAND_IMG: { chatgpt: 'chaos/chatgpt.png', claude: 'chaos/claude.png', gemini: 'chaos/gemini-app-icon.png',
               cursor: 'chaos/cursor.png', copilot: 'chaos/copilot.svg', devin: 'chaos/devin.png',
               hermes: 'chaos/hermes.png', kiro: 'chaos/kiro.png', vscode: 'chaos/vscode.png',
               windsurf: 'tiles/windsurf.svg', zed: 'tiles/zed.svg', cline: 'tiles/cline.svg',
               openclaw: 'tiles/openclaw.svg' },
  // a row's label when its key is not how the product spells it
  LABEL: { vscode: 'vs code' },
};

// ---------- easings (verbatim from the spec) ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const frac = (v) => v - Math.floor(v);
const pow = (p, e) => Math.pow(Math.max(0, p), e);
const outQuint = (p) => 1 - pow(1 - p, 5);
const outCubic = (p) => 1 - pow(1 - p, 3);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * pow(p - 1, 3) + c1 * pow(p - 1, 2); };
// DVD fold: bounce between lo and hi, mirrored
const fold = (v, lo, hi) => { const span = hi - lo; let x = (v - lo) % (2 * span); if (x < 0) x += 2 * span; return lo + (x <= span ? x : 2 * span - x); };
// deterministic rng so every load scatters identically (spec: mulberry32)
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------- icon geometry: simple 24-viewBox line icons (own paths, no fetch)
const ICONS = {
  terminal: '<path d="m5 7 4 4-4 4"/><path d="M12 17h7"/>',
  editor: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  git: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  build: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
  fix: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  data: '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>',
  run: '<path d="m4 5 7 7-7 7"/><path d="M13 19h7"/>',
};

// ---------- boot ----------
import { PHONE, prepStage, revealHub, revealInners, placeBeam, playPhoneFrame,
         perch, wireReplay } from './hub-handoff.js?v=7';
const stage = document.getElementById('stage');
const root = document.createElement('div');
root.className = 'hero-chaos';
root.id = 'hero-chaos';
root.setAttribute('role', 'figure');
root.setAttribute('aria-label', 'superbot slams in, gathers skill files and app brands into your agents, ides, skills and tools, and becomes the agent to manage your agents');
root.innerHTML =
  `<div class="hc-canvas">` +
    `<div class="hc-field"></div>` +
    `<div class="hc-tag"><span class="hc-tag-t">${HC.TAG[0]}<span class="hc-grad">${HC.TAG[1]}</span></span></div>` +
    `<div class="hc-dip"></div>` +
  `</div>`;
const canvas = root.querySelector('.hc-canvas');
const field = root.querySelector('.hc-field');
const tagEl = root.querySelector('.hc-tag');
const dipEl = root.querySelector('.hc-dip');
// the shared replay button (hub-boot's own #replay, shown at the hold)
const replayEl = document.getElementById('replay');

const H = HC, B = H.B, TWO_PI = Math.PI * 2;
// derived beats (W6): the tag layer is black at tagOut; the hub grounds under
// it over hub/inners starting at tagOut, the chaos overlay fades over
// tagOut..HANDOFF and then display:none's, the phone beat runs rebased to
// HANDOFF, and the story rests at the hold = HANDOFF + PHONE.END
const HANDOFF = B.tagOut + H.HANDOFF.fade;
const HUB_END = B.tagOut + H.HANDOFF.hub;
const INNERS_END = B.tagOut + H.HANDOFF.inners;
B.end = HANDOFF + PHONE.END;

// ---------- build the field DOM (seeded, spec's draw order) ----------
const rng = mulberry32(H.SEED);
const items = [];
let brandN = 0; // brands cycle in order so every supported app shows, several times over
for (let i = 0; i < H.N; i++) {
  const isFile = rng() < H.P_FILE;
  const tier = rng() < H.TIER_A ? 0 : (rng() < H.TIER_B ? 1 : 2);
  const s = lerp(H.TIER_S[tier][0], H.TIER_S[tier][1], rng());
  const speed = lerp(H.TIER_SPEED[tier][0], H.TIER_SPEED[tier][1], rng());
  const box = H.TIER_BOX[tier];
  const el = document.createElement('div');
  el.className = isFile ? 'hc-chip' : 'hc-tile';
  el.setAttribute('aria-hidden', 'true');
  if (isFile) {
    const name = H.FILES[Math.floor(rng() * H.FILES.length)];
    const base = /\.mcp\.json$|\.mcp$/.test(name) ? 'mcp' : (name.match(/(\w+)\.\w+$/) || [])[1] || 'md';
    const dot = { md: '0', json: '1', mdc: '3', ts: '4', mcp: '2' }[base] ?? '1';
    el.innerHTML = `<i class="hc-dot hc-dot-${dot}"></i>${name}`;
  } else {
    rng(); // keep the seeded stream the same length
    const name = H.BRANDS[brandN++ % H.BRANDS.length];
    el.innerHTML = `<img src="${H.BRAND}${name}" alt="">`;
  }
  field.appendChild(el);
  // angles: 18% near-horizontal, 15% near-vertical, rest free (spec)
  const aRoll = rng();
  let a;
  if (aRoll < H.ANG_H) a = (rng() < 0.5 ? 0 : Math.PI) + lerp(-H.ANG_JITTER, H.ANG_JITTER, rng());
  else if (aRoll < H.ANG_H + H.ANG_V) a = (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + lerp(-H.ANG_JITTER, H.ANG_JITTER, rng());
  else a = rng() * TWO_PI;
  const wAmp = lerp(isFile ? H.WOB.files[0] : H.WOB.tiles[0], isFile ? H.WOB.files[1] : H.WOB.tiles[1], rng());
  const wPer = lerp(H.WOB.period[0], H.WOB.period[1], rng());
  const spin = rng() < 0.3 ? (rng() < 0.5 ? 1 : -1) * lerp(H.WOB.spin[0], H.WOB.spin[1], rng()) : 0;
  const popDur = lerp(H.POP[0], H.POP[1], rng());
  const twW = lerp(H.TW.w[0], H.TW.w[1], rng());
  const twP = lerp(H.TW.wp[0], H.TW.wp[1], rng());
  const wph = frac(i * 0.618034) * TWO_PI;
  const spawnAt = lerp(B.first, B.last, rng());
  items.push({ i, isFile, tier, s, speed, box, el, a, wAmp, wPer, spin, popDur, twW, twP, wph, spawnAt,
               padX: 0, padY: 0, frozen: undefined, dFrozen: undefined, rank: 0, shown: true });
}

// ---- four spit cards (fixed homes; rows appear one by one) ----
const cards = H.CARDS.map((c, k) => {
  const el = document.createElement('div');
  el.className = 'hc-card';
  el.setAttribute('aria-hidden', 'true');
  const rows = c.rows.map((key) => {
    const img = H.BRAND_IMG[key];
    const icon = img
      ? `<img src="${H.BRAND}${img}" alt="" width="${26}" height="${26}">`
      : `<svg class="hc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</svg>`;
    return `<div class="hc-row">${icon}<span class="hc-lab">${H.LABEL[key] ?? key}</span></div>`;
  }).join('');
  el.innerHTML =
    `<div class="hc-head">your <b>${c.heading[1]}</b></div>` +
    `<div class="hc-rows">${rows}</div>`;
  field.appendChild(el);
  return { k, el, home: H.HOMES[k], rows: [...el.querySelectorAll('.hc-row')] };
});

// ---------- layout: k = min(w/1920, h/1080), centred; every spec number
// applies (the stage is 16:10, so the canvas letterboxes black on black) ----
function layout() {
  const w = root.clientWidth || H.W;
  const h = root.clientHeight || H.H;
  const k = Math.min(w / H.W, h / H.H);
  canvas.style.transform = `scale(${k.toFixed(6)})`;
  canvas.style.left = `${((w - H.W * k) / 2).toFixed(1)}px`;
  canvas.style.top = `${((h - H.H * k) / 2).toFixed(1)}px`;
}
new ResizeObserver(layout).observe(root);

// ---------- measured sizes: bubbles need offsetWidth before positioning ----------
let mounted = false;
function measure() {
  items.forEach((it) => {
    if (it.isFile) {
      const w = Math.max(it.el.offsetWidth, it.s * 1.15);
      const h = Math.max(it.el.offsetHeight, 40);
      it.padX = w / 2 + H.BOX_PAD;
      it.padY = h / 2 + H.BOX_PAD;
      // spec: the pill's text runs at s * 0.38 px
      it.el.style.fontSize = `${(it.s * 0.38).toFixed(1)}px`;
    } else {
      it.padX = it.padY = it.s / 2 + H.BOX_PAD;
      it.el.style.fontSize = `${it.s.toFixed(1)}px`;
      // spec: tiles are s x s, image covers
      it.el.style.width = `${it.s.toFixed(1)}px`;
      it.el.style.height = `${it.s.toFixed(1)}px`;
    }
  });
  mounted = true;
}

// ---------- pure functions of the clock ----------
// the field's drift position at t, frozen at slamLand
function posAt(it, t) {
  const posT = Math.min(t, B.slamLand);
  const et = posT - it.spawnAt;
  if (et <= 0) return null; // not spawned yet
  const e = et + it.twW * Math.sin(et * TWO_PI / it.twP + it.wph);
  const x0 = (it.box[0] + it.box[1]) / 2, y0 = (it.box[2] + it.box[3]) / 2;
  const vx = Math.cos(it.a) * it.speed, vy = Math.sin(it.a) * it.speed;
  return { x: fold(x0 + vx * e, it.box[0] + it.padX, it.box[1] - it.padX),
           y: fold(y0 + vy * e, it.box[2] + it.padY, it.box[3] - it.padY) };
}
// frozen once, at slamLand (spec: order by frozen distance from center, descending)
let freezeDone = false;
function ensureFreeze() {
  if (freezeDone || !mounted) return;
  freezeDone = true;
  items.forEach((it) => { it.frozen = posAt(it, B.slamLand); });
  items.filter((it) => it.frozen)
    .sort((a, b) => (Math.hypot(b.frozen.x - H.CX, b.frozen.y - H.CY)) - (Math.hypot(a.frozen.x - H.CX, a.frozen.y - H.CY)))
    .forEach((it, rank) => {
      it.rank = rank;
      it.dFrozen = Math.hypot(it.frozen.x - H.CX, it.frozen.y - H.CY);
    });
}
// rotation wobble at t (sinusoidal, so it never jumps)
function rotAt(it, t) {
  const et = Math.max(0, t - it.spawnAt);
  return it.wAmp * Math.sin((et * TWO_PI) / it.wPer + it.wph) + it.spin * et;
}

// ---------- the slam tile + its white flash ----------
const tileEl = document.createElement('div');
tileEl.className = 'hc-slam';
tileEl.setAttribute('aria-hidden', 'true');
tileEl.innerHTML = `<img src="${H.SLAM_TILE}" alt="">`;
field.appendChild(tileEl);
const flashEl = document.createElement('div');
flashEl.className = 'hc-flash';
field.appendChild(flashEl);

// squash over the four 30fps frames after slamLand (spec), interpolated
// between its keys so the impact settles on every display frame instead of
// stepping; the landing frame still hits the spec's full squash
function squashFrame(t) {
  const f = (t - B.slamLand) * H.FPS;
  const n = H.SLAM.sqy.length;
  if (f < 0 || f >= n) return null;
  const i = Math.floor(f), j = Math.min(n - 1, i + 1), u = f - i;
  return { sqy: lerp(H.SLAM.sqy[i], H.SLAM.sqy[j], u), sqx: lerp(H.SLAM.sqx[i], H.SLAM.sqx[j], u) };
}
const tagT = tagEl.querySelector('.hc-tag-t');

// ---------- renderer: write transforms/opacity for one story time ----------
function render(t) {
  if (!mounted) measure();
  // past the handoff the overlay is display:none, so its 120 items, cards,
  // tile and tag layer are not written at all during the phone beat; any
  // earlier t (replay, ?t seek) rewrites every one of them below
  if (t < HANDOFF) renderOverlay(t);
  // the handoff (W6, hub-handoff.js): from tagOut the hub grounds underneath
  // while the whole chaos overlay (field, cards, tile, tag layer) fades out
  // over tagOut..HANDOFF and is then display:none'd (kept in the DOM so ?t
  // seeks and replay work). Every write here is a pure function of t —
  // no timers.
  root.style.opacity = String(1 - seg(t, B.tagOut, HANDOFF));
  root.style.display = t >= HANDOFF ? 'none' : 'block';
  revealHub(seg(t, B.tagOut, HUB_END));
  revealInners(seg(t, B.tagOut, INNERS_END));
  if (t >= HANDOFF) {
    // the phone beat, rebased to the handoff; placeBeam is geometry, run
    // once (idempotent) before the dock changes the phone's box
    if (!beamPlaced) { placeBeam(); beamPlaced = true; }
    playPhoneFrame(t - HANDOFF);
  }
  // the hold: the story rests on the real interface; #replay restarts it
  if (t >= B.end) perch();
  replayEl.hidden = t < B.end;
}

// an item is taken out of paint (visibility) once it is invisible for good
// (not spawned, or fully inhaled), and only when that changes
const show = (it, on) => { if (it.shown !== on) { it.shown = on; it.el.style.visibility = on ? '' : 'hidden'; } };

function renderOverlay(t) {
  // the slam tile
  {
    const p = pow(seg(t, B.slamIn, B.slamLand), H.SLAM.p);
    const on = t >= B.slamIn;
    const land = squashFrame(t);
    const settle = outCubic(seg(t, B.slamLand, B.slamLand + H.SLAM.settle));
    const ts = lerp(lerp(H.SLAM.ts[0], H.SLAM.ts[1], p), 1, settle);
    const ty = -H.SLAM.ty * (1 - p);
    const flip = H.SLAM.flip * (1 - p);
    const bright = lerp(H.SLAM.bright[0], H.SLAM.bright[1], p);
    const sq = land ?? { sqx: 1, sqy: 1 };
    let tsx = ts, tsy = ts;
    // gulp swell during the suck window, breathe after spit (spec)
    if (t >= B.suck && t <= B.spit) { tsx *= 1 + H.GULP * Math.sin(seg(t, B.suck, B.spit) * Math.PI); tsy = tsx; }
    // the idle breathe eases to nothing over the tag scene, so the hold rests
    // on a truly static tile (scale 1) rather than mid-breath
    if (t >= B.spit + 0.5) {
      const calm = 1 - outCubic(seg(t, B.tagIn, B.end));
      tsx *= 1 + calm * H.BREATHE.amp * Math.sin(((t - B.spit - 0.5) * TWO_PI) / H.BREATHE.period); tsy = tsx;
    }
    const half = H.TILE / 2;
    tileEl.style.opacity = on ? '1' : '0';
    tileEl.style.transform =
      `translate(${(H.CX - half).toFixed(1)}px, ${(H.CY - half + ty).toFixed(1)}px)` +
      ` rotateY(${flip.toFixed(1)}deg)` +
      ` scale(${(tsx * sq.sqx).toFixed(3)}, ${(tsy * sq.sqy).toFixed(3)})`;
    tileEl.style.filter = bright < 1 ? `brightness(${bright.toFixed(2)})` : 'none';
    // white flash (a full-canvas white layer, opacity only), only from the
    // landing on: before it the unclamped ramp held the layer at the peak and
    // veiled the whole field grey for its first 4.3s
    flashEl.style.opacity = t < B.slamLand ? '0'
      : String((1 - seg(t, B.slamLand, B.slamLand + H.FLASH.rise)) * H.FLASH.peak);
  }
  // the field
  ensureFreeze();
  items.forEach((it) => {
    const pop = seg(t, it.spawnAt, it.spawnAt + it.popDur);
    let p = it.frozen ?? posAt(it, t);
    if (!p) { op(it.el, 0); show(it, false); return; }
    if (it.frozen && t >= B.suck + it.rank * H.SUCK.stagger + H.SUCK.inhale) { op(it.el, 0); show(it, false); return; }
    show(it, true);
    p = { x: p.x, y: p.y };
    let s = lerp(0.6, 1, outBack(pop));
    // ripple: radial offset wave after slamLand (window from the spec)
    const dt = t - B.slamLand;
    if (dt > 0 && dt < H.RIPPLE.window) {
      const d = Math.max(1, it.dFrozen ?? Math.hypot(p.x - H.CX, p.y - H.CY));
      const wave = H.RIPPLE.amp * Math.exp(-pow(d - H.RIPPLE.speed * dt, 2) / (2 * H.RIPPLE.sigma * H.RIPPLE.sigma));
      p.x += ((p.x - H.CX) / d) * wave;
      p.y += ((p.y - H.CY) / d) * wave;
    }
    // suck: farthest-first inhale
    let o = 1;
    if (t >= B.slamLand) {
      const suckAt = B.suck + it.rank * H.SUCK.stagger;
      const sq = seg(t, suckAt, suckAt + H.SUCK.inhale);
      const qq = pow(sq, 1.7);
      p.x = lerp(p.x, H.CX, qq);
      p.y = lerp(p.y, H.CY, qq);
      s *= 1 - H.SUCK.pull * qq;
      o *= 1 - seg(sq, H.SUCK.fade, 1);
    }
    op(it.el, pop * o);
    const rot = t < B.slamLand ? rotAt(it, t) : rotAt(it, B.slamLand);
    tf(it.el, p.x, p.y, Math.max(0.01, s), rot);
  });
  // the spit cards
  cards.forEach((c) => {
    const cAt = B.spit + c.k * H.SPIT.stagger;
    const r = seg(t, cAt, cAt + H.SPIT.glide);
    if (r <= 0) { op(c.el, 0); return; }
    const rr = outQuint(r);
    const hx = lerp(H.CX - H.CARD_W / 2, c.home[0], rr);
    const hy = lerp(H.CY - 90, c.home[1], rr);
    const tilt = lerp(c.k % 2 ? H.SPIT.tilt : -H.SPIT.tilt, 0, r);
    const sc = lerp(H.SPIT.from, 1, r);
    op(c.el, Math.min(1, r * 2));
    c.el.style.transform =
      `translate(${hx.toFixed(1)}px, ${hy.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    // rows of the card (transform/opacity only)
    c.rows.forEach((rowEl, j) => {
      const r0 = cAt + H.ROW.stagger + j * H.ROW.step;
      const rn = seg(t, r0, r0 + H.ROW.run);
      if (rn <= 0) { op(rowEl, 0); return; }
      op(rowEl, rn);
      rowEl.style.transform =
        `translateX(${((1 - outCubic(rn)) * H.ROW.move).toFixed(1)}px)` +
        ` scale(${lerp(H.ROW.from, 1, outBack(rn)).toFixed(3)})`;
    });
  });
  // tagline scene: own black layer, fully up one frame before tagIn; the
  // tagline itself in over tagIn..tagIn+.35 and out before tagOut; the layer
  // then STAYS black — the handoff carries the story out from under it
  // (spec: dip completes one frame before tagIn)
  {
    const complete = B.tagIn - 1 / H.FPS;
    tagEl.style.opacity = String(seg(t, B.tagDip, complete));
    const lift = outCubic(seg(t, B.tagIn, B.tagIn + H.TAG_LIFT));
    op(tagT, lift * (1 - seg(t, B.tagOut - H.TAG_OUT, B.tagOut)));
    tagT.style.transform = `translateY(${((1 - lift) * 18).toFixed(1)}px)`;
  }
  // the dip is the transition into the tag scene, not a hold: it owns
  // tagDip..(tagIn - one frame) and lifts over TAG_LIFT after tagIn
  dipEl.style.opacity = String(seg(t, B.tagDip, B.tagIn - 1 / H.FPS) * (1 - seg(t, B.tagIn, B.tagIn + H.TAG_LIFT)));
}

// ---------- style helpers (transform/opacity only) ----------
const tf = (el, x, y, s, r) => {
  el.style.transform =
    `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg)` +
    ` translate(-50%, -50%) scale(${s.toFixed(3)})`;
};
const op = (el, v) => { el.style.opacity = String(clamp01(v)); };

// ---------- the clock (house pattern: one rAF, pause where it stopped, hold at end) ----------
let t0 = 0, paused = false, pausedAt = 0, visible = true;
let beamPlaced = false;
function setPaused(v) {
  if (v === paused) return;
  paused = v;
  if (v) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
}
const storyT = (now) => Math.min((now - t0) / 1000, B.end);
// every display frame renders; the hold renders the clamped end frame ONCE
// and then the clock idles (perch/#replay land on that frame)
let held = false;
function tick(now) {
  requestAnimationFrame(tick);
  if (paused) return;
  const t = storyT(now);
  if (t >= B.end) {
    if (!held) { held = true; render(B.end); }
    return;
  }
  held = false;
  render(t);
}
// #replay restarts the whole chaos story (no page jump): the overlay returns
// (display:block, opacity 1), the stage un-perches and un-docks, prepStage's
// zeroing re-runs (hub/HUD/inner/phone back to their waiting state), the
// beam geometry resets so it re-measures at rest, and the clock restarts
function restart() {
  beamPlaced = false;
  held = false;
  prepStage(stage, 'chaos');
  root.style.opacity = '1';
  root.style.display = 'block';
  layout();
  t0 = performance.now();
}

// ---------- mount: self-boot on import, inside #stage ----------
function mount() {
  const q = new URLSearchParams(location.search);
  // the shared prologue (hub-handoff.js): data-hero on #stage, the margin
  // column collapsed, the hub grounds transparent, every boot-story row and
  // HUD drop item (the wordmark and each disc) zeroed, #replay hidden
  prepStage(stage, 'chaos');
  stage.querySelector('.body').appendChild(root);
  measure();
  layout();
  const hold = q.get('t') !== null && q.get('play') !== '1';
  if (hold) {
    const t = Math.max(0, Math.min(Number(q.get('t')) || 0, B.end));
    render(t);
    window.__heroChaos = { t: () => t, render };
    return;
  }
  const start = Math.max(0, Math.min(Number(q.get('t') ?? 0) || 0, B.end));
  t0 = performance.now() - start * 1000;
  // #replay restarts the whole chaos story through the shared wiring
  wireReplay(restart);
  // the observer watches the STAGE, not the overlay root: the root
  // display:none's at the handoff, and the phone beat must keep playing
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setPaused(!visible || document.hidden); }, { threshold: 0.15 }).observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(!visible || document.hidden));
  requestAnimationFrame(tick);
  window.__heroChaos = { t: () => storyT(performance.now()), render, restart };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
