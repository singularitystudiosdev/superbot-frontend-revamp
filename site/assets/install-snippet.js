// Install snippet with OS detection. Shared by the landers:
//   import { mountInstallSnippet } from '/site/assets/install-snippet.js?v=44';
//   mountInstallSnippet(document.getElementById('oneliner'));
// Two shapes. With { helper: true } (the landing page, 2026-09-23) it renders
// the Helper/CLI bootstrap lines (bootstrap.sh / bootstrap.ps1, visitor's OS
// first), a "what does this install?" fold, and a small "MCP setup" link to
// /docs#tool. The default (every other caller) leads with the paste-to-agent
// command row (what is shown IS what is copied), then a quiet per-client
// recipes link to /docs#clients, then the "what does this do?" fold carrying
// the per-client alternates (claude code's own add line, VS Code's one-click
// URL).
// Every command it draws (the Helper rows, the paste row, the fold's lines and
// mountCommandRow's) is one line in a hairline box, in the one recipe /download's
// command boxes carry (owner, 2026-10-05: "no scroll bars, they look terrible";
// variant 3, "Fade"): never wrapped (owner, 2026-09-06), never scrolled with a
// bar; a line wider than its box is clipped and fades out at the box's end; the
// whole box is ONE copy button, which copies the code's full text.
// Self-styled via CSS vars with fallbacks so it inherits each page's tokens
// (site/assets/site.css).
//
// Fires `superbot:copied` on window with { source } after a copy that
// actually happened (the mascot celebrates; /docs advances its step rail).

import { detectPlatform } from '/site/assets/os-detect.js?v=2';

// The desktop OS for the widget's own purposes, mapped off the one shared
// ladder (os-detect.js, also behind download.html, the header's nav-store.js
// and chat.js's gate): windows -> 'win', mac -> 'mac', linux -> 'linux'.
// A phone (ios or android) or an unknown platform answers null when the
// device reads as mobile — the download belongs on the computer there, which
// is the old fallback's noDownload behaviour — and 'linux' only for an
// unknown desktop platform.
function detectOS() {
  const { os, mobile } = detectPlatform();
  if (os === 'windows') return 'win';
  if (os === 'mac') return 'mac';
  if (os === 'linux') return 'linux';
  return mobile ? null : 'linux';
}

// The touch/mobile predicate shared with /chat's account gate (chat.js
// imports it so the two cannot drift): when it answers true the visitor is on
// a phone or tablet, the download belongs on the computer, and the widget
// says so instead of offering a desktop artifact as its primary.
export const isTouchDevice = () => {
  // os-detect.js carries the same ladder plus the iPadOS desktop-mode case,
  // so its answer wins; the old probe below stays for anything where the
  // import is unavailable. (chat.js imports this by name — shape intact.)
  try { if (detectPlatform().mobile) return true; } catch { /* os-detect unavailable */ }
  return matchMedia('(pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');
};

// Evidence for an arch chip when client hints are absent: Safari answers
// navigator.userAgentData with nothing, so the WebGL renderer is the only
// probe left. WEBGL_debug_renderer_info exposes UNMASKED_RENDERER_WEBGL
// (MDN: https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info,
// retrieved 2026-09-04). CAVEAT, same retrieval: current Safari masks the
// renderer to "Apple GPU" on EVERY mac, Intel included (gpuweb/gpuweb#2195,
// retrieved 2026-09-04), so "Apple GPU" is only WEAK arm evidence on Safari.
// Firefox with privacy.resistFingerprinting disables the extension entirely
// (MDN), and any throw or miss leaves arch null. Never blocks rendering:
// try/catch around the whole probe.
function webglArch() {
  try {
    const canvas = document.createElement && document.createElement('canvas');
    const gl = canvas && canvas.getContext && canvas.getContext('webgl');
    if (!gl || !gl.getExtension || !gl.getParameter) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return null;
    const r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    if (!r) return null;
    if (/Apple (GPU|M\d)/i.test(r)) return 'arm';
    if (/Intel|AMD|Radeon|NVIDIA/i.test(r)) return 'x64';
    return null;
  } catch {
    // no canvas, no webgl, a masked renderer, anything — no evidence
  }
  return null;
}

