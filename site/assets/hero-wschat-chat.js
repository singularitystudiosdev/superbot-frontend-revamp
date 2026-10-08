// hero-workspace-chat: the hero's chat beat. The visitor watches the first ask
// of the "every model, one chat" ad play inside the real app: `make me a muse
// meme` is typed into the composer and sent, superbot routes it to Gemini
// ("Switching to Gemini"), Gemini makes the image ("Creating image") and
// answers "Here’s your Muse meme." with the meme under it (scenes/tabs-assets/
// chat.js BASE[0] + beats/gemini.js). The thread then plays on through the
// ad's combo route: the DeepSeek scrape and the Superbot + DoorDash burger
// (hero-wschat-chat-more.js). No camera: it plays in place.
//
//   const chat = createChat(ui);   // ui: hero-wschat-frontend.js's contract
//   chat.render(t);                // t = seconds since the beat starts
//   chat.DUR;                      // the beat's length, the last ~1s a settled hold
//   chat.reset();                  // forget every cached write (a replay, a scrub back)
//   chat.el;                       // the thread node appended into ui.feed
//   chat.T;                        // the beat's internal timings (read-only)
//
// render(t) is a pure function of t: clamped to [0, DUR], idempotent, cheap
// (every DOM write is cached and only made when its value changes), and
// scrubbable out of order. The composer is driven only through the ui setters
// (setDraft / setCaret / setSendArmed / setNewChat / setTitle); the one direct
// write outside this module's own nodes is the send button's press scale
// (main's `active: scale .96`), restored to '' outside the press.
//
// The sent ask is the one row that moves on entering, as the apps' Rise preset
// (their default motion; packages/core/src/motion/feel.ts, send.kind 'rise',
// 450 ms): no flight from the composer, no measured geometry. The row, mounted
// at the send beat, fades up IN PLACE over K.SEND_RISE, opacity from 0 and
// translateY from 8px (--spacing-8) to rest on --ease-standard, written from t
// through the same enter() the assistant row's landing uses and restored to ''
// before the send and once the rise is done, so a scrub either way draws the
// same frame. The later asks (hero-wschat-chat-more.js) rise the same way: their
// rows are laid out from the start at opacity 0 and enter() is handed down to
// them as sendRise, so the length, the travel and the bezier have one source. The
// date divider draws at once.
//
// Anatomy is desktop MAIN's thread (apps/desktop/src/renderer/src/hub/
// Thread.tsx, packages/ui message-row.tsx / provider-switch/*, sonar-trace.css),
// read off the live capture .tmp/hero-ref.7580bba1/main/dom/thread-streaming.json:
//   date divider (a "Today" pill) . user row (bubble variant: right, raised, radius 16, no
//   avatar) . assistant row (prose variant, no avatar) holding, while live,
//   the thought bubble (the apps' live thinking step, Spotlight look: a raised,
//   rounded bubble holding the status label and its clock, under it the thought
//   streaming in a three-line window whose top line fades as new lines arrive,
//   the newest words fading in; the sonar trace's out / model figures and lanes
//   are not drawn, owner 2026-09-27) and the live provider switch
//   (pill "Switching to Gemini" -> check + "Switched to Gemini", the nested
//   who header "Gemini · in superbot" on its guide rail, the square generating
//   placeholder "Creating image" under its band); settled, the switch fence
//   card (pill + who), the answer line, the image card. The placeholder and
//   the image card are ONE slot: at the settle the thinking line folds, the
//   answer line opens and the square resolves into the picture's box in place.
//   The thought is not dropped at the settle: the bubble folds into the
//   one muted activity line "Thought 3s" (the apps' One line reply: the
//   thought and, when the turn searched, " · Searched N sites" share one line
//   with one trailing chevron, no opening line), which stays above the switch
//   card and the reply. This scene opens no page, so it reads the thought alone.
//   The reply ends in ONE muted footer caption, the turn's outcome "12s · 5 steps"
//   (hub/ReplyFooter.tsx, agent-status.ts outcomeFooterWords: the duration, then
//   the step count from two steps; no "Worked for"), which opens with the settle.
// Scroll is main's feed at its default, the bottom pin: from the send on the
// view follows the newest content (see target()), and the image cap
// (--size-image-max, 360) is taken at the hero's box so the settled hold shows
// the answer line and the whole picture (see measure()).
// Sizes are main's own CSS px (the 1200px-wide design box the hero scales once).
// Motion rides main's tokens (packages/tokens/tokens/motion.tokens.json), and
// main's switch tokens were themselves cut from this ad's chat.js, so the two
// agree. Motion is unconditional: no reduced-motion guard (project rule).

import { planMore, mountMore } from './hero-wschat-chat-more.js?v=4';

