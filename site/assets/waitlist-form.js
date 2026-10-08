// The beta door, inline (2026-09-25; accounts first since 2026-09-27, plan
// P7). superbot.gg/ used to send an anonymous visitor to the top-right pill,
// then /invite on a new page, to ask for early access; GA on cut-over day
// read 102 home visitors, 4 CTA clicks. This mounts the sign-up where the
// reader already is, with no navigation: the provider slot (when the edge
// configured any), then email, then the 8-digit code from the mail. The
// verify makes the account, signs it in and runs admit() (the edge's
// POST /invite/waitlist/verify, same-origin on the open host: routes
// heroAccountMode), and the flow ends in "you're in." with a download
// button when admit() granted, or "you're on the list." when it did not.
// The shared terms notice (one compact row, "Terms · Privacy · 13+", since
// 2026-09-28) sits under the button in every step
// that can lead to the account, byte-for-byte the /invite join step's
// (edge/src/beta/pages.c1bff7a8.ts termsNoticeHtml, with the open host's
// /legal/* links). It is tease.html's CONTRACT-W1 pair (the only JSON pair
// the invite routes have: edge/src/beta/routes.c1bff7a8.ts waitlistMode),
// posted same-origin; a cross-origin caller (the tease capsule) stays
// list-only, and its answer carries no `account`, so it ends on the list.
//
// Several mounts share one state (the hero's, the download band's, the end of
// /features' and, on a phone, the sign-in sheet's 'sticky'): a step taken in
// one moves every other, and an address typed into one is typed into every
// other, so a reader who starts in the hero finishes in the sheet. That
// sharing is per module instance: every page and signup-bar.js import this
// file at ONE URL (/site/assets/waitlist-form.js?v=13). The GA client already reads these calls
// (ga4.d4d15ea9.js: generate_lead on a join that is a new lead,
// waitlist_verified on a list-only verify, both carrying {placement} from
// window.sbWaitlistPlacement, set right before each POST, and sign_up / login
// {method, placement} instead when the verify made or signed in the account;
// any of them skipped when the edge sent it itself, the answer's `mp`
// naming it); this adds the steps around them, each with the
// mount's placement, so the funnel reads field focus -> submit -> code ->
// verified and says where it breaks:
//   waitlist_focus {placement}                 first focus on an email field, once per placement
//   waitlist_submit {placement}                a valid email sent
//   waitlist_code_submit {placement}           an 8-digit code sent
//   waitlist_error {placement, step, reason}   what stopped a step
//   waitlist_resend / waitlist_restart {placement}
//   waitlist_provider {placement, provider}    a "continue with" provider button
//       was taken (provider 'apple' | 'google' | 'x'); m.provider(name) and
//       trackWaitlistProvider(placement, name) send it
// and, per field (Zuko-style field metrics, Snowplow focus/change/submit):
//   waitlist_field {placement, field, field_ms, autofill, pasted, edits, returns}
//       on each blur of the email or code field (40 a page view at most):
//       field 'email' | 'code'; field_ms focus to blur; edits = input events;
//       returns = times this field was focused again after a blur (this page
//       view); autofill / pasted are '1' | '0'. autofill = an input with
//       inputType insertReplacementText, or with no inputType and no keydown
//       since focus (iOS's one-time-code suggestion lands that way), or the
//       field matching :autofill / :-webkit-autofill at blur.
//   waitlist_away {placement, step, last_field}   the page hid mid-flow
//   waitlist_back {placement, step, away_ms}      ... and came back
//       once a field was focused and until the flow is done; step 'email' |
//       'verify'. visibilitychange, not pagehide: iOS skips pagehide on an app
//       switch, and the verify step sends the reader to Mail for the code.
//       20 pairs a page view at most. Not sent for a hide that is the page
//       being left through a same-tab link in the form (a provider button,
//       "have an invite code?", "Open in your browser"): that is a leave,
//       never a tab switch (see LEAVE_MS below).
// window.sbWaitlistStep = 'none' | 'email' | 'verify' | 'done' is the flow
// state ('none' until a waitlist field is focused); the GA client's page_exit
// reports it as wl_step. How the flow ended ('in', 'list', or 'wait' for a
// list-only answer) is each mount's data-done, beside its data-state.
//
// Server side, each join and verify POST carries `placement` and `flow` (a
// random id kept in sessionStorage for this tab): the edge's beta_events rows
// (edge/src/beta/events.164c18f8.ts) record surface lander:<placement> and tie
// one reader's steps together. Nothing about the reader is in either.

// The look (#61 / #54 / #57, 2026-09-27; waitlist.css carries the full plan):
// the provider stack is Apple white, Google's dark theme and a quiet X, each
// wrapped in a `.pv` box so the "Last used" pill (last-signin.js, the method
// this device signed in with) straddles the top edge of the one it marks
// without moving anything; an 'or' hairline sits between the stack and the
// email field; the done state is one card with the mascot, happy, as the bare
// echo mark (its cyan and magenta copies on the superbot.gg landing's split
// loop, the mark on its slow float; no ring, no shimmer).

