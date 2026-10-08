// hero-wschat (2026-09-28): the hero arm `wschat` (experiments.js hero rev 9),
// the rebuilt workspace hero copied from singularitystudiosdev/superbot-hero-animation
// 6448073 (site/assets/hero-workspace*.{js,css}, hero-chat/, fonts/) with its
// /superbot-hero-animation path prefix dropped and its files renamed
// hero-wschat*, so the `workspace` arm's hero-workspace.js/.css stay as they
// are. The lander links hero-wschat.css, -chat.css and -end.css and switches
// hero-workspace.css off before importing this module (HERO_SHEETS). The
// fork's own header follows, its module names as it wrote them.
//
// hero-workspace: the lander's default hero since 2026-09-25 (`?hero=chaos`
// plays the previous default), ported from the workspace-hero deploy. It opens on the
// ad gallery's "I can do that too" first act (scenes/tabs.js 0..T.K: a browser
// whose tab strip fills with every agent app, faster and faster, the page
// cutting to each new tab), hands the strip's favicons to hero-sphere.js at the
// kill (the sphere, the mark, the HUD, the frontend reveal), and once the
// frontend is up cuts the stage to black for the ads' text card, "All the
// agents in one" (owner, 2026-09-27), with the storm gradient and white shine on "one"
// (timeline.js renderGrads). The card lifts onto the app's NEW CHAT screen
// (hero-wschat-frontend.js), and after a beat the chat plays in it
// (hero-wschat-chat.js: `make me a muse meme` typed and sent, the switch to
// Gemini, the image made; then the ad's combo route plays on in the same
// thread, the DeepSeek scrape and the DoorDash burger). A second after it settles the
// end card comes in over the stage (hero-wschat-end.js: the 'superbot'
// lockup and its replay circle), and the story holds there (2026-09-27).
// This arm draws no phone and plays no phone beat (hero-wschat.css hides
// the phone, the beam and the label, so hub-handoff.js's noPhone path never
// docks); the sphere stays parked on the hub from the chat on, and its own
// hold (perch, #replay at SPHERE_END) is never reached: the end card's circle
// is the one replay control.
//
// The clock is ours, not the sphere's: the stage holds on the first tab frame
// until it is scrolled far enough on screen, then plays once and holds; it
// pauses when scrolled away or the tab is hidden. hero-sphere.js is imported
// hosted (#stage[data-hero-host]) so it mounts and renders but never ticks.
// QA: ?t=<s> holds that story second, ?t=<s>&play=1 plays from it.
//
// The frontend (2026-09-27): the hub is dressed as superbot-desktop main's
// new chat screen by hero-wschat-frontend.js (buildFrontend: the HUD's
// ad roster, main's sidebar, pane, composer and chips at main's own px,
// scaled once to the hub, and the `ui` handle the chat beat drives). It runs
// at mount and only when this hero plays, BEFORE the sphere's prepStage
// reads the hub, so its drop items are the new HUD's wordmark and discs and its
// landing seat is the HUD's mark (the title line's, left of the wordmark).
// Replay (the end card's circle; #replay too, though it never shows here)
// puts everything back: the pristine new chat (ui.reset, the Chat lane), the
// chat beat, the end card, the title card, the sphere, then plays from 0.

import { wireReplay } from './hub-handoff.js?v=7';
import { buildFrontend } from './hero-wschat-frontend.js?v=14';
import { createChat, CHAT_DUR } from './hero-wschat-chat.js?v=16';
import { createEnd, END_IN } from './hero-wschat-end.js?v=3';
import { armMockJoin } from './mock-join.js?v=2';

const stage = document.getElementById('stage');
stage.setAttribute('data-hero-host', 'workspace');
// the story second this stage opens on (and replays from) when the URL names none:
// the `wstop` arm sets data-ws-from before importing this module so its live stage
// starts on the beat its poster shows; absent, 0, the tabs, as ever
const FROM0 = Math.max(0, Number(stage.dataset.wsFrom) || 0);
let ui = null, chat = null, end = null;

const { sphere } = await import('./hero-sphere.js?v=7');
const { HS, T0: PRE, L, BEATS, END: SPHERE_END, liftAt } = sphere;

