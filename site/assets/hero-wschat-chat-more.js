// hero-workspace-chat-more: the ad's two later asks, played on in the same
// thread after the muse meme (hero-wschat-chat.js turn 1). Content is the
// "every model, one chat" ad's combo route, word for word
// (scenes/tabs-assets/chat.js BASE[1] + burger('combo'), beats/scrape.js,
// beats/doordash.js): "Scrape reddit and look for more" routes to DeepSeek V4
// Flash, which sweeps six subreddits; "Winning, order me a burger." switches
// to Superbot, connects DoorDash and places the order. Drawn in desktop main's
// thread anatomy (the same user bubble, provider-switch pill + nested who
// header and answer lead as turn 1), sized in main's CSS px. Each reply ends in
// ONE muted footer caption, the turn's outcome in the app's outcomeFooterWords
// words ("38s", a middle dot, "7 steps"), like turn 1's (hero-wschat-chat.js).
//
//   const plan = planMore(t0);                 // timings, from t0 (s)
//   const more = mountMore(host, plan, w);     // w: turn 1's cached writers + sendRise(node, t, at), its ask's Rise
//   more.render(t);                            // pure of t, write-on-change
//   more.marks;                                // [time, node] scroll marks: the bottom pin follows each node as it lands
//
// Every node is laid out from the start (opacity and transform only), so the column's
// geometry never changes and the scroll marks can be measured once.

const asset = (f) => new URL('./hero-chat/' + f, import.meta.url).href;
const SB_TILE = './site/assets/brand/mono-mark-white.svg';
export const TILES = {
  deepseek: asset('deepseek.svg?v=2'),      // DeepSeek's whale, @lobehub/icons-static-svg 1.95.1 deepseek-color.svg (MIT), on white
  doordash: asset('doordash-tile.webp'),    // packages/ui/src/marks/tiles/doordash.png
  reddit: asset('reddit-tile.webp'),        // packages/ui/src/marks/tiles/reddit.png
};
const BURGER = asset('burger.webp');        // the ad's img/burger.jpg (public domain, NCI), 640x427

const APPS = {
  deepseek: { name: 'DeepSeek V4 Flash', sub: 'in superbot', model: { name: 'DeepSeek V4 Flash', tile: TILES.deepseek } },
  superbot: { name: 'Superbot', sub: '', model: 'superbot' },
  doordash: { name: 'DoorDash', sub: 'in superbot', model: { name: 'DoorDash', tile: TILES.doordash } },
};

const SUBS = [['r/memes', 812], ['r/dankmemes', 544], ['r/me_irl', 391], ['r/ProgrammerHumor', 327], ['r/socialnetwork', 198], ['r/MemeTemplates', 146]];
const TOTAL = SUBS.reduce((s, [, n]) => s + n, 0);
const DASH = [
  ['Opening DoorDash', 'Opened DoorDash'],
  ['Picking the best-rated burger near you', 'Picked Main Street Burger Co.'],
  ['Checking out with your saved card', 'Checked out with your saved card'],
];

const TURNS = [
  {
    ask: 'Scrape reddit and look for more',
    chips: [['deepseek', 'Switching to DeepSeek V4 Flash', 'Switched to DeepSeek V4 Flash']],
    who: 'deepseek', say: 'Scraped 6 subreddits. Found 5 more Muse memes blowing up.', cps: 80, beat: 'scrape',
    outcome: [38, 7],        // the sweep: the Scraping Reddit row + one fetch per subreddit
  },
  {
    ask: 'Winning, order me a burger.',
    chips: [['superbot', 'Switching to Superbot', 'Switched to Superbot'], ['doordash', 'Connecting to DoorDash', 'Connected to DoorDash']],
    who: 'doordash', say: 'Well earned. Getting you a celebration burger.', cps: 90, beat: 'dash',
    outcome: [52, 4],        // open DoorDash, pick the burger, check out, the placed order
  },
];