// EVERY sibling import below carries its own `?v=` (ga-audit 2026-09-30: 148
// visitors never got the form, "Importing binding name 'withCampaign' /
// 'isApplePlatform' is not found"). A bare `./attribution.js` is one URL for
// bytes that change: a copy of it held by the browser or the CDN (served stale
// while it revalidates) met a newer waitlist-form.js asking for an export that
// copy lacks, and the whole module graph failed. A version in the specifier
// makes the URL name the bytes: when a sibling changes, bump ITS number here,
// then bump this file's own `?v=` in every importer (the lander, /features
// and signup-bar.js). edge/test/site-asset-versions.65d3cf7b.test.ts fails on
// any site/assets import with no `?v=`, and edge/test/site-asset-versions.test.ts
// on one asset under two numbers. A sibling edited WITHOUT its bump is the same
// failure, and the lock test (same file: "every versioned module is the bytes
// its ?v= was locked at") is what catches it: attribution.js changed under
// ?v=1 in 3a45e4b2a (2026-10-04, K62) and shipped, so copies cached under ?v=1
// sat beside newer bytes until ga-audit 2026-10-05 ran the test (now ?v=2).
//
// Importing attribution.js records this page load's campaign / click id /
// outside referrer (first and last touch, localStorage sb-attr); join() and
// the verify send both as `attr` (the verify's is the account's signup
// attribution).
import { attrParam, withCampaign } from './attribution.js?v=2';
// "Last used" (#54): the method only, never an identifier (see its header).
import { markPending, promoteLast, readLast } from './last-signin.js?v=1';
// The mascot: the badge's tiny face and the done state's. The same ?v= the
// lander's own script and hub-boot.js import, so the page keeps one copy.
import { markSvg, mountMascotMark } from './mascot-mark.js?v=3';
// The in-app rule and the escape link: the edge's own (federated-providers
// imports this same file), so the hero always matches the /invite slot.
import { ESCAPE, escapeHref, escapeMode, isApplePlatform, isInAppBrowser } from './in-app.js?v=1';

export { ESCAPE, escapeHref, escapeMode, isInAppBrowser };

const KEY = 'sb-waitlist'; // shared with tease.html: a reload mid-verify resumes
// Copy budget for every line the form puts in .wl-msg (the ERR table, rateMsg
// and the m.say notes in mountWaitlist): one sentence, one line, never wrapped
// (one-line-sentences.mdc). Measured headless (Chromium, macOS system font,
// 2026-10-03) on the real hero, lander-agent.html at deviceScaleFactor 2: the
// line is 14px / 20px (--fs-sm / --lh-sm) and its box is the hero column, 288px
// at 320 wide and 358px at 390 wide (the download band and the sign-in sheet
// measure the same). A lowercase sentence averages 6.2px a character there, so
// the budget is 46 characters at 320 and 57 at 390: write to 46. The longest
// realistic dynamic line counts: rateMsg at 'wait 60 min.' is 28. (The "34
// characters of body" in markup's note is the app lane pane, not this slot.)
// edge/test/waitlist-form-errors.test.ts pins every line to the 46.
const ERR = {
  email: "that email doesn't look right.",
  code: "that code doesn't match. check the email.",
  off: 'the list is closed right now.',
  origin: 'sign-up is refused here. try again later.',
  network: "can't reach the server. try again.",
  short: 'the code is 8 digits.',
  sso: "use your team's work sign-in.", // true with or without the redirect (ssoHref): it may be on screen only a moment
};
const rateMsg = (h) => {
  let s = Number(h);
  if (h && !Number.isFinite(s)) s = Math.round((Date.parse(h) - Date.now()) / 1000);
  if (!h || !Number.isFinite(s) || s <= 0) return 'too many tries. give it a minute.';
  return s <= 90 ? `too many tries. wait ${s}s.` : `too many tries. wait ${Math.ceil(s / 60)} min.`;
};

