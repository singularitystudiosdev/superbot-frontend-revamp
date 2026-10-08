// OS detection for the whole site: one module every page imports as
//   import { detectPlatform, storeLink, storeLabel, osMark, OS_MARK_PATHS }
//     from '/site/assets/os-detect.js?v=1';
// No dependencies. No DOM access at import time (only inside the functions,
// guarded). Every function is sync, catches its own probes and never throws.
//
// Three copies of this ladder used to live in the site (install-snippet.js
// detectOS, the since-archived chat.js gateOS, download.html's inline script).
// This file is the one now; the others consume it or note the drift.

// MDI path bodies (Material Design Icons, 24-box), fetched live from
// api.iconify.design/mdi.json?icons=apple,microsoft-windows,linux,android,google-play
// (retrieved 2026-09-09). Raw `d` strings, one per mark.
export const OS_MARK_PATHS = {
  mac: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47c-1.34.03-1.77-.79-3.29-.79c-1.53 0-2 .77-3.27.82c-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51c1.28-.02 2.5.87 3.29.87c.78 0 2.26-1.07 3.81-.91c.65.03 2.47.26 3.64 1.98c-.09.06-2.17 1.28-2.15 3.81c.03 3.02 2.65 4.03 2.68 4.04c-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5c.13 1.17-.34 2.35-1.04 3.19c-.69.85-1.83 1.51-2.95 1.42c-.15-1.15.41-2.35 1.05-3.11',
  windows: 'M3 12V6.75l6-1.32v6.48zm17-9v8.75l-10 .15V5.21zM3 13l6 .09v6.81l-6-1.15zm17 .25V22l-10-1.91V13.1z',
  linux: 'M14.62 8.35c-.42.28-1.75 1.04-1.95 1.19c-.39.31-.75.29-1.14-.01c-.2-.16-1.53-.92-1.95-1.19c-.48-.31-.45-.7.08-.92c1.64-.69 3.28-.64 4.91.03c.49.21.51.6.05.9m7.22 7.28c-.93-2.09-2.2-3.99-3.84-5.66a4.3 4.3 0 0 1-1.06-1.88c-.1-.33-.17-.67-.24-1.01c-.2-.88-.29-1.78-.7-2.61c-.73-1.58-2-2.4-3.84-2.47c-1.81.05-3.16.81-3.95 2.4c-.21.43-.36.88-.46 1.34c-.17.76-.32 1.55-.5 2.32c-.15.65-.45 1.21-.96 1.71c-1.61 1.57-2.9 3.37-3.88 5.35c-.14.29-.28.58-.37.88c-.19.66.29 1.12.99.96c.44-.09.88-.18 1.3-.31c.41-.15.57-.05.67.35c.65 2.15 2.07 3.66 4.24 4.5c4.12 1.56 8.93-.66 9.97-4.58c.07-.27.17-.37.47-.27c.46.14.93.24 1.4.35c.49.09.85-.16.92-.64c.03-.26-.06-.49-.16-.73',
  ios: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47c-1.34.03-1.77-.79-3.29-.79c-1.53 0-2 .77-3.27.82c-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51c1.28-.02 2.5.87 3.29.87c.78 0 2.26-1.07 3.81-.91c.65.03 2.47.26 3.64 1.98c-.09.06-2.17 1.28-2.15 3.81c.03 3.02 2.65 4.03 2.68 4.04c-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5c.13 1.17-.34 2.35-1.04 3.19c-.69.85-1.83 1.51-2.95 1.42c-.15-1.15.41-2.35 1.05-3.11',
  android: 'M16.61 15.15c-.46 0-.84-.37-.84-.83s.38-.82.84-.82s.84.36.84.82s-.38.83-.84.83m-9.2 0c-.46 0-.84-.37-.84-.83s.38-.82.84-.82s.83.36.83.82s-.37.83-.83.83m9.5-5.01l1.67-2.88c.09-.17.03-.38-.13-.47c-.17-.1-.38-.04-.45.13l-1.71 2.91A10.15 10.15 0 0 0 12 8.91c-1.53 0-3 .33-4.27.91L6.04 6.91a.334.334 0 0 0-.47-.13c-.17.09-.22.3-.13.47l1.66 2.88C4.25 11.69 2.29 14.58 2 18h20c-.28-3.41-2.23-6.3-5.09-7.86',
  'google-play': 'M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35m13.81-5.38L6.05 21.34l8.49-8.49zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32l-2.5-2.5l2.5-2.5zM6.05 2.66l10.76 6.22l-2.27 2.27z',
};

