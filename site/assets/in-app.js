// In-app browsers and the way out of them (plan P1, step 7): ONE definition,
// read by the edge (edge/src/beta/federated-providers.164c18f8.ts, for the
// /invite slot and the lander's provider island) and by the hero module
// (site/assets/waitlist-form.js, on the reader's own user agent), so the two
// can never disagree.
//
// Google refuses embedded webviews, so inside one of these Google is hidden
// and "Open in your browser" goes last in the provider slot in its stead.
// Detection (the #61 in-app matrix, .tmp/mobile-reconcile-61/inapp/uas.tsv):
// X, Reddit's Android WebView, Facebook (FBAN / FBAV / FB_IAB and the newer
// MetaIAB forms), Instagram, TikTok (musical_ly / trill_ / BytedanceWebview),
// LinkedIn, Snapchat, LINE (`Line/`), Threads (`Barcelona`), WeChat
// (MicroMessenger), and any Android WebView (`; wv)`). The last four carry no
// `; wv)` on iOS, so only their own token names them there. Safari on iOS, Chrome on
// Android and Reddit's iOS Safari view (a plain Safari user agent) are not
// matched.
//
// The escape, per app (the same audit):
//   'safari'  iOS: x-safari-https:// hands the page to Safari (iOS 17+). It
//             fails inside Instagram, X and TikTok, so those copy instead;
//             Snapchat, LINE, Threads and WeChat copy too until the hand-off
//             is tested in each.
//   'intent'  Android: intent://…#Intent;scheme=https;end opens the default
//             browser; it works in the Meta apps and is unreliable in
//             TikTok, which copies instead.
//   'copy'    the tap copies the page link and the slot says to paste it.
// Every mode copies the link in the tap itself (the clipboard needs the
// gesture), so a scheme the app swallows still leaves the reader the link.

/** The label and its two follow-up lines, each one line at 320px. */
export const ESCAPE = { id: 'browser', label: 'Open in your browser', copied: 'Link copied', paste: 'Now paste it in your browser.' };

const IN_APP_RE = /\bTwitter|\bReddit\/|FBAN|FBAV|FB_IAB|MetaIAB|\bInstagram|musical_ly|trill_|Bytedance|LinkedInApp|\bSnapchat|\bLine\/|\bBarcelona\b|MicroMessenger|; wv\)/i;

/** True inside a social app's in-app browser (Google hidden there). */
export function isInAppBrowser(ua) {
  return IN_APP_RE.test(String(ua || ''));
}

const APPLE_RE = /\b(iPhone|iPad|iPod|Macintosh|Mac OS X)\b/;

/** True on macOS or iOS/iPadOS (an iPad's desktop-class Safari says
 *  Macintosh). "Continue with Apple" renders only here, and leads here. */
export function isApplePlatform(ua) {
  return APPLE_RE.test(String(ua || ''));
}

const IOS_RE = /\b(iPhone|iPad|iPod)\b/;
const ANDROID_RE = /\bAndroid\b/;
// Apps whose webview swallows the scheme hand-off: copy the link instead.
const IOS_NO_SAFARI_RE = /\bInstagram|\bTwitter|musical_ly|trill_|Bytedance|\bSnapchat|\bLine\/|\bBarcelona\b|MicroMessenger/i;
const ANDROID_NO_INTENT_RE = /musical_ly|trill_|Bytedance/i;

/** How this user agent leaves its in-app browser: 'safari' | 'intent' | 'copy'. */
export function escapeMode(ua) {
  const s = String(ua || '');
  if (IOS_RE.test(s)) return IOS_NO_SAFARI_RE.test(s) ? 'copy' : 'safari';
  if (ANDROID_RE.test(s)) return ANDROID_NO_INTENT_RE.test(s) ? 'copy' : 'intent';
  return 'copy';
}

/** The page's own origin in a browser ('' on the server, where the edge
 *  rebuilds the URL from its Host header and that header cannot carry one). */
const pageOrigin = () => {
  try {
    return typeof location !== 'undefined' && /^https?:$/.test(location.protocol) ? location.origin : '';
  } catch (e) {
    return '';
  }
};

/** The escape link for `url` (the page's own http(s) URL): x-safari-https://
 *  in Safari mode, intent:// in intent mode, the URL itself in copy mode (the
 *  tap copies it; the link only stands in for a reader without script). ''
 *  for a URL that is not http(s), that carries credentials
 *  (https://a@evil.com/), or that is not on `origin` (the page's own origin in
 *  a browser; pass one explicitly to pin a server-built URL). Only these three
 *  shapes are ever emitted. */
export function escapeHref(ua, url, origin = pageOrigin()) {
  const m = /^(https?):\/\/([^\s"'<>]+)$/.exec(String(url || ''));
  if (!m) return '';
  let u;
  try {
    u = new URL(m[0]);
  } catch (e) {
    return '';
  }
  if (u.username || u.password) return '';
  if (origin && u.origin !== origin) return '';
  const mode = escapeMode(ua);
  if (mode === 'safari') return `x-safari-${m[1]}://${m[2]}`;
  if (mode === 'intent') return `intent://${m[2]}#Intent;scheme=${m[1]};end`;
  return `${m[1]}://${m[2]}`;
}