// ── the address, as typed ──
// What the field holds is not always what the reader typed (ga-audit
// 2026-09-30: email/invalid_email on 8 of 23 hero focusers, 38% of attempts
// refused). Autofill and paste carry invisible characters (a zero-width space,
// a word joiner, a byte-order mark, the bidi marks iOS puts around an address
// pasted from Contacts or Mail: all Unicode format characters, Cf) and edge
// whitespace; a mobile keyboard adds a trailing '.' after a suggestion.
// normalizeEmail drops every Cf character (and U+0085) wherever it sits, except
// the zero-width non-joiner and joiner, which only the ends lose (an
// Arabic-script or Indic address can use them inside); trims every Unicode
// space at both ends (NBSP, U+3000 ...); and strips ONE trailing '.', then
// trims again. It never lowercases or rewrites anything else: the edge
// lowercases (normalizeBetaEmail).
// The shape test runs on that, and only on submit (never on blur or input: a
// reader mid-address is not told it looks wrong); a refusal is still the
// 'invalid_email' reason, the same copy, the same event.
// The shape is the edge's (normalizeBetaEmail: one '@', no whitespace, a dot
// inside the domain) and so is its 254-character cap, checked first by the
// lookahead: an address the edge would answer 400 {error:'email'} is refused
// here as 'invalid_email' instead, and a pasted run of dots can no longer cost
// the page a quadratic backtrack (`a@` + 80,000 dots + `@` froze the tab for
// 3.6 s without the cap; the lookahead reads at most 255 characters).
export const EMAIL_RE = /^(?=.{1,254}$)[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INNER_INVISIBLE = /(?![\u200C\u200D])[\p{Cf}\u0085]/gu;
// After INNER_INVISIBLE the only non-space characters left to trim are the two
// joiners; a loop, not a `^\s+|\s+$` regex, so a pasted run of a million
// spaces costs a million steps and not a million squared.
const EDGE_ONE = /[\s\u200C\u200D]/;
const trimEdges = (s) => {
  let a = 0, b = s.length;
  while (a < b && EDGE_ONE.test(s[a])) a++;
  while (b > a && EDGE_ONE.test(s[b - 1])) b--;
  return s.slice(a, b);
};

/** The address as it should be tested and sent: `raw` without invisible
 *  characters, edge whitespace or one trailing '.'. */
export function normalizeEmail(raw) {
  let s = trimEdges(String(raw ?? '').replace(INNER_INVISIBLE, ''));
  if (s.endsWith('.')) s = trimEdges(s.slice(0, -1));
  return s;
}

/** Where "you're in." sends the reader: the download page (the account the
 *  verify signed in holds the grant it needs). */
export const DOWNLOAD_HREF = '/download';

/** The passive terms notice, byte-for-byte edge/src/beta/pages.c1bff7a8.ts
 *  termsNoticeHtml({ terms: '/legal/terms', privacy: '/legal/privacy' }) (the
 *  open host's legal paths; /legal/* is anonymous there), but for `id`, which
 *  is per mount so each button names its own notice. edge/test/
 *  beta-hero-account.164c18f8.test.ts holds the two equal.
 *  Since 2026-09-28 it is ONE compact row, "Terms · Privacy · 13+" (owner:
 *  "shrink the terms and tos text like how we did on the Superbot Desktop
 *  login page, too cluttered"): the desktop sign-in's LEGAL_ROW (superbot-
 *  desktop routes/terms-notice-copy.ts, joined by LEGAL_ROW_SEPARATOR, a
 *  middle dot U+00B7 with a space either side), the row mobile shows too.
 *  Terms and Privacy link the same pages the three lines did; 13+ is plain.
 *  Every button above it still says "Continue" and names it in
 *  aria-describedby, so a screen reader reads the row with the button: the
 *  click is the assent. No checkbox anywhere. */
export function termsNoticeHtml(id) {
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  return (
    `<p class="terms-notice" id="${id}">` +
    [link('/legal/terms', 'Terms'), link('/legal/privacy', 'Privacy'), '13+'].join(' · ') +
    '</p>'
  );
}

// ── the provider slot (plan steps 6-8) ──
// The edge hands the configured providers over as a JSON island, <script
// type="application/json" id="sb-join-providers">[{ id, label, href, icon? }]
// </script> (edge/src/beta/routes.c1bff7a8.ts joinProvidersScript, the same
// entries as the /invite join step's slot). No island, no provider, and
// nothing renders. Each entry becomes one "Continue with …" link above the
// email field, in every mount, inside its own `<div class="pv">`: the wrapper
// is the stack's grid item and the positioning box of the "Last used" pill,
// so marking a button later never changes the button's own box (the button
// clips its aura layers, so a pill inside it would be cut; Better Auth's
// last-login-method recipe, a relative wrapper around the button).
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ENT[ch]);
const okProvider = (p) =>
  !!p && typeof p === 'object' &&
  typeof p.id === 'string' && /^[a-z][a-z0-9_]{0,19}$/.test(p.id) &&
  typeof p.label === 'string' && /^Continue with [^<>]{1,30}$/.test(p.label) &&
  typeof p.href === 'string' && /^\/(?!\/)[^\s"'<>]*$/.test(p.href);

// ── in-app browsers (plan P1, step 7) ──
// Google refuses embedded webviews, so inside an in-app browser (./in-app.js
// isInAppBrowser, the edge's rule) Google is dropped and "Open in your
// browser" closes the slot in its stead. The edge marks it in the island (id
// 'browser'), but its link is always rebuilt here from the reader's own user
// agent and URL (./in-app.js escapeHref: x-safari-https://, intent:// or the
// page itself, nothing else), never taken from the island.
// Lucide external-link.
const ESCAPE_ICON =
  '<svg class="bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
const okEscape = (p) => !!p && typeof p === 'object' && p.id === ESCAPE.id && p.label === ESCAPE.label;

/** The providers the edge configured, from the page's #sb-join-providers
 *  island (and its "Open in your browser" entry, when the edge saw an in-app
 *  browser); [] when there is none or it does not parse. */
export function edgeProviders(doc = document) {
  const el = doc.getElementById?.('sb-join-providers');
  if (!el) return [];
  try {
    const list = JSON.parse(el.textContent || '[]');
    return Array.isArray(list) ? list.filter((p) => okProvider(p) || okEscape(p)) : [];
  } catch (e) {
    console.error('waitlist: the provider island does not parse', e);
    return [];
  }
}

// The escape hands THIS page to the system browser, a new GA client: a
// reader who moved on from the ad's landing URL (/features, a reload without
// the query) would arrive there with no campaign, so the stored touch's
// utm_* / click id ride along where the URL has none (attribution.js
// withCampaign; same origin, so escapeHref still accepts it).
const here = () => ({
  ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  url: typeof location !== 'undefined' ? withCampaign(location.href) : '',
});

/** The slot's markup for one mount: '' for no provider. Each link carries the
 *  mount's `placement` and names the notice under the email button. `at` is
 *  the reader ({ua, url}, this page by default): Apple renders only on macOS
 *  and iOS (isApplePlatform); in an in-app browser Google
 *  goes and "Open in your browser" (its link built here, from `at`, never
 *  from the island) closes the slot; elsewhere no escape renders. */
export function providerSlotHtml(list, placement, noticeId, at = here()) {
  const all = list || [];
  const inApp = isInAppBrowser(at.ua);
  const apple = isApplePlatform(at.ua);
  const ok = all.filter(okProvider).filter((p) => !(inApp && p.id === 'google') && (apple || p.id !== 'apple'));
  const out = inApp && (all.some(okEscape) || all.some((p) => okProvider(p) && p.id === 'google')) ? escapeHref(at.ua, at.url) : '';
  const only = escapeMode(at.ua) === 'copy';
  if (!ok.length && !out) return '';
  const withPlacement = (href) => `${href}${href.includes('?') ? '&' : '?'}placement=${encodeURIComponent(placement)}`;
  const icon = (s) => (typeof s === 'string' && /^<svg[\s>]/.test(s) && !/<script|\bon[a-z]+=/i.test(s) ? s : '');
  return (
    '<div class="wl-pv" data-show="email" data-wl-providers>' +
    ok.map((p) => `<div class="pv"><a class="sb-btn ghost wl-pv-btn" href="${esc(withPlacement(p.href))}" data-provider="${esc(p.id)}" aria-describedby="${noticeId}">${icon(p.icon)}${esc(p.label)}</a></div>`).join('') +
    (out
      ? `<div class="pv"><a class="sb-btn ghost wl-pv-btn" href="${esc(out)}" data-escape${only ? ' data-copy-only' : ''} data-url="${esc(at.url)}">${ESCAPE_ICON}<span data-escape-label aria-live="polite">${esc(ESCAPE.label)}</span></a></div>` +
        `<p class="wl-alt" data-escape-hint hidden>${esc(ESCAPE.paste)}</p>`
      : '') +
    '</div>'
  );
}

/** "Open in your browser": the page link is copied in the tap itself (the
 *  clipboard needs the gesture). A copy-only app (its webview swallows the
 *  hand-off) says so at once; otherwise, if this page still shows a moment
 *  later, the system browser did not open, so the label and the line under it
 *  say so then. A failed copy shows the link itself, to copy by hand: at once
 *  in a copy-only app, and in the safari and intent modes once the page is
 *  still showing a moment later (the hand-off failed too). */
function bindEscape(a) {
  a.addEventListener('click', (e) => {
    const url = a.dataset.url;
    if (!url) return;
    const only = a.hasAttribute('data-copy-only');
    if (only) e.preventDefault();
    const say = (ok) => {
      const label = a.querySelector('[data-escape-label]');
      if (ok && label) label.textContent = ESCAPE.copied;
      const hint = a.closest('[data-wl-providers]')?.querySelector('[data-escape-hint]');
      if (hint) { if (!ok) hint.textContent = url; hint.hidden = false; }
    };
    const later = (ok) => {
      if (only) say(ok);
      else setTimeout(() => { if (document.visibilityState === 'visible') say(ok); }, 1200);
    };
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(url).then(() => later(true), () => later(false)); return; }
    } catch (err) { /* no clipboard */ }
    later(false);
  });
}

