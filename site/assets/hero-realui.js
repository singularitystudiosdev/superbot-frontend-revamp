// hero-realui: landing hero variant C, the real-UI cut of the ad gallery's
// "I can do that too" spots (superbot-ad-gallery-real-ui: "I can do that
// too!" and "I can do that too · every app in one chat"), without their
// bait (the "Can it make an app like Lovable?" / "But can it code like
// CURSOR?" cards are left out). The spot's shape, kept: a one-line card,
// quick cuts through the apps you already use, their icons collapsing into
// the superbot tile, the sidebar HUD building, then ONE superbot chat taking ask
// after ask, each answered in the same thread. Every surface in frame is
// real: the stage's own #hub (the gui-sync replica of the desktop app), a
// real component render from site/assets/features (manifest.json), or the
// brand tiles the other variants use.
//
//   card    "All your AI apps in one."
//   beat 1  the apps cut in one after another (brand tiles: the repo holds
//           no capture of their own empty chat screens)
//   beat 2  the icons gather in a cloud and collapse into the superbot tile
//   beat 3  the tile glides onto the REAL HUD's Superbot mark (the page's one
//           mascot: the small square left of the wordmark in the sidebar
//           HUD's title line, superbot-desktop f2fbe329c; the rail draws none)
//           while the HUD's wordmark and destination discs drop in beside it
//   beat 4  the hub opens on one thread (the hub's own act-two transcript,
//           #tour-feed, in the .msg anatomy the boot story's client tour
//           uses). Ask 1 goes out with the composer's picker on Claude and
//           Claude answers; ask 2 goes out on superbot and superbot answers
//           (both turns are this hero's own demo chat); ask 3
//           is a fixture chat title, and its swarm run's real usage panel
//           (features/agentic.png: Claude, GPT and Grok workers) lands under
//           it. Then the camera pulls back to the whole hub and the
//           hub-handoff.js phone beat plays, as in chaos and sphere.
//
// House pattern (hero-chaos.js, hero-sphere.js): ONE requestAnimationFrame
// clock, every beat a pure function of story time t (?t=<s> seeks,
// ?t=<s>&play=1 plays from there, #replay restarts, an offscreen stage or a
// hidden tab pauses). Per-frame writes are transform / opacity only (plus
// the thread title, written once at each of its two cuts); every layout read
// (the hub's boxes, the HUD mark, the lane, the thread's rows, the typed
// characters' offsets) happens in layout(), outside the loop.

import { PHONE, prepStage, revealHub, revealInners, placeBeam, playPhoneFrame,
         perch, wireReplay } from './hub-handoff.js?v=7';

// ---------- constants: retime a beat here, not in the render code ----------
const HR = {
  BRAND: '/site/assets/brand/',
  // the opening card
  CARD: 1.0, CARD_POP: 0.4, CARD_FROM: 1.06, DIP: 0.15,
  // beat 1: the app run, one tile per CUT s, each punching in from PUNCH
  RUN: ['chaos/chatgpt.png', 'chaos/claude.png', 'chaos/gemini-app-icon.png', 'chaos/cursor.png',
        'chaos/copilot.svg', 'chaos/devin.png'],
  CUT: 0.2, PUNCH: 1.1, PUNCH_T: 0.16,
  TILE: 0.3,            // the run tile's box, of min(w, h)
  // beat 2: the cloud (hero-sphere.js HS.BRANDS, the same local set)
  CLOUD: ['chaos/claude.png', 'chaos/gemini-app-icon.png', 'chaos/cursor.png', 'chaos/copilot.svg',
          'chaos/devin.png', 'chaos/hermes.png', 'chaos/kiro.png', 'chaos/vscode.png', 'chaos/chatgpt.png',
          'tiles/windsurf.svg', 'tiles/zed.svg', 'tiles/cline.svg', 'tiles/roo.svg', 'tiles/kilo.svg',
          'tiles/continue.svg', 'tiles/opencode.svg', 'tiles/openclaw.svg', 'tiles/qwen-code.svg',
          'tiles/amazon-q-cli.svg'],
  CLOUD_TILE: 0.34,     // of the run tile
  CLOUD_R: 0.36,        // of min(w, h)
  CLOUD_POP: 0.022, CLOUD_POP_T: 0.22, CLOUD_SPIN: 0.9,
  CLOUD_HOLD: 0.45,     // the cloud drifts, then collapses over CLOUD_COL
  CLOUD_COL: 0.4, CLOUD_COL_EXP: 1.6,
  // beat 3: the superbot tile, the HUD's mark (the bare living head) and the
  // sidebar HUD (the wordmark and the destination discs); HUD_FILL is that group's share of the
  // frame's width and height, whichever binds first
  SB_POP: 0.3, SB_FROM: 0.35, SB_HOLD: 0.15,
  GLIDE: 0.5, XFADE: 0.12,
  DROP_STAGGER: 0.045, DROP: 0.28, DROP_DY: 14,
  HUD_FILL: 0.82, HUD_KMAX: 2.2,
  HUD_HOLD: 0.35,
  // beat 4: the hub opens on the lane, one thread takes three asks
  OPEN: 0.6, INNERS: 0.4,
  LANE_FILL: 0.96, LANE_KMAX: 1.9, LANE_FOOT: 0.95,
  TITLE: 'fix the login redirect',   // the demo chat's thread title
  TURN: 1.5,            // one ask: picker, type, send, bubble, answer
  PICK: 0.1, TYPE0: 0.12, TYPE: 0.45, SEND_AFTER: 0.05, SEND: 0.15, SEND_K: 0.86,
  BUB: 0.1, ANSWER: 0.55, POP: 0.25, POP_DY: 8, SCROLL: 0.35,
  THREAD_HOLD: 0.9,     // the swarm panel rests, readable, before the pull-back
  // the swarm panel (features/agentic.png, manifest.json: 1437x1583): never
  // wider than SWARM_W hub px, and fitted by layout() so the whole picture and
  // its reply's head sit inside what the lane camera shows of the transcript
  SWARM_W: 380, SWARM_RATIO: [1437, 1583],
  FADE: 0.25,           // the transcript hands the lane back to the fixture thread
  PULL: 0.8,
  GLIDE_EASE: [0.3, 0.7, 0.2, 1],
};

