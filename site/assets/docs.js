// /docs (site/docs.html). Everything interactive on the page lives here:
// the "How do you work?" picker, the Helper install line's OS tab, the live MCP probe, copy buttons, the language
// tabs, the left nav's "where am I" marker, the "on this page" list, and the
// filter that narrows the whole page to the words a reader typed.
//
// It is one module rather than a pile of inline blocks so the page's markup
// carries no behaviour and the shell can cache-bust the whole thing with one
// ?v= (site/docs.html). Nothing here fetches anything the page did not already
// offer: the probe is the only network call, and it is the verify step.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- code that scrolls sideways is a keyboard stop: a focusable, labelled
// region, so arrow keys can scroll it (axe scrollable-region-focusable). Each
// region needs its own name (axe landmark-unique), so a label the markup set
// is kept and the rest are numbered. Only the multi-line blocks scroll: a
// command row (.doc-cmd) clips its one line and never scrolls, and neither does
// the multi-line box (.doc-cmd-lines), so their code is no stop and the copy
// button is the box's one.
document.querySelectorAll('pre.doc-code').forEach((el, i) => {
  el.tabIndex = 0;
  el.setAttribute('role', 'region');
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', `Code sample ${i + 1}`);
});

// ---- copy ladder: async clipboard, then execCommand, feedback only on a copy
// that actually happened, and an answer when both rungs refuse. Shared by the
// command rows and the verify question. `onFail` runs when both refuse and may
// return true when it left the text selected for the reader to copy by hand.
const copyLive = $('copylive');
let sayTimer = 0;
const say = (text, ms) => {
  if (!copyLive) return;
  clearTimeout(sayTimer);
  copyLive.textContent = text;
  sayTimer = setTimeout(() => { copyLive.textContent = ''; }, ms);
};
const copy = (text, onDone, onFail) => {
  const done = () => {
    onDone?.();
    say('Copied to clipboard', 2000);
    dispatchEvent(new CustomEvent('superbot:copied', { detail: { source: 'docs' } }));
  };
  const refused = () => {
    const selected = onFail?.();
    say(selected ? 'Clipboard blocked: the text is selected, press copy on your keyboard' : 'Clipboard blocked: select the text and copy it by hand', 4000);
  };
  const fallback = () => {
    // the textarea takes focus to select its text: it sits fixed and clear, so
    // the page does not jump, and focus goes back to where the reader was
    const back = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    Object.assign(ta.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    back?.focus?.({ preventScroll: true });
    if (ok) done(); else refused();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
};

// the command rows and the multi-line box: the whole box is one copy button (docs.css .doc-cmd, .doc-cmd-lines). It
// copies the code's whole text, never the clipped part on screen, and its label
// reads "click to copy", then "copied" (the glyph a check) or "copy failed" (a
// cross, with the line selected so a keystroke still copies it) for a moment
for (const btn of document.querySelectorAll('.doc-copy[data-copy]')) {
  const label = btn.querySelector('.doc-copy-label');
  const rest = label?.textContent ?? '';
  let timer = 0;
  const flash = (text, cls) => {
    clearTimeout(timer);
    if (label) label.textContent = text;
    btn.classList.remove('copied', 'blocked');
    btn.classList.add(cls);
    timer = setTimeout(() => { if (label) label.textContent = rest; btn.classList.remove(cls); }, 1500);
  };
  btn.addEventListener('click', () => {
    const code = (btn.closest('.doc-cmd, .doc-cmd-lines') ?? btn.parentElement)?.querySelector('code');
    if (!code) return;
    copy(code.textContent, () => flash('copied', 'copied'), () => {
      flash('copy failed', 'blocked');
      const sel = getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(code);
      sel.addRange(range);
      return true;
    });
  });
}

// ---- the fade: a command that fits its box shows no fade, one that overflows
// fades out at the box's end (docs.css's default, which is also what a visit
// with no script gets). A row in a picker panel or an OS tab that is not showing
// has no width yet, so each is watched: measured whenever it gains or changes
// its size, and whenever its text is swapped. Nothing is measured at width 0,
// which would read as "fits".
const measureCmd = (code) => {
  const box = code.parentElement;
  if (!box || !code.clientWidth) return;
  if (code.scrollWidth > code.clientWidth) box.removeAttribute('data-fits'); else box.setAttribute('data-fits', '');
};
const cmdCodes = [...document.querySelectorAll('.doc-cmd > code, .doc-cmd-lines > code')];
for (const code of cmdCodes) {
  measureCmd(code);
  if (window.ResizeObserver) new ResizeObserver(() => measureCmd(code)).observe(code);
  if (window.MutationObserver) new MutationObserver(() => measureCmd(code)).observe(code, { childList: true, characterData: true, subtree: true });
}
addEventListener('resize', () => cmdCodes.forEach(measureCmd));

// ---- language tabs (role=tablist). One tablist per code sample; arrow keys
// move between tabs, Home/End jump, and only the selected panel is shown.
for (const tabs of document.querySelectorAll('.doc-tabs[data-tabs]')) {
  const list = tabs.querySelector('.doc-tablist');
  const panels = [...tabs.querySelectorAll('.doc-tabpanel')];
  const buttons = [...tabs.querySelectorAll('.doc-tablist button')];
  const select = (i) => {
    buttons.forEach((b, n) => {
      const on = n === i;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, n) => { p.hidden = n !== i; });
  };
  buttons.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => select(i));
    b.addEventListener('keydown', (e) => {
      const last = buttons.length - 1;
      const to = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
        : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
          : e.key === 'Home' ? 0
            : e.key === 'End' ? last : null;
      if (to === null) return;
      e.preventDefault();
      select(to);
      buttons[to].focus();
    });
  });
  if (list && !list.getAttribute('aria-label')) list.setAttribute('aria-label', 'Code samples');
  // the Helper install line opens on the reader's own shell: a tab carrying
  // data-os="windows" is preselected on Windows, the first tab everywhere else
  const win = /windows/i.test(navigator.userAgentData?.platform || navigator.userAgent || '');
  const own = win ? buttons.findIndex((b) => b.dataset.os === 'windows') : -1;
  select(own >= 0 ? own : 0);
}

