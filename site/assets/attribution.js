// Signup attribution, first touch and last touch (2026-09-26). Which campaign,
// ad click, referrer and landing URL brought a reader, kept in this browser so
// the waitlist POST (waitlist-form.js) and the /invite forms (a hidden `attr`
// input the edge page fills, edge/src/beta/pages.c1bff7a8.ts) can send it with
// the signup. The edge validates and stores it (edge/src/beta/attribution.786e0a78.ts,
// migration 0017-signup-attribution.786e0a78.sql).
//
// A TOUCH is a page load whose URL carries a campaign parameter (utm_*) or an
// ad click id, or whose document.referrer is another site:
//   { ts, utm: {source, medium, campaign, content, term, id}, click: {name, value},
//     referrer: origin + path of the referring page (never its query),
//     landing: path + the campaign/click params only }
// Every field but ts is optional; a load with none of them is not a touch (an
// internal navigation, a reload of a bare URL, a typed address).
// localStorage 'sb-attr' = { v: 1, first, last }: FIRST is never overwritten
// until it is 90 days old; LAST is replaced by every new touch. Storage that
// throws (Safari private mode, a sandboxed frame) means no attribution, never
// an error in the page.
//
// Privacy: campaign params, click ids, the referrer's origin + path and our own
// landing path only. No referrer query, no fingerprinting. Every value is
// capped at 200 characters; one that looks like an email or a credential is
// dropped.
//
// The GA client (ga4.d4d15ea9.js) carries an ES5 copy of captureTouch for the
// pages that load nothing else (the edge's /invite gate, /docs); edge/test/
// beta-attribution.786e0a78.test.ts runs both over the same URLs so they stay
// in step.
//
// Click ids: each name confirmed on the platform's own docs page, fetched 2026-09-26.
//   gclid      Google Ads    https://support.google.com/google-ads/answer/9744275
//   gbraid     Google Ads    https://support.google.com/analytics/answer/11367152 (web-to-app)
//   wbraid     Google Ads    https://support.google.com/analytics/answer/11367152 (app-to-web)
//   dclid      Google DV360  https://support.google.com/analytics/answer/11242870
//   msclkid    Microsoft     https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_proc_microsoftclickid
//   fbclid     Meta          https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc
//   twclid     X             https://docs.x.com/x-ads-api/measurement/web-conversions.md
//   ttclid     TikTok        https://ads.tiktok.com/resources/help/article/tiktok-click-id
//   li_fat_id  LinkedIn      https://learn.microsoft.com/en-us/linkedin/marketing/conversions/enabling-first-party-cookies
//   rdt_cid    Reddit        https://ads-api.reddit.com/docs/v3/guides/programs/capi
// The first one present wins (a URL carries one platform's id).

export const KEY = 'sb-attr';
// K62: the regions the edge stamps data-sb-region for and denies analytics
// storage to (the EEA, the UK and Switzerland). An empty value is an unknown
// region; either way nothing is written. An absent attribute means the edge
// never resolved a region: behave as before.
export const CONSENT_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
/** Whether this page's stamped region denies analytics/attribution storage. */
export function regionDenied(win = globalThis.window) {
  try {
    const el = win && win.document && win.document.documentElement;
    const cc = el && el.getAttribute ? el.getAttribute('data-sb-region') : null;
    if (cc === null || cc === undefined) return false;
    return cc === '' || CONSENT_REGIONS.includes(String(cc).trim().toUpperCase());
  } catch (e) {
    return false;
  }
}
export const TTL_MS = 90 * 86_400_000;
export const MAX_VALUE = 200;
export const UTM = ['source', 'medium', 'campaign', 'content', 'term', 'id'];
export const CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'dclid', 'msclkid', 'fbclid', 'twclid', 'ttclid', 'li_fat_id', 'rdt_cid'];
// Our own hosts, and the identity providers a sign-in round trip returns
// from (X, Google, Apple: their callback lands here with the IdP as
// document.referrer): a referrer from any of them is a navigation, not a
// touch. ga4.d4d15ea9.js OWN_HOST is the same expression.
const OWN = /(^|\.)(superbot\.gg|superbot\.sh|ezo\.dev)\.?$|^xdxdxd\.dsh\.sh\.?$|^(localhost|127\.0\.0\.1|\[::1\])$|^(www\.)?(x\.com|twitter\.com|api\.x\.com|api\.twitter\.com|accounts\.google\.com|appleid\.apple\.com)\.?$/i;
// A sign-in return: the provider callback path, or a load carrying the edge's
// __Host-sbev flash (a redirecting success). Its referrer is the round trip,
// never a touch (a campaign param on it still is).
const AUTH_PATH = /^\/invite\/auth\//;
const FLASH = /(?:^|;\s*)__Host-sbev=[^;\s]/;
const EMAILISH = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
// sbk_/sbd_/sbr_ edge tokens, sk- API keys, a JWT, a Bearer string
const TOKENISH = /^(sb[a-z]_|sk-|eyJ[\w-]{8,}\.|bearer\s)/i;

/** A capped, printable value, or '' when it is empty or looks like a secret. */
export function clean(v) {
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_VALUE);
  if (!s || EMAILISH.test(s) || TOKENISH.test(s)) return '';
  return s;
}

function campaignOf(params) {
  const utm = {};
  let n = 0;
  for (const k of UTM) {
    const v = clean(params.get(`utm_${k}`));
    if (v) { utm[k] = v; n++; }
  }
  let click = null;
  for (const name of CLICK_IDS) {
    const v = clean(params.get(name));
    if (v) { click = { name, value: v }; break; }
  }
  return { utm: n ? utm : null, click };
}