// the three asks. Turns 1 and 2 are the hero's own demo chat, authored here
// (no page image carries them): Claude found the bug, superbot patched it.
// Ask 3 is a fixture chat title
// (scripts/gui-sync/fixture.json), and its answer is the real
// SwarmUsagePanel render (features/agentic.png)
const TURNS = [
  { pick: 'claude', ask: 'the login drops the next url after sign in',
    who: 'Claude', mark: 'claude',
    text: 'Found it in the callback. The redirect drops the next url before the session is set, so sign in falls back to the home page. I can patch it next.',
    worked: '1s · 2 steps' },
  { pick: 'superbot', ask: 'patch the callback so the login keeps the next url',
    who: 'superbot', mark: 'superbot',
    text: 'Done. The callback now carries the next url through the redirect, so sign in lands where it started. The login test passes.' },
  { pick: 'superbot', ask: 'Review the auth middleware',
    who: 'superbot', mark: 'superbot', swarm: '/site/assets/features/agentic.png' },
];

// ---------- derived beats (s) ----------
const NR = HR.RUN.length, NC = HR.CLOUD.length;
const RUN0 = HR.CARD;                            // cut: the app run
const CLOUD0 = RUN0 + NR * HR.CUT;               // the cloud gathers
const COL0 = CLOUD0 + NC * HR.CLOUD_POP + HR.CLOUD_POP_T + HR.CLOUD_HOLD;
const COL1 = COL0 + HR.CLOUD_COL;                // the cloud has collapsed
const SB0 = COL1 - 0.08;                         // the superbot tile pops out of it
const HUD0 = SB0 + HR.SB_POP + HR.SB_HOLD;       // it starts its glide
const LAND = HUD0 + HR.GLIDE;                    // it sits on the real HUD mark
const DROP0 = LAND - 0.1;                        // the wordmark, then each disc
const OPEN0 = LAND + HR.HUD_HOLD;                // the hub opens on the lane
const OPEN1 = OPEN0 + HR.OPEN;
const T0 = TURNS.map((_, i) => OPEN1 + i * HR.TURN);   // each turn's start
// a turn's own clock: pick, type, send, the ask's bubble, the answer
const tk = (i) => {
  const a = T0[i];
  const type0 = a + HR.TYPE0, type1 = type0 + HR.TYPE;
  const send0 = type1 + HR.SEND_AFTER, send1 = send0 + HR.SEND;
  return { a, type0, type1, send0, send1, bub: send1 + HR.BUB - HR.SEND, answer: a + HR.ANSWER + HR.TYPE0 + HR.TYPE };
};
const TK = TURNS.map((_, i) => tk(i));
const THREAD1 = TK[TK.length - 1].answer + HR.POP + HR.THREAD_HOLD;   // the last answer has rested
const H0 = THREAD1;                              // the pull-back starts
const HANDOFF = H0 + HR.PULL;                    // the whole hub at rest: the phone beat's zero
const END = HANDOFF + PHONE.END;                 // the hold
const DIPS = [RUN0];