/** A provider start link with the signup attribution `attr` (attrParam's
 *  JSON) as its query: unchanged when there is none or it already has one. */
export function withAttr(href, attr) {
  if (typeof href !== 'string' || !href || !attr || /[?&]attr=/.test(href)) return href;
  return `${href}${href.includes('?') ? '&' : '?'}attr=${encodeURIComponent(attr)}`;
}

const mounts = [];
let state = 'email';
let outcome = ''; // at 'done': 'in' (granted), 'list' (an account, no grant), 'wait' (list-only answer)
let email = '';
let busy = false;
let seq = 0;

async function call(path, params) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(path, {
      method: 'POST', body: new URLSearchParams(params), credentials: 'same-origin',
      headers: { accept: 'application/json' }, signal: ctl.signal,
    });
    let j = null;
    try { j = await r.json(); } catch (e) { console.error(`waitlist: ${path} answered ${r.status} without JSON`, e); }
    return { status: r.status, j: j || {}, retry: r.headers.get('Retry-After') };
  } catch (e) {
    console.error(`waitlist: ${path} failed`, e);
    return { status: 0, j: { ok: false, error: 'network' }, retry: null };
  } finally {
    clearTimeout(t);
  }
}

const track = (name, params) => window.sbTrack?.(name, params);

/** waitlist_provider {placement, provider}: a "continue with" provider taken
 *  from the mount named `placement`. The provider buttons call it. */
export function trackWaitlistProvider(placement, provider) {
  if (typeof provider !== 'string' || !/^[a-z][a-z0-9_]{0,19}$/.test(provider)) return;
  track('waitlist_provider', { placement, provider });
}

// The funnel flow id for beta_events: random, per tab, never derived from the reader.
const FLOW_KEY = 'sb-wl-flow';
let flowId = '';
function flow() {
  if (flowId) return flowId;
  try { flowId = sessionStorage.getItem(FLOW_KEY) || ''; } catch (e) { /* storage off */ }
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(flowId)) {
    const b = new Uint8Array(12);
    try { crypto.getRandomValues(b); } catch (e) { for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256); }
    flowId = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try { sessionStorage.setItem(FLOW_KEY, flowId); } catch (e) { /* storage off */ }
  }
  return flowId;
}
// placements that sent their first waitlist_focus: one per form (the hero,
// the phone sheet, the end of /features ...), never twice for one form
const focused = new Set();

// field metrics and away/back (see the header); never throws into the page
let lastField = null; // { placement, field } of the last focused waitlist field
let fieldsSent = 0;
let awayAt = 0;
let awayStep = '';
let awaySent = 0;
const publishStep = () => { window.sbWaitlistStep = lastField ? state : 'none'; };
if (typeof window.sbWaitlistStep !== 'string') window.sbWaitlistStep = 'none';

/** How one input event filled a field: 'paste', 'auto' (autofill, a keyboard
 *  suggestion tap, anything that is not the reader typing) or 'typed'. `grew`
 *  is how many characters the value gained in that event: typing adds one, so
 *  a plain insertText that adds several is a suggestion or an autofill, whatever
 *  inputType the engine reports for it (the iOS one-time-code suggestion and a
 *  keyboard's clipboard chip have not been seen on a device here: ga-audit
 *  2026-10-02 read autofill 0% on the code field, from about eight mobile
 *  events, so the inputType rule alone cannot be trusted to see them). */
export function fillKind(type, grew, keyed) {
  if (type === 'insertFromPaste' || type === 'insertFromPasteAsQuotation') return 'paste';
  if (type === 'insertReplacementText' || ((type === undefined || type === '') && !keyed)) return 'auto';
  if (grew > 1 && (type === 'insertText' || type === undefined || type === '')) return 'auto';
  return 'typed';
}

