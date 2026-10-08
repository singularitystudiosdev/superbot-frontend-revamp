/* superbot GA4 client: the ONE source of truth. Never linked directly: the edge
 * (edge/src/ga4.d4d15ea9.ts) and the superbot.gg capsule build
 * (deploy/superbot-gg/capsule/build.sh) inline it right before </head> with
 * __SB_GA4_ID__ replaced by a validated G- id, beside the async gtag.js loader.
 * No id, no snippet: nothing of this file ships and nothing touches the network.
 *
 * - Consent Mode v2 defaults BEFORE config: ad_* denied everywhere;
 *   analytics_storage denied in the EEA, UK and CH, granted elsewhere.
 * - Global Privacy Control (K61): navigator.globalPrivacyControl true denies
 *   analytics_storage everywhere, sends no page_view and no sbTrack event, the
 *   client half of the edge sender's sec-gpc skip.
 * - page_location / page_referrer keep only the ALLOW-listed query params (K4)
 *   and template secret path segments; the fragment is dropped. Anything not
 *   explicitly allowed is dropped, so a new link parameter never reaches GA.
 * - window.sbTrack(name, params): scrubbed event API (emails and secret keys dropped).
 * - Delegated cta_click on [data-track] and on download/invite/install/mailto
 *   and cross-host superbot.gg links.
 * - Funnel: the __Host-sbev flash cookie the edge sets on a redirecting success,
 *   and the waitlist / email-code JSON calls a page makes with fetch():
 *   generate_lead {method, placement} and waitlist_verified {placement}, where
 *   placement is window.sbWaitlistPlacement (the form that posted; set by
 *   waitlist-form.js) and is left out when a page does not set it.
 *   generate_lead only for a join answer that is a new lead (`lead: false`
 *   marks a honeypot hit, a resend or a re-join; an answer without `lead` is
 *   one). A verify that made or signed in an account sends sign_up or login
 *   only, never waitlist_verified beside it.
 * - Server-side Measurement Protocol (the edge, when it has an API secret):
 *   an event the edge sent itself is never sent again here. On a redirect it
 *   is simply left out of __Host-sbev; on a JSON answer the answer names it
 *   in `mp` (e.g. "mp":["sign_up"]) and this client skips that name. No `mp`
 *   = the edge sent nothing (MP off, or a consent-region visitor).
 * - Automated browsers (navigator.webdriver: Playwright, Selenium, headless QA)
 *   get nothing: no gtag, no sbTrack. Our own drives opt in with ?ga_force=1
 *   (remembered as localStorage sb-ga-force=1; ?ga_force=0 forgets it).
 * - ?internal=1 marks this browser as ours (localStorage sb-internal=1;
 *   ?internal=0 clears it): config then carries traffic_type=internal, which the
 *   property's internal-traffic data filter keys on. Both flag params are
 *   scrubbed from page_location like the secrets.
 * - User properties acq_source / acq_medium / acq_campaign / acq_content, set
 *   before config on a landing that carries utm_source, an ad click id or an
 *   external referrer, so ad traffic shows in GA Realtime (see before config).
 *   All four or none; a sign-in return (an identity provider's referrer, the
 *   /invite/auth/ path, the __Host-sbev flash) is never a referral, and a
 *   referral never replaces an earlier paid touch.
 * - Where readers stop: scroll_depth, section_view, section_dwell,
 *   engaged_time, page_exit, rage_click, js_error, and the click_map heatmap
 *   event; see the block at the end.
 *
 * Every event this file sends, with its params (each param needs an
 * event-scoped custom definition to show in reports):
 *   cta_click {cta_id, link_url, link_area}
 *   link_click {link_url, link_text, link_area}
 *   generate_lead {method, placement}   waitlist_verified {placement}
 *   sign_up {method[, placement]}   login {method[, placement]}   (placement
 *     when the hero module's verify made or signed in the account; and
 *     name[:method[:placement]] from __Host-sbev)
 *   (each of these skipped when the JSON answer's `mp` names it)
 *   click_map {section_id, x_pct, y_pct, target, dead}
 *   scroll_depth {percent_scrolled}
 *   section_view {section_id, section_index}
 *   section_dwell {section_id, seconds}
 *   engaged_time {seconds, mark}
 *   page_exit {last_section, max_scroll, seconds, sections_seen, lcp_ms,
 *     cls_x1000, inp_ms, scroll_ups, max_speed, max_px, wl_step}
 *   rage_click {target, section_id}
 *   js_error {message, source}   source is never empty: the error's file, else its
 *                                scheme (an extension's), a stack URL, or the page path
 * waitlist-form.js sends its own waitlist_* events through sbTrack (listed in
 * its header) and publishes window.sbWaitlistStep, which page_exit reads. */