const ASK = 'make me a muse meme';
const SAY = 'Here’s your Muse meme.';
const VENDOR = 'Gemini';
const SWITCHING = `Switching to ${VENDOR}`; // provider-switch.ts:390-399 switchPillLabel
const SWITCHED = `Switched to ${VENDOR}`;
const THINK = 'Working on a muse meme';
// the mascot's thought for this turn, streamed into the bubble word by word
const THOUGHT = 'A meme about Muse, so this wants a picture, and Gemini draws these best. '
  + 'The passed note in a lecture hall fits the joke: Muse slips a note over with a grin, '
  + 'the note says you have 40 unread notifications from Muse, and the last panel is the long stare back. '
  + 'Keep the words on the note big enough to read at a glance, put a red badge on the bell, '
  + 'and let the stare land the punchline.';
const WORDS = THOUGHT.split(' ');

const asset = (f) => new URL('./hero-chat/' + f, import.meta.url).href;
const MEME = { src: asset('muse-meme.webp'), w: 870, h: 1024 };
const TILE = asset('google-tile.webp'); // packages/ui/src/marks/tiles/google.png, main's Gemini tile

// ---- timings (s) ------------------------------------------------------------
const K = {
  TYPE_AT: 0.25,       // the caret shows alone first
  KEY: 0.02,           // one key every 20ms, flat (owner, 2026-09-27)
  SEND_AFTER: 0.15,    // armed send held before the press
  PRESS: 0.18,         // send press, main's active scale .96
  SEND_RISE: 0.45,     // the sent ask's fade up in place: Rise's send (feel.ts rise.send.durationMs 450), --ease-standard
  COLLAPSE: 0.4,       // new-chat tail collapse: --duration-400, emphasized-decelerate
  ROW_AFTER: 0.3,      // superbot's row after the send
  SW_AFTER: 0.45,      // the switch pill after the row
  SPIN_MIN: 0.65,      // SWITCH_MIN_SPIN_MS (provider-switch.ts:129)
  LIVE_FOR: 1.7,       // generating held (e2e referent: live 1500ms)
  SAY_CPS: 70,         // the ad's streamCount(SAY, .., 70)
  SETTLE: 0.4,         // the settle handoff (thinking line folds, answer line opens, the
                       // placeholder resolves into the image): --duration-400, --ease-standard
                       // (a size change; emphasized-decelerate's first frame was a 13px step)
  ENTER: 0.2,          // feed-enter 200ms emphasized-decelerate, 4px
  RISE: 0.42,          // sb-switch-rise 420ms out-cubic, 10px
  TILE: 0.4, TILE_DELAY: 0.05,
  CHECK: 0.3, SPIN_FADE: 0.14,
  SHIMMER: 1.4,        // label sweep and generating band, linear loop
  GLIDE: 0.42,         // the thread's bottom pin gliding to new content
  PIN_GLIDE: 0.9,      // a long follow (a tall part landing at once), on an in-out curve
  MEME_HOLD: 0.5,      // the settled muse meme turn, before the next ask starts typing
  HOLD: 0.6,           // settled hold at the end
  THINK_IN: 0.15,      // the thought's first word, after the row lands
  THINK_END: 0.25,     // the thought's last word, this long before the settle
  WORD_IN: 0.24,       // a new word's fade in
  LINE_GLIDE: 0.2,     // the window rising one line when a new line starts
};
const TB_LINES = 3;    // the thought window's lines (the apps show 6; the hero's box takes 3)
const TB_LH = 19;      // the thought's line pitch, .hwc-tb-text 13/19
const SEND_DY = 8;     // the sent ask's rise, --spacing-8 (the apps' send fade starts 8px low)

// ---- math -------------------------------------------------------------------
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const outCubic = (p) => 1 - Math.pow(1 - p, 3);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s, Y = (s) => ((ay * s + by) * s + cy) * s;
  const dX = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) { const e = X(s) - x; const d = dX(s); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; s -= e / d; }
    let lo = 0, hi = 1;
    if (Math.abs(X(s) - x) > 1e-5) { s = x; for (let i = 0; i < 24; i++) { if (X(s) < x) lo = s; else hi = s; s = (lo + hi) / 2; } }
    return Y(s);
  };
}
const emphDecel = bezier(0.05, 0.7, 0.1, 1);  // --ease-emphasized-decelerate
const standard = bezier(0.2, 0, 0, 1);        // --ease-standard
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const frac = (x) => x - Math.floor(x);
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---- the timeline ------------------------------------------------------------
// char i of the ask lands at KEYS[i], one every K.KEY
const KEYS = (() => {
  const out = []; let at = K.TYPE_AT;
  for (let i = 0; i < ASK.length; i++) {
    out.push(r3(at));
    at += K.KEY;
  }
  return out;
})();
const T = {};
T.typeEnd = KEYS[KEYS.length - 1];
T.send = r3(T.typeEnd + K.SEND_AFTER);
T.row = r3(T.send + K.ROW_AFTER);
T.sw = r3(T.row + K.SW_AFTER);
T.live = r3(T.sw + K.SPIN_MIN);
T.done = r3(T.live + K.LIVE_FOR);
T.sayEnd = r3(T.done + 0.06 + SAY.length / K.SAY_CPS);
T.img = T.done;                                  // the placeholder starts resolving into the image
T.settled = r3(Math.max(T.sayEnd, T.done + K.SETTLE));
const MORE = planMore(r3(T.settled + K.MEME_HOLD));  // the ad's later asks, played on
T.more = MORE.start;
const DUR = r3(MORE.end + K.HOLD);
T.thought = r3(T.done - T.row);                  // the thought's length, for the activity line
Object.freeze(T);
// word i of the thought shows at WORD_AT[i], evenly over the live turn
const WORD_AT = (() => {
  const a = T.row + K.THINK_IN, b = T.done - K.THINK_END, step = (b - a) / Math.max(1, WORDS.length - 1);
  return WORDS.map((_, i) => r3(a + i * step));
})();
const ACTIVITY = `Thought ${Math.max(1, Math.round(T.thought))}s`;   // the settled activity line (no search in this scene)