// ---- the picker ("How do you work?", the top of Start here). Three tiles, one
// detail panel: WAI-ARIA tabs with automatic activation. The server ships the
// picked state (first tile current, the other panels data-off) and a link per
// tile, so this only adds the roles, the roving tabindex and the keys. Choosing
// is a tap that acknowledges: it swaps which panel shows and moves nothing else,
// and the page does not scroll. A link to a panel's heading (the "on this page"
// rail, #mode-api) opens that panel first.
const modes = document.querySelector('[data-modes]');
const modeTabs = modes ? [...modes.querySelectorAll('.doc-mode')] : [];
const modePanels = modes ? [...modes.querySelectorAll('.doc-mode-panel')] : [];
const modeOfHash = (id) => modePanels.findIndex((p) => id === p.id || id === p.querySelector('h3')?.id || id === modeTabs[modePanels.indexOf(p)]?.id);
const pickMode = (i, focus) => {
  modeTabs.forEach((tab, n) => {
    tab.setAttribute('aria-selected', n === i ? 'true' : 'false');
    tab.tabIndex = n === i ? 0 : -1;
  });
  modePanels.forEach((panel, n) => { panel.toggleAttribute('data-off', n !== i); });
  // preventScroll: the tile is already in view and a tap must not move the page
  if (focus) modeTabs[i].focus({ preventScroll: true });
};
if (modeTabs.length && modeTabs.length === modePanels.length) {
  const tiles = modes.querySelector('[data-mode-tiles]');
  tiles.setAttribute('role', 'tablist');
  tiles.setAttribute('aria-labelledby', 'start-h');
  modeTabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', modePanels[i].id);
    tab.removeAttribute('aria-current');
    modePanels[i].setAttribute('role', 'tabpanel');
    modePanels[i].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      modes.setAttribute('data-picked', '');
      pickMode(i, false);
    });
    tab.addEventListener('keydown', (e) => {
      const last = modeTabs.length - 1;
      const to = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
        : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
          : e.key === 'Home' ? 0
            : e.key === 'End' ? last
              : e.key === ' ' ? i : null;
      if (to === null) return;
      e.preventDefault();
      modes.setAttribute('data-picked', '');
      pickMode(to, true);
    });
  });
  const fromHash = () => {
    const at = modeOfHash(location.hash.slice(1));
    if (at >= 0) pickMode(at, false);
  };
  pickMode(Math.max(0, modeOfHash(location.hash.slice(1))), false);
  addEventListener('hashchange', fromHash);
}
// where a link to a panel's heading should land: the heading is shown only when
// the panels are stacked, so with the picker up the link lands on the tiles
const landingFor = (id) => {
  const mode = modeOfHash(id);
  return mode >= 0 && modes?.querySelector('[role="tablist"]') ? modeTabs[mode] : document.getElementById(id);
};