// ---- math ---------------------------------------------------------------------
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const outCubic = (p) => 1 - Math.pow(1 - p, 3);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const frac = (x) => x - Math.floor(x);
const r3 = (x) => Math.round(x * 1000) / 1000;
const num = (n) => Math.round(n).toLocaleString('en-US');
// the footer caption, agent-status.ts outcomeFooterWords on a landed turn: formatOutcomeDuration
// (whole seconds, bare under a minute, "1m 04s" from one), then " (middle dot) N steps" from two steps
// (FOOTER_STEPS_MIN: a single step is never named)
const footerWords = ([secs, steps]) => {
  const lead = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
  return steps >= 2 ? `${lead} \u00b7 ${steps} steps` : lead;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- timings -------------------------------------------------------------------
// KEY: one key every 20ms, flat; REST and each turn's END_HOLD keep the next ask close behind the last answer (owner, 2026-09-27)
const K = { CARET: 0.15, KEY: 0.02, SEND_AFTER: 0.12, ROW: 0.3, CHIP_GAP: 0.12, SPIN: 0.65, REPLY: 0.08, REST: 0.15, END_HOLD: 0.5 };

export function planMore(t0) {
  let s = t0;
  const turns = TURNS.map((d) => {
    const u = { ...d, s };
    let at = s + K.CARET;
    u.keys = [...d.ask].map((_, i) => r3(at + i * K.KEY));
    u.send = r3(u.keys[u.keys.length - 1] + K.SEND_AFTER);
    u.row = r3(u.send + K.ROW);
    let c = u.row + 0.15;
    u.chips = d.chips.map(([app, run, done]) => { const x = { app, run, done: done, sw: r3(c), ok: r3(c + K.SPIN) }; c = x.ok + K.CHIP_GAP; return x; });
    u.live = u.chips[u.chips.length - 1].ok;     // the who header lands with the last check
    const r = u.r = r3(u.live + K.REPLY);
    const B = u.B = { r };
    if (d.beat === 'scrape') {
      B.chip = r3(r + 0.2);
      B.sub = SUBS.map((_, i) => r3(r + 0.35 + i * 0.22));
      B.done = r3(B.sub[SUBS.length - 1] + 0.6);
      B.cap = r3(B.done + 0.1);                 // the footer caption opens just after the settle
      u.busyEnd = B.done; u.end = r3(B.done + K.END_HOLD);
    } else {
      B.chipIn = [r + 0.25, r + 0.55, r + 0.85].map(r3);
      B.card = r3(r + 1.2);
      B.placed = r3(B.card + 1.3);
      B.chipDone = [r + 0.6, r + 1.15, B.placed].map(r3);
      B.eta = r3(B.placed + 0.4);
      B.cap = r3(B.eta + 0.15);                 // under the arrival line, once the order has landed
      u.busyEnd = B.placed; u.end = r3(B.eta + K.END_HOLD);
    }
    s = u.end + K.REST;
    return u;
  });
  // the composer's model chip: each switch swaps it at its check, the turn's end puts superbot back
  const models = [];
  turns.forEach((u) => {
    u.chips.forEach((c, i) => {
      const to = i < u.chips.length - 1 ? u.chips[i + 1].ok : u.busyEnd + 0.3;
      models.push([c.ok, r3(to), APPS[c.app].model]);
    });
  });
  return { start: t0, turns, models, end: turns[turns.length - 1].end };
}

// ---- markup ----------------------------------------------------------------------
const SVG = (cls, d) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SPIN = SVG('hwc-spin', '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>');
const CHECK = SVG('hwc-check', '<path d="M20 6 9 17l-5-5"/>');
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/></svg>';
const PIN = SVG('', '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>');
const CLOCK = SVG('', '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>');
const BAG = SVG('hwc-dd-bag', '<path d="M5 8h14l-1.2 12H6.2Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>');
const DONE = '<svg class="hwc-dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="hwc-dd-check-p" d="M4.5 12.5l5 5L19.5 7"/></svg>';

const tile = (app, cls) => app === 'superbot'
  ? `<span class="${cls} hwc-sbtile"><img src="${SB_TILE}" alt="" width="12" height="12"/></span>`
  : `<img class="${cls}" src="${TILES[app]}" width="128" height="128" alt="" draggable="false" decoding="async"/>`;

const pill = (c) => `<span class="hwc-pill">${tile(c.app, 'hwc-pill-tile')}<span class="hwc-pill-label"><span class="hwc-sweep"><span class="hwc-mask"><span class="hwc-ink">${esc(c.run)}</span></span></span></span><span class="hwc-status">${SPIN}${CHECK}</span></span>`;
const who = (app) => `<div class="hwc-nest"><div class="hwc-who">${tile(app, 'hwc-who-tile')}<span class="hwc-who-name">${APPS[app].name}</span>${APPS[app].sub ? `<span class="hwc-who-sub">${APPS[app].sub}</span>` : ''}</div></div>`;
const tool = (label, count) => `<div class="hwc-tool"><span class="hwc-status">${SPIN}${CHECK}</span><span class="hwc-tool-t">${esc(label)}</span>${count ? '<b class="hwc-tool-n">0 posts</b>' : ''}</div>`;

function beatMarkup(u) {
  if (u.beat === 'scrape') {
    return tool('Scraping Reddit', true) +
      `<div class="hwc-subs">${SUBS.map(([s]) => `<span class="hwc-sub"><img src="${TILES.reddit}" alt="" width="128" height="128"/>${esc(s)}<b>0</b></span>`).join('')}</div>`;
  }
  return DASH.map(([run]) => tool(run, false)).join('') + `
<div class="hwc-dd">
  <div class="hwc-dd-head"><img src="${TILES.doordash}" alt="" width="128" height="128"/><b>DoorDash order</b><span class="hwc-dd-tag">1 item</span></div>
  <div class="hwc-dd-photo"><img src="${BURGER}" width="640" height="427" alt="Cheeseburger"/><span class="hwc-dd-place"><b>Main Street Burger Co.</b><i>${STAR}4.8</i><em>0.8 mi</em></span></div>
  <div class="hwc-dd-item"><span class="hwc-dd-thumb" style="background-image:url('${BURGER}')"></span><span class="hwc-dd-meta"><b>Cheeseburger</b><small>Cheddar, pickles, house sauce</small></span><span class="hwc-dd-qty">1x</span><span class="hwc-dd-price">$7.99</span></div>
  <div class="hwc-dd-fees"><div><span>Delivery fee</span><span>$1.99</span></div><div><span>Service fee</span><span>$1.42</span></div><div><span>Dasher tip</span><span>$3.00</span></div><div class="hwc-dd-total"><span>Total</span><span>$14.40</span></div></div>
  <div class="hwc-dd-addr"><span class="hwc-dd-pin">${PIN}</span><span class="hwc-dd-where"><b>Deliver to 1480 Market St, Apt 5</b><small>Visa ending 4242</small></span><span class="hwc-dd-eta">${CLOCK}24 min</span></div>
  <div class="hwc-dd-btn"><span class="hwc-dd-grp hwc-dd-a">${BAG}<span class="hwc-dd-lab">Placing order.</span></span><span class="hwc-dd-grp hwc-dd-b">${DONE}<span>Ordered!</span></span><i class="hwc-dd-shine"></i></div>
  <div class="hwc-dd-etaline">${CLOCK}<span>Arriving in <b>24 min</b>, your Dasher is on the way</span></div>
</div>`;
}

const turnMarkup = (u) => `
<div class="hwc-turn">
  <div class="hwc-row hwc-user" data-variant="bubble"><span class="hwc-bubble"><p class="hwc-p">${esc(u.ask)}</p></span></div>
  <div class="hwc-row hwc-bot" data-variant="prose"><div class="hwc-prose">
    ${u.chips.map((c, i) => `<div class="hwc-sw">${pill(c)}${i === u.chips.length - 1 ? who(u.who) : ''}</div>`).join('')}
    <p class="hwc-say"><span class="hwc-say-vis"></span><span class="hwc-say-hid">${esc(u.say)}</span></p>
    <div class="hwc-beat">${beatMarkup(u)}</div>
    <span class="hwc-cap">${esc(footerWords(u.outcome))}</span>
  </div></div>
</div>`;

// ---- mount + render ---------------------------------------------------------------
export function mountMore(host, plan, w) {
  host.innerHTML = plan.turns.map(turnMarkup).join('');
  const { css, text, attr, sendRise } = w;
  const rise = (node, t, at, dur, dy) => {
    const p = outCubic(seg(t, at, at + dur));
    css(node, 'opacity', p >= 1 ? '' : p.toFixed(3));
    css(node, 'transform', p >= 1 ? '' : `translateY(${((1 - p) * dy).toFixed(2)}px)`);
  };
  const marks = [];
  const turns = plan.turns.map((u, i) => {
    const root = host.children[i];
    const q = (s) => root.querySelector(s), qa = (s) => [...root.querySelectorAll(s)];
    const n = {
      user: q('.hwc-user'), bot: q('.hwc-bot'), sws: qa('.hwc-sw'), nest: q('.hwc-nest'),
      say: q('.hwc-say'), vis: q('.hwc-say-vis'), hid: q('.hwc-say-hid'),
      tools: qa('.hwc-tool'), subs: qa('.hwc-sub'), subsRow: q('.hwc-subs'), dd: q('.hwc-dd'), cap: q('.hwc-cap'),
    };
    n.pills = n.sws.map((sw) => ({
      pill: sw.querySelector('.hwc-pill'), tile: sw.querySelector('.hwc-pill-tile'), sweep: sw.querySelector('.hwc-sweep'),
      ink: sw.querySelector('.hwc-ink'), spin: sw.querySelector('.hwc-spin'), check: sw.querySelector('.hwc-check'),
    }));
    marks.push([u.send, n.user]);
    u.chips.forEach((c, j) => marks.push([c.sw, n.sws[j]]));
    marks.push([u.r, n.say]);
    if (u.beat === 'scrape') { marks.push([u.B.chip, n.tools[0]], [u.B.sub[0], n.subsRow]); }
    else {
      u.B.chipIn.forEach((a, j) => marks.push([a, n.tools[j]]));
      marks.push([u.B.card, n.dd]);
      n.btn = q('.hwc-dd-btn'); n.grpA = q('.hwc-dd-a'); n.grpB = q('.hwc-dd-b'); n.lab = q('.hwc-dd-lab');
      n.bag = q('.hwc-dd-bag'); n.check = q('.hwc-dd-check'); n.checkP = q('.hwc-dd-check-p'); n.shine = q('.hwc-dd-shine');
      n.eta = q('.hwc-dd-eta'); n.etaLine = q('.hwc-dd-etaline');
    }
    marks.push([u.B.cap, n.cap]);                // the bottom pin follows the footer row in, like any row that lands
    return { u, n };
  });
  marks.sort((a, b) => a[0] - b[0]);

  // a spinner-then-check status slot (the switch pill's and the tool rows')
  const status = (spin, check, t, from, ok) => {
    const done = t >= ok;
    css(spin, 'transform', done ? '' : `rotate(${(((t - from) * 360) % 360).toFixed(1)}deg)`);
    css(spin, 'opacity', done ? (1 - seg(t, ok, ok + 0.14)).toFixed(3) : '1');
    const cp = seg(t, ok, ok + 0.3);
    css(check, 'opacity', !done ? '0' : (cp >= 1 ? '1' : cp.toFixed(3)));
    css(check, 'transform', !done || cp >= 1 ? '' : `scale(${lerp(0.3, 1, outBack(cp)).toFixed(4)})`);
  };
  const stream = (u, n, t) => {
    const c = Math.max(0, Math.min(u.say.length, Math.floor((t - (u.r + 0.06)) * u.cps + 1e-6)));
    text(n.vis, u.say.slice(0, c)); text(n.hid, u.say.slice(c));
  };

  function renderScrape({ u, n }, t) {
    const B = u.B, [tl] = n.tools;
    rise(tl, t, B.chip, 0.3, 8);
    const done = t >= B.done;
    status(tl.querySelector('.hwc-spin'), tl.querySelector('.hwc-check'), t, B.chip, B.done);
    text(tl.querySelector('.hwc-tool-t'), done ? 'Scraped Reddit' : 'Scraping Reddit');
    attr(tl, 'data-done', done ? 'true' : null);
    let sum = 0;
    css(n.subsRow, 'opacity', t >= B.sub[0] - 0.05 ? '1' : '0');
    n.subs.forEach((p, i) => {
      const a = B.sub[i];
      rise(p, t, a, 0.28, 6);
      const c = SUBS[i][1] * outCubic(seg(t, a + 0.05, a + 0.55));
      sum += c;
      text(p.lastElementChild, num(c));
      attr(p, 'data-on', t >= a + 0.55 ? 'true' : null);
    });
    text(tl.querySelector('.hwc-tool-n'), `${num(done ? TOTAL : sum)} posts`);
  }

  function renderDash({ u, n }, t) {
    const B = u.B;
    n.tools.forEach((tl, i) => {
      rise(tl, t, B.chipIn[i], 0.35, 8);
      status(tl.querySelector('.hwc-spin'), tl.querySelector('.hwc-check'), t, B.chipIn[i], B.chipDone[i]);
      text(tl.querySelector('.hwc-tool-t'), t >= B.chipDone[i] ? DASH[i][1] : DASH[i][0]);
    });
    const ci = outCubic(seg(t, B.card, B.card + 0.55));
    css(n.dd, 'opacity', ci >= 1 ? '' : ci.toFixed(3));
    css(n.dd, 'transform', ci >= 1 ? '' : `translateY(${((1 - ci) * 20).toFixed(2)}px) scale(${lerp(0.97, 1, ci).toFixed(4)})`);
    // the order pill: "Placing order..." resolves into "Ordered!" with a dip, a shine and a drawn check
    const P = B.placed;
    text(n.lab, 'Placing order' + '.'.repeat(1 + (Math.floor(Math.max(0, t - B.card) * 4) % 3)));
    const down = seg(t, P - 0.06, P + 0.04) * (1 - seg(t, P + 0.1, P + 0.24));
    const bs = 1 - 0.05 * down + 0.03 * Math.sin(Math.PI * seg(t, P + 0.1, P + 0.5));
    css(n.btn, 'transform', Math.abs(bs - 1) < 1e-4 ? '' : `scale(${bs.toFixed(4)})`);
    const sh = seg(t, P + 0.02, P + 0.62);
    css(n.shine, 'opacity', (sh > 0 && sh < 1 ? Math.sin(Math.PI * Math.min(1, sh * 1.25)) : 0).toFixed(3));
    css(n.shine, 'transform', `translateX(${lerp(-160, 300, 0.5 - Math.cos(Math.PI * sh) / 2).toFixed(1)}%) skewX(-20deg)`);
    const ro = seg(t, P + 0.04, P + 0.3);
    css(n.grpA, 'opacity', (1 - outCubic(ro)).toFixed(3));
    css(n.grpA, 'transform', `translate(-50%, calc(-50% - ${(outCubic(ro) * 10).toFixed(2)}px))`);
    css(n.bag, 'transform', `rotate(${(-40 * ro).toFixed(1)}deg) scale(${(1 - 0.6 * ro).toFixed(3)})`);
    const gi = seg(t, P + 0.1, P + 0.45), pop = outBack(seg(t, P + 0.1, P + 0.5));
    css(n.grpB, 'opacity', outCubic(gi).toFixed(3));
    css(n.grpB, 'transform', `translate(-50%, calc(-50% + ${((1 - outCubic(gi)) * 10).toFixed(2)}px)) scale(${lerp(0.9, 1, pop).toFixed(4)})`);
    css(n.checkP, 'stroke-dashoffset', (23 * (1 - outCubic(seg(t, P + 0.14, P + 0.44)))).toFixed(2));
    css(n.check, 'transform', `scale(${lerp(0.55, 1, outBack(seg(t, P + 0.14, P + 0.4))).toFixed(3)})`);
    const ep = seg(t, B.eta - 0.2, B.eta + 0.15);
    css(n.eta, '--lit', outCubic(ep).toFixed(3));
    css(n.eta, 'transform', `scale(${(1 + 0.08 * Math.sin(Math.PI * ep)).toFixed(4)})`);
    rise(n.etaLine, t, B.eta, 0.45, 6);
  }

  function render(t) {
    turns.forEach((tn) => {
      const { u, n } = tn;
      // the sent bubble fades up in place at the send, as turn 1's ask does (Rise: opacity + an 8px
      // rise to rest over 0.45 s on the standard ease). sendRise is hero-wschat-chat.js's own writer,
      // passed in through w so the length, the travel and the bezier have one source; before the send
      // it holds the row at opacity 0 (laid out, not drawn), once the rise is done it is '' (rest)
      sendRise(n.user, t, u.send);
      rise(n.bot, t, u.row, 0.2, 4);
      u.chips.forEach((c, j) => {
        const P = n.pills[j];
        rise(n.sws[j], t, c.sw, 0.42, 10);
        const tp = outBack(seg(t, c.sw + 0.05, c.sw + 0.45));
        css(P.tile, 'transform', tp >= 1 ? '' : `scale(${lerp(0.5, 1, tp).toFixed(4)}) rotate(${((1 - tp) * -25).toFixed(2)}deg)`);
        const ok = t >= c.ok;
        attr(P.pill, 'data-check', ok ? 'true' : null);
        text(P.ink, ok ? c.done : c.run);
        const sp = ok ? 0 : frac((t - c.sw) / 1.4);
        css(P.sweep, 'transform', ok ? '' : `translateX(${(150 * sp).toFixed(2)}%)`);
        css(P.ink, 'transform', ok ? '' : `translateX(${(-150 * sp).toFixed(2)}%)`);
        status(P.spin, P.check, t, c.sw, c.ok);
      });
      rise(n.nest, t, u.live, 0.42, 10);
      stream(u, n, t);
      if (u.beat === 'scrape') renderScrape(tn, t); else renderDash(tn, t);
      // the footer caption: laid out from the start like every node, so only its opacity moves
      const cp = outCubic(seg(t, u.B.cap, u.B.cap + 0.3));
      css(n.cap, 'opacity', cp >= 1 ? '' : cp.toFixed(3));
    });
  }

  return { marks, render };
}