// the composer across every ask: what is typed when, when a turn is live, which model the chip names
const ASKS = [{ ask: ASK, keys: KEYS, from: 0, send: T.send }, ...MORE.turns.map((u) => ({ ask: u.ask, keys: u.keys, from: u.s, send: u.send }))];
const BUSY = [[T.send, T.done], ...MORE.turns.map((u) => [u.send, u.busyEnd])];
const MODELS = [[T.live, r3(T.done + 0.3), { name: VENDOR, tile: TILE }], ...MORE.models];
const SWAPS = MODELS.flatMap(([a, b]) => [a, b]);

// structure changes, in order: each can change the thread's height (the glide)
const EVENTS = [T.send, T.row, T.sw, T.live, T.done];
const stage = (t) => { let k = 0; while (k < EVENTS.length && t >= EVENTS[k]) k++; return k; };

// ---- markup -------------------------------------------------------------------
const SVG = (cls, d, vb = '0 0 24 24') => `<svg class="${cls}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SPIN = SVG('hwc-spin', '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>');     // lucide LoaderCircle
const CHECK = SVG('hwc-check', '<path d="M20 6 9 17l-5-5"/>');              // lucide Check
const CHEV = `<svg class="hwc-thought-check" style="margin-inline:4px 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;   // the activity line's one chevron (lucide ChevronRight)
const tile = (cls) => `<img class="${cls}" src="${TILE}" width="128" height="128" alt="" draggable="false" decoding="async"/>`;

// the date divider reads "Today" (fixture thread.date; the app's divider names a same-day
// thread so), not a month and day; the footer caption is fixture thread.outcome ('&#183;' is
// its middle dot, the app's own separator between the duration and the step count)
const DATE = 'Today';
const OUTCOME = '12s &#183; 5 steps';

function markup() {
  return `
<div class="hwc-in">
  <div class="hwc-b hwc-date" role="separator"><span class="hwc-date-line"></span><span class="hwc-date-chip">${DATE}</span><span class="hwc-date-line"></span></div>
  <div class="hwc-b hwc-row hwc-user" data-variant="bubble"><span class="hwc-bubble"><p class="hwc-p">${ASK}</p></span></div>
  <div class="hwc-b hwc-row hwc-bot" data-variant="prose"><div class="hwc-prose">
    <div class="hwc-think" role="status">
      <div class="hwc-tb">
        <div class="hwc-tb-head"><span class="hwc-sonar-label">${THINK}</span><span class="hwc-tb-sep"> · </span><span class="hwc-tb-clock">0s</span></div>
        <div class="hwc-tb-win"><p class="hwc-tb-text">${WORDS.map((w) => `<span class="hwc-w">${w} </span>`).join('')}</p></div>
      </div>
      <div class="hwc-thought"><span class="hwc-thought-open">${ACTIVITY}</span>${CHEV}</div>
    </div>
    <div class="hwc-sw">
      <span class="hwc-pill">${tile('hwc-pill-tile')}<span class="hwc-pill-label"><span class="hwc-sweep"><span class="hwc-mask"><span class="hwc-ink"></span></span></span></span><span class="hwc-status">${SPIN}${CHECK}</span></span>
      <div class="hwc-nest"><div class="hwc-who">${tile('hwc-who-tile')}<span class="hwc-who-name">${VENDOR}</span><span class="hwc-who-sub">in superbot</span></div></div>
    </div>
    <p class="hwc-say"><span class="hwc-say-vis"></span><span class="hwc-caret"></span><span class="hwc-say-hid">${SAY}</span></p>
    <div class="hwc-slot"><img class="hwc-img" src="${MEME.src}" width="${MEME.w}" height="${MEME.h}" alt="Muse meme" loading="eager" decoding="sync" draggable="false"/><div class="hwc-gen" role="status"><span class="hwc-gen-band"><span class="hwc-gen-sheen"></span></span><span class="hwc-gen-chip">${tile('hwc-gen-tile')}<span>Creating image</span></span></div></div>
    <span class="hwc-cap">${OUTCOME}</span>
  </div></div>
  <div class="hwc-more"></div>
</div>`;
}