// ---- hash landing: a link into a section must land on it, not in the gap its
// sticky chrome hides. scroll-margin-top on .doc-group/.doc-block is the CSS
// half; this is the half that survives the font arriving and reflowing the page
// under the reader (same class of fix the old page carried for its folds).
const landOnHash = () => {
  const id = location.hash.slice(1);
  if (!id) return;
  const target = landingFor(id);
  if (!target) return;
  const place = () => requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  if (document.readyState === 'complete') place();
  else addEventListener('load', place, { once: true });
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(place);
    ro.observe(document.body);
    setTimeout(() => ro.disconnect(), 2500);
  }
};
landOnHash();
addEventListener('hashchange', landOnHash);

// ---- the left rail's disclosure. Above 900px the CSS shows its children
// whatever `open` says and hides the summary, so it reads as the fixed left
// column. Below that it is a real disclosure, and it must start CLOSED: the
// markup ships `open` (the wide layout needs it), which at 390 left 26 nav rows
// above the title and no content on the first screen. One listener keeps the
// attribute in step with the breakpoint in both directions, so widening the
// window restores the column and narrowing it collapses the rail again.
const rail = document.querySelector('.doc-rail');
if (rail) {
  const narrow = matchMedia('(max-width: 900px)');
  const syncRail = (mq) => { rail.open = !mq.matches; };
  syncRail(narrow);
  narrow.addEventListener('change', syncRail);
}

// ---- left nav: the marker follows the section the reader is in.
const navLinks = [...document.querySelectorAll('.doc-nav a[data-nav]')];
const navFor = (id) => navLinks.find((a) => a.dataset.nav === id);
const blocks = [...document.querySelectorAll('.doc-block[id]')];
const groups = [...document.querySelectorAll('.doc-group[id]')];
let currentNav = null;
const markNav = (id) => {
  if (!id || id === currentNav) return;
  currentNav = id;
  for (const a of navLinks) a.setAttribute('aria-current', a.dataset.nav === id ? 'true' : 'false');
};
// The reading line sits under the sticky chrome and above the page's middle.
// Whichever block straddles it is where the reader is; the group is second best
// (its intro prose), and the last block above the line wins when nothing
// straddles, so scrolling up never leaves the marker stuck below.
const readPosition = () => {
  const line = innerHeight * 0.38;
  let straddle = null;
  let best = null;
  for (const el of [...groups, ...blocks]) {
    if (el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (r.top <= line && r.bottom > line) straddle = el;
    if (r.top <= line) best = el;
  }
  const el = straddle ?? best;
  if (!el) return;
  if (el.classList.contains('doc-block') && el.id) markNav(el.id);
  else if (el.classList.contains('doc-group')) {
    // the group's own landing row: prefer the first block that has already
    // started, else the group's first nav entry
    const first = el.querySelector('.doc-block[id]');
    markNav(el.id === 'start' ? 'start' : (first?.id ?? el.id));
  }
};
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(readPosition, { rootMargin: '-38% 0px -62% 0px' });
  for (const el of [...groups, ...blocks]) io.observe(el);
}
addEventListener('scroll', () => requestAnimationFrame(readPosition), { passive: true });
addEventListener('resize', () => requestAnimationFrame(readPosition));
readPosition();