// ---------- math ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const pow = (p, e) => Math.pow(Math.max(0, p), e);
const frac = (v) => v - Math.floor(v);
const outQuint = (p) => 1 - pow(1 - p, 5);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * pow(p - 1, 3) + c1 * pow(p - 1, 2); };
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
// CSS cubic-bezier(x1,y1,x2,y2) as a function of progress (hero-sphere.js)
const bezier = ([x1, y1, x2, y2]) => {
  const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  const dx = (u) => 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 6; i++) { const d = dx(u); if (Math.abs(d) < 1e-6) break; u -= (bx(u) - x) / d; }
    if (u < 0 || u > 1 || Math.abs(bx(u) - x) > 1e-4) {
      let lo = 0, hi = 1; u = x;
      for (let i = 0; i < 30; i++) { u = (lo + hi) / 2; if (bx(u) < x) lo = u; else hi = u; }
    }
    return by(u);
  };
};
const glideEase = bezier(HR.GLIDE_EASE);

// the cloud's fixed layout: golden-angle spokes at radii from a second,
// uncorrelated sequence (the plastic ratio; a golden-ratio radius would
// line up with the golden angle and pile the far tiles on one side), sqrt
// so the tiles spread evenly over the disc (pure)
const CLOUD = HR.CLOUD.map((_, i) => ({ a: i * 2.399963, r: 0.12 + 0.88 * Math.sqrt(frac(i * 0.754878 + 0.31)), s: 0.8 + 0.4 * frac(i * 0.414214) }));

// ---------- DOM ----------
const stage = document.getElementById('stage');
const hub = document.getElementById('hub');
const root = document.createElement('div');
root.className = 'hero-realui';
root.id = 'hero-realui';
root.setAttribute('role', 'figure');
root.setAttribute('aria-label', 'your AI apps collapse into superbot, and one superbot chat takes ask after ask: Claude answers one, superbot the next, and a swarm across Claude, GPT and Grok the third');
const tileEl = (src, cls) => `<div class="rr-tile ${cls}" aria-hidden="true"><img src="${HR.BRAND}${src}" alt="" draggable="false"></div>`;
root.innerHTML =
  `<div class="rr-ground"></div>` +
  HR.RUN.map((s) => tileEl(s, 'rr-run')).join('') +
  HR.CLOUD.map((s) => tileEl(s, 'rr-cloud')).join('') +
  `<div class="rr-sb" aria-hidden="true"><img src="${HR.BRAND}superbot-app-icon.png" alt="" draggable="false"></div>` + // the HUD mark's own art (its img.tile layer): the app icon (desktop default skin 'plain', 2026-09-25)
  `<div class="rr-card"><p class="rr-line">All your AI apps <span class="rr-grad">in one.</span></p></div>` +
  `<div class="rr-dip"></div>`;
const ground = root.querySelector('.rr-ground');
const runEls = [...root.querySelectorAll('.rr-run')];
const cloudEls = [...root.querySelectorAll('.rr-cloud')];
const sbEl = root.querySelector('.rr-sb');
const card = root.querySelector('.rr-card'), line = card.querySelector('.rr-line');
const dip = root.querySelector('.rr-dip');
const replayEl = document.getElementById('replay');

// ---- the thread: the hub's act-two transcript (#tour-feed), filled with
// the .msg anatomy the hub already draws: the user's .bub row (the open
// thread's own), and the answer rows of the boot story's client tour
// (.avatar, .m-head with .m-name and .m-when, .m-text) with the reply's
// .worked footer caption. One inner column carries the thread's scroll ----
const main = hub.querySelector('.main');
const feedEl = hub.querySelector('#feed');
const tourFeed = hub.querySelector('#tour-feed');
const chatName = hub.querySelector('.chat-head b');
const HOME_TITLE = chatName.textContent;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const avatar = (mark) => mark === 'claude'
  ? `<span class="avatar sb" style="--tile-bg:var(--brand-claude);color:var(--brand-claude-ink)"><svg style="width:62%;height:62%" aria-hidden="true"><use href="#sb-ic-claude"/></svg></span>`
  : `<span class="avatar sb"><img src="/site/assets/brand/mark-clean.svg" alt=""></span>`;