// ---------- constants (s, our clock: 0 = the first tab frame, PRE = the kill) ----------
const HW = {
  OPEN: [0.45, 2.30], OPEN_EXP: 0.6, // tabs 3..N-1 open over this window, each gap shorter than the last
  GROW: 0.16,                        // a new tab widens into the strip
  FIRST: 3,                          // tabs already open on the first frame
  TAB_MAX: 240,                      // Chrome's widest tab, design px
  PUSH_AT: 0.3,                      // the camera starts leaning in
  COUNT_IN: [0.9, 1.1],              // the "N tabs open" pill
  TAB_DIE: 0.18,                     // a tab fades as its favicon lifts
  CHROME_OUT: [0.1, 0.62],           // after the kill, the window fades as it falls
  // the card, the ads' text beat in frame: once the frontend has shown, the
  // stage fades to black, the headline's words rise and unblur in turn, the
  // shine sweeps "one", then the card lifts and the frontend carries on. The
  // sphere's clock stands still from CARD_AT until the card starts to lift.
  CARD_AT: BEATS.REST1 + 0.5,        // sphere time: the frontend has been up a beat
  CARD_IN: 0.4, CARD_HOLD: 3.0, CARD_OUT: 0.5,
  WORD_AT: 0.3,                      // after CARD_AT, the first word starts
  WORD_GAP: 0.08, WORD_DUR: 0.55, WORD_DY: 0.36, WORD_BLUR: 8,
  SHINE_DELAY: 0.08, SHINE_DUR: 0.9,
  STORM_LOOP: 8,                     // s for the gradient tile to drift one period
  REST_CHAT: 0.6,                    // after the card has lifted, the new chat screen rests this long, then the chat beat
  CHAT_HOLD: 1.0,                    // after the chat beat (its own last ~1s already a settled hold), before the end card
  // the gate: play once this much of the stage is on screen
  GATE_RATIO: 0.6, GATE_VIEW: 0.6,
};
const N = HS.N;
const T_CARD = PRE + HW.CARD_AT;
const T_BLACK = T_CARD + HW.CARD_IN;
const T_OUT = T_BLACK + HW.CARD_HOLD;
const CARD_LEN = T_OUT - T_CARD;       // how long the sphere stands still
const T_TITLE = T_CARD + HW.WORD_AT;
// the beats after the card: it has lifted onto the new chat screen, rests,
// the chat plays (CHAT..CHAT_END, the chat module's DUR), holds, then the end
// card comes in (ENDCARD) and is fully in, its replay circle live, at END:
// the hold.
const T_CHAT = T_OUT + HW.CARD_OUT + HW.REST_CHAT;
const T_CHAT_END = T_CHAT + CHAT_DUR;
const T_ENDCARD = T_CHAT_END + HW.CHAT_HOLD;
const END = T_ENDCARD + END_IN;
// our clock -> the sphere's: straight through, frozen under the card, then
// shifted by it, and parked from the chat on (S_PARK, the sphere's time at
// T_CHAT), so nothing of the sphere moves under the chat or the end card. The
// sphere's own hold (SPHERE_END: perch() lifts the hub, #replay shows) is
// never reached: the end card's circle is this arm's replay control.
const S_PARK = HW.CARD_AT + HW.CARD_OUT + HW.REST_CHAT;
const sphereT = (tau) =>
  Math.max(0, tau < T_CARD ? tau - PRE : tau < T_OUT ? HW.CARD_AT : Math.min(tau - PRE - CARD_LEN, S_PARK));

