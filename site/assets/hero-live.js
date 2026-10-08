// hero-live: the `live` hero arm (experiments.js hero rev 13, 2026-10-07).
//
// The owner's remake of the landing hero, rebuilt from the superbot desktop UI:
//   1. a thinking bubble at the top, the desktop's live thought row (the v11
//      bubble line: a mascot avatar, a raised bubble holding the status label
//      and its clock, under it the newest thought's lines). Thoughts cycle fast
//      (one every 760 ms), every word streams in, and the loop never stops:
//      a visitor reads it as a turn that is thinking, hard, right now.
//   2. the composer under it, with the model chip the ModelPicker draws (the
//      built-in superbot lane first, then the vendors) and the desktop
//      provider-switch pill: "Switching to Claude" with its spinner, then
//      "Switched to Claude" with its check, cycling through the models.
//   3. the apps superbot manages, one toggle each, all OFF, in the dock's own
//      roster (lander-agent.html .dock, the vendor marks already in the page).
//      When the band scrolls into view the toggles flip ON one by one on the
//      intro orbit's own pop rhythm (IntroOrbit.tsx: 120 ms base, 60 ms
//      stagger, 220 ms fade, the .3/.85/.3/1.04 flip curve), and the line
//      under them reads "Powering superbot."
//
// The module is mounted by lander-agent.html's playHero (HEROES.live) after
// hero-live.css is in. It appends one panel into #desk, between the stage's
// clip box and the dock rail, and hides the stage: this arm draws its own.
// Every string here is ours, no vendor art is drawn, the marks are the page's
// own <symbol> registry. Motion is unconditional: superbot never honours
// prefers-reduced-motion (operator order 2026-09-19, motion-always-on.mdc).
// No em-dashes anywhere in this file's copy, by rule.