const col = document.createElement('div');
col.style.cssText = 'display:grid;gap:12px;align-content:start;will-change:transform';
const rows = [];   // { el, at } in thread order
const swarms = []; // { rep, img }: the replies that carry the swarm panel
TURNS.forEach((m, i) => {
  const own = document.createElement('div');
  own.className = 'msg own';
  own.innerHTML = `<p class="bub">${esc(m.ask)}</p>`;
  const rep = document.createElement('div');
  rep.className = 'msg';
  rep.innerHTML = `${avatar(m.mark)}<div class="m-main"><div class="m-head"><span class="m-name">${m.who}</span><span class="m-when">now</span></div>` +
    (m.text ? `<p class="m-text">${esc(m.text)}</p>` : '') +
    (m.swarm ? `<img src="${m.swarm}" alt="" draggable="false" style="display:block;width:min(100%,${HR.SWARM_W}px);height:auto;aspect-ratio:${HR.SWARM_RATIO.join('/')}">` : '') +
    (m.worked ? `<span class="worked">${m.worked}</span>` : '') + `</div>`;
  if (m.swarm) swarms.push({ rep, img: rep.querySelector('.m-main > img') });
  col.append(own, rep);
  rows.push({ el: own, at: TK[i].bub }, { el: rep, at: TK[i].answer });
});
tourFeed.appendChild(col);

// ---- the composer: the picker's slot names the app the ask goes out on,
// and the asks are typed into the placeholder slot one character at a time.
// The placeholder text moves into its own span so a draft can take its
// place; the slot, its font and its clipping stay the app's (.composer .ph)
const composer = hub.querySelector('.composer');
const ph = composer.querySelector('.ph');
const sendEl = composer.querySelector('.send');
const phText = document.createElement('span');
phText.textContent = ph.textContent;
ph.textContent = '';
ph.style.position = 'relative';
ph.appendChild(phText);
const drafts = TURNS.map((m) => {
  const track = document.createElement('span');
  track.setAttribute('aria-hidden', 'true');
  track.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;color:var(--fg);opacity:0;will-change:transform,opacity';
  const chars = [...m.ask].map((c) => { const s = document.createElement('span'); s.textContent = c; s.style.opacity = '0'; track.appendChild(s); return s; });
  const caret = document.createElement('span');
  caret.style.cssText = 'position:absolute;left:0;top:10%;width:1px;height:80%;background:var(--fg);will-change:transform,opacity';
  track.appendChild(caret);
  ph.appendChild(track);
  return { track, chars, caret, shown: new Uint8Array(chars.length), right: new Float32Array(chars.length + 1) };
});
// the picker (.composer .model: the superbot mark and name): the same slot
// also holds the Claude row's mark and name, stacked in one grid cell, so
// switching the picked app is an opacity cross-fade, never a reflow
const model = composer.querySelector('.model');
const picks = {};
if (model) {
  const cv = model.querySelector('.cv');
  const cell = document.createElement('span');
  cell.style.cssText = 'display:inline-grid';
  const sb = document.createElement('span');
  sb.style.cssText = 'grid-area:1/1;display:flex;align-items:center;gap:4px';
  [...model.childNodes].filter((n) => n !== cv).forEach((n) => sb.appendChild(n));
  const cl = document.createElement('span');
  cl.style.cssText = 'grid-area:1/1;display:flex;align-items:center;gap:4px;opacity:0';
  cl.innerHTML = '<svg style="width:10px;height:10px" aria-hidden="true"><use href="#sb-ic-claude"/></svg>Claude';
  cell.append(sb, cl);
  model.insertBefore(cell, cv);
  picks.superbot = sb; picks.claude = cl;
}

// ---------- layout: every read, outside the loop ----------
// root px throughout; an ancestor may scale the stage, so Z converts screen
// rects. The hub's boxes are read with its camera transform cleared
const L = { w: 0, h: 0, Z: 1, hub: null, mark: null, hud: null, lane: null, tile: 0, kh: 1, kl: 1,
            phW: 0, scroll: new Float32Array(rows.length) };