// the apps, one per sphere tile (hero-sphere.js HS.BRANDS, same order), so tab k's favicon IS tile k
const APPS = {
  'chaos/claude.png': ['Claude', 'claude.ai'],
  'chaos/gemini-app-icon.png': ['Gemini', 'gemini.google.com'],
  'chaos/cursor.png': ['Cursor', 'cursor.com'],
  'chaos/copilot.svg': ['GitHub Copilot', 'github.com/copilot'],
  'chaos/devin.png': ['Devin', 'app.devin.ai'],
  'chaos/hermes.png': ['Hermes Agent', 'github.com/NousResearch/hermes-agent'],
  'chaos/kiro.png': ['Kiro', 'kiro.dev'],
  'chaos/vscode.png': ['VS Code', 'vscode.dev'],
  'chaos/chatgpt.png': ['ChatGPT', 'chatgpt.com'],
  'tiles/windsurf.svg': ['Windsurf', 'windsurf.com'],
  'tiles/zed.svg': ['Zed', 'zed.dev'],
  'tiles/cline.svg': ['Cline', 'cline.bot'],
  'tiles/roo.svg': ['Roo Code', 'roocode.com'],
  'tiles/kilo.svg': ['Kilo Code', 'kilocode.ai'],
  'tiles/continue.svg': ['Continue', 'continue.dev'],
  'tiles/opencode.svg': ['opencode', 'opencode.ai'],
  'tiles/openclaw.svg': ['OpenClaw', 'openclaw.ai'],
  'tiles/qwen-code.svg': ['Qwen Code', 'github.com/QwenLM/qwen-code'],
  'tiles/amazon-q-cli.svg': ['Amazon Q', 'aws.amazon.com/q/developer'],
};
const appOf = (k) => {
  const file = HS.BRANDS[k % HS.BRANDS.length];
  const [name, host] = APPS[file] ?? [file.replace(/^.*\/|\..*$/g, ''), ''];
  return { src: HS.BRAND + file, name, host };
};

// ---------- math ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// tab k opens at OPEN_AT[k]: the first three are open on frame one, the rest
// arrive on a p^0.6 curve, so every gap is shorter than the one before
const OPEN_AT = Array.from({ length: N }, (_, k) => {
  if (k < HW.FIRST) return -1;
  const p = (k - HW.FIRST) / (N - 1 - HW.FIRST);
  return lerp(HW.OPEN[0], HW.OPEN[1], Math.pow(p, HW.OPEN_EXP));
});

// ---------- DOM: the browser, drawn in the sphere's own canvas (design px) ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const browser = document.createElement('div');
browser.className = 'hw-browser';
browser.setAttribute('aria-hidden', 'true');
browser.innerHTML =
  `<div class="hw-strip"><i class="hw-dot"></i><i class="hw-dot"></i><i class="hw-dot"></i>` +
  `<div class="hw-tabs"></div><span class="hw-new">+</span></div>` +
  `<div class="hw-bar"><span class="hw-nav">&#8592;</span><span class="hw-nav">&#8594;</span><span class="hw-nav">&#8635;</span>` +
  `<div class="hw-omni"><span class="hw-lock"></span><span class="hw-url"></span></div></div>` +
  `<div class="hw-page"><div class="hw-app"><img class="hw-app-icon" alt="" draggable="false">` +
  `<div class="hw-app-name"></div><div class="hw-compose"><span class="hw-ph"></span><i class="hw-send"></i></div></div>` +
  `<div class="hw-count"></div></div>`;
const tabsEl = browser.querySelector('.hw-tabs');
const newEl = browser.querySelector('.hw-new');
const urlEl = browser.querySelector('.hw-url');
const appIcon = browser.querySelector('.hw-app-icon');
const appName = browser.querySelector('.hw-app-name');
const phEl = browser.querySelector('.hw-ph');
const countEl = browser.querySelector('.hw-count');

