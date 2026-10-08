// The phone's sign-in CTA and its sheet (#65, 2026-09-27; the email bar of
// the CRO pass, 2026-09-26, before it), shared by / (placement 'sticky',
// anchored on the hero's form) and /features ('features_sticky', anchored on
// its headline). Its look is signin-sheet.css.
//
// A portrait phone past the anchor gets one button, "Join the beta", pinned
// where the thumb is. It opens a native <dialog> (showModal: the page goes
// inert, Tab stays inside, Esc closes, focus returns to the button) that
// holds one more waitlist mount: the hero's own provider stack, 'or' row,
// email step, in-app escape and done state, with no fork and no `bar` mode.
// The mount is made once, at load, inside the closed dialog, so a step taken
// in the sheet moves every other mount and the reverse: a reader who starts
// in the sheet can finish in the hero. That sharing is per module instance,
// so the import below MUST be the exact URL the pages import
// (/site/assets/waitlist-form.js?v=13): a different ?v= is a second module
// with its own state.
//
// The bar is up while the reader is past the anchor, no other form's field
// (or the "you're in." download button) is in view, no other field has focus
// and the flow is not done. "you're in." turns the CTA into its Download
// link on the same terms; any other finish takes it down. While the sheet is
// open the bar holds still under the scrim, so focus has its button to come
// back to. A finish inside the sheet keeps the sheet open on its done state
// until the reader closes it. On iOS the keyboard shrinks only the visual
// viewport, so --sheet-kb lifts the sheet onto it and --sheet-vv caps its
// height; the focused field is scrolled into the sheet's own view.
//
// A product mock's tap (mock-join.js, 2026-10-05) opens the same sheet, a
// second dialog of the same build whose mount is named 'mock' (so every form
// event of a start taken from a mock reads placement mock, and a step taken
// there moves every other mount all the same), under one line that says what
// the app does where the reader tapped. It is built at idle, once the page has
// settled, never in the tap. The open is reported as waitlist_sheet_open
// {placement: 'mock', section_id: the mock's section}, after the sheet's
// entrance ends and one idle slot (afterSettle below: the module's one settle
// seam), so the tap's own frames carry only the sheet's rise.
//
// Nothing here touches the URL: no route, hash or history entry.
//
// Desktop and tablet render no bar (the hero's form is inline there). The
// dialog is still built on every device, so a phone turned on its side with
// the sheet open keeps a fitting sheet; mountSignupBar returns { open } for
// any other entry point a page wants to wire.
import { mountWaitlist } from '../../site/assets/waitlist-form.js?v=13';
import { provideJoin } from '../../site/assets/mock-join.js?v=2';

// a mount's live control: its step's field, or the download button of "you're in."
const fieldOf = (s) => s.querySelector('.wl-row:not([hidden]) .wl-in, .wl-dl:not([hidden])');

// Lucide x.
const X_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

let seq = 0;

// the module's one settle seam: work waits for the sheet's REAL end (a
// transitionend whose target is the sheet itself) and one idle slot. `ms` is
// only the fallback for an end event that never comes, the entrance's length
// plus margin (--dur-5), read once at build time and never inside a tap.
function afterSettle(el, ms, fn) {
  let done = false;
  let fallback = 0;
  const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: ms }) : (f) => setTimeout(f);
  const end = (e) => { if (e.target === el) finish(); };
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener('transitionend', end);
    clearTimeout(fallback);
    idle(fn);
  };
  el.addEventListener('transitionend', end);
  fallback = setTimeout(finish, ms); /* settle-seam */
}

/** One sign-in sheet: a native <dialog> (showModal: the page goes inert, Tab
 *  stays inside, Esc closes, focus returns to what opened it) holding one more
 *  waitlist mount named `placement`, and its keyboard fit on iOS. `withLine`
 *  adds the one-line prompt a mock's tap sets. `onClose` runs after the sheet
 *  has closed. Returns { sheet, slot, open, setLine }; open() is false when it
 *  was already open. */