function layout(force = false) {
  const w = root.clientWidth, h = root.clientHeight;
  if (!w || !h) return;
  if (!force && w === L.w && h === L.h) return;
  L.w = w; L.h = h;
  const tf = hub.style.transform, cf = col.style.transform;
  hub.style.transform = '';
  col.style.transform = '';
  const rr = root.getBoundingClientRect();
  const Z = L.Z = rr.width / w || 1;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - rr.left) / Z, y: (r.top - rr.top) / Z, w: r.width / Z, h: r.height / Z };
  };
  L.hub = box(hub);
  const rel = (b) => ({ x: b.x - L.hub.x, y: b.y - L.hub.y, w: b.w, h: b.h });   // hub-local
  // the HUD's Superbot mark (the landing seat, in the title line left of the
  // wordmark) and the HUD's text column (the wordmark over the discs row,
  // whose last disc is the '+'): the group the HUD camera frames is the mark,
  // the wordmark and the discs, one lockup
  const tileBox = box(hub.querySelector('.hud-mark'));
  const items = ['.hud-word', '.hud-disc.add'].map((q) => hub.querySelector(q)).filter(Boolean).map((el) => rel(box(el)));
  L.mark = rel(tileBox);
  const hb = [L.mark, ...items];
  const x0 = Math.min(...hb.map((b) => b.x)), x1 = Math.max(...hb.map((b) => b.x + b.w));
  const y0 = Math.min(...hb.map((b) => b.y)), y1 = Math.max(...hb.map((b) => b.y + b.h));
  // the HUD camera: the mark to the '+' disc, centred, filling HUD_FILL of
  // the frame on whichever axis binds first
  L.hud = { fx: (x0 + x1) / 2, fy: (y0 + y1) / 2 };
  L.kh = Math.min(HR.HUD_KMAX, (w * HR.HUD_FILL) / Math.max(1, x1 - x0), (h * HR.HUD_FILL) / Math.max(1, y1 - y0));
  // the lane camera: the main lane filling the width, its composer's foot
  // at LANE_FOOT of the frame's height
  const mb = rel(box(main)), cb = rel(box(composer));
  L.kl = Math.min(HR.LANE_KMAX, (w * HR.LANE_FILL) / Math.max(1, mb.w));
  L.lane = { fx: mb.x + mb.w / 2, fy: cb.y + cb.h };
  // the thread's scroll: the newest row's foot sits on the transcript's foot,
  // just above the composer, as the app's thread anchors its last turn
  // (.feed.thread's align-content: end); a negative offset lowers the column
  // while it is short. Rows are measured at rest, every one laid out from
  // mount, so nothing reflows as they land
  const fb = rel(box(tourFeed));
  const inset = 6;
  const bottom = fb.y + fb.h - inset;
  // the swarm panel's frame (features/agentic.png is portrait). Its reply is
  // the newest row, so its foot parks on `bottom`; the picture, with the
  // reply's head above it, must then fit between that foot and the highest
  // point of the transcript the lane camera still shows, at the thread's
  // closest zoom (laneCam(H0)): the feed's own top, or the frame's, whichever
  // is lower. Its width follows from the picture's own aspect ratio
  const lc = laneCam(H0);
  const top = Math.max(fb.y, -(L.hub.y + lc.ty) / lc.k) + inset;
  for (const { rep, img } of swarms) {
    const fitH = bottom - top - (box(rep).h - box(img).h);
    const fitW = Math.min(HR.SWARM_W, Math.max(0, (fitH * HR.SWARM_RATIO[0]) / HR.SWARM_RATIO[1]));
    img.style.width = `min(100%, ${fitW.toFixed(1)}px)`;
  }
  rows.forEach((r, i) => { const rb = rel(box(r.el)); L.scroll[i] = rb.y + rb.h - bottom; });
  // the drafts: each character's right edge, and the placeholder slot's
  // width (a draft scrolls like a one-line input)
  L.phW = ph.clientWidth;
  for (const d of drafts) d.chars.forEach((c, i) => { d.right[i + 1] = c.offsetLeft + c.offsetWidth; });
  // the run tile
  L.tile = Math.min(w, h) * HR.TILE;
  for (const el of [...runEls, sbEl]) el.style.width = el.style.height = `${L.tile.toFixed(1)}px`;
  const ct = L.tile * HR.CLOUD_TILE;
  for (const el of cloudEls) el.style.width = el.style.height = `${ct.toFixed(1)}px`;
  L.ct = ct;
  hub.style.transform = tf;
  col.style.transform = cf;
}
new ResizeObserver(() => layout()).observe(root);