// A tab moves only transform and opacity (2026-09-28; it wrote width and the
// favicon's left every frame before). Its box is always Chrome's widest tab,
// TAB_MAX, and two nested clips cut it to the frame's width w: the tab
// (.hw-tab, overflow hidden, rounded) sits at x + w - TAB_MAX so its right
// edge is the tab's right edge, and its inner (.hw-in, overflow hidden,
// rounded, the active tab's fill and the separator) counter-slides to x, so
// together they show exactly [x, x + w] with both top corners rounded. The
// close x rides the outer box (right 10, as before); the favicon slides; the
// title's text-overflow ellipsis is drawn from its measured prefixes (a
// transform clip at the last whole character that fits, then the '…').
const TT_L = 36, TT_R = 28, TT_R_S = 6;          // the title's inset: left, right, right at size s
const TT_W = HW.TAB_MAX - TT_L;                 // the title clip's box
// hero-wschat.css .hw-browser's font; canvas measures it without a layout
const TAB_FONT = '500 12px ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const measureCtx = document.createElement('canvas').getContext('2d');
measureCtx.font = TAB_FONT;
const ELL_W = measureCtx.measureText('…').width;
const tabs = Array.from({ length: N }, (_, k) => {
  const app = appOf(k);
  const el = document.createElement('div');
  el.className = 'hw-tab';
  el.innerHTML = `<div class="hw-in"><img class="hw-fav" src="${esc(app.src)}" alt="" draggable="false">` +
    `<span class="hw-tt"><span class="hw-tx">${esc(app.name)}</span></span><span class="hw-el">&#8230;</span></div>` +
    `<span class="hw-x">&#215;</span>`;
  tabsEl.appendChild(el);
  const inn = el.firstElementChild;
  const tt = inn.querySelector('.hw-tt');
  const chars = [...app.name];
  const pre = chars.map((_, i) => measureCtx.measureText(chars.slice(0, i).join('')).width);
  return {
    k, el, inn, fav: inn.firstElementChild, tt, tx: tt.firstElementChild, ell: inn.querySelector('.hw-el'),
    pre, full: measureCtx.measureText(app.name).width, app, lift: liftAt(k), st: {},
  };
});
// text-overflow: ellipsis in `a` px: the whole title when it fits, else the
// longest prefix that leaves room for the '…'; returns the clip's right edge
// and where the '…' goes (-1: none)
function ellipsize(tb, a) {
  if (tb.full <= a) return [TT_W, -1];
  let i = tb.pre.length - 1;
  while (i > 0 && tb.pre[i] + ELL_W > a) i--;
  return [tb.pre[i], tb.pre[i]];
}

// the card: black over the whole stage, the headline centred on it
const card = document.createElement('div');
card.className = 'hw-card';
card.innerHTML = '<p class="hw-title">' +
  ['All', 'the', 'agents', 'in', 'one']
    .map((w) => `<span class="hw-w${w === 'one' ? ' hw-one' : ''}">${w}</span>`).join(' ') + '</p>';
const title = card.firstElementChild;
const words = [...title.querySelectorAll('.hw-w')];
const one = title.querySelector('.hw-one');

// ---------- the browser's frame ----------
let bShown = true, activeK = -1, countN = -1, lastW = 0;
function setPage(k) {
  if (k === activeK) return;
  if (activeK >= 0) tabs[activeK].el.classList.remove('on');
  activeK = k;
  const { app, el } = tabs[k];
  el.classList.add('on');
  urlEl.textContent = app.host;
  appIcon.src = app.src;
  appName.textContent = app.name;
  phEl.textContent = `Message ${app.name}`;
}
// write a style only when its value moved (40 tabs a frame)
const put = (tb, key, v, fn) => { if (tb.st[key] !== v) { tb.st[key] = v; fn(v); } };