function watchField(el, field, placement) {
  let at = 0, blurs = 0, returns = 0, edits = 0, keyed = false, auto = false, pasted = false, len = 0;
  const autofilled = () => {
    for (const sel of [':autofill', ':-webkit-autofill']) {
      try { if (el.matches(sel)) return true; } catch (e) { /* engine without this selector */ }
    }
    return false;
  };
  const safe = (fn) => (e) => { try { fn(e); } catch (x) { /* analytics only */ } };
  el.addEventListener('focus', safe(() => {
    if (blurs) returns++;
    at = Date.now();
    keyed = false;
    len = el.value.length;
    lastField = { placement, field };
    publishStep();
  }));
  el.addEventListener('keydown', safe(() => { keyed = true; }));
  el.addEventListener('paste', safe(() => { pasted = true; }));
  el.addEventListener('input', safe((e) => {
    edits++;
    const grew = el.value.length - len;
    len = el.value.length;
    const kind = fillKind(e.inputType, grew, keyed);
    if (kind === 'paste') pasted = true;
    else if (kind === 'auto') auto = true;
  }));
  el.addEventListener('blur', safe(() => {
    if (!at) return;
    blurs++;
    const ms = Math.max(0, Math.round(Date.now() - at));
    at = 0;
    keyed = false;
    if (autofilled()) auto = true;
    if (fieldsSent < 40) {
      fieldsSent++;
      track('waitlist_field', { placement, field, field_ms: ms, autofill: auto ? '1' : '0', pasted: pasted ? '1' : '0', edits, returns });
    }
    edits = 0;
    auto = false;
    pasted = false;
  }));
}