// ---------- the camera on the real hub ----------
// a hub-local focus point f shown at root point a, at zoom k: the hub's
// transform-origin is 0 0 (hub-boot.css), so tx = a - hub.x - f * k
const cam = (fx, fy, k, ax, ay) => ({ tx: ax - L.hub.x - fx * k, ty: ay - L.hub.y - fy * k, k });
const hudCam = (t) => {
  const k = L.kh * lerp(0.94, 1, outQuint(seg(t, HUD0, OPEN0)));
  return cam(L.hud.fx, L.hud.fy, k, L.w / 2, L.h / 2);
};
const laneCam = (t) => {
  const k = L.kl * lerp(1, 1.03, seg(t, OPEN1, H0));   // a slow push through the thread
  return cam(L.lane.fx, L.lane.fy, k, L.w / 2, L.h * HR.LANE_FOOT);
};
const mixCam = (a, b, p) => ({ tx: lerp(a.tx, b.tx, p), ty: lerp(a.ty, b.ty, p), k: Math.exp(lerp(Math.log(a.k), Math.log(b.k), p)) });
// hub-local point -> root px under a camera
const project = (c, x, y) => ({ x: L.hub.x + c.tx + x * c.k, y: L.hub.y + c.ty + y * c.k });

// write-if-changed, so a still frame costs no style invalidation
const W = new WeakMap();
const set = (el, prop, v) => {
  let m = W.get(el);
  if (!m) { m = {}; W.set(el, m); }
  if (m[prop] !== v) { m[prop] = v; el.style[prop] = v; }
};
const op = (el, v) => set(el, 'opacity', clamp01(v).toFixed(3));

// ---------- the renderer: one story time -> every write ----------
let S = null, beamPlaced = false;
function render(t) {
  if (!L.hub) return;
  const overlay = t < OPEN0;
  set(root, 'display', overlay ? 'block' : 'none');
  renderHub(t);
  renderThread(t);
  renderComposer(t);
  if (overlay) renderOverlay(t);
  if (t >= HANDOFF) {
    if (!beamPlaced) { placeBeam(); beamPlaced = true; }
    playPhoneFrame(t - HANDOFF);
  }
  if (t >= END) perch();
  replayEl.hidden = t < END;
}

// the real hub through the story: dark until the superbot tile lands; then
// the sidebar HUD alone, floating on the stage's black with its wordmark and
// discs dropping in beside the mark (grounds held transparent, the chats
// column still dark); then the whole window with its grounds (revealHub(1)),
// the columns fading up as the camera moves from the HUD onto the lane; the
// pull-back to rest over H0..HANDOFF, where the hub-handoff.js phone beat
// takes over
function renderHub(t) {
  const { mark, dropItems } = S;
  if (t < OPEN0) {
    const on = t >= HUD0 ? 1 : 0;
    revealHub(0);                           // grounds transparent, mark and HUD items dark
    revealHub(on, { grounds: false });      // then the HUD's own opacity
    revealInners(0);
    // revealHub(0) wrote the mark (the HUD's) and the HUD items dark this
    // frame, so these write straight through (no write-if-changed cache)
    // (the mark is the bare living head, no ground: it fades in under the tile
    // as the tile's grey ground fades out over it, the cross-fade below)
    mark.style.opacity = seg(t, LAND, LAND + HR.XFADE).toFixed(3);
    dropItems.forEach((el, i) => {
      const p = seg(t, DROP0 + i * HR.DROP_STAGGER, DROP0 + i * HR.DROP_STAGGER + HR.DROP);
      el.style.opacity = clamp01(p * 1.6).toFixed(3);
      set(el, 'transform', p < 1 ? `translateY(${((1 - outBack(p)) * -HR.DROP_DY).toFixed(2)}px)` : '');
    });
    setHubCam(hudCam(t));
  } else {
    revealHub(1);
    revealInners(seg(t, OPEN0, OPEN0 + HR.INNERS));
    dropItems.forEach((el) => set(el, 'transform', ''));
    if (t < OPEN1) setHubCam(mixCam(hudCam(OPEN0), laneCam(OPEN1), glideEase(seg(t, OPEN0, OPEN1))));
    else if (t < H0) setHubCam(laneCam(t));
    else if (t < HANDOFF) {
      const c = laneCam(H0), p = glideEase(seg(t, H0, HANDOFF));
      setHubCam({ tx: lerp(c.tx, 0, p), ty: lerp(c.ty, 0, p), k: Math.exp(lerp(Math.log(c.k), 0, p)) });
    } else setHubCam(null);
  }
}
function setHubCam(c) {
  set(hub, 'willChange', c ? 'transform, opacity' : '');
  set(hub, 'transform', c ? `translate(${c.tx.toFixed(2)}px, ${c.ty.toFixed(2)}px) scale(${c.k.toFixed(4)})` : '');
}