// arch, best effort: userAgentData's high-entropy ask is the strongest signal
// (its UA is frozen at "Intel" on all macs). Without client hints, the UA
// string sniff covers Linux (its UA carries the real arch) and a WebGL
// renderer probe takes a mac the rest of the way; anything unresolved leaves
// arch null and the caller's default stands. windowsArm64 is TRUE only on
// POSITIVE arm evidence: the client hint's architecture 'arm' WITH bitness
// '64', or an ARM64 token in the UA string — a bare 'arm' answer with no
// bitness never claims arm64. `source` says where the answer came from:
// 'client-hints' when the probe answered (the only fully-trusted tier),
// 'webgl' when the renderer decided, 'none' when the default was kept on no
// evidence. Exported for /chat's gate (chat.js), which paints its own
// arch-aware rows.
export async function detectArchEvidence(dlOS) {
  let arch = null;
  let heAnswered = false;
  let heBitness64 = false;
  try {
    const he = await navigator.userAgentData?.getHighEntropyValues?.(['architecture', 'bitness']);
    if (/^arm/.test(he?.architecture || '')) { arch = 'arm'; heAnswered = true; heBitness64 = he?.bitness === '64'; }
    else if (/^x86/.test(he?.architecture || '')) { arch = 'x64'; heAnswered = true; }
  } catch {
    // no userAgentData — the UA sniff below decides
  }
  if (!arch) {
    const ua = `${navigator.userAgent || ''} ${navigator.platform || ''}`;
    if (/aarch64|arm64|armv[78]/i.test(ua)) arch = 'arm';
    else if (/x86_64|amd64|x64/i.test(ua)) arch = 'x64';
  }
  let source = heAnswered ? 'client-hints' : 'none';
  if (!arch && dlOS === 'mac') {
    const w = webglArch();
    if (w) { arch = w; source = 'webgl'; }
  }
  return { arch, heAnswered, source, windowsArm64: (heAnswered && heBitness64) || (!heAnswered && arch === 'arm') };
}

// The /onboard card's primary-download contract: the desktop app page,
// handed over as data. Resolves to { href, label, file, afterLine }, or null
// on a touch/mobile device (the download belongs on the computer there).
// Never throws. onboarding-page.ts imports it as
// /site/assets/install-snippet.js?v=44 — the name and shape are fixed.
export async function resolvePrimaryDownload() {
  try {
    if (isTouchDevice()) return null;
    return {
      href: `${location.origin}/download`,
      label: 'Download the desktop app',
      file: 'superbot-desktop',
      afterLine: '',
    };
  } catch {
    return null;
  }
}