function renderBrowser(tau) {
  const t = tau - PRE;
  if (t >= HW.CHROME_OUT[1]) {
    if (bShown) { bShown = false; browser.style.visibility = 'hidden'; }
    return;
  }
  if (!bShown) { bShown = true; browser.style.visibility = ''; }
  const { cx, cy, W } = L;
  const BW = W / HS.Z;
  if (BW !== lastW) { lastW = BW; browser.style.width = `${BW.toFixed(2)}px`; }

  // the camera: leans in over the act, then falls away about the centre at
  // the kill; the same numbers hero-sphere.js places the lifting tiles with
  const push = Math.min(HS.PUSH, 8 / cx);
  const s1 = 1 + push * (t < 0 ? inOutCubic(seg(tau, HW.PUSH_AT, PRE)) : 1);
  const s2 = t < 0 ? 1 : lerp(1, HS.FALL, outCubic(seg(t, 0, HS.KILL)));
  const cam = s1 * s2, offX = cx + (cx * (1 - s1) - cx) * s2, offY = cy - cy * s2;
  browser.style.transform = `translate(${offX.toFixed(2)}px, ${offY.toFixed(2)}px) scale(${(HS.Z * cam).toFixed(5)})`;
  browser.style.opacity = t < 0 ? '1' : (1 - outCubic(seg(t, HW.CHROME_OUT[0], HW.CHROME_OUT[1]))).toFixed(3);

  // the strip: every open tab shares the width, capped at Chrome's widest;
  // with all N open this is exactly the geometry of L.fav (hero-sphere layout())
  const avail = BW - HS.STRIP_L - HS.STRIP_R;
  const grow = tabs.map((tb) => (OPEN_AT[tb.k] < 0 ? 1 : outCubic(seg(tau, OPEN_AT[tb.k], OPEN_AT[tb.k] + HW.GROW))));
  const share = Math.min(HW.TAB_MAX, avail / Math.max(1e-6, grow.reduce((a, b) => a + b, 0)));
  let x = HS.STRIP_L, open = 0, newest = 0;
  for (const tb of tabs) {
    const g = grow[tb.k], w = share * g;
    if (OPEN_AT[tb.k] <= tau) { open++; newest = tb.k; }
    const die = t < 0 ? 1 : 1 - seg(t, tb.lift, tb.lift + HW.TAB_DIE);
    const vis = g > 0 && die > 0;
    put(tb, 'vis', vis, (v) => { tb.el.style.visibility = v ? '' : 'hidden'; });
    if (vis) {
      // the outer clip's right edge at x + w, the inner box back at x
      const ww = Math.round(w * 100) / 100, xx = Math.round(x * 100) / 100;
      put(tb, 'x', (xx + ww - HW.TAB_MAX).toFixed(2), (v) => { tb.el.style.transform = `translateX(${v}px)`; });
      put(tb, 'w', (HW.TAB_MAX - ww).toFixed(2), (v) => { tb.inn.style.transform = `translateX(${v}px)`; });
      put(tb, 'op', die.toFixed(3), (v) => { tb.el.style.opacity = v; });
      const size = w < 64 ? 'xs' : w < 110 ? 's' : '';
      put(tb, 'size', size, (v) => { tb.el.dataset.size = v; });
      if (size !== 'xs') {
        const [cut, ell] = ellipsize(tb, ww - TT_L - (size === 's' ? TT_R_S : TT_R));
        put(tb, 'cut', cut.toFixed(2), (v) => {
          tb.tt.style.transform = `translateX(${(v - TT_W).toFixed(2)}px)`;
          tb.tx.style.transform = `translateX(${(TT_W - v).toFixed(2)}px)`;
        });
        put(tb, 'ell', ell.toFixed(2), (v) => {
          tb.ell.style.opacity = ell < 0 ? '0' : '1';
          if (ell >= 0) tb.ell.style.transform = `translateX(${v}px)`;
        });
      }
      // the favicon sits where the sphere's tile k lifts from, then hands over
      put(tb, 'fl', (Math.min(12, (w - 16) / 2) - 12).toFixed(2), (v) => { tb.fav.style.transform = `translateX(${v}px)`; });
      put(tb, 'fo', (t < 0 ? 1 : 1 - seg(t, tb.lift, tb.lift + HS.LIFT_IN)).toFixed(3), (v) => { tb.fav.style.opacity = v; });
    }
    x += w;
  }
  newEl.style.transform = `translateX(${(x + 6).toFixed(2)}px)`;
  newEl.style.opacity = x + 34 < BW - 8 ? '1' : '0';
  // each new tab takes the page: the cuts come faster as the tabs do
  setPage(newest);
  if (open !== countN) { countN = open; countEl.textContent = `${open} tabs open`; }
  countEl.style.opacity = seg(tau, HW.COUNT_IN[0], HW.COUNT_IN[1]).toFixed(3);
}

// ---------- the headline ----------
let wordState = [], grad = null;
function measureOne() {
  if (!one || !one.offsetWidth) return null;
  const W = one.offsetWidth;
  const P = Math.max(260, W * 3);
  return { W, band: W * 0.55, P, V: P / HW.STORM_LOOP };
}
// the headline's font size: read in the stage's ResizeObserver below, where
// the layout is already fresh (a computed-style read every frame forced a
// style and layout pass mid-frame; one at mount forced the first layout).
// A word at rest (e 0) is invisible, so its rise needs no size yet.
let titleFs = 0;
function renderTitle(tau) {
  words.forEach((el, i) => {
    const a = T_TITLE + i * HW.WORD_GAP;
    const e = Math.round(outCubic(seg(tau, a, a + HW.WORD_DUR)) * 1000) / 1000;
    if (wordState[i] === e) return;
    wordState[i] = e;
    if (e > 0 && e < 1 && !titleFs) titleFs = parseFloat(getComputedStyle(title).fontSize) || 48;
    const fs = titleFs || 48;
    el.style.opacity = String(e);
    el.style.transform = e >= 1 ? '' : `translateY(${(HW.WORD_DY * fs * (1 - e)).toFixed(2)}px)`;
    el.style.filter = e >= 1 || e <= 0 ? '' : `blur(${(HW.WORD_BLUR * (1 - e)).toFixed(2)}px)`;
  });
  if (!cardOn) return;
  // the storm tile drifts left the whole time the card is up; the white band
  // sweeps "one" once, just after it lands
  if (!grad) grad = measureOne();
  if (!grad) return;
  const land = T_TITLE + words.indexOf(one) * HW.WORD_GAP + HW.WORD_DUR;
  const drift = ((tau * grad.V) % grad.P + grad.P) % grad.P;
  const f = inOutCubic(seg(tau, land + HW.SHINE_DELAY, land + HW.SHINE_DELAY + HW.SHINE_DUR));
  const sx = lerp(-grad.band, grad.W, f);
  one.style.backgroundSize = `${grad.band.toFixed(1)}px 100%, ${grad.P.toFixed(1)}px 100%`;
  one.style.backgroundPosition = `${sx.toFixed(1)}px 0, ${(-drift).toFixed(1)}px 0`;
}
new ResizeObserver(() => {
  grad = null;
  titleFs = title.isConnected ? parseFloat(getComputedStyle(title).fontSize) || 0 : 0;
}).observe(stage);