// the thread: the transcript holds the lane from the hub's opening until the
// pull-back, where it hands the lane back to the fixture thread (#feed, whose
// rows the phone beat pops in). The title is the transcript's own
// (written once at each cut: a text write, not a per-frame one)
function renderThread(t) {
  const tour = t >= OPEN0 && t < H0 + HR.FADE;
  const v = tour ? 1 - seg(t, H0, H0 + HR.FADE) : 0;
  op(tourFeed, v);
  op(feedEl, t >= OPEN0 ? 1 - v : 1);
  const title = t >= OPEN0 && t < H0 + HR.FADE / 2 ? HR.TITLE : HOME_TITLE;
  if (W.get(chatName)?.text !== title) { W.set(chatName, { text: title }); chatName.textContent = title; }
  let y = L.scroll[0];
  rows.forEach((r, i) => {
    const p = seg(t, r.at, r.at + HR.POP);
    op(r.el, p * 2);
    set(r.el, 'transform', p < 1 ? `translateY(${((1 - outBack(p)) * HR.POP_DY).toFixed(2)}px)` : '');
    y = lerp(y, L.scroll[i], outQuint(seg(t, r.at, r.at + HR.SCROLL)));
  });
  set(col, 'transform', Math.abs(y) > 0.05 ? `translateY(${(-y).toFixed(1)}px)` : '');
}

// the composer: per turn, the picker settles on the turn's app, the ask is
// typed (scrolled like a one-line input so the caret stays in the slot), the
// real send button presses, and the draft clears as the app clears it (the
// placeholder returns)
function renderComposer(t) {
  let pick = 'superbot', since = -1, typing = false, press = 0;
  TURNS.forEach((m, i) => {
    const k = TK[i], d = drafts[i];
    if (t >= k.a && m.pick !== pick) { pick = m.pick; since = k.a; }
    const n = Math.round(d.chars.length * seg(t, k.type0, k.type1));
    for (let j = 0; j < d.chars.length; j++) {
      const v = j < n ? 1 : 0;
      if (d.shown[j] !== v) { d.shown[j] = v; d.chars[j].style.opacity = v ? '1' : '0'; }
    }
    const on = t >= k.type0 && t < k.send1;
    if (on) typing = true;
    const right = d.right[n] || 0;
    set(d.track, 'transform', `translateX(${(-Math.max(0, right - L.phW + 6)).toFixed(1)}px)`);
    op(d.track, on ? 1 : 0);
    set(d.caret, 'transform', `translateX(${(right + 1).toFixed(1)}px)`);
    press = Math.max(press, bump(t, k.send0, k.send1));
  });
  // the picked app's row fades up over PICK as the turn starts; the other is dark
  const fade = since < 0 ? 1 : seg(t, since, since + HR.PICK);
  for (const [k, el] of Object.entries(picks)) op(el, k === pick ? fade : 0);
  op(phText, typing ? 0 : 1);
  set(sendEl, 'transform', press > 0 ? `scale(${lerp(1, HR.SEND_K, press).toFixed(3)})` : '');
}