// Minimal tinting for copy boxes: the command word bright, flags muted,
// URLs in the accent. WYSIWYG contract: this styles the SAME text that is
// copied — the plain string still rides the copy handler untouched.
function tint(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(https?:\/\/[^\s"]+)/g, '<span class="sb-url">$1</span>')
    .replace(/(^|\s)(curl|wget|powershell|npx|sh|claude)(?=\s|$)/g, '$1<b>$2</b>')
    .replace(/(^|\s)(-{1,2}[a-zA-Z][\w-]*)/g, '$1<span class="sb-flag">$2</span>');
}

// the copy control's glyph: lucide's copy, check and x (24-unit, the same three
// /download's .cpy draws). One svg holds all three; the button's class
// (.copied, .blocked) picks which one shows
const GLYPH = '<svg class="sb-copy-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><g class="sb-copy-g-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></g><path class="sb-copy-g-ok" d="M20 6 9 17l-5-5"/><path class="sb-copy-g-no" d="M18 6 6 18M6 6l12 12"/></svg>';
const IDLE = 'click to copy';

// the copy control, shared by the widget's rows and the standalone command row
// (mountCommandRow): ONE <button> holding the muted label and the glyph. Its
// ::after stretches over the whole box (STYLE), so a press anywhere in the box
// copies. `aria` is its name and must start with the visible label (a screen
// reader user who says "click to copy" gets this button); `label` is the word
// the box shows, which flips to "copied" / "copy failed" and back
const copyBtn = (cls, aria, label = IDLE) =>
  `<button class="sb-copy ${cls}" type="button" aria-label="${aria}"><span class="sb-copy-label">${label}</span>${GLYPH}</button>`;

// the STYLE tag goes in once per page, whichever mount ran first
function ensureStyle() {
  if (document.getElementById('sb-oneliner-style')) return;
  const style = document.createElement('style');
  style.id = 'sb-oneliner-style';
  style.textContent = STYLE;
  document.head.appendChild(style);
}

// the fade: a command that fits its box shows no fade, one that overflows
// fades out at the box's end (STYLE's default, which is also all a visit with
// no script gets, and is safe: the box clips). A box inside a closed fold has no
// width yet, so each line is watched: it is measured whenever it gains or
// changes its size and whenever its text is swapped, and the whole page's lines
// again on a window resize and when the fonts settle
function fits(code) {
  const box = code.parentElement;
  if (!box || !code.clientWidth) return;
  if (code.scrollWidth > code.clientWidth) box.removeAttribute('data-fits'); else box.setAttribute('data-fits', '');
}
let fitWired = false;
function watchFit(code) {
  if (!code) return;
  fits(code);
  if (window.ResizeObserver) new ResizeObserver(() => fits(code)).observe(code);
  if (window.MutationObserver) new MutationObserver(() => fits(code)).observe(code, { childList: true, characterData: true, subtree: true });
  if (fitWired) return;
  fitWired = true;
  const all = () => document.querySelectorAll('.sb-oneliner .sb-cmd > code').forEach(fits);
  addEventListener('resize', all);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
}

// Same ladder as the landers' copy buttons: async clipboard in secure
// contexts, execCommand elsewhere — and feedback only on a copy that actually
// happened, or on both refusing. What is copied is the code's whole textContent
// (the full command, never the clipped part on screen; tint()'s spans add no
// text, so it is the plain string) unless `text` is given (a getter or a
// string: the VS Code row has a link, not a code). `live` is the aria-live
// region the answer is also said through
function wireCopy(btn, text, source, live) {
  if (!btn) return;
  const label = btn.querySelector('.sb-copy-label');
  const idle = label ? label.textContent : IDLE;
  const say = (t) => { if (live) live.textContent = t; };
  // the glyph turns to a check (or a cross) and the label says so for a moment
  const flash = (words, cls) => {
    if (label) label.textContent = words;
    btn.classList.remove('copied', 'blocked');
    btn.classList.add(cls);
    clearTimeout(btn._t);
    // 1500ms: the dwell /download's copy buttons use (shadcn's copy-button and
    // VitePress's copyCode ship 2000, retrieved 2026-09-04)
    btn._t = setTimeout(() => { if (label) label.textContent = idle; btn.classList.remove(cls); say(''); }, 1500);
  };
  btn.addEventListener('click', () => {
    const codeEl = btn.closest('.sb-cmd')?.querySelector('code');
    const value = text == null ? (codeEl ? codeEl.textContent : '') : typeof text === 'function' ? text() : text;
    if (!value) return;
    const done = () => {
      dispatchEvent(new CustomEvent('superbot:copied', { detail: { source } }));
      flash('copied', 'copied');
      say('copied to clipboard');
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      } finally {
        ta.remove();
      }
      if (ok) done();
      else {
        // both clipboard rungs refused: leave the command selected so one
        // keystroke copies it, and say so on the button and aloud — no modal
        if (codeEl) { const sel = getSelection(); sel.removeAllRanges(); const r = document.createRange(); r.selectNodeContents(codeEl); sel.addRange(r); }
        flash('copy failed', 'blocked');
        say('clipboard blocked: the command is selected, press copy on your keyboard');
      }
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, fallback);
    else fallback();
  });
}

// ---- token mirror ----
// The hardcoded fallbacks in STYLE below mirror the canonical token sheet in
// site/assets/site.css (the :root block: surfaces + ink, the one accent,
// radii, spacing, type, durations, targets). site.css is the single source of truth; these
// fallbacks exist so pages that predate the sheet still paint. Any token
// change in site.css MUST update this mirror in the same commit, or the two
// surfaces drift.
const STYLE = `
.sb-oneliner {
  /* stay inside the page's centered column — never span the page margins */
  margin: 0 auto; max-width: var(--content, 720px); width: 100%; text-align: left;
  font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px);
}
.sb-oneliner .sb-or { color: var(--muted, #9a9a9a); margin-bottom: var(--sp-2, 8px); }
.sb-oneliner .sb-or:empty { display: none; }
/* the "setup for every client" link: a quiet text control (muted, underlined
   on hover), a full-height touch target */
.sb-oneliner .sb-more-link {
  display: inline-flex; align-items: center; min-height: max(24px, var(--target-sm, 28px)); padding: 0;
  background: none; border: 0; color: var(--muted, #9a9a9a); font: inherit; font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px);
  text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; cursor: pointer;
  transition: color var(--dur-2, 150ms) var(--ease-std, ease), text-decoration-color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner .sb-more-link:hover, .sb-oneliner .sb-more-link:focus-visible { color: var(--fg, #ececec); text-decoration-color: currentColor; }
.sb-oneliner .sb-more { margin-top: var(--sp-2, 8px); }
.sb-oneliner .sb-cmd {
  --sb-fade: var(--sp-8, 32px);
  position: relative; display: flex; align-items: center; gap: 0;
  min-height: var(--target, 36px); padding: var(--sp-1, 4px) var(--sp-3, 12px);
  background: var(--card, #0d0d0d); border: 1px solid var(--line, #262626); border-radius: var(--r-control, 8px);
  transition: border-color var(--dur-2, 150ms) var(--ease-std, ease);
}
/* a command is ONE line, never wrapped (owner, 2026-09-06: never wrap the
   command: a pipe broken mid-URL reads as two commands) and never scrolled
   with a bar (owner, 2026-10-05: "no scroll bars, they look terrible"; mockup
   download-token-one-liner-20261005-1710, variant 3, "Fade": the same recipe as
   /download's .cmd). A line wider than its box is clipped, and its last
   --sb-fade fades out into the box, so the cut reads as a soft end, not an
   error; a line that fits shows no fade (watchFit sets data-fits on the box when
   scrollWidth fits clientWidth; with no script the box clips with the fade,
   which is safe). Nothing here scrolls, so the code is no tab stop: the copy
   button is the one stop. The line and the control are two flex items of one
   row, so the line's box ENDS exactly where the control's begins: the code is
   flex: 1 with min-width: 0 and overflow: hidden, the control flex: none, and
   the mask is on the code's own box. The fade is solid until --sb-fade from the
   box's end and fully clear --sp-1 BEFORE it, so a letter cut by the edge is
   never a ghost against the control. What copy sends is the code's whole text,
   never the clipped part on screen. */
.sb-oneliner .sb-cmd code {
  flex: 1; min-width: 0; overflow: hidden; white-space: nowrap;
  font-family: var(--font-mono, ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace); font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px); color: var(--fg, #ececec);
  background: none; border: 0; padding: var(--sp-1, 4px) 0;
  -webkit-mask-image: linear-gradient(to right, var(--fg, #ececec) calc(100% - var(--sb-fade)), transparent calc(100% - var(--sp-1, 4px)));
  mask-image: linear-gradient(to right, var(--fg, #ececec) calc(100% - var(--sb-fade)), transparent calc(100% - var(--sp-1, 4px)));
}
.sb-oneliner .sb-cmd[data-fits] code { -webkit-mask-image: none; mask-image: none; }
/* the copy control: ONE button, the muted "click to copy" label and a copy
   glyph at the box's end. Its ::after stretches over the whole box (the box is
   the positioned ancestor: the button itself is not positioned), so a press
   anywhere in the box copies. Hover reaches --fg and the box's hairline
   --line-strong; copied is the glyph turning to a check in the accent, with the
   word, for a moment; refused (both clipboard rungs) is a cross and "copy
   failed". */
.sb-oneliner .sb-cmd .sb-copy {
  flex: none; display: inline-flex; align-items: center; gap: var(--sp-2, 8px);
  min-height: var(--target-sm, 28px); padding: 0; background: none; border: 0;
  color: var(--muted, #9a9a9a); font: inherit; font-size: var(--fs-xs, 12px); line-height: var(--lh-xs, 16px); font-weight: 400; white-space: nowrap; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner .sb-cmd .sb-copy::after { content: ''; position: absolute; inset: 0; border-radius: var(--r-control, 8px); }
.sb-oneliner .sb-cmd .sb-copy-label { min-width: calc(var(--sp-16, 64px) + var(--sp-2, 8px)); text-align: right; } /* "copied" does not pull the line sideways */
.sb-oneliner .sb-cmd .sb-copy-ico { flex: none; width: var(--sp-4, 16px); height: var(--sp-4, 16px); }
.sb-oneliner .sb-cmd .sb-copy-ico .sb-copy-g-ok, .sb-oneliner .sb-cmd .sb-copy-ico .sb-copy-g-no { display: none; }
.sb-oneliner .sb-cmd .sb-copy.copied .sb-copy-g-ok, .sb-oneliner .sb-cmd .sb-copy.blocked .sb-copy-g-no { display: inline; }
.sb-oneliner .sb-cmd .sb-copy.copied .sb-copy-g-copy, .sb-oneliner .sb-cmd .sb-copy.blocked .sb-copy-g-copy { display: none; }
@media (hover: hover) {
  .sb-oneliner .sb-cmd .sb-copy:hover { color: var(--fg, #ececec); }
  .sb-oneliner .sb-cmd:not(.sb-cmd-link):has(.sb-copy:hover) { border-color: var(--line-strong, #5c5c5c); }
}
.sb-oneliner .sb-cmd .sb-copy:active { color: var(--fg, #ececec); }
.sb-oneliner .sb-cmd .sb-copy.copied { color: var(--accent, #4d8aff); }
.sb-oneliner .sb-cmd .sb-copy.blocked { color: var(--fg, #ececec); }
/* the ring is the whole box's, drawn on the stretched ::after (the button's own would hug the label) */
.sb-oneliner .sb-cmd .sb-copy:focus-visible { outline-color: transparent; }
.sb-oneliner .sb-cmd .sb-copy:focus-visible::after { outline: 2px solid var(--accent, #4d8aff); outline-offset: 2px; }
/* the VS Code row holds a link and its copy fallback, not a command line: it is
   a box that wraps when it must (the label can be long, the link is a control)
   and scrolls nowhere. The link keeps its own press, so the button's ::after
   does not stretch over it: the ring goes round the button alone, the box's
   hairline does not follow its hover. */
.sb-oneliner .sb-cmd.sb-cmd-link { flex-wrap: wrap; gap: var(--sp-2, 8px); justify-content: space-between; }
.sb-oneliner .sb-cmd.sb-cmd-link .sb-copy::after { content: none; }
.sb-oneliner .sb-cmd.sb-cmd-link .sb-copy-label { min-width: 0; }
.sb-oneliner .sb-cmd.sb-cmd-link .sb-copy:focus-visible { outline: 2px solid var(--accent, #4d8aff); outline-offset: 2px; }
/* fold rows: a small label above each alternate command, so each one is a
   self-contained copy target instead of a wrapped inline fragment */
.sb-oneliner .sb-row { margin-top: var(--sp-3, 12px); }
.sb-oneliner .sb-row .sb-lab { color: var(--muted, #9a9a9a); font-size: var(--fs-xs, 12px); line-height: var(--lh-xs, 16px); margin-bottom: var(--sp-1, 4px); }
.sb-oneliner .sb-row.sb-links { display: flex; flex-wrap: wrap; gap: var(--sp-2, 8px); align-items: center; }
.sb-oneliner .sb-row.sb-links .sb-lab { width: 100%; }
.sb-oneliner a.sb-deep {
  display: inline-flex; align-items: center; gap: 6px; min-height: max(32px, var(--target-sm, 28px)); padding: 0 var(--sp-3, 12px);
  border: 1px solid var(--line, #262626); border-radius: var(--r-md, 8px); background: transparent;
  color: var(--fg, #ececec); text-decoration: none; font-size: var(--fs-xs, 12px);
  transition: border-color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner a.sb-deep:hover { border-color: var(--accent); }
/* syntax tinting: verbs bright, flags muted, URLs accent — styling only,
   the text content stays byte-identical to what copy puts on the board */
.sb-oneliner .sb-cmd code b { color: var(--fg, #ececec); font-weight: 600; }
.sb-oneliner .sb-cmd code .sb-flag { color: var(--muted, #9a9a9a); }
.sb-oneliner .sb-cmd code .sb-url { color: var(--accent); }
.sb-oneliner details.sb-fold { margin-top: var(--sp-3, 12px); }
.sb-oneliner details.sb-fold summary {
  color: var(--muted, #9a9a9a); cursor: pointer; list-style: none; user-select: none; text-align: left;
  display: inline-flex; align-items: center; min-height: var(--target-sm, 28px); border-radius: var(--r-sm, 8px);
  transition: color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner details.sb-fold summary:hover { color: var(--fg, #ececec); }
.sb-oneliner details.sb-fold summary::-webkit-details-marker { display: none; }
/* Child combinator: with folds nested, each arrow must key off its OWN
   details' open state, not any open ancestor's. */
.sb-oneliner details.sb-fold > summary::before { content: '▸'; color: var(--accent); width: 1.2em; display: inline-block; transition: transform var(--dur-3, 200ms) var(--ease-out, ease); }
.sb-oneliner details.sb-fold[open] > summary::before { transform: rotate(90deg); }
.sb-oneliner details.sb-fold .sb-cmd { margin-top: var(--sp-2, 8px); }
.sb-oneliner details.sb-fold details.sb-fold { margin-left: var(--sp-4, 16px); }
.sb-oneliner .sb-what { color: var(--muted, #9a9a9a); font-size: var(--fs-xs, 12px); line-height: var(--lh-xs, 16px); margin-top: var(--sp-2, 8px); max-width: var(--measure, 62ch); }
.sb-oneliner .sb-what code { color: var(--fg, #ececec); }
/* the fold's "get the desktop app" link is a control: it measured 266x37 on
   a coarse pointer (mobile matrix, 2026-09-09), under the 44px floor. The
   --target token lifts it to 44 there and 36 on a mouse. */
.sb-oneliner .sb-what a { display: inline-flex; align-items: center; min-height: var(--target, 36px); color: var(--accent); }
.sb-oneliner .sb-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
/* the fold's explanations are sentences: on a touch device they read at
   body-small, not caption size (the row labels above each command stay 12px) */
@media (pointer: coarse) {
  .sb-oneliner .sb-what { font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px); }
}
/* a command box on a phone: the line is what the box is for, and the "click to
   copy" label would take 72px of a 262px box (15 characters of the line left,
   11 of them before the fade, measured at 320 on /download). So the box holds
   the copy glyph alone at its end: the label stays in the markup as the button's
   text (and as the word that flips to "copied"), visually hidden by the
   site.css .sb-visually-hidden recipe, which a class in the markup could not
   apply to the phone alone; the "copied" answer is the glyph turning to a check
   and the live region saying it; the hit area is still the whole box and the
   ring still goes round it. The padding steps in a --sp-1 each side and the fade
   narrows to --sp-4, so the faded end is never against the glyph. The VS Code
   row keeps its words: a lone glyph beside a link names nothing. The breakpoint
   is /download's, 480px. */
@media (max-width: 480px) {
  .sb-oneliner .sb-cmd { --sb-fade: var(--sp-4, 16px); padding-inline: var(--sp-2, 8px); }
  .sb-oneliner .sb-cmd:not(.sb-cmd-link) .sb-copy-label { position: absolute; width: 1px; height: 1px; min-width: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  /* the glyph alone is 16px wide, under the target floor (24px WCAG 2.5.8; 44px under a finger, the mobile matrix's rule, which
     measures the button's own box): the button holds it centred in a --target square, 20px of line given up at 44, and its
     ::after still stretches the hit area over the whole box */
  .sb-oneliner .sb-cmd:not(.sb-cmd-link) .sb-copy { min-width: var(--target, 36px); justify-content: center; }
}
/* the download control is a .sb-btn storm button (site.css carries the ramp,
   the sheen and the glow); this rule keeps only the widget's own anatomy */
.sb-oneliner .sb-dl-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: max(44px, var(--target, 44px)); padding: 0 var(--sp-4, 16px);
  border-radius: var(--r-md, 8px);
  font-weight: 600; text-decoration: none;
}
.sb-oneliner .sb-dl-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
/* the Helper/CLI rows (opts.helper): the same box and recipe as every other
   command above. A shell line never wraps and never scrolls, because a pipe
   broken mid-URL reads as two commands and a scroll bar is the defect. */
.sb-oneliner .sb-helper .sb-row:first-child { margin-top: 0; }
/* links inside the Helper fold's sentence stay inline: an inline-flex target
   here opened a tall line box and broke the paragraph's rhythm (WCAG 2.5.8
   exempts links inside a sentence from the target size) */
.sb-oneliner .sb-helper-fold .sb-what a { display: inline; min-height: 0; padding-block: calc((var(--target-sm, 28px) - 1em) / 2); }
/* ...but the bootstrap.sh / bootstrap.ps1 links measured 17px tall (mobile
   matrix, 2026-09-23). Vertical padding on an INLINE box grows its hit area
   without touching the line box, so the sentence keeps its rhythm while the
   target reaches --target-sm: ~31px on a mouse (floor 24), ~47px on a coarse
   pointer where the token is 44. */
.sb-oneliner .sb-more-note { color: var(--muted, #9a9a9a); margin-right: var(--sp-1, 4px); }
.sb-oneliner .sb-more .sb-more-link { text-decoration-color: var(--line, #262626); color: var(--fg, #ececec); }
`;

// The Helper/CLI install row (opts.helper, the landing page's "or from a
// terminal" path, 2026-09-23): the app download is the page's primary, and
// this is the second path, the same two bootstrap lines /download's #dl-cli
// and /docs' Start here carry, in the same words. The visitor's OS row comes
// first. The MCP paste line is not here: it is one surface among several, so
// it rides a small secondary link to the /docs MCP section instead. Between
// the two sits one quiet row for people who keep their own harness: the
// standalone superbot relay app, the /download#helper card (the second route,
// never the hero). edge/src/app.ts landerWithFallback renders the same rows
// for a fetch that runs no JS.
function mountHelperRow(el, opts) {
  const origin = location.origin;
  const eo = origin.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rows = [
    { id: 'sh', label: 'macOS and Linux', cmd: `curl -fsSL ${origin}/bootstrap.sh | sh` },
    { id: 'ps', label: 'Windows, in PowerShell', cmd: `irm ${origin}/bootstrap.ps1 | iex` },
  ];
  if (detectOS() === 'win') rows.reverse();
  const row = (r) => `
      <div class="sb-row"><div class="sb-lab">${r.label}</div>
        <div class="sb-cmd"><code>${tint(r.cmd)}</code>${copyBtn(`sb-copy-${r.id}`, `${IDLE} the ${r.label} install line`)}</div></div>`;

  ensureStyle();
  el.classList.add('sb-oneliner');
  el.innerHTML = `
    <div class="sb-helper">${rows.map(row).join('')}</div>
    <div class="sb-live" aria-live="polite"></div>
    <details class="sb-fold sb-helper-fold"><summary>${opts.fold || 'what does this install?'}</summary>
      <div class="sb-what">one line installs the Helper, the local relay your agents run through, and the <code>superbot</code> command, then the app where a build exists. on Windows and Linux it installs the Helper and skips the app for now. read it first: <a href="${eo}/bootstrap.sh">bootstrap.sh</a>, <a href="${eo}/bootstrap.ps1">bootstrap.ps1</a>. <code>superbot uninstall</code> removes it all.</div>
    </details>
    <div class="sb-row sb-more sb-more-helper"><span class="sb-more-note">use your own harness?</span><a class="sb-more-link" href="${eo}/download#helper">superbot relay</a></div>
    <div class="sb-row sb-more"><span class="sb-more-note">connecting an agent directly?</span><a class="sb-more-link" href="${eo}/docs#tool">MCP setup</a></div>
  `;
  const live = el.querySelector('.sb-live');
  for (const r of rows) wireCopy(el.querySelector(`.sb-copy-${r.id}`), null, 'oneliner', live);
  el.querySelectorAll('.sb-cmd > code').forEach(watchFit);
}

export async function mountInstallSnippet(el, opts = {}) {
  if (!el) return;
  // opts.helper: render the Helper/CLI bootstrap rows instead of the MCP paste
  // row (the landing page). Every other caller keeps the default below.
  if (opts.helper) return mountHelperRow(el, opts);
  const mcpUrl = opts.mcpUrl || `${location.origin}/mcp`;
  // The paste-to-agent line is the row: what it shows is what the copy
  // button puts on the clipboard, byte for byte.
  const skillCmd = `install the superbot MCP server globally: ${mcpUrl}`;
  // Claude Code's own add line: `-s user` is what puts it in every project
  // (the flag defaults to local, one directory).
  const claudeCmd = `claude mcp add --transport http superbot ${mcpUrl} -s user`;
  // VS Code's documented URL handler: vscode:mcp/install?{urlencoded json}.
  // A human clicks it; the page never tells an agent to.
  const vscodeHref = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'superbot', type: 'http', url: mcpUrl }))}`;
  // the fold goes to innerHTML with intentional <code> markup, so the
  // origin is escaped here — a hostile Host header must not write markup
  // through it (the tint() path escapes its own interpolation; this one
  // would otherwise bypass that discipline)
  const eo = location.origin.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // The Desktop app is the install for a computer; a phone cannot run it, so a
  // coarse pointer gets no button and its first line is the command row.
  // opts.noDownload: the host already shows the download as its own primary
  // (the landing page's download hero, 2026-09-08), so the widget renders only
  // the paste path and its label stops saying "or"
  const showDl = !opts.noDownload && !matchMedia('(pointer: coarse)').matches;
  // opts.noLabel: the host already captions the command (the landing page's
  // "or paste this into your coding agent" divider), so the row label is blank
  // opts.labels: the host's own copy for the three strings this widget states,
  // for a page whose voice is sentence case (the /docs docs page). Absent, the
  // widget keeps the copy it shipped with, so the lander and /install are
  // byte-identical to before.
  const say = opts.labels ?? {};
  const labels = {
    row: opts.noLabel ? '' : showDl ? 'or paste this into your coding agent:' : 'paste this into your coding agent:',
    download: say.download ?? 'download the desktop app',
    more: say.more ?? 'per-client setup recipes',
    fold: say.fold ?? 'what does this do?',
  };
  const dlRow = () => (showDl
    ? `<div class="sb-row sb-dl"><a class="sb-dl-btn sb-btn" href="${eo}/download">${labels.download}</a></div>`
    : '');
  // a phone leads with the same row: the MCP endpoint is reachable from the
  // agent's own machine, so nothing here needs to move to a computer
  const moreRow = () =>
    `<div class="sb-row sb-more"><a class="sb-more-link" href="${eo}/docs#clients">${labels.more}</a></div>`;
  const fold = {
    skill: `paste that into any coding agent and it fetches <code>${eo}/llms.txt</code>, picks its own client's recipe, and routes itself through superbot. restart the client after. or <a href="${eo}/download">get the desktop app</a>, which routes every client on the machine for you.`,
  };

  ensureStyle();

  el.classList.add('sb-oneliner');
  el.innerHTML = `
    ${dlRow()}
    <div class="sb-row" id="sb-panel-row">
      <div id="sb-panel"><div class="sb-or"></div>
      <div class="sb-cmd"><code></code>${copyBtn('sb-copy-paste', `${IDLE} the line to paste into your coding agent`)}</div></div>
    </div>
    ${moreRow()}
    <div class="sb-live" aria-live="polite"></div>
    <details class="sb-fold"><summary>${labels.fold}</summary>
      <div class="sb-what"></div>
      <div class="sb-extra">
        <div class="sb-row"><div class="sb-lab">just claude code:</div><div class="sb-cmd"><code>${tint(claudeCmd)}</code>${copyBtn('sb-copy-claude', `${IDLE} the claude code add line`)}</div></div>
        <div class="sb-row sb-links"><div class="sb-lab">just vs code, one click:</div>
          <!-- the deep link and its copy fallback in one box (Q-78). A desk
               without VS Code met the OS's "cannot open" dialog and no way to
               move the link to the machine that has the editor, because the
               copy fallback was mounted only under (pointer: coarse). The link
               carries data-copy-href and the button beside it ships on every
               pointer type. -->
          <div class="sb-cmd sb-cmd-link">
            <a class="sb-deep" href="${vscodeHref.replace(/"/g, '&quot;')}" data-copy-href="${vscodeHref.replace(/"/g, '&quot;')}">add to VS Code</a>
            ${copyBtn('sb-copy-vscode', 'copy the link to add superbot to VS Code', 'copy the link')}
          </div>
          <span class="sb-what" style="margin:0">opens VS Code and asks you to confirm the <span class="sb-url">${eo}/mcp</span> server.</span>
        </div>
      </div>
    </details>
  `;

  const code = el.querySelector('.sb-cmd code');
  const label = el.querySelector('.sb-or');
  const what = el.querySelector('.sb-fold > .sb-what');
  const extra = el.querySelector('.sb-extra');

  // "add to VS Code" on a device with no VS Code (a phone) is a dead tap that
  // ends in the OS's "cannot open" dialog: there, the button copies the link
  // for the reader's computer instead, and its line says so (2026-09-02).
  const deep = el.querySelector('.sb-extra .sb-deep');
  if (deep && matchMedia('(pointer: coarse)').matches) {
    // the note is the .sb-what SENTENCE under the row. It used to be written
    // to deep.nextElementSibling, which is the copy button — so this 130-char
    // line became a button label and measured 894px in a 288px row, carrying
    // the whole widget past the 320px viewport (review, 2026-09-17). The
    // button's own label stays "copy the link".
    const note = deep.closest('.sb-row')?.querySelector('.sb-what') || null;
    if (note) note.textContent = 'no VS Code on this device: tapping copies the link for your computer, where it opens VS Code and asks you to confirm the server.';
    deep.addEventListener('click', (e) => {
      e.preventDefault();
      const value = deep.getAttribute('href');
      const was = deep.textContent;
      const live = el.querySelector('.sb-live');
      const done = () => {
        deep.textContent = 'copied: open it on your computer';
        if (live) { live.textContent = 'link copied for your computer'; setTimeout(() => { live.textContent = ''; }, 2000); }
        setTimeout(() => { deep.textContent = was; }, 2500);
      };
      const fallback = () => {
        const ta = document.createElement('textarea'); ta.value = value; document.body.appendChild(ta); ta.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
        if (ok) done(); else if (live) live.textContent = 'clipboard blocked: the manual command above works on your computer too';
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, fallback); else fallback();
    });
  }
  const live = el.querySelector('.sb-live');
  const render = () => {
    // the guard is belt and braces against a future markup change losing the row
    if (!code || !label) return;
    label.textContent = labels.row;
    // WYSIWYG: tint() styles the same string the copy handler sends — only
    // spans differ from what is on the board
    code.innerHTML = tint(skillCmd);
    what.innerHTML = fold.skill;
    if (extra) extra.hidden = false;
  };

  // the rows copy their code's whole text (null: wireCopy reads textContent)
  wireCopy(el.querySelector('.sb-copy-paste'), null, 'oneliner', live);
  wireCopy(el.querySelector('.sb-copy-claude'), null, 'oneliner', live);
  // the VS Code link's copy fallback, on every pointer type (Q-78): a desk
  // without the editor meets the same dead end a phone does, and the coarse
  // branch above cannot reach it. The button keeps its own word, "copy the
  // link", and flips back to it after "copied".
  wireCopy(el.querySelector('.sb-copy-vscode'), vscodeHref, 'vscode', live);
  // the deep link is an install too: the step rail on /docs listens for it.
  el.querySelector('.sb-extra a.sb-deep')?.addEventListener('click', () => {
    dispatchEvent(new CustomEvent('superbot:copied', { detail: { source: 'vscode' } }));
  });
  render();
  el.querySelectorAll('.sb-cmd > code').forEach(watchFit);
}

