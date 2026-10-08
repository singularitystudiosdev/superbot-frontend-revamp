// The header's store retarget. An ES module the shared header (siteNav in
// edge/src/site-nav.ts) loads on every page:
//   <script type="module" src="/site/assets/nav-store.js?v=2"></script>
//
//   - On a phone or tablet (detectPlatform().os of ios/android) the header
//     pill `.sb-nav .sb-btn[href$="/download"]` keeps its /download href and
//     reads 'Get superbot', with no store mark: there is no App Store or Play
//     listing yet (2026-09-23), and /download says the phone apps are coming.
//   - On a Mac it prepends the apple mark to the same pill and changes nothing
//     else (same href, same text). Windows and Linux get no mark: there is no
//     desktop build for them yet, so the pill must not promise one.
//   - No-op whenever nothing matches: no pill, no OS, an unknown platform, a
//     coarse pointer without a mobile UA token. Never throws.
//
// The mark sits inside the pill behind the site.css shared recipe
// (.sb-btn .sb-os-mark), left of the label with the button's own
// var(--sp-2) gap.

import { detectPlatform, osMark } from '../../site/assets/os-detect.js?v=2';

(function () {
  try {
    // An open beta host serves a visitor without a grant the sign-up or
    // invite-code entry in the pill's slot (edge siteNav `access`), whose href
    // also ends in /download, and marks it data-access (the lander marks
    // <body> too). Leave it exactly as served. Absent or "granted": today's
    // retarget.
    const pill = document.querySelector('.sb-nav .sb-btn[href$="/download"]');
    if (!pill) return;
    const access = pill.dataset.access || (document.body && document.body.dataset.access);
    if (access && access !== 'granted') return;
    const { os, mobile } = detectPlatformSafe();

    // a phone or tablet: same /download href, an honest label, no store mark
    if (mobile && (os === 'ios' || os === 'android')) {
      pill.textContent = 'Get superbot';
      return;
    }

    // a Mac: keep href and text, prepend the apple mark only
    if (os !== 'mac' || mobile) return;
    const mark = osMark(os, 16);
    if (!mark) return;
    if (pill.querySelector('.sb-os-mark')) return; // already marked
    pill.insertAdjacentHTML('afterbegin', `<span class="sb-os-mark">${mark}</span>`);
  } catch {
    // a missing header, an odd DOM shape, anything — the page stands as served
  }

  function detectPlatformSafe() {
    try { return detectPlatform(); } catch { return { os: null, mobile: false, label: null }; }
  }
})();