// ---- "on this page": the subheadings of the section the reader is in. Built
// from the live DOM, so a section that is not on this page never lists one.
const tocList = $('toc-list');
// Which headings belong in the rail: every feature/API block's own h3, plus any
// heading the markup marks data-toc (Start here's tiles, Verify, and the
// connection strip, which are not .doc-block sections). Without the marker the
// Start group had no h3 the rail could list, so the column rendered empty while
// the reader was on the first screen.
const headingsOf = (group) => [...group.querySelectorAll('.doc-block h3, h3[data-toc]')];
const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
// The anchor a heading answers to: its own id, else the section that holds it.
const anchorOf = (h) => h.id || h.closest('[id]')?.id || '';
let tocFor = null;
const buildToc = (group) => {
  if (!tocList || !group || group === tocFor) return;
  tocFor = group;
  tocList.textContent = '';
  for (const h of headingsOf(group)) {
    // A slug id only when the heading has none and nothing else holds it: the
    // section usually carries the same id already, and a second one is invalid.
    const s = slug(h.textContent);
    if (!h.id && s && !document.getElementById(s)) h.id = s;
    const id = anchorOf(h);
    if (!id) continue;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = h.textContent;
    a.dataset.toc = id;
    li.appendChild(a);
    tocList.appendChild(li);
  }
  };
const tocLinks = () => [...document.querySelectorAll('.doc-toc a[data-toc]')];
// The subtitles of the group in play, at the top of the anchor rail.
const markToc = () => {
  const line = innerHeight * 0.38;
  let here = null;
  for (const g of document.querySelectorAll('.doc-block h3, h3[data-toc]')) {
    // a panel the picker has put away has no box: its zero rect is not "above the line"
    if (!g.getClientRects().length) continue;
    const r = g.getBoundingClientRect();
    if (r.top <= line) here = anchorOf(g);
  }
  for (const a of tocLinks()) a.setAttribute('aria-current', a.dataset.toc === here ? 'true' : 'false');
};
addEventListener('scroll', () => requestAnimationFrame(markToc), { passive: true });
// The rail follows the group the reader is in, from the same reading position
// the nav marker uses, so the two never name different sections.
const currentGroup = () => {
  const line = innerHeight * 0.38;
  let best = groups[0];
  for (const g of groups) {
    const r = g.getBoundingClientRect();
    if (r.top <= line) best = g;
  }
  return best;
};
buildToc(currentGroup());
addEventListener('scroll', () => requestAnimationFrame(() => { buildToc(currentGroup()); markToc(); }), { passive: true });
addEventListener('resize', () => requestAnimationFrame(() => { buildToc(currentGroup()); markToc(); }));
markToc();