// The standalone command row: the widget's one-line copy box with nothing
// around it — no label, no download button, no fold. /api's drop-in card
// mounts one per command (env lines and the curl samples), each in its own
// [data-cmd] host. Same STYLE, same tint() (the URL lands in the accent), same
// recipe and the same copy ladder as mountInstallSnippet's rows: one clipped
// line that fades at the box's end, the whole box one copy button that sends
// the full line. `copyLabel` swaps the button's visible word when a host
// wants something other than "click to copy" (the button's name starts with it).
// Rendered markup:
//   <div class="sb-oneliner"><div class="sb-cmd"><code>…</code>
//   <button class="sb-copy"><span class="sb-copy-label">click to copy</span><svg/></button></div>
//   <div class="sb-live" aria-live="polite"></div></div>
export function mountCommandRow(el, { cmd, copyLabel } = {}) {
  if (!el || !cmd) return;
  ensureStyle();
  el.classList.add('sb-oneliner');
  const word = copyLabel || IDLE;
  el.innerHTML = `<div class="sb-cmd"><code></code>${copyBtn('sb-copy-cmd', `${word} this command`, word)}</div><div class="sb-live" aria-live="polite"></div>`;
  // the button's name says which line it copies, by the command's first word
  // (OPENAI_BASE_URL, curl; a bare URL is "the address"), so a card of several
  // rows names each one apart. Set as a property, never interpolated: a command
  // holds quotes and angle brackets
  const first = (/^[^\s=]+/.exec(cmd) || [''])[0];
  el.querySelector('.sb-copy-cmd').setAttribute('aria-label', !first || /^[a-z][\w+.-]*:\/\//i.test(first) ? `${word} the address` : `${word} the ${first} line`);
  const code = el.querySelector('.sb-cmd code');
  // WYSIWYG, same contract as the main row: tint() styles the string the
  // copy handler sends, only spans differ from what is on the board
  code.innerHTML = tint(cmd);
  wireCopy(el.querySelector('.sb-copy-cmd'), null, 'oneliner', el.querySelector('.sb-live'));
  watchFit(code);
}
