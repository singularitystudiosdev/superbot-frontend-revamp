// hub-keys: the homepage keyboard under the mascot, shared by the hub hero
// variants. A port of hero.css `.keys` (two rows of textmode keycaps, a struck
// key flashes accent and decays over 180ms) and hero-stage.js `strike()` (a
// typed character lights its key and drops the paw on that side, both held for
// KEY_HOLD_MS so paw and cap never drift apart). The paws themselves are drawn
// by mascot.js while `mascot.typing` is true, so callers set that flag around
// a typing beat and call strike()/burst() from their own clock.

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl'];
const KEY_HOLD_MS = 60;
const FILLER = 'the quick brown fox jumps over the lazy dog and files the receipt';

const CSS = `
.sb-keys { position: absolute; left: 50%; transform: translateX(-50%); display: grid; gap: 3px; pointer-events: none; z-index: 4; }
.sb-keys .krow { display: flex; gap: 3px; }
.sb-keys .krow + .row { padding-left: 8px; }
.sb-keys i { display: block; width: 13px; height: 8px; border-radius: 2px; border: 1px solid var(--line, #262626); background: var(--raised, #181818); transition: background-color 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1); }
.sb-keys i.hit { background: var(--accent, #2b6bff); border-color: var(--accent, #2b6bff); box-shadow: 0 0 8px color-mix(in srgb, var(--accent, #2b6bff) 60%, transparent); transition: none; }
.sb-keys.small { gap: 2px; } .sb-keys.small .row { gap: 2px; } .sb-keys.small .row + .row { padding-left: 6px; } .sb-keys.small i { width: 10px; height: 6px; }
`;
let styled = false;

/** Mount the keyboard into `host` (a positioned element); returns
 *  { el, strike(ch), burst(t), clear() }. Position `el` from the caller
 *  (top/bottom in px) so it sits right under the mascot's body. */
export function mountKeys(host, mascot, { small = false } = {}) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const el = document.createElement('div');
  el.className = 'sb-keys' + (small ? ' small' : '');
  el.setAttribute('aria-hidden', 'true');
  const keyRows = KEY_ROWS.map((r) => {
    const row = document.createElement('span');
    row.className = 'krow'; // not `.row`: the hub shells style that name
    const keys = [...r].map(() => { const i = document.createElement('i'); row.appendChild(i); return i; });
    el.appendChild(row);
    return keys;
  });
  host.appendChild(el);

  const held = new Map();
  const strike = (ch) => {
    const c = String(ch || ' ').toLowerCase();
    let row = KEY_ROWS.findIndex((r) => r.includes(c));
    let col = row < 0 ? -1 : KEY_ROWS[row].indexOf(c);
    if (row < 0) {
      // digits, punctuation, space: a stable spot on the board, not a random one
      const code = c.charCodeAt(0);
      row = code % 2;
      col = (code * 7) % KEY_ROWS[row].length;
    }
    const key = keyRows[row]?.[col];
    if (key) {
      key.classList.add('hit');
      clearTimeout(held.get(key));
      held.set(key, setTimeout(() => key.classList.remove('hit'), KEY_HOLD_MS));
    }
    mascot?.press?.(col < KEY_ROWS[row].length / 2 ? 'left' : 'right', KEY_HOLD_MS);
  };

  // burst(t): steady typing with no literal text, one strike every 110ms of
  // the caller's clock (seconds), so a paused clock pauses the hands too
  let last = -1;
  const burst = (t, text = FILLER) => {
    const k = Math.floor(t / 0.11);
    if (k === last) return;
    last = k;
    strike(text[k % text.length]);
  };
  const clear = () => { last = -1; keyRows.flat().forEach((k) => k.classList.remove('hit')); };
  return { el, strike, burst, clear };
}