// ---- the probe: three states, from a stateless tools/list on /mcp. The POST
// only passes the /mcp Origin gate on the production origin, so a same-origin
// GET is the fallback that still proves the endpoint answers. Both are the
// server's own answers, never a badge.
const probe = $('probe');
const probetext = $('probetext');
let listening = false;
const setProbe = (state, html) => {
  if (!probe) return;
  probe.classList.remove('on', 'off', 'wait');
  probe.classList.add(state);
  probetext.innerHTML = html;
};
const runProbe = async () => {
  setProbe('wait', 'Checking the server from this browser…');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 2500);
  const host = esc(location.host);
  try {
    let tools = null;
    if (location.protocol === 'https:') try {
      const r = await fetch('/mcp', {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      if (r.ok) {
        const raw = await r.text();
        const line = raw.split('\n').find((l) => l.startsWith('data:'));
        const msg = JSON.parse(line ? line.slice(5) : raw);
        if (Array.isArray(msg.result?.tools)) tools = msg.result.tools.map((x) => String(x.name));
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
    }
    if (!tools) {
      const r = await fetch('/mcp', { signal: ctl.signal, headers: { accept: 'text/markdown' } });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const body = await r.text();
      if (!/MCP endpoint/i.test(body)) throw new Error('unexpected reply');
    }
    if (tools && tools.length === 0) {
      setProbe('off', `Reached <b>${host}/mcp</b>, but it lists no tools yet. <span class="mut">Pair first, then check again.</span>`);
      return;
    }
    listening = true;
    const what = tools
      ? `lists ${tools.length} tool${tools.length === 1 ? '' : 's'}: ${tools.map((x) => `<code>${esc(x)}</code>`).join(', ')}`
      : 'answers. Its one tool is <code>superbot</code>';
    setProbe('on', `Listening. <b>${host}/mcp</b> ${what}. <span class="mut">Now restart your AI client and ask it the question below.</span>`);
    dispatchEvent(new CustomEvent('superbot:copied', { detail: { source: 'probe' } }));
  } catch (err) {
    setProbe('off', `Cannot see the server from here (${esc(err?.name === 'AbortError' ? 'timed out' : err?.message ?? err)}). <span class="mut">Run the install line, then check again.</span>`);
  } finally {
    clearTimeout(t);
  }
};
if (probe) {
  $('probeagain')?.addEventListener('click', runProbe);
  const askBtn = $('askcopy');
  askBtn?.addEventListener('click', () => copy($('askline').textContent, () => {
    askBtn.textContent = 'Copied';
    setTimeout(() => { askBtn.textContent = 'Copy the question'; }, 2000);
  }));
  runProbe();
}

// ---- the filter: one field narrows every section and every nav row to the
// words typed. A section shows when its own text matches; a nav row follows its
// section, so the two can never disagree about what is on the page.
const filter = $('pagefilter');
const filterNote = $('filtersum');
const filterClear = $('filterclear');
const words = (t) => t.toLowerCase().replace(/\s+/g, ' ');
const applyFilter = () => {
  if (!filter) return;
  const typed = filter.value.trim();
  const tokens = typed ? words(typed).split(' ').filter(Boolean) : [];
  const hits = (text) => tokens.every((w) => text.includes(w));
  let shown = 0;
  let total = 0;
  for (const group of groups) {
    let any = false;
    const heads = [...group.querySelectorAll(':scope > h2, :scope > .doc-lede')];
    for (const blk of group.querySelectorAll('.doc-block')) {
      total += 1;
      const text = words(blk.textContent);
      const ok = !tokens.length || hits(text);
      blk.hidden = !ok;
      const li = navFor(blk.id)?.closest('li');
      if (li) li.hidden = !ok;
      if (ok) { shown += 1; any = true; }
    }
    // a group with no blocks of its own (Start here) is matched on its whole text
    const ownOk = !tokens.length || hits(words(group.textContent));
    for (const el of heads) el.hidden = !ownOk;
    group.hidden = !ownOk && !any;
  }
  for (const nav of document.querySelectorAll('.doc-nav ul')) {
    const lis = [...nav.children];
    nav.hidden = lis.every((li) => li.hidden);
  }
  if (filterClear) filterClear.hidden = !tokens.length;
  if (filterNote) {
    filterNote.hidden = !tokens.length;
    if (tokens.length) filterNote.textContent = shown === 0 ? `Nothing on this page matches "${typed}".` : `Showing ${shown} of ${total} sections.`;
  }
  readPosition();
  markToc();
};
if (filter) {
  filter.addEventListener('input', applyFilter);
  filterClear?.addEventListener('click', () => { filter.value = ''; applyFilter(); filter.focus(); });
  filter.addEventListener('keydown', (e) => { if (e.key === 'Escape' && filter.value) { filter.value = ''; applyFilter(); } });
}