function makeSheet({ placement, id, inviteHref, withLine = false, onClose = null }) {
  const root = document.documentElement;
  // the sheet: handle, title and close, then the mount
  const sheet = document.createElement('dialog');
  sheet.className = 'sb-sheet';
  sheet.id = id;
  sheet.setAttribute('aria-labelledby', `${id}-title`);
  sheet.innerHTML =
    '<div class="sb-sheet-grab" aria-hidden="true"></div>' +
    '<div class="sb-sheet-head">' +
    `<h2 class="sb-sheet-title" id="${id}-title">join the beta.</h2>` +
    `<button type="button" class="sb-sheet-x" aria-label="Close" data-signin-close>${X_ICON}</button>` +
    '</div>' +
    `<div class="sb-sheet-body">${withLine ? '<p class="sb-sheet-line" hidden></p>' : ''}<div data-sheet-slot></div></div>`;
  const title = sheet.querySelector('.sb-sheet-title');
  const body = sheet.querySelector('.sb-sheet-body');
  const slot = body.querySelector('[data-sheet-slot]');
  const lineEl = sheet.querySelector('.sb-sheet-line');
  document.body.append(sheet);
  mountWaitlist(slot, { placement, inviteHref });

  const vv = window.visualViewport;
  // the visual viewport while open: the keyboard's height under the sheet
  // and the height it may take; the focused field stays in the sheet's view
  const fit = () => {
    if (!sheet.open) return;
    const kb = `${vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0}px`;
    const h = vv ? `${Math.round(vv.height)}px` : '';
    if (kb !== sheet.style.getPropertyValue('--sheet-kb')) sheet.style.setProperty('--sheet-kb', kb);
    if (h && h !== sheet.style.getPropertyValue('--sheet-vv')) sheet.style.setProperty('--sheet-vv', h);
    const f = document.activeElement;
    if (!f?.matches?.('input, textarea') || !body.contains(f)) return;
    // the field's whole row (the field and its Continue) when it fits, else the field
    const box = body.getBoundingClientRect();
    const row = f.closest('.wl-row')?.getBoundingClientRect();
    const r = row && row.height <= box.height ? row : f.getBoundingClientRect();
    if (r.bottom > box.bottom) body.scrollTop += r.bottom - box.bottom;
    else if (r.top < box.top) body.scrollTop -= box.top - r.top;
  };
  let fitFrame = 0;
  const refit = () => { if (!fitFrame) fitFrame = requestAnimationFrame(() => { fitFrame = 0; fit(); }); };
  // the title steps aside for the done state's own ("you're in."), and
  // still names the dialog for a screen reader; the mock's line goes with it
  const syncTitle = () => {
    const done = slot.dataset.state === 'done';
    title.classList.toggle('sb-visually-hidden', done);
    if (lineEl) lineEl.hidden = done || !lineEl.textContent;
  };
  const setLine = (text) => { if (lineEl && lineEl.textContent !== text) lineEl.textContent = text; };

  const open = () => {
    if (sheet.open) return false;
    syncTitle();
    sheet.showModal();
    root.classList.add('sb-sheet-open');
    fit();
    return true;
  };
  const close = () => { if (sheet.open) sheet.close(); };
  sheet.querySelector('[data-signin-close]').addEventListener('click', close);
  // a tap on the backdrop: the click lands on the dialog itself, at a point
  // outside its box (a tap inside the box lands on its content)
  sheet.addEventListener('click', (e) => {
    if (e.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  sheet.addEventListener('close', () => {
    root.classList.remove('sb-sheet-open');
    onClose?.();
    // after "you're on the list." the CTA hides, so focus would fall to the
    // body: hand it to the page's own done title (no scroll jump)
    requestAnimationFrame(() => {
      const act = document.activeElement;
      if (act && act !== document.body && act.offsetParent !== null) return;
      document.querySelector('.wl:not(.sb-sheet .wl) .wl-done:not([hidden]) .wl-title:not([hidden])')?.focus({ preventScroll: true });
    });
  });
  sheet.addEventListener('focusin', refit);
  for (const ev of ['resize', 'scroll']) vv?.addEventListener(ev, refit, { passive: true });
  new MutationObserver(syncTitle).observe(slot, { attributes: true, attributeFilter: ['data-state'] });
  return { sheet, slot, open, setLine };
}

/** Mount the CTA bar and its sheet. `anchor`: the bar waits until this has
 *  scrolled up under the header; a waitlist mount (.wl) counts by its
 *  visible field. `quiet`: an optional () => boolean that holds the bar down
 *  (an open menu). Returns { bar, sheet, open }. */
export function mountSignupBar({ placement, anchor, inviteHref = '/invite?next=/download', quiet = null }) {
  const n = ++seq;
  const root = document.documentElement;

  // the bar: one CTA, and the download link "you're in." swaps it for
  const bar = document.createElement('div');
  bar.className = 'sb-cta-bar';
  const sheetId = `sb-signin-${n}`;
  // data-track: the tap is a cta_click (ga4.d4d15ea9.js), cta_id 'sticky_join'
  // on / and 'features_sticky_join' on /features; waitlist_sheet_open below
  // is the form start the forms lane counts
  bar.innerHTML =
    `<button type="button" class="sb-btn sb-cta-go" aria-haspopup="dialog" aria-controls="${sheetId}" aria-expanded="false" data-signin-open data-track="${placement}_join">Join the beta</button>` +
    '<a class="sb-btn sb-cta-go" href="/download" data-signin-dl hidden>Download superbot</a>';
  const go = bar.querySelector('[data-signin-open]');
  const dl = bar.querySelector('[data-signin-dl]');
  document.body.append(bar);

  const phone = matchMedia('(max-width: 560px) and (orientation: portrait)');
  const header = document.querySelector('.sb-header');
  let frame = 0;

  // ── the sheet ──
  const main = makeSheet({
    placement, id: sheetId, inviteHref,
    onClose: () => {
      go.setAttribute('aria-expanded', 'false');
      // showModal returns focus to the CTA; after "you're in." the CTA is the
      // download link, so focus goes there instead
      if (!dl.hidden) dl.focus();
      schedule();
    },
  });
  const { sheet, slot } = main;
  const open = () => {
    if (!main.open()) return;
    go.setAttribute('aria-expanded', 'true');
    window.sbTrack?.('waitlist_sheet_open', { placement });
  };
  go.addEventListener('click', open);

  // ── a product mock's tap: the same sheet under the placement 'mock' ──
  // built at idle (a mock is not on screen at load), or in the tap that beats
  // it; the bar holds still under it as under the sheet
  let mock = null;
  let settleMs = 0;
  const mockSheet = () => {
    if (mock) return mock;
    settleMs = parseFloat(getComputedStyle(root).getPropertyValue('--dur-5')) || 500;
    return (mock = makeSheet({ placement: 'mock', id: `${sheetId}-mock`, inviteHref, withLine: true, onClose: () => schedule() }));
  };
  provideJoin(({ section, line }) => {
    const m = mockSheet();
    if (main.sheet.open || m.sheet.open) return;
    m.setLine(line);
    if (m.open()) afterSettle(m.sheet, settleMs, () => window.sbTrack?.('waitlist_sheet_open', { placement: 'mock', section_id: section }));
  });
  // a tap that beats the idle slot builds it there and then
  (window.requestIdleCallback ? (f) => requestIdleCallback(f) : (f) => setTimeout(f))(mockSheet);

  // ── the bar ──
  const update = () => {
    frame = 0;
    const state = slot.dataset.state;
    const granted = state === 'done' && slot.dataset.done === 'in';
    if (go.hidden !== granted) { go.hidden = granted; dl.hidden = !granted; }
    if (sheet.open || mock?.sheet.open) return; // the bar holds still under the scrim
    const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
    const inView = (el) => { const r = el?.getBoundingClientRect(); return !!r && r.height > 0 && r.bottom > top && r.top < innerHeight; };
    const act = document.activeElement;
    const typing = !!act?.matches?.('input, textarea, select');
    const others = [...document.querySelectorAll('.wl')].filter((s) => s !== slot);
    const mark = anchor?.classList?.contains('wl') ? fieldOf(anchor) : anchor;
    const pastAnchor = !mark || mark.getBoundingClientRect().bottom <= top;
    // still something to do here: a step, or "you're in." and its download
    const live = state !== 'done' || granted;
    const on = phone.matches && !quiet?.() && live && pastAnchor && !typing && !others.some((s) => inView(fieldOf(s)));
    const h = `${bar.offsetHeight}px`;
    if (h !== root.style.getPropertyValue('--sb-cta-h')) root.style.setProperty('--sb-cta-h', h);
    if (on !== bar.classList.contains('is-on')) { bar.classList.toggle('is-on', on); root.classList.toggle('sb-cta-pad', on); }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const events = [[window, 'scroll'], [window, 'resize'], [document, 'focusin'], [document, 'focusout']];
  if (quiet) events.push([document, 'click'], [document, 'keydown']);
  for (const [t, ev] of events) t?.addEventListener(ev, schedule, { passive: true });
  phone.addEventListener('change', schedule);
  new MutationObserver(schedule).observe(slot, { attributes: true, attributeFilter: ['data-state', 'data-done'] });
  new ResizeObserver(schedule).observe(bar);
  schedule();
  return { bar, sheet, open };
}