/** The touch this page load makes, or null (no campaign, no click id, no
 *  outside referrer). `href` is the page URL, `referrer` document.referrer;
 *  `flash` true when the load carries the __Host-sbev flash (the referrer is
 *  then ignored, as on the /invite/auth/ path). */
export function touchOf(href, referrer, now = Date.now(), flash = false) {
  let u;
  try { u = new URL(href); } catch (e) { return null; }
  let path = u.pathname;
  const params = u.searchParams;
  let { utm, click } = campaignOf(params);
  // A gated page 302s to /invite?next=<path+query>: the ad's params ride inside next.
  const next = params.get('next');
  if (!utm && !click && next && next.startsWith('/') && !next.startsWith('//')) {
    try {
      const n = new URL(next, u.origin);
      const got = campaignOf(n.searchParams);
      if (got.utm || got.click) { ({ utm, click } = got); path = n.pathname; }
    } catch (e) { /* not a path */ }
  }
  let ref = '';
  if (referrer && !flash && !AUTH_PATH.test(u.pathname)) {
    try {
      const r = new URL(referrer);
      if ((r.protocol === 'http:' || r.protocol === 'https:') && !OWN.test(r.hostname) && r.host !== u.host) {
        ref = clean(r.origin + r.pathname);
      }
    } catch (e) { /* unparseable referrer: none */ }
  }
  if (!utm && !click && !ref) return null;
  // built by hand (not URLSearchParams) so the GA client's ES5 copy matches it byte for byte
  const keep = [];
  for (const k of UTM) if (utm && utm[k]) keep.push(`utm_${k}=${encodeURIComponent(utm[k])}`);
  if (click) keep.push(`${click.name}=${encodeURIComponent(click.value)}`);
  const q = keep.join('&');
  const t = { ts: new Date(now).toISOString(), landing: (path + (q ? `?${q}` : '')).slice(0, 600) };
  if (utm) t.utm = utm;
  if (click) t.click = click;
  if (ref) t.referrer = ref;
  return t;
}

/** Whether this load carries the edge's __Host-sbev flash (read only; the GA
 *  client reads and clears it). */
function hasFlash(win) {
  try {
    return FLASH.test(String(win.document?.cookie || ''));
  } catch (e) {
    return false;
  }
}

const fresh = (t, now) => !!t && typeof t === 'object' && typeof t.ts === 'string' && now - Date.parse(t.ts) < TTL_MS;

/** { first, last } from storage, expired touches dropped; null when there is
 *  nothing (or storage is unavailable). */
export function readAttr(win = globalThis.window, now = Date.now()) {
  try {
    const raw = win.localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const first = fresh(o?.first, now) ? o.first : null;
    const last = fresh(o?.last, now) ? o.last : null;
    return first || last ? { first: first || last, last: last || first } : null;
  } catch (e) {
    return null;
  }
}

/** Record this page load's touch (if it is one) and return the stored state. */
export function captureTouch(win = globalThis.window, now = Date.now()) {
  try {
    const t = touchOf(win.location.href, win.document?.referrer || '', now, hasFlash(win));
    const cur = readAttr(win, now);
    if (!t || regionDenied(win)) return cur; // K62: no storage before consent
    const next = { v: 1, first: cur?.first || t, last: t };
    win.localStorage.setItem(KEY, JSON.stringify(next));
    return { first: next.first, last: next.last };
  } catch (e) {
    return null;
  }
}

/** `url` with this browser's stored campaign params added where it has none
 *  (the in-app browser escape: the system browser opens a new GA client, and
 *  a reader who moved on from the landing URL would carry no campaign to it).
 *  The touch is the stored first one when it carries utm_* or a click id,
 *  else the last one when that does. utm_* are added only when `url` has no
 *  utm_* param at all, the click id only when `url` has no known click id, so
 *  one link never mixes two touches' campaigns. `url` unchanged when nothing
 *  is added or it does not parse. `a` is readAttr's answer. */
export function withCampaign(url, a = readAttr()) {
  const t = a?.first && (a.first.utm || a.first.click) ? a.first : a?.last && (a.last.utm || a.last.click) ? a.last : null;
  if (!t || typeof url !== 'string') return url;
  let u;
  try { u = new URL(url); } catch (e) { return url; }
  const keys = [...u.searchParams.keys()];
  const add = [];
  if (t.utm && typeof t.utm === 'object' && !keys.some((k) => k.startsWith('utm_'))) {
    for (const k of UTM) {
      const v = clean(t.utm[k]);
      if (v) add.push(`utm_${k}=${encodeURIComponent(v)}`);
    }
  }
  if (t.click && CLICK_IDS.includes(t.click.name) && !keys.some((k) => CLICK_IDS.includes(k))) {
    const v = clean(t.click.value);
    if (v) add.push(`${t.click.name}=${encodeURIComponent(v)}`);
  }
  if (!add.length) return url;
  u.search = u.search ? `${u.search}&${add.join('&')}` : `?${add.join('&')}`;
  return u.toString();
}

/** The `attr` form value for a signup POST: JSON {first, last}, or '' when
 *  this browser holds no touch. */
export function attrParam(win = globalThis.window, now = Date.now()) {
  const a = readAttr(win, now);
  if (!a) return '';
  const s = JSON.stringify({ first: a.first, last: a.last });
  return s.length <= 4000 ? s : '';
}

if (typeof window !== 'undefined' && window.location) captureTouch(window);