// A same-tab link tapped in the form (a provider button, "have an invite code?",
// "Open in your browser") takes the reader AWAY FROM THE PAGE: the document
// hides as the next one loads, and no waitlist_back can follow, because the
// flow carries on elsewhere (ga-audit 2026-10-02: 34 waitlist_away at the hero
// email step against 13 waitlist_back, all last_field email; a headless
// Chromium repro, focus the email field then tap a provider, sent
// waitlist_away right after waitlist_provider). That is a leave, which
// waitlist_provider already reports, not a tab switch, so the hide that comes
// within LEAVE_MS of such a click sends no waitlist_away (and so no
// waitlist_back). A new tab (target=_blank: the terms links), a modified
// click and a click something already handled (the copy-only escape) are the
// reader still being here, and count as before.
export const LEAVE_MS = 5000;
/** Whether click `e` on anchor `a` leaves this page in this tab. */
export function isLeavingClick(e, a) {
  if (!e || !a || !a.getAttribute?.('href')) return false;
  if (a.target && a.target !== '_self') return false;
  if (e.defaultPrevented || (e.button ?? 0) !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  return true;
}
let leftAt = 0; // when the last leaving click happened

document.addEventListener('visibilitychange', () => {
  try {
    if (document.visibilityState === 'hidden') {
      const leaving = leftAt && Date.now() - leftAt < LEAVE_MS;
      leftAt = 0;
      if (leaving) return;
      if (!lastField || state === 'done' || awayAt || awaySent >= 20) return;
      awaySent++;
      awayAt = Date.now();
      awayStep = state;
      track('waitlist_away', { placement: lastField.placement, step: awayStep, last_field: lastField.field });
    } else if (awayAt) {
      const ms = Math.max(0, Math.round(Date.now() - awayAt));
      awayAt = 0;
      track('waitlist_back', { placement: lastField.placement, step: awayStep, away_ms: ms });
    }
  } catch (e) { /* analytics only */ }
});
// The copy for a failed POST. Every refusal the edge sends is a JSON `error`:
// email, code, rate, off, origin, and sso_required (409, an address whose org
// enforces single sign-on: no code is mailed and none is checked). sso_required
// used to fall through to the network line, "can't reach the server", for a
// reader who had reached it. Anything unnamed still reads as the network line.
export const errText = (res) => {
  const e = res.j.error;
  if (e === 'rate' || res.status === 429) return rateMsg(res.retry);
  if (e === 'sso_required') return ERR.sso;
  return ERR[e] || ERR.network;
};

/** Where an sso_required answer sends the reader: its `sso_url` when that is
 *  this page's own origin and the /invite/auth/sso start (the edge builds it
 *  from the request host; the same hand-off the /invite forms 303 to), else ''.
 *  `base` is the page's URL. */
export function ssoHref(res, base = typeof location !== 'undefined' ? location.href : '') {
  const url = res?.j?.sso_url;
  if (res?.j?.error !== 'sso_required' || typeof url !== 'string' || !url || !base) return '';
  try {
    const u = new URL(url, base);
    return u.origin === new URL(base).origin && u.pathname === '/invite/auth/sso' ? u.href : '';
  } catch (e) {
    return '';
  }
}

/** A failed POST's reason for waitlist_error: the edge's `error` (call() names
 *  a dead connection 'network'), else 'rate' for a 429 with no body, else the
 *  HTTP status. Every failure of a join, resend or verify reports one. */
const reasonOf = (res) => res.j.error || (res.status === 429 ? 'rate' : `http_${res.status}`);

// One tap to the inbox the code went to, for the big webmail hosts (on an
// iPhone, Security Code AutoFill usually offers the code above the keyboard
// first; this is the path when it does not). A new tab, so this page and its
// code step stay where they are. Unknown domains get no link.
const INBOX = [
  [/^(gmail|googlemail)\.com$/, 'Gmail', 'https://mail.google.com/mail/u/0/#search/from%3Asuperbot'],
  [/^(outlook|hotmail|live|msn)\.[a-z.]+$/, 'Outlook', 'https://outlook.live.com/mail/0/'],
  [/^(yahoo|ymail)\.[a-z.]+$/, 'Yahoo Mail', 'https://mail.yahoo.com/'],
  [/^(icloud|me|mac)\.com$/, 'iCloud Mail', 'https://www.icloud.com/mail'],
  [/^(proton\.me|protonmail\.com|pm\.me)$/, 'Proton Mail', 'https://mail.proton.me/'],
];
const inboxOf = (addr) => {
  const host = addr.split('@')[1]?.toLowerCase() ?? '';
  const hit = INBOX.find(([re]) => re.test(host));
  return hit ? { name: hit[1], href: hit[2] } : null;
};

// An element shows in the steps its data-show names; at 'done', one that
// also names data-done shows only for those outcomes.
const shown = (el) =>
  el.dataset.show.split(' ').includes(state) && (state !== 'done' || !el.dataset.done || el.dataset.done.split(' ').includes(outcome));

function render(m) {
  m.slot.dataset.state = state;
  if (state === 'done') m.slot.dataset.done = outcome; else delete m.slot.dataset.done;
  for (const el of m.slot.querySelectorAll('[data-show]')) el.hidden = !shown(el);
  // the done mascot's blink and happy beat start the first time it shows, so
  // a mount that never finishes runs no timer for it
  if (state === 'done' && !m.doneLive) {
    m.doneLive = true;
    mountMascotMark(m.slot.querySelector('.wl-done .sb-mark'));
  }
  m.to.textContent = email;
  const inbox = inboxOf(email);
  const row = m.slot.querySelector('[data-wl-inbox]');
  if (!inbox) row.hidden = true;
  else {
    const a = row.querySelector('a');
    a.href = inbox.href;
    a.textContent = `open ${inbox.name}`;
  }
}

function go(next, from) {
  state = next;
  publishStep();
  try { if (state === 'verify') sessionStorage.setItem(KEY, email); else sessionStorage.removeItem(KEY); } catch (e) { console.error('waitlist: sessionStorage', e); }
  for (const m of mounts) { render(m); if (m !== from) m.say(''); }
}

function setBusy(on) {
  busy = on;
  for (const m of mounts) {
    for (const b of m.slot.querySelectorAll('button')) { b.disabled = on; b.setAttribute('aria-busy', on && b.type === 'submit' ? 'true' : 'false'); }
    for (const i of m.slot.querySelectorAll('input')) i.readOnly = on;
  }
}

// The done card's two actions (#95), the /invite list step's twins
// (edge/src/beta/pages.c1bff7a8.ts X_GLYPH, TICKET_GLYPH): the X mark, the
// same path as tease.html's .xm, and lucide `ticket` (api.iconify.design
// lucide.json?icons=ticket, 2026-09-27). Decorative: the label names the action.
const X_GLYPH =
  '<svg class="wl-cta-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
const TICKET_GLYPH =
  '<svg class="wl-cta-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Zm11-4v2m0 10v2m0-8v2"/></svg>';

// Order, as the /invite join step: the provider slot, the 'or' hairline (only
// when there is a slot), the step's field and its Continue, the notice right
// under that button, then the ways around. An error or a note (.wl-msg) sits
// above the fields it is about. The done state is one card (#57): the mascot
// as the bare echo mark, the headline, the queue slot (.wl-pos: empty and hidden,
// no page or API has a position today, so none is ever invented), then the
// lines and actions for the outcome. Copy budget, every line at 320px: about
// 34 characters of body, 24 of headline (one-line-sentences.mdc).
const markup = (n, inviteHref, providers) => `
  <p class="wl-title" data-show="verify" tabindex="-1" hidden>check your inbox.</p>
  <p class="wl-sub" data-show="verify" hidden>code sent to <span data-wl-to></span></p>
  <p class="wl-alt" data-show="verify" data-wl-inbox hidden><a target="_blank" rel="noopener" data-wl-inbox-link></a></p>
  ${providers}
  ${providers ? '<p class="wl-or" data-show="email">or</p>' : ''}
  <p class="wl-msg" id="wl-msg-${n}" role="status" aria-live="polite"></p>
  <form class="wl-row" data-wl-email data-show="email" novalidate>
    <div class="wl-hp" aria-hidden="true"><label>website <input name="website" tabindex="-1" autocomplete="off"/></label></div>
    <input class="wl-in" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="you@email.com" aria-label="email" aria-describedby="wl-msg-${n}" required/>
    <button class="sb-btn wl-go" type="submit" aria-describedby="wl-terms-${n}">Continue with email</button>
  </form>
  <form class="wl-row" data-wl-verify data-show="verify" novalidate hidden>
    <input class="wl-in wl-code" name="code" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" maxlength="12" placeholder="8-digit code" aria-label="code from the email" aria-describedby="wl-msg-${n}" required/>
    <button class="sb-btn wl-go" type="submit" aria-describedby="wl-terms-${n}">Continue</button>
  </form>
  <div class="wl-terms" data-show="email verify">${termsNoticeHtml(`wl-terms-${n}`)}</div>
  <p class="wl-alt" data-show="verify" hidden>no mail yet? <button type="button" class="wl-link" data-wl-resend>resend the code</button></p>
  <p class="wl-alt" data-show="verify" hidden>wrong email? <button type="button" class="wl-link" data-wl-restart>start over</button></p>
  <p class="wl-alt wl-code-alt" data-show="email">have an invite code? <a href="${inviteHref}">enter it</a></p>
  <div class="wl-done" data-show="done" hidden>
    ${markSvg({ id: `wl-done-mark-${n}`, cls: 'is-happy' })}
    <p class="wl-title" data-show="done" data-done="in" tabindex="-1" hidden>you're in.</p>
    <p class="wl-title" data-show="done" data-done="list wait" tabindex="-1" hidden>you're on the list.</p>
    <p class="wl-pos" data-wl-pos hidden></p>
    <p class="wl-sub" data-show="done" data-done="list" hidden>your account holds your spot.</p>
    <a class="sb-btn wl-go wl-dl" data-show="done" data-done="in" href="${DOWNLOAD_HREF}" hidden>Download superbot</a>
    <p class="wl-alt" data-show="done" data-done="list wait" hidden>invite waves drop on x first.</p>
    <div class="wl-ctas" data-show="done" data-done="list wait" hidden>
      <a class="wl-cta wl-cta-x" href="https://x.com/superbot_gg" target="_blank" rel="me noopener">${X_GLYPH}Follow @superbot_gg</a>
      <a class="wl-cta wl-cta-code" href="${inviteHref}">${TICKET_GLYPH}Have an invite code?</a>
    </div>
  </div>`;

// ── "Last used" (#54) ──
// The pill: the tiny mascot at its start, then 'Last used', on the stack's
// one accent. It sits in the marked button's .pv (the email row itself for
// 'email'), absolutely placed across the button's top edge, so the stack
// measures the same with it and without it. Screen readers get it through
// the button's aria-describedby: a `hidden` span holding the same words (a
// description may name a hidden node; browse mode then does not read it a
// second time), so the pill itself is aria-hidden.
// The face glances down and left, toward the label, once the pill is first
// on screen, then idles on mountMascotMark's blink. GLANCE is in the mark's
// user units (the eye holes' own geometry, 100 across; mountMascotMark's
// pointer drift is 2): at the pill's 20px a unit is 0.2px, so 4 is a 0.8px
// shift, visible on a phone's 3x screen, and the hole stays inside the face.
const GLANCE = 4;
const GLANCE_IN_MS = 300; // --dur-4, the site's quick-band cap
const GLANCE_HOLD_MS = 900; // long enough to read as a look, not a twitch
const GLANCE_OUT_MS = 500; // --dur-5: settling back is the slower move

function glance(svg) {
  const eyes = [...svg.querySelectorAll('.mark-eye')];
  const base = eyes.map((e) => [Number(e.getAttribute('cx')), Number(e.getAttribute('cy'))]);
  const at = (k) => eyes.forEach((e, i) => {
    e.setAttribute('cx', (base[i][0] - GLANCE * k).toFixed(2));
    e.setAttribute('cy', (base[i][1] + GLANCE * k).toFixed(2));
  });
  const tween = (from, to, ms, then) => {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      at(from + (to - from) * (1 - (1 - p) ** 3)); // ease-out cubic
      if (p < 1) requestAnimationFrame(step); else then?.();
    };
    requestAnimationFrame(step);
  };
  tween(0, 1, GLANCE_IN_MS, () => setTimeout(() => tween(1, 0, GLANCE_OUT_MS), GLANCE_HOLD_MS));
}