function renderOverlay(t) {
  // the black under every scene that is not the hub itself
  op(ground, t >= HUD0 ? 1 - seg(t, HUD0, HUD0 + HR.GLIDE * 0.5) : 1);
  const cx = L.w / 2, cy = L.h / 2, s0 = L.tile;

  // ---- the card ----
  const on = t < RUN0;
  op(card, on ? 1 : 0);
  if (on) {
    const p = outQuint(seg(t, 0, HR.CARD_POP));
    op(line, p * 1.3);
    set(line, 'transform', `scale(${lerp(HR.CARD_FROM, 1, p).toFixed(4)})`);
  }

  // ---- beat 1: the run, a hard cut per tile ----
  runEls.forEach((el, i) => {
    const a = RUN0 + i * HR.CUT, v = t >= a && t < a + HR.CUT;
    op(el, v ? 1 : 0);
    if (v) {
      const k = lerp(HR.PUNCH, 1, outQuint(seg(t, a, a + HR.PUNCH_T)));
      set(el, 'transform', `translate(${(cx - s0 / 2).toFixed(1)}px, ${(cy - s0 / 2).toFixed(1)}px) scale(${k.toFixed(4)})`);
    }
  });

  // ---- beat 2: the cloud gathers, drifts, and collapses to the centre ----
  const R = Math.min(L.w, L.h) * HR.CLOUD_R, cs = L.ct;
  const col = pow(seg(t, COL0, COL1), HR.CLOUD_COL_EXP);
  const spin = HR.CLOUD_SPIN * Math.max(0, t - CLOUD0);
  cloudEls.forEach((el, i) => {
    const c = CLOUD[i], a0 = CLOUD0 + i * HR.CLOUD_POP;
    const pop = seg(t, a0, a0 + HR.CLOUD_POP_T);
    const v = pop * (1 - seg(t, COL1 - 0.1, COL1));
    op(el, t < COL1 ? v : 0);
    if (v <= 0) return;
    const r = R * c.r * (1 - col), ang = c.a + spin * (0.6 + 0.4 * c.r);
    const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.78;
    const k = c.s * lerp(0.4, 1, outBack(pop)) * lerp(1, 0.4, col);
    set(el, 'transform', `translate(${(x - cs / 2).toFixed(2)}px, ${(y - cs / 2).toFixed(2)}px) scale(${k.toFixed(4)})`);
  });

  // ---- beat 3: the superbot tile pops out of the collapse, then glides onto the HUD's mark ----
  if (t >= SB0 && t < LAND + HR.XFADE) {
    const pop = outBack(seg(t, SB0, SB0 + HR.SB_POP));
    let k = lerp(HR.SB_FROM, 1, pop);
    let x = cx, y = cy;
    const g = glideEase(seg(t, HUD0, LAND));
    if (g > 0) {
      const c = hudCam(t), sl = L.mark, p = project(c, sl.x + sl.w / 2, sl.y + sl.h / 2);
      x = lerp(cx, p.x, g); y = lerp(cy, p.y, g);
      k = lerp(1, (sl.w * c.k) / s0, g);
    }
    // the tile hands over to the mark in a short crossfade
    op(sbEl, seg(t, SB0, SB0 + 0.06) * (1 - seg(t, LAND, LAND + HR.XFADE)));
    set(sbEl, 'transform', `translate(${(x - s0 / 2).toFixed(2)}px, ${(y - s0 / 2).toFixed(2)}px) scale(${k.toFixed(4)})`);
  } else op(sbEl, 0);

  // ---- the dip: black over the card's cut ----
  let d = 0;
  for (const c of DIPS) d = Math.max(d, seg(t, c - HR.DIP, c) * (1 - seg(t, c, c + HR.DIP)));
  op(dip, d);
}

// ---------- the clock (house pattern: one rAF, pause where it stopped, hold at end) ----------
let t0 = 0, paused = false, pausedAt = 0, visible = true, held = false;
function setPaused(v) {
  if (v === paused) return;
  paused = v;
  if (v) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
}
const storyT = (now) => Math.min((now - t0) / 1000, END);
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
  beamPlaced = false;
  held = false;
  hub.style.transform = '';
  S = prepStage(stage, 'realui');
  W.delete(hub);
  S.dropItems.forEach((el) => W.delete(el));
  root.style.display = 'block';
  layout(true);
}
// #replay: prepStage re-zeroes the hub, the boxes are re-measured at rest,
// and the clock restarts
function restart() { prep(); t0 = performance.now(); }

const B = { RUN0, CLOUD0, COL0, COL1, SB0, HUD0, LAND, OPEN0, OPEN1, T: T0, H0, HANDOFF, END };

// ---------- mount: self-boot on import, inside #stage ----------
function mount() {
  const q = new URLSearchParams(location.search);
  stage.querySelector('.body').appendChild(root);
  prep();
  const hold = q.get('t') !== null && q.get('play') !== '1';
  const holdT = Math.max(0, Math.min(Number(q.get('t')) || 0, END));
  // the drafts' and rows' offsets depend on the UI font: re-measure once it loads
  document.fonts?.ready.then(() => { layout(true); if (hold) render(holdT); });
  if (hold) {
    render(holdT);
    window.__heroRealui = { t: () => holdT, render, B };
    return;
  }
  const start = Math.max(0, Math.min(Number(q.get('t') ?? 0) || 0, END));
  t0 = performance.now() - start * 1000;
  wireReplay(restart);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; setPaused(!visible || document.hidden); }, { threshold: 0.15 }).observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(!visible || document.hidden));
  requestAnimationFrame(tick);
  window.__heroRealui = { t: () => storyT(performance.now()), render, restart, B };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