const LABELS = {
  mac: 'macOS', windows: 'Windows', linux: 'Linux',
  ios: 'iPhone or iPad', android: 'Android',
};

// Store routes (edge/src/app.ts, U2): 302 to the real store or a coming-soon
// shell. null for every desktop OS.
export function storeLink(os) {
  if (os === 'ios') return '/download/store/ios';
  if (os === 'android') return '/download/store/android';
  return null;
}

// The CTA label for a phone. No store listing exists yet: storeLink's route
// renders the coming-soon page (edge/src/store-links.ts) unless the store env
// is set, so the label says so instead of naming a store it is not on. Same
// signature as before: a string for ios/android, null for everything else.
export function storeLabel(os) {
  if (os === 'ios') return 'iPhone app, coming soon';
  if (os === 'android') return 'Android app, coming soon';
  return null;
}

// Inline SVG markup for a platform mark, or '' for null/unknown. The mark
// never leaves currentColor and never carries its own size outside the
// attributes the caller named (layout rule: it sits inside the control, left
// of the label, gap var(--sp-2), at most the label's line-height).
export function osMark(os, size = 20) {
  try {
    const d = OS_MARK_PATHS[os];
    if (!d) return '';
    const n = Number(size) > 0 ? Math.round(Number(size)) : 20;
    return `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  } catch {
    return '';
  }
}

// The one detection ladder: navigator.userAgentData.platform first (UA-CH,
// Chromium and the honest answer), then the UA string, then navigator.platform.
// Never throws: every probe is guarded, any miss answers null.
export function detectPlatform() {
  try {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const navPlatform = (typeof navigator !== 'undefined' && navigator.platform) || '';
    let touchPoints = 0;
    try { touchPoints = navigator.maxTouchPoints || 0; } catch { /* very old engines */ }

    const uad = (typeof navigator !== 'undefined' && navigator.userAgentData) || null;
    const uadPlatform = (uad && typeof uad.platform === 'string' && uad.platform) || '';

    // 1. UA-CH platform. iPadOS 13+ Safari in desktop mode still reports the
    //    mac platform with a multi-touch screen: maxTouchPoints > 1 says ios.
    let os = null;
    const up = uadPlatform.toLowerCase();
    if (up) {
      if (up === 'macos' || up === 'mac') os = touchPoints > 1 ? 'ios' : 'mac';
      else if (up === 'windows') os = 'windows';
      else if (up === 'android') os = 'android';
      else if (up === 'ios') os = 'ios';
    }

    // 2. UA string. Phone and tablet tokens before the desktop ones: an
    //    Android UA carries "Linux", iOS Safari carries "Mac" on iPadOS.
    if (!os) {
      if (/iphone|ipad|ipod/i.test(ua)) os = 'ios';
      else if (/android/i.test(ua)) os = 'android';
      else if (/windows|win32|win64|wow64/i.test(ua)) os = 'windows';
      else if (/mac os x|macintosh/i.test(ua)) os = touchPoints > 1 ? 'ios' : 'mac';
      else if (/cros|linux|x11/i.test(ua)) os = 'linux';
    }

    // 3. navigator.platform, the last resort.
    if (!os) {
      const np = navPlatform.toLowerCase();
      if (np.includes('win')) os = 'windows';
      else if (np.includes('mac')) os = touchPoints > 1 ? 'ios' : 'mac';
      else if (np.includes('linux') || np.includes('x11')) os = 'linux';
    }

    // mobile: a phone/tablet OS, or a coarse pointer carrying a mobile UA
    // token (the desktop app's own mobile-web gate reads the same shape).
    let mobile = os === 'ios' || os === 'android';
    if (!mobile) {
      try {
        mobile = !!(matchMedia && matchMedia('(pointer: coarse)').matches
          && /android|iphone|ipad|ipod|mobile|tablet/i.test(ua));
      } catch { /* matchMedia unavailable */ }
    }

    return { os, mobile, label: os ? LABELS[os] : null };
  } catch {
    return { os: null, mobile: false, label: null };
  }
}