// the card's black: in over CARD_IN, held, out over CARD_OUT
let cardOn = false, cardOp = -1;
function renderCard(tau) {
  const op = tau < T_OUT ? outCubic(seg(tau, T_CARD, T_BLACK)) : 1 - inOutCubic(seg(tau, T_OUT, T_OUT + HW.CARD_OUT));
  const r = Math.round(op * 1000) / 1000;
  if (r === cardOp) return;
  cardOp = r;
  cardOn = r > 0;
  card.style.opacity = String(r);
  card.style.visibility = cardOn ? 'visible' : 'hidden';
}

// ---------- the chat beat: the composer is the beat's from CHAT on ----------
// Before CHAT the new chat is pristine (no caret: the beat raises it at its
// start). Crossing back over CHAT (a scrub, a replay) draws the beat's frame 0
// (every thread row hidden, the composer idle), drops the caret, and forgets
// the beat's cache, so its next frame writes everything afresh.
let chatOn = null; // null: unknown (mount, replay); false: pristine; true: the beat owns the composer
function renderChat(tau) {
  if (!chat) return;
  if (tau < T_CHAT) {
    if (chatOn === false) return;
    chatOn = false;
    chat.render(0);
    ui.setCaret(false);
    chat.reset();
    return;
  }
  chatOn = true;
  chat.render(tau - T_CHAT); // clamped to [0, DUR] by the module: settled from CHAT_END on
}

// ---------- one story time -> every write ----------
function render(tau) {
  sphere.render(sphereT(tau));
  renderBrowser(tau);
  renderCard(tau);
  renderTitle(tau);
  renderChat(tau);
  // the end card is pure of its own t (hidden below 0); at the hold it gets
  // exactly IN so its circle is live whatever the float sum of END came to
  end?.render(tau >= END ? END_IN : tau - T_ENDCARD);
}
function resetTitle() {
  wordState = [];
  cardOp = -1;
  one.style.backgroundPosition = '';
}

// ---------- the clock: held on frame one until the gate, then one rAF, hold at end ----------
let t0 = 0, started = false, paused = true, pausedAt = 0, visible = false, heldAt = 0;
// data-ws-hold: the host (the `wstop` arm) keeps the clock still until it calls
// freeze(false), so the frame it reveals is the one it opened on
let frozen = stage.hasAttribute('data-ws-hold');
function setPaused(v) {
  v = v || frozen || !started;
  if (v === paused) return;
  paused = v;
  if (v) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
}
const storyT = (now) => (started ? Math.min(((paused ? pausedAt : now) - t0) / 1000, END) : 0);
function tick(now) {
  requestAnimationFrame(tick);
  if (paused) return;
  const tau = storyT(now);
  if (tau >= END) {
    // held: the sphere stays perched, nothing left to write
    if (!heldAt) { heldAt = now; render(END); }
    return;
  }
  heldAt = 0;
  render(tau);
}
function start(from = 0) {
  if (started) return;
  started = true;
  paused = true;
  pausedAt = performance.now();
  t0 = pausedAt - from * 1000;
  setPaused(!visible || document.hidden);
}
// replay: the tabs come back, the sphere re-zeroes the hub, the clock
// restarts at once. Everything is put back and frame 0 drawn in this one
// task, so no in-between frame paints (the end card cuts straight to the tabs).
function restart() {
  if (ui) {
    ui.lanes.select('chat');
    ui.reset(); // removes every feed row after the greeting: the thread goes back in
    if (chat) { ui.feed.appendChild(chat.el); chat.reset(); }
  }
  chatOn = null;
  end?.reset();
  sphere.reset();
  resetTitle();
  activeK = -1; countN = -1; heldAt = 0;
  for (const tb of tabs) tb.st = {};
  started = false;
  render(FROM0);
  wire();
  start(FROM0);
}