const ICON = (id, size) =>
  `<svg width="${size}" height="${size}" fill="currentColor" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

const MONO_MARK = '/site/assets/brand/mono-mark-white.svg'; // the app's own superbot disc (hud-title-line, composer model chip)
const AVATAR = '/site/assets/brand/mark-clean.svg';         // the mascot head beside the bubble (the desktop's thought row avatar)

// The composer's model rows: the built-in superbot lane first, then the
// vendors, exactly the order ModelPicker.ts modelRows serves (/me.models).
const MODELS = [
  { name: 'Superbot', mark: `<img class="live-chip-img" src="${MONO_MARK}" alt="" width="12" height="12" loading="lazy" decoding="async"/>` },
  { name: 'Claude', mark: ICON('sb-ic-claude', 13) },
  { name: 'Codex', mark: ICON('sb-ic-openai', 13) },
  { name: 'Gemini', mark: ICON('sb-ic-gemini', 13) },
  { name: 'Cursor', mark: ICON('sb-ic-cursor', 13) },
];

// What superbot is thinking, in the app's own register: short lines about
// routing an ask, checking the apps it manages, and moving between models.
// They cycle in order and never end. No em-dashes.
const THOUGHTS = [
  'checking which apps are connected',
  'claude is rate limited, routing to codex',
  'reading the cursor workspace',
  'three agents mid task, holding the queue',
  'codex hit its limit, switching to gemini',
  'this ask wants a picture, routing to gemini',
  'cursor picked up the edit, verifying the diff',
  'syncing the rules across every agent',
  'scanning this project for new mcp servers',
  'claude finished, handing the thread back to codex',
  'no tool needed here, answering directly',
  'keeping the context on claude, codex is busy',
];

// The apps superbot manages, one toggle each: the dock's roster, in its order,
// with the icon registry's own symbols (lander-agent.html .dock).
const APPS = [
  ['sb-ic-claude', 'claude code'],
  ['sb-ic-cursor', 'cursor'],
  ['sb-ic-vscode', 'vs code'],
  ['sb-ic-openai', 'codex cli'],
  ['sb-ic-openai', 'chatgpt'],
  ['sb-ic-gemini', 'gemini cli'],
  ['sb-ic-zed', 'zed'],
  ['sb-ic-windsurf', 'windsurf'],
  ['sb-ic-claude', 'claude desktop'],
  ['sb-ic-claude', 'claude.ai'],
  ['sb-ic-cline', 'cline'],
  ['sb-ic-roo', 'roo code'],
  ['sb-ic-kilo', 'kilo code'],
  ['sb-ic-continue', 'continue'],
  ['sb-ic-copilot', 'copilot cli'],
  ['sb-ic-opencode', 'opencode'],
  ['sb-ic-openclaw', 'openclaw'],
  ['sb-ic-hermes', 'hermes agent'],
  ['sb-ic-goose', 'goose'],
  ['sb-ic-devin', 'devin cli'],
  ['sb-ic-aider', 'aider'],
  ['sb-ic-qwen', 'qwen code'],
  ['sb-ic-kiro', 'kiro'],
  ['sb-ic-amazonq', 'amazon q'],
];

// ---- the clocks (ms) ---------------------------------------------------------
const THOUGHT_MS = 760;   // a new thought every 760 ms (owner: 0.6 s to 0.9 s)
const STREAM_MS = 520;    // the words of one thought stream in over its first 520 ms
const WORD_FADE = 150;    // a word's own fade, once its moment lands
const GHOST = 0.14;       // a not yet streamed word's ink
const SW_A = 900;         // "Switching to X" holds (SWITCH_MIN_SPIN_MS 650 plus the labels)
const SW_B = 1500;        // "Switched to X" holds
const SW_MS = SW_A + SW_B;
const POP_BASE = 120;     // IntroOrbit.tsx POP_BASE_MS: the first toggle
const POP_STAGGER = 60;   // IntroOrbit.tsx POP_STAGGER: between toggles
const FADE_MS = 220;      // IntroOrbit.tsx FADE_MS: a toggle's own fade

const SVG_SPIN = `<svg class="live-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
const SVG_CHECK = `<svg class="live-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const SVG_CHEV = `<svg class="live-cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const SVG_SEND = `<svg class="live-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function markup() {
  return `
<div class="live-think">
  <span class="live-avatar"><img src="${AVATAR}" alt="" width="22" height="22" loading="lazy" decoding="async"/></span>
  <span class="live-tail" aria-hidden="true"></span>
  <div class="live-bubble">
    <div class="live-head"><span class="live-label">Thinking</span><span class="live-sep">&#183;</span><span class="live-clock">0s</span></div>
    <div class="live-win"><p class="live-text"></p></div>
  </div>
</div>
<div class="live-composer">
  <span class="live-sw" data-check="false">
    <span class="live-sw-mark">${MODELS[1].mark}</span>
    <span class="live-sw-ink">Switching to ${MODELS[1].name}</span>
    <span class="live-sw-status">${SVG_SPIN}${SVG_CHECK}</span>
  </span>
  <div class="live-box">
    <span class="live-field">How can superbot help you today?</span>
    <div class="live-foot">
      <span class="live-chip"><span class="live-chip-mark">${MODELS[0].mark}</span><b class="live-chip-name">${MODELS[0].name}</b>${SVG_CHEV}</span>
      <span class="live-super">super</span>
      ${SVG_SEND}
    </div>
  </div>
</div>
<div class="live-apps">
  <span class="live-apps-lab">apps superbot manages</span>
  <ul class="live-grid">
    ${APPS.map(([ic, name], i) => `<li class="live-app" style="--d:${POP_BASE + i * POP_STAGGER}ms"><span class="live-mark">${ICON(ic, 17)}</span><span class="live-name">${name}</span><span class="live-toggle" aria-hidden="true"><i></i></span></li>`).join('\n    ')}
  </ul>
  <p class="live-power">Powering superbot.</p>
</div>`;
}