(function () {
  var ID = '__SB_GA4_ID__';
  if (!/^G-[A-Z0-9]{4,}$/.test(ID) || window.sbTrack) return;

  // The ONE URL allow-list (K4), substituted by the edge's ga4InlineScript (and
  // the capsule build) for __SB_GA4_ALLOW__: {params, prefixes, clicks, seg}.
  // A query param not named here (or not starting with an allowed prefix) is
  // dropped, so a link parameter added later is dropped by default. The path is
  // templated where a segment is a secret by shape. No fallback list: without a
  // substitution nothing but the path survives, which is the safe direction.
  var ALLOW = typeof __SB_GA4_ALLOW__ === 'object' && __SB_GA4_ALLOW__ ? __SB_GA4_ALLOW__ : { params: [], prefixes: [], clicks: [], seg: '^$', paths: [] };
  var SECRET_SEG = new RegExp(ALLOW.seg);
  function allowParam(k) {
    k = String(k).toLowerCase();
    for (var i = 0; i < ALLOW.params.length; i++) if (k === ALLOW.params[i]) return true;
    for (var j = 0; j < ALLOW.prefixes.length; j++) if (k.indexOf(ALLOW.prefixes[j]) === 0) return true;
    return false;
  }
  // K62: the region the edge stamped on <html>. Its absence means geo was never
  // seen (no cf-ipcountry): behave as before. A present-but-empty value is an
  // unknown region; '' and the EEA/UK/CH list get no storage.
  var CONSENT_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
  function regionAttr() {
    try {
      var el = document.documentElement;
      return el && el.getAttribute ? el.getAttribute('data-sb-region') : null;
    } catch (e) {
      return null;
    }
  }
  function regionDenied() {
    var cc = regionAttr();
    if (cc === null || cc === undefined) return false;
    cc = String(cc).trim().toUpperCase();
    return cc === '' || CONSENT_REGIONS.indexOf(cc) >= 0;
  }

  // Every read here is guarded: storage throws when it is disabled or the page
  // is a sandboxed frame, and a stripped-down host may have no navigator.
  function param(name) {
    try {
      return new URL(location.href).searchParams.get(name);
    } catch (e) {
      return null;
    }
  }
  function remember(key, name) {
    var v = param(name);
    try {
      var s = window.localStorage;
      if (s && v === '1') s.setItem(key, '1');
      else if (s && v === '0') s.removeItem(key);
      return v === '1' || (v !== '0' && !!s && s.getItem(key) === '1');
    } catch (e) {
      return v === '1';
    }
  }
  // Signup attribution: site/assets/attribution.js captureTouch, in ES5, for
  // the pages that load nothing else (the /invite gate, /docs). It writes only
  // localStorage sb-attr (sends nothing), so it runs before the automated-
  // browser bail-out below. edge/test/beta-attribution.786e0a78.test.ts keeps
  // the two copies in step.
  var ATTR_UTM = ['source', 'medium', 'campaign', 'content', 'term', 'id'];
  var ATTR_CLICK = ALLOW.clicks;
  // A referrer from one of these hosts is never a touch (attrTouch) and never
  // an acq_* referral (the acq block below): our own hosts, and the identity
  // providers a sign-in round trip comes back from (X, Google, Apple), whose
  // return lands here with the IdP as document.referrer. attribution.js OWN
  // is the same expression.
  var OWN_HOST = /(^|\.)(superbot\.gg|superbot\.sh|ezo\.dev)\.?$|^xdxdxd\.dsh\.sh\.?$|^(localhost|127\.0\.0\.1|\[::1\])$|^(www\.)?(x\.com|twitter\.com|api\.x\.com|api\.twitter\.com|accounts\.google\.com|appleid\.apple\.com)\.?$/i;
  // A sign-in return: the provider callback path, or a load carrying the
  // edge's __Host-sbev flash (set on a redirecting success). Read here, before
  // anything else runs; the flash reader further down still reads and clears
  // it as before. On such a load the referrer is the round trip, not a touch.
  var AUTH_PATH = /^\/invite\/auth\//;
  var flashAtLoad = false;
  try {
    flashAtLoad = /(?:^|;\s*)__Host-sbev=[^;\s]/.test(String(document.cookie || ''));
  } catch (e) {}
  function attrClean(v) {
    if (typeof v !== 'string') return '';
    var s = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);
    if (!s || /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s) || /^(sb[a-z]_|sk-|eyJ[\w-]{8,}\.|bearer\s)/i.test(s)) return '';
    return s;
  }
  function attrCampaign(p) {
    var utm = null, click = null, i, v;
    for (i = 0; i < ATTR_UTM.length; i++) {
      v = attrClean(p.get('utm_' + ATTR_UTM[i]));
      if (v) (utm = utm || {})[ATTR_UTM[i]] = v;
    }
    for (i = 0; i < ATTR_CLICK.length && !click; i++) {
      v = attrClean(p.get(ATTR_CLICK[i]));
      if (v) click = { name: ATTR_CLICK[i], value: v };
    }
    return { utm: utm, click: click };
  }
  function attrTouch(href, referrer, now, flash) {
    var u = new URL(href), path = u.pathname, c = attrCampaign(u.searchParams), ref = '', nx = u.searchParams.get('next');
    if (!c.utm && !c.click && nx && nx.charAt(0) === '/' && nx.charAt(1) !== '/') {
      try {
        var n = new URL(nx, u.origin), g = attrCampaign(n.searchParams);
        if (g.utm || g.click) { c = g; path = n.pathname; }
      } catch (e) {}
    }
    if (referrer && !flash && !AUTH_PATH.test(u.pathname)) {
      try {
        var r = new URL(referrer);
        if ((r.protocol === 'http:' || r.protocol === 'https:') && !OWN_HOST.test(r.hostname) && r.host !== u.host) ref = attrClean(r.origin + r.pathname);
      } catch (e) {}
    }
    if (!c.utm && !c.click && !ref) return null;
    var keep = [];
    for (var i = 0; i < ATTR_UTM.length; i++) if (c.utm && c.utm[ATTR_UTM[i]]) keep.push('utm_' + ATTR_UTM[i] + '=' + encodeURIComponent(c.utm[ATTR_UTM[i]]));
    if (c.click) keep.push(c.click.name + '=' + encodeURIComponent(c.click.value));
    var q = keep.join('&');
    var t = { ts: new Date(now).toISOString(), landing: (path + (q ? '?' + q : '')).slice(0, 600) };
    if (c.utm) t.utm = c.utm;
    if (c.click) t.click = c.click;
    if (ref) t.referrer = ref;
    return t;
  }
  function attrCapture(now) {
    if (regionDenied()) return; // K62: no attribution storage before consent
    var t = attrTouch(location.href, document.referrer || '', now, flashAtLoad);
    if (!t) return;
    var s = window.localStorage, first = null, o = null;
    try { o = JSON.parse(s.getItem('sb-attr') || 'null'); } catch (e) {}
    if (o && o.first && typeof o.first.ts === 'string' && now - Date.parse(o.first.ts) < 7776000000) first = o.first;
    else if (o && o.last && typeof o.last.ts === 'string' && now - Date.parse(o.last.ts) < 7776000000) first = o.last;
    s.setItem('sb-attr', JSON.stringify({ v: 1, first: first || t, last: t }));
  }
  // Whether this browser already held a paid touch (utm_* or an ad click id,
  // first or last, inside the 90-day TTL) BEFORE this load's capture: the acq
  // block below then lets a referral-only landing write nothing (see there).
  function attrPaidBefore(now) {
    var o = JSON.parse(window.localStorage.getItem('sb-attr') || 'null');
    var paid = function (t) {
      return !!t && typeof t === 'object' && typeof t.ts === 'string' && now - Date.parse(t.ts) < 7776000000 && !!(t.utm || t.click);
    };
    return !!o && (paid(o.first) || paid(o.last));
  }
  var attrNow = Date.now();
  var paidBefore = false;
  try {
    paidBefore = attrPaidBefore(attrNow);
  } catch (e) {}
  try {
    attrCapture(attrNow);
  } catch (e) {}

  var forced = remember('sb-ga-force', 'ga_force');
  var bot = false;
  try {
    bot = !!window.navigator && window.navigator.webdriver === true;
  } catch (e) {}
  if (bot && !forced) return;
  var ours = remember('sb-internal', 'internal');

  // Event PARAM names that never leave (K4 replaced the old URL deny-list with
  // the ALLOW list above; this stays for sbTrack's free-text params, which are
  // not URLs). An email in any param value is dropped by hasEmail below.
  var SCRUB = { code: 1, invite: 1, token: 1, email: 1, t: 1, sbd: 1, otp: 1, ga_force: 1, internal: 1 };
  // An email, found by a linear scan, not a regex. This was
  // /[^\s@:\/]+@[^\s@\/]+\.[a-z]{2,}/i, quadratic on a long run with no @ (every
  // start position rescans the run to its end): a link carrying
  // 'https://superbot.gg/' + 80,000 'a' froze the page for 3.9 s, and the link
  // is all a visitor needs to send. emailSpan(s, lo) returns the SAME first match
  // that regex found at or after offset lo, as [start, end) (null when there is
  // none; edge/src/ga4-mp.786e0a78.ts emailSpans is the server's twin and the
  // test's differential pins both to the old regex): an @ with a local-part
  // character before it (not whitespace, @, : or /) and, in the run after it that
  // holds no whitespace, @ or /, a dot with a character before it and two ASCII
  // letters after it. The match ends with the letters of the LAST such dot (the
  // regex's greedy backtrack) and starts where the local part's run starts, no
  // earlier than lo. Each @ scans only the run up to the next @, so the whole
  // string is read a bounded number of times.
  var ADDR_STOP = /[\s@\/]/;
  // Is the character at s[i] whitespace, @ or /, or past the end? The ASCII
  // ones by code (\s there is 9-13 and 32), every other by the regex itself, so
  // the verdict is the old pattern's own.
  function addrStop(s, i) {
    var c = s.charCodeAt(i);
    return c === 64 || c === 47 || c === 32 || (c >= 9 && c <= 13) || (c > 127 && ADDR_STOP.test(s.charAt(i))) || c !== c;
  }
  function addrLetter(s, i) {
    var c = s.charCodeAt(i) | 32;
    return c >= 97 && c <= 122;
  }
  function emailSpan(s, lo) {
    lo = lo || 0;
    for (var at = s.indexOf('@', lo); at >= 0; at = s.indexOf('@', at + 1)) {
      if (at <= lo || addrStop(s, at - 1) || s.charCodeAt(at - 1) === 58) continue;
      var end = at + 1;
      while (end < s.length && !addrStop(s, end)) end++;
      var tld = -1;
      for (var j = at + 2; j + 2 < end; j++) {
        if (s.charCodeAt(j) === 46 && addrLetter(s, j + 1) && addrLetter(s, j + 2)) tld = j + 1;
      }
      if (tld < 0) continue;
      end = tld;
      while (end < s.length && addrLetter(s, end)) end++;
      var start = at;
      while (start > lo && !addrStop(s, start - 1) && s.charCodeAt(start - 1) !== 58) start--;
      return [start, end];
    }
    return null;
  }
  // Every email of t as [start, end), in order and apart: what a /g scan of the
  // old regex found (each search starts where the last match ended).
  function scanSpans(t) {
    var out = [], from = 0, m;
    while ((m = emailSpan(t, from)) !== null) {
      out.push(m);
      from = m[1];
    }
    return out;
  }
  // An email can hide behind percent-encoding: me%40example.com in a query value or
  // a path segment is me@example.com to the server that decodes it, and GA's terms
  // forbid sending one. addrView is s with every %XX that stands for an ASCII
  // character replaced by that character, read once (%2540 is %40, not @), and
  // esc, the sorted indexes in that text of the characters an escape made (each
  // stands for 3 characters of s, so index d of the text is offset d + 2 * the
  // escapes before it in s); null when s holds no such escape. Only ASCII is
  // decoded, on purpose: an email's shape is ASCII (@, a dot, letters), a
  // non-ASCII escape (%C3%BC) is a plain filler character either way, and so a
  // malformed escape ('%', '%E0%A4%A') neither throws nor hides an encoded email
  // elsewhere in the string, as decodeURIComponent giving up on the whole string
  // would. The server's decodeSafe (ga4-mp.786e0a78.ts) does give up there.
  function hexVal(c) {
    if (c >= 48 && c <= 57) return c - 48;
    c |= 32;
    return c >= 97 && c <= 102 ? c - 87 : -1;
  }
  function addrView(s) {
    var text = '', esc = [], i = 0, len = 0, hi, lo;
    for (var q = s.indexOf('%'); q >= 0; ) {
      hi = hexVal(s.charCodeAt(q + 1));
      lo = hexVal(s.charCodeAt(q + 2));
      if (hi >= 0 && hi < 8 && lo >= 0) {
        text += s.slice(i, q) + String.fromCharCode(hi * 16 + lo);
        len += q - i;
        esc.push(len++);
        i = q + 3;
        q = s.indexOf('%', i);
      } else q = s.indexOf('%', q + 1);
    }
    return esc.length ? { text: text + s.slice(i), esc: esc } : null;
  }
  // the offset in s of index d of an addrView text
  function viewAt(esc, d) {
    var lo = 0, hi = esc.length, mid;
    while (lo < hi) {
      mid = (lo + hi) >> 1;
      if (esc[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    return d + 2 * lo;
  }
  // Every email in s, raw or percent-encoded, as [start, end) offsets into s: in
  // order, none overlapping (a span the two readings share, or only partly, is one).
  function emailSpans(s) {
    var raw = scanSpans(s), v = addrView(s);
    if (!v) return raw;
    var dec = scanSpans(v.text), out = [], i = 0, j = 0, k, c, last = null;
    for (k = 0; k < dec.length; k++) dec[k] = [viewAt(v.esc, dec[k][0]), viewAt(v.esc, dec[k][1])];
    while (i < raw.length || j < dec.length) {
      c = j >= dec.length || (i < raw.length && raw[i][0] <= dec[j][0]) ? raw[i++] : dec[j++];
      if (last && c[0] <= last[1]) {
        if (c[1] > last[1]) last[1] = c[1];
      } else {
        last = [c[0], c[1]];
        out.push(last);
      }
    }
    return out;
  }
  function hasEmail(s) {
    if (emailSpan(s, 0) !== null) return true;
    var v = addrView(s);
    return v !== null && emailSpan(v.text, 0) !== null;
  }
  // s with EVERY email cut out (the old code cut the first only, so a second
  // one in the path went out: /u/a@b.co/x@y.io left /u//x@y.io).
  function dropEmail(s) {
    var spans = emailSpans(s), out = '', from = 0;
    for (var i = 0; i < spans.length; i++) {
      out += s.slice(from, spans[i][0]);
      from = spans[i][1];
    }
    return out + s.slice(from);
  }
  var CONSENT_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];

  // An invite link carries the code as its path (/invite/<CODE>), so the
  // path itself is a secret: it becomes /invite/:code, the template the
  // edge's recorders write. The shape mirrors edge/src/beta/invite-path.164c18f8.ts
  // INVITE_LINK_RE (16 letters or digits in four groups of four, dashes
  // optional), tried on the raw path and on its percent-decoded form as
  // isInviteLinkPath does; this file is inlined into pages and cannot import
  // edge code. A trailing slash is templated too: scrubbing more is harmless.
  var INVITE_LINK = /^\/invite\/[0-9A-Za-z]{4}(?:-?[0-9A-Za-z]{4}){3}\/?$/;
  function inviteLinkPath(p) {
    if (INVITE_LINK.test(p)) return true;
    if (p.indexOf('%') < 0) return false;
    try {
      return INVITE_LINK.test(decodeURI(p));
    } catch (e) {
      return false;
    }
  }

  // The path with every secret segment templated: an invite link to
  // /invite/:code, and any other segment that is a secret by shape (a known
  // credential prefix, or a 20+ character opaque token) to :token. Tested on
  // the raw segment and its percent-decoded form.
  function scrubPath(pathname) {
    // The shared allow-list's path templates come first (T4-G5: the rooms
    // invite link /rooms/join/<code> becomes /rooms/join/:code). The list is
    // inlined with the rest of __SB_GA4_ALLOW__ from site/assets/ga4-allow.json,
    // the same file the edge server reads, so one entry scrubs both sides.
    var paths = ALLOW.paths || [];
    for (var t = 0; t < paths.length; t++) {
      try {
        if (new RegExp(paths[t].re).test(pathname)) return paths[t].as;
      } catch (e) {}
    }
    if (inviteLinkPath(pathname)) return '/invite/:code';
    var segs = pathname.split('/');
    var changed = false;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (!s) continue;
      var dec = s;
      if (s.indexOf('%') >= 0) {
        try { dec = decodeURIComponent(s); } catch (e) { dec = s; }
      }
      if (SECRET_SEG.test(dec)) { segs[i] = ':token'; changed = true; }
    }
    return changed ? segs.join('/') : pathname;
  }

  function scrubUrl(href) {
    if (!href) return '';
    try {
      var u = new URL(href, location.href);
      if (u.protocol === 'mailto:' || u.protocol === 'tel:') return u.protocol;
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      u.pathname = scrubPath(u.pathname);
      // Rebuild the query with only the allowed params, in one pass: deleting
      // one at a time was O(n^2) on a URL carrying thousands of params. A temp
      // URL (not a URLSearchParams global the sandboxed page may lack) keeps the
      // same serialization for what survives.
      var keep = new URL(u.origin);
      u.searchParams.forEach(function (v, k) {
        if (allowParam(k)) keep.searchParams.append(k, v);
      });
      u.search = keep.search;
      u.hash = '';
      u.username = '';
      u.password = '';
      var out = u.toString();
      if (!hasEmail(out)) return out;
      // An email anywhere in the URL: the query goes, and every email in the path
      // is cut (raw or percent-encoded). Cutting can join two halves into a new
      // email (x%20 + @d.ee): one look at the result, and the bare origin if so.
      var path = dropEmail(u.pathname);
      return u.origin + (hasEmail(path) ? '/' : path);
    } catch (e) {
      return '';
    }
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  // No wait_for_update (2026-10-01, ga-audit F2): that key holds gtag's first
  // hit for up to 500ms so a later consent 'update' can land first, and nothing
  // here ever sends one (see below). U5 measured the first /g/collect leaving
  // ~480ms later with it; a 1.6s mobile session cannot spare that. If an update
  // call ever ships (a banner), the wait goes back in the same change.
  var denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  function consent(extra) {
    var o = {};
    for (var k in denied) o[k] = denied[k];
    for (var j in extra) o[j] = extra[j];
    return o;
  }
  // Consent, as decided 2026-09-27: nothing here calls gtag('consent','update')
  // and no banner ships, so analytics_storage stays denied for GOOD in the
  // countries below (the EEA, the UK, Switzerland). Those visitors send
  // cookieless pings: no _ga, a fresh client per page load, no user properties.
  // They are therefore NOT measured in GA and show in none of its reports or
  // dashboards; the edge's own rows (beta_waitlist, beta_signup_attribution,
  // counted on the "Superbot: GA4 ad campaigns" dashboard) are the record of
  // what they did. Do not "fix" this by granting storage without a banner:
  // granting for a region that never consented is the thing the default
  // prevents. If a banner ever ships, this is where the update belongs.
  //
  // K61 (F7): a browser that sends Global Privacy Control opts out the same
  // way the edge's sender reads it off the sec-gpc header (ga4-mp.*.ts,
  // `if (i.secGpc) return { skip: 'gpc' }`). navigator.globalPrivacyControl is
  // the client half: true denies analytics_storage everywhere (below), the
  // config sends no page_view, and sbTrack sends nothing. A GPC visitor is
  // then in no GA report, exactly the visitors the server sender skips.
  var gpc = false;
  try {
    gpc = !!(window.navigator && window.navigator.globalPrivacyControl === true);
  } catch (e) {}
  gtag('consent', 'default', consent({ analytics_storage: gpc ? 'denied' : 'granted' }));
  gtag('consent', 'default', consent({ analytics_storage: 'denied', region: CONSENT_REGIONS }));
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', false);
  gtag('js', new Date());
  var cfg = {
    page_location: scrubUrl(location.href),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  };
  if (document.referrer) cfg.page_referrer = scrubUrl(document.referrer);
  if (ours) cfg.traffic_type = 'internal';
  // K61: no page_view for a GPC browser, so gtag('config') sends nothing.
  if (gpc) cfg.send_page_view = false;
  // An untagged ad click (Reddit lands superbot.gg/?rdt_cid=<id> with no
  // utm_*): GA does not read these click ids, so the session would be
  // (direct)/(none). On the landing hit only (the URL carrying the click id;
  // GA keeps a session's first campaign anyway), and only with no utm_source
  // (GA parses utm_* from page_location itself), the platform's source and
  // channel are set, never the id (cardinality). Strings from GA's default
  // channel-group source list (support.google.com/analytics/answer/9756891,
  // 2026-09-26): 'twitter' not 'x' (x is not on the Paid Social list),
  // 'facebook', 'bing'. The signup row's acq_source/acq_medium use the same
  // strings (edge/src/beta/attribution.786e0a78.ts CLICK_SOURCE).
  // No Google ids here: GA4 attributes gclid/gbraid/wbraid/dclid natively (auto-tagging, the real Ads campaign); a set would overwrite it.
  var GA_CLICK = [['rdt_cid', 'reddit', 'paid_social'], ['twclid', 'twitter', 'paid_social'], ['fbclid', 'facebook', 'paid_social'], ['msclkid', 'bing', 'cpc'], ['ttclid', 'tiktok', 'paid_social'], ['li_fat_id', 'linkedin', 'paid_social']];
  if (!param('utm_source') && !param('gclid') && !param('gbraid') && !param('wbraid') && !param('dclid')) {
    for (var gc = 0; gc < GA_CLICK.length; gc++) {
      if (param(GA_CLICK[gc][0])) {
        gtag('set', { campaign_source: GA_CLICK[gc][1], campaign_medium: GA_CLICK[gc][2], campaign_name: '(untagged ad)' });
        break;
      }
    }
  }
  // Ad source in GA Realtime (2026-09-26): Realtime's "First user source /
  // medium / campaign" card lists only batch-processed users, so a visitor
  // fresh off an ad never shows there, while user-scoped custom dimensions do
  // ("Active users by User property"). Set BEFORE config so the landing
  // page_view carries them, and only when THIS landing carries a signal
  // (utm_source, a known click id, an external referrer): an internal
  // navigation or a direct revisit sends nothing, so GA keeps the user's
  // earlier values (last non-direct). Campaign strings and hosts only, never a
  // URL, path or query; 36 chars at most (GA's user-property value limit).
  // They sit beside GA's own attribution and never override it (hence
  // google/cpc for a gclid, unlike the campaign_* set above). Registered
  // USER-scoped by scripts/ga/register-definitions.mjs.
  // F2 (2026-09-27): the four are one tuple, always written together (a
  // partial write kept an earlier landing's campaign/content beside a new
  // source: `x.com | referral | every_model_one_app | ad2`). Fills, the same
  // as the edge's server-side sender: campaign = utm_campaign || '(untagged
  // ad)' for a click id || '(referral)' for a referral-only touch ||
  // '(not set)'; content = utm_content || '(not set)'. A referral-only touch
  // (the source comes from document.referrer: no utm_source, no click id)
  // writes nothing at all when this browser already held a paid touch (utm_*
  // or a click id in sb-attr, first or last, inside the 90-day TTL, read
  // before this load's own capture): GA keeps the ad's tuple instead of a
  // later organic visit's. No referral at all on a sign-in return (the
  // /invite/auth/ callback path, or a load carrying the __Host-sbev flash),
  // and never from OWN_HOST (our hosts and the identity providers); a
  // utm_*/click-id landing still writes as before.
  try {
    var acqNet = null, ai;
    var ACQ_GOOGLE = ['gclid', 'gbraid', 'wbraid', 'dclid'];
    for (ai = 0; ai < ACQ_GOOGLE.length && !acqNet; ai++) if (param(ACQ_GOOGLE[ai])) acqNet = ['google', 'cpc'];
    for (ai = 0; ai < GA_CLICK.length && !acqNet; ai++) if (param(GA_CLICK[ai][0])) acqNet = [GA_CLICK[ai][1], GA_CLICK[ai][2]];
    var acqRef = '';
    if (document.referrer && !flashAtLoad && !AUTH_PATH.test(location.pathname)) {
      try {
        var ar = new URL(document.referrer);
        if ((ar.protocol === 'http:' || ar.protocol === 'https:') && ar.hostname !== location.hostname && !OWN_HOST.test(ar.hostname)) acqRef = ar.hostname.toLowerCase().replace(/^www\./, '');
      } catch (e) {}
    }
    var acqVal = function (v, lower) {
      var s = attrClean(v);
      return (lower ? s.toLowerCase() : s).slice(0, 36);
    };
    var acqSrc = acqVal(param('utm_source'), true);
    var acqRefOnly = !acqSrc && !acqNet;
    if ((acqSrc || acqNet || acqRef) && !(acqRefOnly && paidBefore)) {
      gtag('set', 'user_properties', {
        acq_source: acqSrc || (acqNet ? acqNet[0] : acqVal(acqRef, true)),
        acq_medium: acqVal(param('utm_medium'), true) || (acqNet ? acqNet[1] : 'referral'),
        acq_campaign: acqVal(param('utm_campaign')) || (acqNet ? '(untagged ad)' : acqRefOnly ? '(referral)' : '(not set)'),
        acq_content: acqVal(param('utm_content')) || '(not set)',
      });
    }
  } catch (e) {}
  gtag('config', ID, cfg);

  window.sbTrack = function (name, params) {
    try {
      if (gpc) return; // K61: a GPC browser sends no event at all
      if (typeof name !== 'string' || !/^[a-z][a-z0-9_]{0,39}$/i.test(name)) return;
      var out = {};
      if (params && typeof params === 'object') {
        for (var k in params) {
          if (!Object.prototype.hasOwnProperty.call(params, k) || SCRUB[k.toLowerCase()]) continue;
          var v = params[k];
          if (typeof v === 'string') {
            if (/^(https?:|mailto:|tel:|\/)/i.test(v)) v = scrubUrl(v);
            if (hasEmail(v)) continue;
            v = v.slice(0, 100);
          } else if (typeof v !== 'number' && typeof v !== 'boolean') continue;
          out[k] = v;
        }
      }
      window.gtag('event', name, out);
    } catch (e) {}
  };
  var track = window.sbTrack;

  var SITE = /(^|\.)superbot\.gg$/i;
  function isCta(href) {
    if (!href) return false;
    if (/^mailto:/i.test(href)) return true;
    try {
      var u = new URL(href, location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      if (u.host !== location.host && SITE.test(u.hostname)) return true;
      // the signed-out CTAs' target, the home page's hero form (edge site-nav betaInviteHref)
      if (u.pathname === '/' && u.hash === '#join') return true;
      return /^\/(download|invite|install)(\/|$)/.test(u.pathname);
    } catch (e) {
      return false;
    }
  }
  function internal(href) {
    try {
      var u = new URL(href, location.href);
      return (u.protocol === 'http:' || u.protocol === 'https:') && u.host === location.host;
    } catch (e) {
      return false;
    }
  }
  // header, footer or the page body: the site header is .sb-nav / <header>
  function areaOf(el) {
    return el.closest('header, .sb-nav, nav.sb-header') ? 'header' : el.closest('footer') ? 'footer' : 'main';
  }

  // A section: an id-bearing <section>/<article> under <main>, or anything
  // carrying [data-track-section] (shared with the block at the end).
  var SECTIONS = 'main section[id], main article[id], [data-track-section]';
  // What a click can land on and do something; a click on none of it is dead.
  // The mascot mark answers a tap with its happy beat (mascot-mark.js
  // mountMascotMark, the edge pages' inline port): mountAllMarks stamps
  // data-mark-live, a direct mountMascotMark (the hero's .sb-glitch) does not,
  // so the classes name it too. Not [data-track]: that is the cta_click trigger.
  // .ud-plot[tabindex] is the /account/usage chart with data (usage-chart.js;
  // account/usage.ts stamps tabindex=0 role=group only when there are bars):
  // a tap picks the bar under it. The empty plot ("No usage in this range")
  // does nothing, so it stays dead. .sb-scrim is the nav drawer's backdrop
  // (nav-drawer.js): a tap closes the drawer. Not a bare [tabindex] (a skip
  // target or a focusable region does nothing on a tap).
  var ACTIVE = 'a,button,input,select,textarea,label,summary,[role=button],[data-track],[onclick],svg[data-mark-live],svg.sb-mark,svg.sb-glitch,.ud-plot[tabindex],.sb-scrim';
  // Which tenth (0-9) of [lo, lo + span) v falls in, clamped; 0 when unknown.
  function decile(v, lo, span) {
    var d = span > 0 ? Math.floor(((v - lo) / span) * 10) : 0;
    return d > 9 ? 9 : d >= 0 ? d : 0;
  }
  // tag#id or tag.firstclass, no text: low cardinality for a heatmap target
  // (an SVG element's className is an object: its class attribute is read)
  function tagOf(el) {
    var s = String(el.tagName || '').toLowerCase();
    var cls = typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '';
    if (el.id) s += '#' + el.id;
    else if (cls.trim()) s += '.' + cls.trim().split(/\s+/)[0];
    return s.slice(0, 40);
  }
  // click_map: one event per pointer click (40 a page view at most), placed as
  // a decile grid: x across the viewport, y down the enclosing section's box
  // (down the viewport when there is no section). A keyboard or scripted click
  // (detail 0) has no position and is skipped.
  var mapped = 0;
  function clickMap(e) {
    var t = e.target;
    if (mapped >= 40 || !t || !t.closest || !t.tagName || e.detail === 0) return;
    mapped++;
    // A click whose target IS a <dialog> is a tap on its backdrop (a tap in
    // the box lands on its content): the sheet closes on it (signup-bar.js).
    // Only the dialog itself: dialog.sb-sheet in ACTIVE would make every tap
    // on the sheet's text a hit.
    var hit = t.closest(ACTIVE) || (t.tagName === 'DIALOG' ? t : null);
    var sec = t.closest(SECTIONS);
    var box = sec && sec.getBoundingClientRect ? sec.getBoundingClientRect() : null;
    track('click_map', {
      section_id: (sec && (sec.id || sec.getAttribute('data-track-section'))) || '(none)',
      x_pct: decile(e.clientX, 0, window.innerWidth),
      y_pct: box ? decile(e.clientY, box.top, box.height) : decile(e.clientY, 0, window.innerHeight),
      target: tagOf(hit || t),
      dead: !hit,
    });
  }

  // Every listener and callback this file registers goes through guard():
  // analytics never throws into the page.
  function guard(fn) {
    return function (a) {
      try {
        fn(a);
      } catch (x) {}
    };
  }

  document.addEventListener(
    'click',
    guard(function (e) {
      try {
        clickMap(e);
      } catch (x) {}
      var t = e.target;
      if (!t || !t.closest) return;
      var el = t.closest('[data-track],a[href]');
      if (!el) return;
      var id = el.getAttribute('data-track');
      var href = el.getAttribute('href') || '';
      var text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!id && !isCta(href)) {
        // every other same-site link: where a reader goes next, and from
        // which part of the page (enhanced measurement only counts outbound)
        if (el.tagName !== 'A' || !internal(href)) return;
        track('link_click', { link_url: scrubUrl(href), link_text: text, link_area: areaOf(el) });
        return;
      }
      if (!id) id = el.id || text || 'link';
      track('cta_click', { cta_id: id, link_url: scrubUrl(href), link_area: areaOf(el) });
    }),
    true,
  );

  // A redirecting success on an edge page (invite redeemed, account created,
  // signed in) leaves `name[:method[:placement]]` entries in the JS-readable,
  // 2-minute __Host-sbev cookie; read once, then cleared. placement names the
  // form the flow started from; a field that fails its shape is dropped, the
  // rest of the entry still sends (an empty method keeps a placement).
  var m = document.cookie.match(/(?:^|;\s*)__Host-sbev=([^;]*)/);
  if (m) {
    document.cookie = '__Host-sbev=; Max-Age=0; Path=/; Secure; SameSite=Lax';
    var evs = [];
    try {
      evs = decodeURIComponent(m[1]).split(',');
    } catch (e) {}
    for (var i = 0; i < evs.length; i++) {
      var p = evs[i].split(':');
      if (!/^[a-z_]{1,40}$/.test(p[0])) continue;
      var fp = {};
      if (p[1] && /^[a-z_]{1,20}$/.test(p[1])) fp.method = p[1];
      if (p[2] && /^[a-z0-9_-]{1,32}$/.test(p[2])) fp.placement = p[2];
      track(p[0], fp);
    }
  }

  // The JSON halves of the funnel: superbot.gg's waitlist form (cross-origin to
  // the beta host) and the email-code sign-in (/onboard). Observed, never altered.
  if (typeof window.fetch === 'function') {
    var orig = window.fetch;
    window.fetch = function (input) {
      var res = orig.apply(this, arguments);
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || String(input);
        var path = new URL(url, location.href).pathname;
        var kind = path === '/invite/waitlist' ? 'join' : path === '/invite/waitlist/verify' ? 'verify' : path === '/auth/email/verify' ? 'login' : '';
        if (kind) {
          // Which waitlist form made this call (waitlist-form.js sets it right
          // before each POST). Read now, not when the answer lands: a second
          // mount's POST in between would otherwise credit the wrong form.
          var wp = window.sbWaitlistPlacement;
          var where = typeof wp === 'string' && wp ? wp : '';
          res.then(
            guard(function (r) {
              if (!r || !r.ok) return;
              r.clone()
                .json()
                .then(
                  guard(function (j) {
                    if (!j) return;
                    // j.mp: the events the edge already sent for this answer
                    // through the Measurement Protocol; never sent twice.
                    var mp = Array.isArray(j.mp) ? j.mp : [];
                    var send = function (name, params) {
                      if (mp.indexOf(name) < 0) track(name, params);
                    };
                    var lead = { method: 'waitlist' };
                    var verified = {};
                    if (where) lead.placement = verified.placement = where;
                    // lead: false = not a new lead (honeypot, resend, cooldown,
                    // an already verified address); an older edge never sends it
                    if (kind === 'join' && j.ok === true && j.step === 'verify') {
                      if (j.lead !== false) send('generate_lead', lead);
                    } else if (kind === 'verify' && j.ok === true) {
                      if (j.account === true) {
                        // the hero's same-origin verify made (created) or
                        // signed in the account (edge routes heroAccount):
                        // one key event for one person, sign_up or login,
                        // never waitlist_verified beside it
                        var acct = { method: 'email_code' };
                        if (where) acct.placement = where;
                        send(j.created === true ? 'sign_up' : 'login', acct);
                      } else if (!j.already) send('waitlist_verified', verified);
                    } else if (kind === 'login' && j.access_token) send(j.created === true ? 'sign_up' : 'login', { method: 'email_code' });
                  }),
                  function () {},
                );
            }),
            function () {},
          );
        }
      } catch (e) {}
      return res;
    };
  }

  // ---- where readers stop (2026-09-25) -------------------------------------
  // Enhanced measurement's `scroll` is one 90% mark and says nothing about
  // WHERE a reader left. These answer that on every page that inlines this
  // file, with no markup to add: a section is an id-bearing <section> or
  // <article> under <main>, or anything carrying [data-track-section].
  //   scroll_depth {percent_scrolled}              25 / 50 / 75 / 100, once each
  //   section_view {section_id, section_index}     first time a section crosses mid-screen
  //   section_dwell {section_id, seconds}          one stretch of a section in view (its
  //                                                midline on screen, or for one taller
  //                                                than that, covering mid-screen) of
  //                                                150ms or more, sent when it leaves or
  //                                                the page hides; 1 decimal, 20 a page
  //   engaged_time {seconds, mark}                 5 / 10 / 30 / 60 / 180 s of visible time,
  //                                                once each, checked every second; mark is
  //                                                the same number sent as a registered
  //                                                DIMENSION (seconds is a metric, which GA
  //                                                cannot group by), so '>= 10 s' reads
  //                                                customEvent:mark 10, never 'any
  //                                                engaged_time' (that is >= 5 s since
  //                                                the 5 s mark shipped, 2026-09-27)
  //   page_exit {last_section, max_scroll, seconds, sections_seen, lcp_ms, cls_x1000, inp_ms,
  //              scroll_ups, max_speed, max_px, wl_step}
  //                                                once, the first time the page is hidden;
  //                                                scroll_ups = upward moves longer than half
  //                                                a viewport (a reversal or a 1s pause ends
  //                                                a move), max_speed = fastest px/s over
  //                                                ~100ms windows, max_px = deepest scrollY
  //                                                to 50px, wl_step = window.sbWaitlistStep
  //                                                (waitlist-form.js) at that hide, or none
  //   rage_click {target, section_id}              3 clicks on one element inside 800ms
  //   js_error {message, source}                   uncaught errors, 5 a page at most; source is
  //                                                never empty (errSource below)
  //   click_map {section_id, x_pct, y_pct, target, dead}
  //                                                every pointer click, 40 a page at most;
  //                                                x/y are 0-9 deciles (x of the viewport,
  //                                                y of the section's box), target is
  //                                                tag#id / tag.class, dead = nothing
  //                                                clickable there. Sent from the capture
  //                                                listener above (clickMap), so it runs
  //                                                even where this block cannot.
  // None of this runs for an automated browser (navigator.webdriver) unless
  // ga_force opted it in, and a browser flagged ?internal=1 sends it all under
  // traffic_type=internal. Their params need event-scoped custom definitions
  // on the property to show in reports (scripts/ga/register-definitions.mjs).
  // Analytics never throws into the page: a failure here is dropped, the same
  // contract as sbTrack above.
  try {
    var visibleMs = 0;
    var visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
    var visibleSeconds = function () {
      return Math.round((visibleMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000);
    };

    // section_dwell: every tracked section (scan() below fills `tracked`) is
    // in view while its midline is on screen, or, for one taller than that
    // allows, while it covers mid-screen. inAt[i] is when that stretch began
    // (0 = out of view). Only visible time counts: a hide ends every stretch.
    var tracked = [];
    var inAt = [];
    var dwellSent = 0;
    var dwellEnd = function (i, now) {
      var ms = now - inAt[i];
      inAt[i] = 0;
      if (ms < 150 || dwellSent >= 20) return;
      dwellSent++;
      var s = tracked[i];
      track('section_dwell', { section_id: s.id || s.getAttribute('data-track-section'), seconds: Math.round(ms / 100) / 10 });
    };
    var dwell = function () {
      if (!visibleSince || dwellSent >= 20) return;
      var now = Date.now();
      var vh = window.innerHeight;
      for (var i = 0; i < tracked.length; i++) {
        var r = tracked[i].getBoundingClientRect();
        var mid = r.top + r.height / 2;
        var on = r.height > 0 && ((mid >= 0 && mid <= vh) || (r.top <= vh / 2 && r.top + r.height >= vh / 2));
        if (on && !inAt[i]) inAt[i] = now;
        else if (!on && inAt[i]) dwellEnd(i, now);
      }
    };
    var dwellFlush = function () {
      var now = Date.now();
      for (var i = 0; i < tracked.length; i++) if (inAt[i]) dwellEnd(i, now);
    };

    // scroll shape for page_exit: deepest px, fastest ~100ms window, and
    // upward moves (a run in one direction; a reversal or a 1s pause ends it)
    var maxY = 0;
    var maxSpeed = 0;
    var scrollUps = 0;
    var lastY = -1;
    var lastT = 0;
    var anchorY = 0;
    var anchorT = 0;
    var runDir = 0;
    var runFrom = 0;
    var runCounted = false;
    var motion = function (y) {
      var now = Date.now();
      if (y > maxY) maxY = y;
      var idle = lastY < 0 || now - lastT > 250;
      if (idle) {
        anchorY = y;
        anchorT = now;
      } else if (now - anchorT >= 100) {
        var v = Math.round((Math.abs(y - anchorY) * 1000) / (now - anchorT));
        if (v > maxSpeed) maxSpeed = v;
        anchorY = y;
        anchorT = now;
      }
      if (lastY >= 0 && now - lastT > 1000) runDir = 0;
      if (lastY >= 0 && y !== lastY) {
        var dir = y < lastY ? -1 : 1;
        if (dir !== runDir) {
          runDir = dir;
          runFrom = lastY;
          runCounted = false;
        }
        if (dir < 0 && !runCounted && runFrom - y > window.innerHeight / 2) {
          runCounted = true;
          scrollUps++;
        }
      }
      if (lastY < 0 || y !== lastY) lastT = now;
      lastY = y;
    };

    var maxPct = 0;
    var marks = [25, 50, 75, 100];
    var queued = false;
    // readScroll's geometry reads (scrollHeight/clientHeight here, the section
    // boxes in dwell) are the first long task in traces (~60-95ms at 4x CPU,
    // ~1.7s), reported as forced layout. Measured 2026-10-01 (ga-audit F2,
    // Slow 4G, readScroll made a no-op): the long task stays, 100-150ms. It is
    // the page's FIRST layout after the CSS lands, which the frame's own
    // render step then runs anyway; the read only moves it into this callback.
    // Caching the height would buy nothing, and dwell's section boxes cannot be
    // cached without changing what section_dwell means. Left as is.
    var readScroll = function () {
      queued = false;
      var el = document.documentElement;
      var y = window.scrollY || el.scrollTop || 0;
      var h = el.scrollHeight - el.clientHeight;
      var pct = h <= 0 ? 100 : Math.min(100, Math.round((y / h) * 100));
      if (pct > maxPct) maxPct = pct;
      while (marks.length && maxPct >= marks[0]) track('scroll_depth', { percent_scrolled: marks.shift() });
      try {
        motion(y);
        dwell();
      } catch (e) {}
    };
    var onScroll = guard(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(guard(readScroll));
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    var seen = {};
    var seenCount = 0;
    var current = '';
    var io = 'IntersectionObserver' in window
      ? new IntersectionObserver(guard(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            var sid = entries[i].target.id || entries[i].target.getAttribute('data-track-section');
            current = sid;
            if (seen[sid]) continue;
            seen[sid] = 1;
            seenCount++;
            track('section_view', { section_id: sid, section_index: seenCount });
          }
          dwell();
        }), { rootMargin: '-45% 0px -45% 0px' })
      : null;
    // collects every section once (for section_dwell) and hands it to the
    // section_view observer
    var scan = guard(function () {
      var els = document.querySelectorAll(SECTIONS);
      for (var i = 0; i < els.length && tracked.length < 60; i++) {
        if (tracked.indexOf(els[i]) >= 0) continue;
        tracked.push(els[i]);
        inAt.push(0);
        if (io) io.observe(els[i]);
      }
      dwell();
    });
    // pages that grow after load (the home page splices /features in) get
    // their new sections picked up, at most once every 700ms
    var scanTimer = 0;
    if ('MutationObserver' in window) {
      new MutationObserver(guard(function () {
        if (!scanTimer) scanTimer = setTimeout(function () { scanTimer = 0; scan(); }, 700);
      })).observe(document.documentElement, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); // scan is guarded
    else scan();
    var sectionOf = function (el) {
      var s = el.closest && el.closest(SECTIONS);
      return s ? s.id || s.getAttribute('data-track-section') : '';
    };

    var tMarks = [5, 10, 30, 60, 180];
    var tTimer = setInterval(guard(function () {
      var s = visibleSeconds();
      while (tMarks.length && s >= tMarks[0]) {
        var m = tMarks.shift();
        track('engaged_time', { seconds: m, mark: m });
      }
      if (!tMarks.length) clearInterval(tTimer);
    }), 1000);

    // web vitals, reported with the exit: LCP, CLS and the slowest
    // interaction (an INP stand-in). An engine without an entry type throws
    // on observe; that vital then reports 0.
    //
    // LCP follows the web-vitals library (onLCP). The browser keeps adding
    // candidates for as long as the reader does nothing, so the value counts
    // only the untouched, visible part of the load: it stops at the first
    // pointerdown or keydown, at the first hide, and at the exit. At that stop
    // the candidates still queued are read once, the observer is disconnected
    // (a page restored from the back/forward cache cannot add more) and the
    // last candidate is the value. A candidate stamped at or after the first
    // hide is ignored, and a page that loaded hidden (a background tab) counts
    // as hidden from time 0, so it reports 0: its first paint only comes when
    // the tab is finally shown, an arbitrary time after the load. Measured
    // 2026-10-01, before this rule: 14 mobile page_exit events averaged lcp_ms
    // 6.2M (about 1.7 hours), candidates taken long after the page loaded.
    // 0 still means no LCP (none yet, a hidden start, or no entry type).
    var lcp = 0;
    var cls = 0;
    var inp = 0;
    var vital = function (type, fn, opts) {
      try {
        var o = new PerformanceObserver(guard(function (list) {
          var es = list.getEntries();
          for (var i = 0; i < es.length; i++) fn(es[i]);
        }));
        opts = opts || {};
        opts.type = type;
        opts.buffered = true;
        o.observe(opts);
        return o;
      } catch (e) {}
      return null;
    };
    var lcpDone = false;
    var lcpHiddenAt = document.visibilityState === 'hidden' ? 0 : Infinity;
    var lcpSee = function (e) {
      if (e.startTime < lcpHiddenAt) lcp = Math.round(e.startTime);
    };
    var lcpObs = vital('largest-contentful-paint', function (e) { if (!lcpDone) lcpSee(e); });
    var lcpStop = function () {
      if (lcpDone) return;
      lcpDone = true;
      if (!lcpObs) return;
      try {
        var rest = lcpObs.takeRecords();
        for (var i = 0; i < rest.length; i++) lcpSee(rest[i]);
      } catch (e) {}
      try {
        lcpObs.disconnect();
      } catch (e) {}
    };
    var lcpInput = guard(lcpStop);
    window.addEventListener('pointerdown', lcpInput, { capture: true, once: true, passive: true });
    window.addEventListener('keydown', lcpInput, { capture: true, once: true, passive: true });
    // Registered before the exit listener below, so the hide time is known
    // when the exit reads lcp. The event's own stamp, on the same clock as an
    // entry's startTime, not the moment this handler happens to run.
    document.addEventListener('visibilitychange', guard(function (e) {
      if (document.visibilityState !== 'hidden') return;
      if (lcpHiddenAt === Infinity) {
        lcpHiddenAt = e && typeof e.timeStamp === 'number' ? e.timeStamp : typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
      }
      lcpStop();
    }));
    vital('layout-shift', function (e) { if (!e.hadRecentInput) cls += e.value; });
    vital('event', function (e) { if (e.interactionId && e.duration > inp) inp = Math.round(e.duration); }, { durationThreshold: 40 });

    // the waitlist step at this hide: none / email / verify / done
    var wlStep = function () {
      var s = window.sbWaitlistStep;
      return typeof s === 'string' && /^[a-z]{1,12}$/.test(s) ? s : 'none';
    };
    var exited = false;
    var exit = function () {
      if (exited) return;
      exited = true;
      lcpStop(); // a pagehide with no earlier hide or input still finalizes it
      readScroll();
      track('page_exit', {
        last_section: current || '(top)',
        max_scroll: maxPct,
        seconds: visibleSeconds(),
        sections_seen: seenCount,
        lcp_ms: lcp,
        cls_x1000: Math.round(cls * 1000),
        inp_ms: inp,
        scroll_ups: scrollUps,
        max_speed: maxSpeed,
        max_px: Math.round(maxY / 50) * 50,
        wl_step: wlStep(),
        transport_type: 'beacon',
      });
    };
    // a hide ends every section_dwell stretch (sent), then page_exit once
    document.addEventListener('visibilitychange', guard(function () {
      if (document.visibilityState === 'hidden') {
        try {
          dwellFlush();
        } catch (e) {}
        if (visibleSince) visibleMs += Date.now() - visibleSince;
        visibleSince = 0;
        exit();
      } else {
        visibleSince = Date.now();
        dwell();
      }
    }));
    window.addEventListener('pagehide', guard(function () {
      try {
        dwellFlush();
      } catch (e) {}
      exit();
    }));

    var rageEl = null;
    var rageN = 0;
    var rageT = 0;
    var describe = function (el) {
      var s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\s+/)[0];
      var txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return txt ? s + ' ' + txt : s;
    };
    document.addEventListener('click', guard(function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      t = t.closest('a,button,input,label,summary,[role="button"],[data-track]') || t;
      var now = Date.now();
      if (t === rageEl && now - rageT < 800) rageN++;
      else {
        rageEl = t;
        rageN = 1;
      }
      rageT = now;
      if (rageN === 3) track('rage_click', { target: describe(t), section_id: sectionOf(t) });
    }), true);

    // js_error.source is never empty (ga-audit 2026-10-05: 63% of js_error rows
    // since 2026-09-28 read (not set)). Three browser behaviours left it blank:
    // an unhandledrejection carries no filename at all, WebKit (Safari and every
    // iOS browser) leaves ErrorEvent.filename empty for a module that fails to
    // link ("Importing binding name 'withCampaign' is not found": 100% of the
    // 2026-09-27 incident's WebKit rows had no source), and an extension's or a
    // blob's file scrubs to ''. The chain, first hit wins:
    //   1. the error's own file (ErrorEvent.filename), scrubbed like every URL
    //   2. a non-web file (chrome-extension:, moz-extension:, blob: ...): its
    //      scheme alone, so an extension's noise reads apart from the site's
    //   3. the first http(s) URL in the error's stack (a rejection's frame)
    //   4. this page, without its query: where the error surfaced when the
    //      browser names no file
    // A script reads as a .js path; a page-level fallback reads as a page path,
    // so the two are told apart by the path. sbTrack scrubs every URL-valued param
    // again through the K4 allow-list, so a script's `?v=<n>` does not survive
    // (it did before 2026-10-04, waitlist-form.js?v=9): `v` is not allow-listed.
    var errSource = function (file, err) {
      var s = file ? scrubUrl(file) : '';
      if (s) return s;
      if (file) {
        try {
          var p = new URL(String(file), location.href).protocol;
          if (p && p !== 'http:' && p !== 'https:') return p;
        } catch (e) {}
      }
      try {
        var stack = err && typeof err.stack === 'string' ? err.stack.slice(0, 2000) : '';
        var m = /https?:\/\/[^\s)'"]+/.exec(stack);
        if (m) {
          s = scrubUrl(m[0].replace(/(?::\d+){1,2}$/, ''));
          if (s) return s;
        }
      } catch (e) {}
      s = scrubUrl(location.href);
      var q = s.indexOf('?');
      return (q < 0 ? s : s.slice(0, q)) || String(location.protocol || 'unknown');
    };
    var errCount = 0;
    var jsError = function (msg, src, err) {
      if (errCount >= 5 || !msg || msg === 'Script error.') return;
      errCount++;
      track('js_error', { message: String(msg).slice(0, 100), source: errSource(src, err) });
    };
    window.addEventListener('error', guard(function (e) { if (e.message) jsError(e.message, e.filename, e.error); }));
    window.addEventListener('unhandledrejection', guard(function (e) {
      var r = e.reason;
      jsError(r && r.message ? r.message : String(r), '', r);
    }));
  } catch (e) {}
})();