/** Mark `method` (readLast()) as last used in this mount; nothing when that
 *  method has no button here (Google inside an in-app browser, or no island). */
function lastUsedBadge(slot, method, n) {
  const email = method === 'email';
  const btn = email ? slot.querySelector('[data-wl-email] .wl-go') : slot.querySelector(`.pv > [data-provider="${method}"]`);
  const box = email ? btn?.closest('.wl-row') : btn?.parentElement;
  if (!btn || !box) return;
  const id = `wl-lu-${n}`;
  box.insertAdjacentHTML('beforeend',
    `<span class="lu" aria-hidden="true">${markSvg({ id: `wl-lu-mark-${n}`, cls: 'lu-mark' })}Last used</span>` +
    `<span id="${id}" hidden>Last used</span>`);
  btn.setAttribute('aria-describedby', `${id} ${btn.getAttribute('aria-describedby') || ''}`.trim());
  const svg = box.querySelector('.lu .sb-mark');
  mountMascotMark(svg);
  // once, the first time the pill is fully on screen (a mount in a closed
  // sheet waits until the sheet opens)
  if (typeof IntersectionObserver !== 'function') { glance(svg); return; }
  const io = new IntersectionObserver((seen) => {
    if (!seen.some((s) => s.isIntersecting)) return;
    io.disconnect();
    glance(svg);
  }, { threshold: 1 });
  io.observe(box.querySelector('.lu'));
}

/** The "have an invite code?" href with this mount's CTA id appended
 *  (cta_id=have_code_<placement>, after any query the href already has), the
 *  way every lander CTA names itself (edge/src/site-nav.ts betaInviteHref):
 *  /invite keeps it on the funnel flow. An href that already names a cta_id,
 *  or carries a fragment, is left as given. `&` is spelled `&amp;` for the
 *  attribute it lands in. */
export function codeLinkHref(inviteHref, placement) {
  const href = String(inviteHref);
  const id = `have_code_${String(placement || 'lander').toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`.slice(0, 40);
  const out = /[?&]cta_id=/.test(href) || href.includes('#') ? href : `${href}${href.includes('?') ? '&' : '?'}cta_id=${id}`;
  return out.replace(/&(?!amp;)/g, '&amp;');
}

/** Replace `slot`'s children with the sign-up. `placement` names the mount in
 *  GA; `inviteHref` is where "have an invite code?" goes (with cta_id added);
 *  `providers` overrides the edge's list (edgeProviders). Every mount, the
 *  phone's sign-in sheet included, renders the whole door; `bar` (the retired
 *  phone bar's flag) is still accepted, and ignored, so an old caller keeps
 *  working. */
