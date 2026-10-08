// The race: two panes, the same request typed into both, superbot's loop in
// one and claude-agent-sdk in the other, on the same model (the /benchmarks
// run, claude haiku 4.5). The clocks start when the prompt is submitted (typing
// the request costs the same in both windows) and land on the two measured
// means from the benchmarks ledger: superbot's pane at `targets.super` ms,
// the plain pane at `targets.plain` ms (8551 vs 24057, verdict-v3). Every
// pause in a script is a weight that the pane rescales so its pauses sum to
// its target, so the finish clocks ARE the ledger's numbers; the steps
// between are an example of what fills that time, never a recording of
// either side. Usage:
//
//   import { mountRace } from '../../site/assets/hero-race.js';
//   mountRace(sectionEl, { scripts: { plain: [...], super: [...] }, targets: { super: 8551, plain: 24057 } });
//
// A script line is { k: 'p'|'t'|'ok'|'wait', text, ms }: 'p' is the typed
// prompt (its clock has not started, so its ms is ignored); every other line
// appears at once and holds for its share of the target. Only unpaused time
// reaches a clock: offscreen and hidden tabs pause both panes together, and
// the clock never credits the time away. Loops after a hold.

const CHAR_MS = 22;
// a stopwatch, to the millisecond: 8551 → 0:08.551. It runs while the pane
// works and stops on the pane's own finish.
const fmt = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = (ms - m * 60000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
};