// ---- the beat -------------------------------------------------------------------
export function createChat(ui) {
  const el = document.createElement('div');
  el.className = 'hwc';
  el.innerHTML = markup();
  ui.feed.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const n = {
    inner: $('.hwc-in'), date: $('.hwc-date'), user: $('.hwc-user'), bot: $('.hwc-bot'),
    think: $('.hwc-think'), tb: $('.hwc-tb'), tbClock: $('.hwc-tb-clock'), tbText: $('.hwc-tb-text'),
    words: [...el.querySelectorAll('.hwc-w')], thought: $('.hwc-thought'),
    sw: $('.hwc-sw'), pill: $('.hwc-pill'), pillTile: $('.hwc-pill-tile'), sweep: $('.hwc-sweep'), ink: $('.hwc-ink'),
    spin: $('.hwc-spin'), check: $('.hwc-check'),
    nest: $('.hwc-nest'), prose: $('.hwc-prose'),
    say: $('.hwc-say'), sayVis: $('.hwc-say-vis'), sayHid: $('.hwc-say-hid'), caret: $('.hwc-caret'),
    slot: $('.hwc-slot'), img: $('.hwc-img'), gen: $('.hwc-gen'), sheen: $('.hwc-gen-sheen'), cap: $('.hwc-cap'),
    more: $('.hwc-more'),
  };
  // The meme is fetched and decoded now, seconds before it shows: it sits laid
  // out and painted in its slot under the opaque placeholder from the moment the
  // slot mounts, so its first visible frame is the picture, never a pop.
  if (n.img.decode) n.img.decode().catch(() => {});

  // every write goes through here: made only when the value changed
  let memo = new Map();
  const put = (node, key, val, fn) => {
    let m = memo.get(node); if (!m) { m = {}; memo.set(node, m); }
    if (m[key] === val) return; m[key] = val; fn(val);
  };
  const setStyle = (node, prop, v) => { if (prop[1] === '-') node.style.setProperty(prop, v); else node.style[prop] = v; };
  const css = (node, prop, val) => put(node, prop, val, (v) => setStyle(node, prop, v));
  const attr = (node, a, val) => put(node, '@' + a, val, (v) => { if (v === null) node.removeAttribute(a); else node.setAttribute(a, v); });
  const text = (node, val) => put(node, '#text', val, (v) => { node.textContent = v; });
  const show = (node, on) => css(node, 'display', on ? '' : 'none');
  const enter = (node, t, at, dur, dy, ease) => {         // opacity + rise, 'none' at rest
    const p = ease(seg(t, at, at + dur));
    css(node, 'opacity', p >= 1 ? '' : p.toFixed(3));
    css(node, 'transform', p >= 1 ? '' : `translateY(${((1 - p) * dy).toFixed(2)}px)`);
  };
  let last = {};
  const call = (key, val, fn) => { if (last[key] === val) return; last[key] = val; fn(val); };
  // the later asks fade up the same way the first does (K.SEND_RISE, SEND_DY, the standard ease): one writer, handed down
  const sendRise = (node, t, at) => enter(node, t, at, K.SEND_RISE, SEND_DY, standard);
  const more = mountMore(n.more, MORE, { css, text, attr, sendRise });

  // ---- geometry, measured once per thread box (width x height) and after fonts
  // The image budget: main caps an inline image at --size-image-max (360;
  // packages/ui styles.css:908 .sb-image, and the generating square's
  // max-w-(--size-image-max), provider-switch.tsx:239) "so a picture never
  // takes the whole feed". Main's own feed is taller than the hero's box, so
  // the same cap is taken at the hero's box: the most that lets the answer
  // line and the whole picture sit under the feed's top fade once the bottom
  // pin holds the picture's end at the view's end, never more than 360. When
  // the box allows it the whole turn from the ask down fits (capAt's `rest`),
  // so the settled hold shows the ask as well.
  const px = (v) => `${Math.round(v * 100) / 100}px`;
  const GAP = 8;         // markdown gap-8: answer line under the who, the picture under the answer
  const FADE = 24;       // .hub-feed's top scroll-edge fade, --spacing-24 (hub-chat.css:118-124)
  let G = null;          // { w, V, D, IW, IH, hThink, hRow, hSay, hCap, wl[], H[] }
  const blank = { D: 360, IW: 306, IH: 360, hThink: 0, hRow: 19, hSay: 28, hCap: 16, wl: null };

  // the structure at stage k (which blocks draw, which label the pill reads,
  // the settle's sizes at progress p): the one layout-changing part of a
  // frame, also run by the measure pass. Every key here is written on every
  // frame, so the measure pass's writes are always overwritten or restored.
  const structure = (k, p, g) => {
    const settling = k >= 5 && p < 1;
    show(n.date, k >= 1); show(n.user, k >= 1); show(n.bot, k >= 2);
    // the thought bubble while live; over the settle it folds into its step
    // line (the two share one grid cell, the box closing from the bubble's
    // height to the line's), and the line stays
    show(n.think, k >= 2);
    show(n.tb, k < 5 || settling);
    show(n.thought, k >= 5);   // the activity line
    css(n.think, 'height', settling ? px(lerp(g.hThink, g.hRow, p)) : '');
    css(n.think, 'overflow', settling ? 'hidden' : '');
    show(n.sw, k >= 3);
    attr(n.sw, 'data-head', k >= 2 ? 'think' : null);       // mt-8 under the bubble, then under its row
    attr(n.pill, 'data-check', k >= 4 ? 'true' : null);
    text(n.ink, k >= 4 ? SWITCHED : SWITCHING);
    show(n.nest, k >= 4);
    // the answer line opens between the who and the picture
    show(n.say, k >= 5);
    css(n.say, 'height', settling ? px(g.hSay * p) : '');
    css(n.say, 'margin-top', settling ? px(GAP * p) : '');
    css(n.say, 'overflow', settling ? 'hidden' : '');
    // the footer caption opens under the picture on the same progress, so the column's height
    // is one continuous lerp (H[4] to H[5]) and the settle never takes a step from it
    show(n.cap, k >= 5);
    css(n.cap, 'height', settling ? px(g.hCap * p) : '');
    css(n.cap, 'margin-top', settling ? px(GAP * p) : '');
    css(n.cap, 'overflow', settling ? 'hidden' : '');
    css(n.cap, 'opacity', settling ? p.toFixed(3) : '');
    // one slot: the generating square, resolving in place into the picture's box
    show(n.slot, k >= 4);
    const q = k >= 5 ? p : 0;
    css(n.slot, 'width', px(lerp(g.D, g.IW, q)));
    css(n.slot, 'height', px(lerp(g.D, g.IH, q)));
  };

  // The box (the column's width w, the thread's height V) comes from a
  // ResizeObserver, never from a read in a frame: a per-frame clientWidth /
  // clientHeight read after the composer's writes forced a layout every frame
  // of the beat. The observer is delivered after the frame's layout and before
  // its paint, so when the box moved (the new chat collapsing, a draft
  // wrapping, a resize) it redraws the same t at the real box, and the frame
  // that paints is the one a read would have drawn.
  let boxW = 0, boxV = 0, lastT = null;
  new ResizeObserver(() => {
    const w = n.inner.clientWidth, V = el.clientHeight;   // fresh: the layout just ran
    if (w === boxW && V === boxV) return;
    boxW = w; boxV = V;
    if (lastT !== null) render(lastT);
  }).observe(el);

  // A measure pass lays the turn out at the stages it needs, reads, then puts
  // every cached write back, so the memo stays true.
  const measuring = (fn) => {
    const saved = memo; memo = new Map();                  // measure with fresh writes, then restore
    css(n.more, 'display', 'none');                        // turn 1 alone (the later asks sit below it)
    fn();
    memo = saved;
    for (const [node, m] of memo) for (const key in m) {
      const v = m[key];
      if (key === '#text') node.textContent = v;
      else if (key[0] === '@') { if (v === null) node.removeAttribute(key.slice(1)); else node.setAttribute(key.slice(1), v); }
      else setStyle(node, key, v);
    }
  };
  // The turn's geometry splits by what it depends on. GA hangs on the width
  // alone (measured once per width, and after fonts): the column, the answer
  // line, the thinking line and the column's height up to the switch. GB hangs on the picture's cap, the only thing the thread's height
  // moves: the square, the picture's box and the column's height with them.
  // So the collapse (the height moving every frame) measures nothing, and GB
  // is measured once the height has settled, or again only if the cap moves.
  let GA = null, GB = null;
  const measureA = (w) => {
    // (offsets are layout px, untouched by the column's transform or the hero's scale)
    const g = { ...blank, w };
    measuring(() => {
      // 1. the settled turn at the blank cap: what sits between the answer line's top and the column's end
      structure(5, 1, g);
      g.colW = n.prose.clientWidth;
      const sayTop = n.bot.offsetTop + n.say.offsetTop;
      g.hSay = n.say.offsetHeight;
      g.hCap = n.cap.offsetHeight;
      g.need = n.inner.offsetHeight - sayTop - n.slot.offsetHeight; // answer line + gap + the row's own padding below
      // the whole turn but the picture, from the ask (just under the fade) down: the switch, the who, the answer
      g.rest = n.inner.offsetHeight - (n.user.offsetTop - FADE) - n.slot.offsetHeight;
      g.hRow = n.think.offsetHeight;                          // the thought's step row, settled
      // 2. the bubble's own height, for its fold, and the line each word of the
      // thought sits on (ranked by its top, so the hero's zoom never matters)
      structure(4, 0, g);
      g.hThink = n.think.offsetHeight;
      const tops = n.words.map((w) => w.offsetTop);
      const rows = [...new Set(tops)].sort((a, b) => a - b);
      g.wl = tops.map((y) => rows.indexOf(y));
      // 3. the column's height at every stage before the square (the bottom pin follows it)
      g.H = [];
      for (let k = 0; k < 4; k++) { structure(k, 0, g); g.H[k] = n.inner.offsetHeight; }
    });
    GA = g; GB = null;
  };
  // the slot's outer height budget at a thread height V: the whole turn when
  // the picture can still be a real picture, else the answer line and the picture alone
  const capAt = (a, V) => {
    const whole = V - a.rest;
    return whole >= 140 ? Math.min(360, whole) : Math.max(48, Math.min(360, V - FADE - a.need));
  };
  const measureB = (a, cap) => {
    const g = { ...a };
    g.D = Math.min(a.colW, cap);                                      // the square, border included
    const b = 2;                                                      // the card's two hairlines
    let ih = cap - b, iw = ih * MEME.w / MEME.h;
    if (iw + b > a.colW) { iw = a.colW - b; ih = iw * MEME.h / MEME.w; }
    g.IW = iw + b; g.IH = ih + b;
    const H = [];
    measuring(() => {
      for (let k = 4; k <= EVENTS.length; k++) { structure(k, k >= 5 ? 1 : 0, g); H[k] = n.inner.offsetHeight; }
    });
    GB = { cap, D: g.D, IW: g.IW, IH: g.IH, H4: H[4], H5: H[5] };
  };
  // G for this frame's box; the square's part only when the frame can show it
  // (k >= 4), so no height the collapse passes through is ever measured
  const measure = (k) => {
    const w = boxW, V = boxV;
    if (!w || !V) { G = null; return; }                    // the thread is not drawn yet (new chat)
    const cap = GA && GA.w === w ? capAt(GA, V) : 0;
    if (!GA || GA.w !== w) { measureA(w); measureB(GA, capAt(GA, V)); }   // a new width: both, once
    else if (k >= 4 && (!GB || GB.cap !== cap)) measureB(GA, cap);
    const B = GB || { D: blank.D, IW: blank.IW, IH: blank.IH };
    if (G && G.w === w && G.V === V && G.B === GB && G.A0 === GA) return;
    const H = GA.H.slice();
    if (GB) { H[4] = GB.H4; H[5] = GB.H5; }
    G = { w, V, D: B.D, IW: B.IW, IH: B.IH, hThink: GA.hThink, hRow: GA.hRow, hSay: GA.hSay, hCap: GA.hCap, wl: GA.wl, H, B: GB, A0: GA };
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { GA = null; GB = null; G = null; });

  function renderComposer(t) {
    // the ask being typed (each ask's caret shows alone first, then human-cadence keys)
    const cur = ASKS.find((a) => t >= a.from && t < a.send);
    const typed = cur ? cur.keys.filter((k) => t >= k).length : 0;
    call('draft', cur ? cur.ask.slice(0, typed) : '', (v) => ui.setDraft(v));
    call('caret', !!cur, (v) => ui.setCaret(v));
    call('armed', typed > 0, (v) => ui.setSendArmed(v));
    const nc = 1 - emphDecel(seg(t, T.send, T.send + K.COLLAPSE));
    call('newChat', r3(nc), (v) => ui.setNewChat(v));
    call('title', t >= T.send ? ASK : 'New chat', (v) => ui.setTitle(v));
    //   ui.setSending(on)          a turn is live: send reads as main's stop square, the
    //                              placeholder "Queues until this turn ends", SUPER dims
    //   ui.setModel(m)             the composer model chip: the routed model's { name, tile }
    //                              while its switch holds, null = superbot
    //   ui.setModelFx(opacity, s)  that chip's dip (to .15 over 140ms, the swap at the bottom)
    //                              and pop (1.08 -> 1 over 400ms out-cubic), pure of t
    call('sending', BUSY.some(([a, b]) => t >= a && t < b), (v) => ui.setSending?.(v));
    const on = MODELS.find(([a, b]) => t >= a && t < b);
    const m = on ? on[2] : null;
    call('model', m && typeof m === 'object' ? m.name : m || '', () => ui.setModel?.(m));
    const at = SWAPS.reduce((best, s) => (Math.abs(t - s) < Math.abs(t - best) ? s : best), SWAPS[0]);
    const mo = t < at ? 1 - 0.85 * seg(t, at - 0.14, at) : 1 - 0.85 * (1 - seg(t, at, at + 0.14));
    const ms = t < at ? 1 : lerp(1.08, 1, outCubic(seg(t, at, at + 0.4)));
    call('modelFx', `${r3(mo)}|${r3(ms)}`, () => ui.setModelFx?.(r3(mo), r3(ms)));
    if (ui.send) {
      const sendAt = ASKS.reduce((best, x) => (Math.abs(t - x.send) < Math.abs(t - best) ? x.send : best), T.send);
      const a = sendAt - K.PRESS * 0.45, b = sendAt + K.PRESS * 0.55;
      const p = seg(t, a, b);
      const s = p <= 0 || p >= 1 ? '' : `scale(${(1 - 0.04 * Math.sin(Math.PI * p)).toFixed(4)})`;
      css(ui.send, 'transform', s);
    }
  }

  function renderSwitch(t, k, p) {
    const settled = k >= 5;                                 // the fence card: drawn at rest
    if (settled) { css(n.pill, 'opacity', ''); css(n.pill, 'transform', ''); css(n.pillTile, 'transform', ''); }
    else {
      enter(n.pill, t, T.sw, K.RISE, 10, outCubic);
      const tp = outBack(seg(t, T.sw + K.TILE_DELAY, T.sw + K.TILE_DELAY + K.TILE));
      css(n.pillTile, 'transform', tp >= 1 ? '' : `scale(${lerp(0.5, 1, tp).toFixed(4)}) rotate(${((1 - tp) * -25).toFixed(2)}deg)`);
    }
    // the label's travelling mask while it reads the switching line
    const sp = k === 3 ? frac((t - T.sw) / K.SHIMMER) : 0;
    css(n.sweep, 'transform', k === 3 ? `translateX(${(150 * sp).toFixed(2)}%)` : '');
    css(n.ink, 'transform', k === 3 ? `translateX(${(-150 * sp).toFixed(2)}%)` : '');
    // spinner turns, fades at the check; the check pops (out-back from .3)
    css(n.spin, 'transform', k === 3 ? `rotate(${(((t - T.sw) * 360) % 360).toFixed(1)}deg)` : '');
    css(n.spin, 'opacity', k === 3 ? '1' : (settled ? '0' : (1 - seg(t, T.live, T.live + K.SPIN_FADE)).toFixed(3)));
    const cp = settled ? 1 : seg(t, T.live, T.live + K.CHECK);
    css(n.check, 'opacity', k < 4 ? '0' : (cp >= 1 ? '1' : cp.toFixed(3)));
    css(n.check, 'transform', k < 4 || cp >= 1 ? '' : `scale(${lerp(0.3, 1, outBack(cp)).toFixed(4)})`);
    // the who header and the generating square rise in with the switch's entrance
    if (settled) { css(n.nest, 'opacity', ''); css(n.nest, 'transform', ''); css(n.slot, 'opacity', ''); css(n.slot, 'transform', ''); }
    else { enter(n.nest, t, T.live, K.RISE, 10, outCubic); enter(n.slot, t, T.live, K.RISE, 10, outCubic); }
    // the placeholder's band sweeps until the picture has taken its place;
    // the placeholder (opaque, over the already painted picture) fades off it
    const gone = settled && p >= 1;
    const bp = k >= 4 && !gone ? frac((t - T.live) / K.SHIMMER) : 0;
    css(n.sheen, 'transform', `translateX(${(-60 * (1 - bp)).toFixed(2)}%)`);
    const go = settled ? emphDecel(seg(t, T.img, T.img + K.ENTER)) : 0;
    css(n.gen, 'opacity', go <= 0 ? '' : (go >= 1 ? '0' : (1 - go).toFixed(3)));
    css(n.gen, 'visibility', go >= 1 ? 'hidden' : '');
    // the bubble fades as it folds; its activity line fades in in its place
    const tf = settled ? emphDecel(seg(t, T.done, T.done + K.ENTER)) : 0;
    css(n.tb, 'opacity', tf <= 0 ? '' : (1 - tf).toFixed(3));
    const rf = settled ? emphDecel(seg(t, T.done + 0.06, T.done + 0.06 + K.ENTER)) : 0;
    css(n.thought, 'opacity', rf >= 1 ? '' : rf.toFixed(3));
  }

  // The live thought (the apps' Spotlight look): the clock counts from the
  // row, the words arrive on WORD_AT and each fades in, and once a line past
  // the window starts the text glides up one line, the top line fading as it
  // goes. Transform and opacity only; the window's box never moves.
  function renderThought(t, g) {
    text(n.tbClock, `${Math.max(0, Math.floor(Math.min(t, T.done) - T.row))}s`);
    const wl = g.wl;
    let u = 0;                                               // the window's scroll, in lines
    if (wl) {
      const last = wl[wl.length - 1];
      for (let l = TB_LINES; l <= last; l++) {
        const a = WORD_AT[wl.indexOf(l)];
        if (t < a) break;
        u += standard(seg(t, a, a + K.LINE_GLIDE));
      }
    }
    css(n.tbText, 'transform', u <= 0 ? '' : `translateY(${(-u * TB_LH).toFixed(2)}px)`);
    const over = Math.min(1, u);                             // the top line's fade arrives with the first overflow
    for (let i = 0; i < n.words.length; i++) {
      const o = seg(t, WORD_AT[i], WORD_AT[i] + K.WORD_IN);
      const pos = (wl ? wl[i] : 0) - u;                       // the word's line within the window
      const m = pos >= 1 ? 1 : 1 - (1 - lerp(0.4, 1, clamp01(pos))) * over;
      const v = o * m;
      css(n.words[i], 'opacity', v >= 1 ? '' : v.toFixed(3));
    }
  }

  function renderAnswer(t) {
    const c = Math.max(0, Math.min(SAY.length, Math.floor((t - (T.done + 0.06)) * K.SAY_CPS + 1e-6)));
    text(n.sayVis, SAY.slice(0, c)); text(n.sayHid, SAY.slice(c));
    // main's typing caret rides the streamed text only while it streams: caret-pulse 1000ms standard
    const streaming = t >= T.done && c < SAY.length;
    show(n.caret, streaming);
    css(n.caret, 'opacity', streaming ? (1 - 0.8 * Math.sin(Math.PI * frac((t - T.done) / 1.0))).toFixed(3) : '');
  }

  // The scroll, as main's feed runs it by default (the bottom pin,
  // use-stick-to-bottom.ts; "Start replies at the top" is off): the send
  // leaves the view at the bottom pin, and from then on the view follows the
  // newest content, so while the thread is shorter than the viewport nothing
  // moves and once it is taller the newest row sits at the view's end. Main
  // jumps there in one scrollTo; here each row that lands glides the column
  // over K.GLIDE, and the settle, whose sizes all move on one progress,
  // scrolls with them exactly (the picture's bottom holds still at the end).
  const target = (g, k, p) => {
    if (k === 0) k = 1;                                     // nothing drawn yet: rest where the send will put it
    const h = k >= 5 ? lerp(g.H[4], g.H[5], p) : g.H[k];
    return Math.max(0, h - g.V);
  };

  // The later asks' scroll, measured once per box with every one of their
  // nodes laid out: the bottom pin follows each part that lands, the sent ask
  // included (use-stick-to-bottom.ts), and never scrolls back up. Each mark
  // glides the column from wherever the previous one left it, so the scroll
  // is one continuous curve.
  let M = null;
  const topIn = (node) => { let y = 0, x = node; while (x && x !== n.inner) { y += x.offsetTop; x = x.offsetParent; } return y; };
  const measureMore = () => {
    if (!G) { M = null; return; }
    if (M && M.w === G.w && M.V === G.V) return;
    const padB = parseFloat(getComputedStyle(n.inner).paddingBottom) || 0;
    let prev = target(G, 5, 1);
    const marks = more.marks.map(([a, node]) => {
      const tg = Math.max(prev, topIn(node) + node.offsetHeight + padB - G.V);
      // a long follow (the order card landing whole) takes longer, on an in-out curve
      const dist = Math.abs(tg - prev), far = dist > 160;
      prev = tg;
      return [a, tg, far ? Math.min(K.PIN_GLIDE, Math.max(K.GLIDE, dist / 600)) : K.GLIDE, far ? inOut : standard];
    });
    M = { w: G.w, V: G.V, S1: target(G, 5, 1), marks };
  };

  function render(tIn) {
    const t = Math.min(DUR, Math.max(0, Number.isFinite(tIn) ? tIn : 0));
    lastT = t;
    renderComposer(t);
    const later = t >= MORE.start;
    css(n.more, 'display', later ? '' : 'none');
    const k = stage(t);
    measure(k);
    const g = G || blank;
    const p = k >= 5 ? standard(seg(t, T.done, T.done + K.SETTLE)) : 0;
    structure(k, p, g);
    let s = 0;
    if (G && later) {
      measureMore();
      s = M.S1;
      for (const [a, tg, d, ease] of M.marks) { if (t <= a) break; s = lerp(s, tg, ease(seg(t, a, a + d))); }
    } else if (G) {
      s = target(G, k, p);
      // rows that landed at the row, switch and live events glide in (send has
      // nothing to glide: the ask lands in place; the settle is continuous)
      for (let i = 1; i <= 3; i++) {
        if (t < EVENTS[i]) break;
        s += (target(G, i, 0) - target(G, i + 1, 0)) * (1 - standard(seg(t, EVENTS[i], EVENTS[i] + K.GLIDE)));
      }
    }
    css(n.inner, 'transform', Math.abs(s) < 0.05 ? '' : `translateY(${(-s).toFixed(2)}px)`);
    // the sent ask fades up in place from the send beat (Rise: opacity + translateY(8px) to rest over
    // K.SEND_RISE on the standard ease); before the send its row is not drawn and its inline style is
    // rest, like once the rise is done. The date divider draws at once.
    if (t >= T.send) enter(n.user, t, T.send, K.SEND_RISE, SEND_DY, standard);
    else { css(n.user, 'opacity', ''); css(n.user, 'transform', ''); }
    // superbot's row, the next beat, enters the same way over K.ENTER
    enter(n.bot, t, T.row, K.ENTER, 4, emphDecel);
    // every part renders every frame (hidden or not), so a scrub leaves no stale state; the write cache keeps it cheap
    renderSwitch(t, k, p);
    renderThought(t, g);
    renderAnswer(t);
    more.render(t);
  }

  function reset() { memo = new Map(); last = {}; G = null; GA = null; GB = null; M = null; }

  render(0);
  return { DUR, T, render, reset, el };
}

export const CHAT_DUR = DUR;
export const CHAT_T = T;
