// superbot console hello: the cat says hi to whoever opens devtools.
// One console.log per page load: the mascot (brand/mark.svg geometry drawn in
// half blocks, every glyph one column wide, 39 columns max so a narrow devtools
// pane never wraps it), a block "superbot" wordmark, and three short lines.
// No dependencies, no network, no eval. Safe to import more than once.

const BLUE = '#4d8aff';

// The mark's face mask rasterised at 32 columns: rounded-square head, two
// pointed ears, two tall oval eye holes. The grid is aligned so both eye centres
// sit on a cell centre, which keeps the ovals symmetric. Each text row is two
// pixel rows (▀ top, ▄ bottom), so a pixel is close to square.
const CAT = [
  '    ▄▄▄▄                      ▄▄▄▄',
  '   ▄█████▄                  ▄█████▄',
  '   █████████▄            ▄█████████',
  '   ████████████████████████████████',
  '   ████████████████████████████████',
  '   ████████████████████████████████',
  '   ███████▀   ▀████████▀   ▀███████',
  '   ██████▀     ▀██████▀     ▀██████',
  '   ██████       ██████       ██████',
  '   ██████▄     ▄██████▄     ▄██████',
  '   ███████▄   ▄████████▄   ▄███████',
  '   ████████████████████████████████',
  '    ██████████████████████████████',
  '     ▀██████████████████████████▀',
  '       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
];

const WORD = [
  '                         █          █',
  '▄▀▀▀ █  █ █▀▀▄ ▄▀▀▄ █▄▀▀ █▀▀▄ ▄▀▀▄ ▀█▀▀',
  ' ▀▀▄ █  █ █▄▄▀ █▀▀▀ █    █  █ █  █  █',
  '▀▀▀   ▀▀▀ █     ▀▀▀ ▀    ▀▀▀   ▀▀    ▀▀',
];

// Chrome's console keeps only background/border/color/font/line/margin/padding/
// text properties, so no display tricks. A full block in Menlo is 1.02em tall and
// the console row's strut (11px, line-height 1.2) sets a floor on each line box,
// which leaves a hairline between block rows; a 1px text-shadow up and down closes it in
// every engine and font without adding a column.
const MONO = "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace;font-size:13px;line-height:1";
const ART = `${MONO};color:${BLUE};text-shadow:0 1px 0 ${BLUE},0 -1px 0 ${BLUE}`;
const WORDMARK = `${MONO};color:#e8ecf4;text-shadow:0 1px 0 #e8ecf4,0 -1px 0 #e8ecf4`;
const TEXT = 'font-family:inherit;font-size:12px;line-height:1.6;color:#c9ced8';
const DIM = 'font-family:inherit;font-size:12px;line-height:1.6;color:#8a91a0';
const MAIL = `font-family:inherit;font-size:12px;line-height:1.6;color:${BLUE};font-weight:700`;

export function sayHi(con = globalThis.console) {
  if (globalThis.__sbHi || !con || typeof con.log !== 'function') return false;
  globalThis.__sbHi = true;
  con.log(
    `%c${CAT.join('\n')}\n\n%c${WORD.join('\n')}` +
      '\n\n%chey, you opened the console 👀' +
      '\n%cfound a bug, or just want to say hi? %chi@superbot.gg' +
      '\n%cwe read every one.',
    ART, WORDMARK, TEXT, TEXT, MAIL, DIM,
  );
  return true;
}

sayHi();