// the brand mark in the superbot pane (site/benchmarks.html .race-mark) needs
// no per-frame JS coupling: its storm aura wakes purely off the pane's own
// .running class (race.css), the same class this module already toggles.
export function mountRace(section, { scripts, targets = { super: 8551, plain: 24057 }, holdMs = 4200 } = {}) {
  const panes = [...section.querySelectorAll('.pane')].map((el) => ({
    el,
    arm: el.dataset.arm,
    term: el.querySelector('[data-term]'),
    clock: el.querySelector('[data-clock]'),
  }));
  const reasons = new Set();
  let waiters = [];
  const paused = () => reasons.size > 0;
  const pause = (why) => reasons.add(why);
  const resume = (why) => {
    reasons.delete(why);
    if (paused()) return;
    const w = waiters;
    waiters = [];
    for (const r of w) r();
  };
  const untilResumed = () => (paused() ? new Promise((r) => waiters.push(r)) : Promise.resolve());
  // sleep in short chunks so a pause lands within a chunk; when a clock is
  // passed, only the time actually slept is credited to it, and the chunks
  // are frame-sized so the stopwatch visibly counts milliseconds
  const sleep = async (ms, clk) => {
    let left = ms;
    while (left > 0) {
      await untilResumed();
      const t0 = performance.now();
      await new Promise((r) => setTimeout(r, Math.min(clk ? 16 : 50, left)));
      const dt = performance.now() - t0;
      left -= dt;
      if (clk) {
        clk.ms += dt;
        clk.el.textContent = fmt(clk.ms);
        clk.tick?.(clk.ms);
      }
    }
  };
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? resume('offscreen') : pause('offscreen')), { threshold: 0.2 });
  io.observe(section);
  const onVis = () => (document.hidden ? pause('hidden') : resume('hidden'));
  document.addEventListener('visibilitychange', onVis);

  const line = (term, k, text) => {
    const el = document.createElement('span');
    el.className = k;
    el.textContent = text;
    term.append(el, '\n');
    // the term scrolls to keep the newest line visible as the script grows
    // past its own box (race.css .pane .term overflow-y: auto)
    term.scrollTop = term.scrollHeight;
    return el;
  };
  // the prompt is typed; with a command (`cmd`) it follows the request on its
  // own line, in its own badge, lit the moment it is complete (owner ask,
  // 2026-09-10: the badge used to lead the request)
  const typeLine = async (term, k, text, cmd) => {
    const el = line(term, k, '');
    el.classList.add('cur');
    const request = document.createTextNode('');
    el.append(request);
    for (let i = 1; i <= text.length; i++) {
      await untilResumed();
      request.textContent = text.slice(0, i);
      term.scrollTop = term.scrollHeight;
      await sleep(CHAR_MS);
    }
    if (cmd) {
      const badge = document.createElement('b');
      badge.className = 'cmd';
      el.append('\n', badge);
      for (let i = 1; i <= cmd.length; i++) {
        await untilResumed();
        badge.textContent = cmd.slice(0, i);
        if (i === cmd.length) badge.classList.add('lit');
        term.scrollTop = term.scrollHeight;
        await sleep(CHAR_MS);
      }
    }
    el.classList.remove('cur');
    return el;
  };

  // the superbot pane's steps type in at a brisk, visible typewriter rate
  // (owner ask, 2026-09-01; 2026-09-10: the old 2 ms/char burst left every
  // step idle for most of its share, which read as latency between
  // commands). Typing credits the clock like any other work.
  const STEP_CHAR_MS = 11;
  const typeStep = async (pane, el, txt, text, clk) => {
    for (let i = 1; i <= text.length; i++) {
      await untilResumed();
      txt.textContent = text.slice(0, i);
      pane.term.scrollTop = pane.term.scrollHeight;
      await sleep(STEP_CHAR_MS, clk);
    }
  };

  // one pane's steps after the prompt: each step owns its share of the
  // pane's target, and the clock it drives is that pane's own. Every step
  // carries its own millisecond label that counts up live from the moment
  // the line opens and freezes on the step's total, so the superbot pane is
  // never still: it is typing, or its latest step's latency is ticking. The
  // plain pane gets the same label, which is where the contrast reads.
  const runSteps = async (pane, steps, target) => {
    const weight = steps.reduce((a, s) => a + (s.ms ?? 600), 0) || 1;
    const clk = { ms: 0, el: pane.clock };
    clk.el.textContent = fmt(0);
    pane.el.classList.add('running');
    for (const s of steps) {
      const share = ((s.ms ?? 600) / weight) * target;
      const el = line(pane.term, s.k, '');
      // the typed text in its own span so the cursor (race.css .cur .typed)
      // sits on the text being typed, not after the latency label
      const txt = document.createElement('span');
      txt.className = 'typed';
      txt.textContent = pane.arm === 'super' ? '' : s.text;
      el.append(txt);
      if (share <= 0) {
        txt.textContent = s.text;
        continue;
      }
      const lab = document.createElement('i');
      lab.className = 'ms';
      el.append(lab);
      const t0 = clk.ms;
      clk.tick = (ms) => { lab.textContent = `${Math.round(ms - t0)} ms`; };
      clk.tick(clk.ms);
      el.classList.add('cur');
      if (pane.arm === 'super') await typeStep(pane, el, txt, s.text, clk);
      await sleep(Math.max(0, share - (clk.ms - t0)), clk);
      clk.tick = null;
      // the label reads the step's share, not the sum of timer overshoots
      lab.textContent = `${Math.round(share)} ms`;
      el.classList.remove('cur');
    }
    // the finish reads the ledger's number, not the sum of timer overshoots
    clk.el.textContent = fmt(target);
    pane.el.classList.remove('running');
    pane.el.classList.add('done');
  };

  const cycle = async () => {
    for (const p of panes) {
      p.el.classList.remove('done', 'running');
      p.term.textContent = '';
      p.clock.textContent = fmt(0);
    }
    // both prompts are typed first, clocks idle: the request costs the same
    // to type in either window, and the longer one finishing is "submit"
    await Promise.all(panes.map((p) => {
      const prompt = scripts[p.arm].find((s) => s.k === 'p');
      return typeLine(p.term, 'p', prompt?.text ?? '', prompt?.cmd);
    }));
    await sleep(350);
    await Promise.all(panes.map((p) => runSteps(p, scripts[p.arm].filter((s) => s.k !== 'p'), targets[p.arm])));
  };

  let running = true;
  (async () => {
    while (running && section.isConnected) {
      await untilResumed();
      await cycle();
      await sleep(holdMs);
    }
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  })();

  return { pause, resume, stop: () => { running = false; resume('stop'); } };
}