// ---------- mount ----------
function mount() {
  const q = new URLSearchParams(location.search);
  ui = buildFrontend(stage.querySelector('#hub'));
  // the stage's figure label named the phone beat; this arm has none
  stage.setAttribute('aria-label', 'the apps you already use lift into a spinning sphere, collapse into the superbot tile, and it becomes the app, where one chat asks for a muse meme and gemini makes it');
  sphere.mount();
  // prepStage (inside mount) collapsed the transcript margin, so the hub is
  // wider than when buildFrontend scaled it: rescale, then let the sphere
  // measure the HUD at its real size (its landing slot is the scaled mark).
  // Any later rescale re-measures too, and the held frame is redrawn.
  if (ui) {
    ui.fit();
    sphere.layout(true);
    ui.onFit = () => { sphere.layout(true); render(window.__heroWorkspace?.t?.() ?? 0); };
  }
  sphere.root.querySelector('.hs-canvas').prepend(browser);
  stage.appendChild(card);
  // the chat's thread goes into the new chat's feed (after the greeting); the
  // end card over the whole stage, once per page (its mark's listeners stay)
  // createChat has drawn the beat's frame 0 on the pristine new chat (the
  // caret off since buildFrontend), so the beat is already what renderChat
  // would make it before CHAT: forget its cache (it measures afresh at
  // CHAT) and skip a second frame 0, which forced a layout at mount.
  if (ui) { chat = createChat(ui); chat.reset(); chatOn = false; }
  end = createEnd(stage, { onReplay: restart });
  stage.appendChild(end.el);
  // 193 taps on this stage read as dead in GA (2026-09-08..10-05): a tap on it
  // opens the join, the replay circle keeps its own tap
  // (mock-join.js: the stage holds a control, so it gets a hidden key)
  armMockJoin(stage, { section: 'hero', line: 'try superbot in the app.' });
  render(q.get('t') === null ? FROM0 : 0);
  const B = { ...BEATS, PRE, CARD: T_CARD, TITLE: T_TITLE, OUT: T_OUT, CHAT: T_CHAT, CHAT_END: T_CHAT_END, ENDCARD: T_ENDCARD, END };
  const freeze = (v) => { frozen = !!v; setPaused(!visible || document.hidden); };
  const api = { render, restart, freeze, started: () => started, B, ui, chat, end };
  if (q.get('t') !== null && q.get('play') !== '1') {
    // ?t= holds that second (no clock); the end card's circle still replays,
    // which wires the live clock in and plays from 0
    const tau = Math.max(0, Math.min(Number(q.get('t')) || 0, END));
    render(tau);
    window.__heroWorkspace = { ...api, t: () => (wired ? storyT(performance.now()) : tau) };
    return;
  }
  wire(Math.max(0, Math.min(Number(q.get('t') ?? FROM0) || 0, END)));
  window.__heroWorkspace = { ...api, t: () => storyT(performance.now()) };
}

// the live clock: #replay, the gate, visibility, the rAF. Once per page (a
// ?t= hold wires it on its first replay).
let wired = false;
function wire(from = 0) {
  if (wired) return;
  wired = true;
  wireReplay(restart);
  // the gate: frame one holds until enough of the stage is on screen (or the
  // stage fills most of the viewport); after that, off screen only pauses it
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    const enough = en.intersectionRatio >= HW.GATE_RATIO || en.intersectionRect.height >= innerHeight * HW.GATE_VIEW;
    if (!started && enough) start(from);
    setPaused(!visible || document.hidden);
  }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(!visible || document.hidden));
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