export function mountWaitlist(slot, { placement, inviteHref = '/invite?next=/download', providers } = {}) {
  const n = ++seq;
  slot.classList.add('wl');
  // The page's ascii sky (ascii-bg.js, a fixed canvas under everything) paints
  // nothing inside a data-ascii-damp box, so no glyph sits in the notice, the
  // 'or' hairline or the gaps between the buttons. A mount made after the sky
  // booted is picked up in the next frame: ascii-bg.js watches the document
  // for this attribute (a MutationObserver, #51), where it used to wait up to
  // 1.5s for its re-measure tick. A page without the sky ignores the
  // attribute.
  slot.setAttribute('data-ascii-damp', '0');
  const pv = providerSlotHtml(providers ?? edgeProviders(), placement, `wl-terms-${n}`);
  slot.innerHTML = markup(n, codeLinkHref(inviteHref, placement), pv);
  const last = readLast();
  if (last) lastUsedBadge(slot, last, n);
  const $ = (sel) => slot.querySelector(sel);
  const emailForm = $('[data-wl-email]'), verifyForm = $('[data-wl-verify]');
  const address = emailForm.elements.email, code = verifyForm.elements.code, msg = $('.wl-msg');
  const m = {
    slot, address, to: $('[data-wl-to]'),
    /** waitlist_provider for this mount (the provider buttons call it). */
    provider(name) { trackWaitlistProvider(placement, name); },
    fail(text, step, reason) {
      this.say(text, true);
      track('waitlist_error', { placement, step, reason });
    },
    say(text = '', err = false) {
      msg.textContent = text;
      msg.classList.toggle('is-err', err && !!text);
      const field = state === 'verify' ? code : address;
      if (err) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    },
  };
  mounts.push(m);
  // after every anchor's own handler (bubbling), so a copy-only escape that
  // preventDefault()ed its tap is not taken for a leave
  slot.addEventListener('click', (e) => {
    try { if (isLeavingClick(e, e.target?.closest?.('a[href]'))) leftAt = Date.now(); } catch (x) { /* analytics only */ }
  });
  for (const a of slot.querySelectorAll('a[data-escape]')) bindEscape(a);
  for (const a of slot.querySelectorAll('[data-provider]')) {
    a.addEventListener('click', () => {
      // The start is a GET: this browser's first/last touch rides as `attr`,
      // as the email join sends it (the edge's federated startAttr).
      a.setAttribute('href', withAttr(a.getAttribute('href'), attrParam()));
      m.provider(a.dataset.provider);
      // the method only, pending until an account confirms it (the account
      // page promotes it once the provider round trip lands there)
      if (/^(apple|google|x)$/.test(a.dataset.provider)) markPending(a.dataset.provider);
    });
  }

  /** The end of the flow: `ended` is the verify's (or a list-only join's)
   *  answer. An account with a grant is 'in'; an account without one is
   *  'list'; an answer with no account (list-only) is 'wait'. */
  const done = (ended) => {
    outcome = ended.account ? (ended.granted ? 'in' : 'list') : 'wait';
    // an account is signed in ('in' / 'list'): the pending method is now the
    // last used one. A list-only answer ('wait') made no account: nothing.
    if (outcome !== 'wait') promoteLast();
    go('done', m);
    m.say('');
    $('.wl-title[data-show="done"]:not([hidden])').focus();
  };

  async function join(fromResend) {
    setBusy(true);
    window.sbWaitlistPlacement = placement; // the GA client tags generate_lead with it
    // attr: first/last touch JSON ('' = none); still a form body, so the POST
    // stays a CORS simple request. placement names this mount on the stored row.
    const res = await call('/invite/waitlist', { email, source: 'superbot.gg', website: emailForm.elements.website.value, attr: attrParam(), placement, flow: flow() });
    setBusy(false);
    if (res.j.ok && res.j.step === 'done') return done(res.j);
    if (res.j.ok) {
      if (fromResend) { m.say('sent a fresh code. check your inbox.'); code.focus(); return; }
      go('verify', m);
      code.value = '';
      m.say(res.j.already ? 'a code is already on its way.' : ''); // the resend link is the row under the form
      code.focus();
      return;
    }
    m.fail(errText(res), fromResend ? 'resend' : 'email', reasonOf(res));
    const sso = ssoHref(res);
    if (sso) { location.assign(sso); return; }
    (fromResend ? code : address).focus();
  }

  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    const v = normalizeEmail(address.value);
    if (!EMAIL_RE.test(v)) { m.fail(ERR.email, 'email', 'invalid_email'); address.focus(); return; }
    email = v;
    markPending('email');
    track('waitlist_submit', { placement });
    join(false);
  });

  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const c = code.value.replace(/\D+/g, '');
    if (c.length !== 8) { m.fail(ERR.short, 'code', 'short_code'); code.focus(); return; }
    track('waitlist_code_submit', { placement });
    setBusy(true);
    window.sbWaitlistPlacement = placement; // ... and waitlist_verified, sign_up / login
    // placement and flow: the edge's beta_events row for this verify; attr:
    // the account's signup attribution when this verify makes it
    const res = await call('/invite/waitlist/verify', { email, code: c, placement, flow: flow(), attr: attrParam() });
    setBusy(false);
    if (res.j.ok) return done(res.j);
    m.fail(errText(res), 'code', reasonOf(res));
    const sso = ssoHref(res);
    if (sso) { location.assign(sso); return; }
    code.select();
  });

  // a pasted or autofilled code submits itself; typing waits for enter
  let codeDigits = 0;
  code.addEventListener('focus', () => { codeDigits = code.value.replace(/\D+/g, '').length; });
  code.addEventListener('input', (e) => {
    if (code.hasAttribute('aria-invalid')) m.say('');
    const digits = code.value.replace(/\D+/g, '').length;
    const jumped = digits - codeDigits > 1; // several digits at once: not typed
    codeDigits = digits;
    if ((e.inputType !== 'insertText' || jumped) && digits === 8) verifyForm.requestSubmit();
  });
  address.addEventListener('focus', () => {
    if (focused.has(placement)) return;
    focused.add(placement);
    track('waitlist_focus', { placement });
  });
  address.addEventListener('input', () => {
    if (address.hasAttribute('aria-invalid')) m.say('');
    for (const o of mounts) if (o !== m) o.address.value = address.value; // no input event: the other mount's field metrics stay its own
  });
  watchField(address, 'email', placement);
  watchField(code, 'code', placement);

  $('[data-wl-restart]').addEventListener('click', () => {
    track('waitlist_restart', { placement });
    go('email', m);
    m.say('');
    address.value = email;
    address.focus();
    address.select();
  });
  $('[data-wl-resend]').addEventListener('click', () => { if (busy) return; track('waitlist_resend', { placement }); join(true); });

  if (mounts.length === 1) {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) { email = saved; state = 'verify'; }
    } catch (e) { console.error('waitlist: sessionStorage', e); }
  }
  if (email) address.value = email;
  else if (mounts[0] !== m) address.value = mounts[0].address.value; // a mount added mid-typing (the end of /features) starts where the reader is
  render(m);
  return m;
}