function mount() {
  const desk = document.getElementById('desk');
  const hero = document.querySelector('.hero');
  if (!desk || !hero) return;
  const old = document.getElementById('live-hero');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'live';
  el.id = 'live-hero';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = markup();
  const stage = desk.querySelector('.stage-clip');
  desk.insertBefore(el, stage ? stage.nextSibling : desk.firstChild);
  hero.setAttribute('data-hero-live', '');
  run(el);
}

function run(el) {
  const $ = (s) => el.querySelector(s);
  const win = $('.live-win'), tx = $('.live-text'), clock = $('.live-clock');
  const sw = $('.live-sw'), swMark = $('.live-sw-mark'), swInk = $('.live-sw-ink');
  const chipMark = $('.live-chip-mark'), chipName = $('.live-chip-name');
  const grid = $('.live-grid'), apps = [...el.querySelectorAll('.live-app')], power = $('.live-power');

  // ---- the toggles: OFF until the band scrolls into view, then the orbit's
  // own pop rhythm, one by one, and the power line last. Once on they stay on:
  // these apps power superbot for the rest of the visit.
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    apps.forEach((li) => li.classList.add('on'));
    setTimeout(() => power.classList.add('on'), POP_BASE + apps.length * POP_STAGGER + FADE_MS);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      reveal();
    }, { threshold: 0.18, rootMargin: '0px 0px -12% 0px' });
    io.observe($('.live-apps'));
  } else {
    setTimeout(reveal, 800);
  }

  // ---- the loop: one rAF clock drives the thought stream and the model
  // switch. Every write is derived from t, so the frame is idempotent and a
  // hidden tab resumes on the right beat instead of stacking timeouts.
  let wordEls = [];
  let lastThought = -1, lastSec = -1, lastChip = -1, lastPill = '';
  const t0 = performance.now();

  const buildThought = (text) => {
    win.textContent = '';
    const p = document.createElement('p');
    p.className = 'live-text';
    for (const w of text.split(' ')) {
      const s = document.createElement('span');
      s.className = 'live-w';
      s.textContent = w + ' ';
      s.style.opacity = String(GHOST);
      p.appendChild(s);
    }
    win.appendChild(p);
    wordEls = [...p.querySelectorAll('.live-w')];
  };

  const setChip = (i) => {
    if (i === lastChip) return;
    lastChip = i;
    chipMark.innerHTML = MODELS[i].mark;
    chipName.textContent = MODELS[i].name;
  };

  const frame = (now) => {
    if (!el.isConnected) return; // a retry replaced this panel: its clock stops here
    const t = now - t0;
    // the thinking line: a new thought every THOUGHT_MS, its words streaming in
    const cycle = Math.floor(t / THOUGHT_MS);
    if (cycle !== lastThought) {
      lastThought = cycle;
      buildThought(THOUGHTS[cycle % THOUGHTS.length]);
    }
    const ph = t % THOUGHT_MS;
    for (let i = 0; i < wordEls.length; i++) {
      const at = (i / Math.max(1, wordEls.length)) * STREAM_MS;
      const v = GHOST + (1 - GHOST) * clamp01((ph - at) / WORD_FADE);
      wordEls[i].style.opacity = v.toFixed(3);
    }
    const sec = Math.floor(t / 1000);
    if (sec !== lastSec) { lastSec = sec; clock.textContent = `${sec}s`; }
    // the model switch: "Switching to X", then "Switched to X", cycling
    const si = Math.floor(t / SW_MS);
    const sp = t % SW_MS;
    const from = si % MODELS.length;
    const to = (si + 1) % MODELS.length;
    const done = sp >= SW_A;
    const label = `${done ? 'Switched to' : 'Switching to'} ${MODELS[to].name}`;
    if (label !== lastPill) {
      lastPill = label;
      swInk.textContent = label;
      sw.setAttribute('data-check', done ? 'true' : 'false');
      swMark.innerHTML = MODELS[to].mark;
    }
    setChip(done ? to : from);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

mount();