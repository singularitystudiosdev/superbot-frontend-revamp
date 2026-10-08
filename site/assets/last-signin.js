// "Last used" (#54): which way this device signed in last, so the sign-in
// stack can mark that method with a small pill on its next visit (Linear's
// login, Better Auth's last-login-method plugin).
//
// THE CONTRACT, shared byte-for-byte with /invite (edge/src/beta/pages.c1bff7a8.ts
// inlines an equivalent under its CSP nonce) and the account page
// (edge/src/account/overview.ts promotes the pending entry after a provider
// round trip lands there):
//   localStorage 'sb-last-signin-pending'  written when a sign-in STARTS
//   localStorage 'sb-last-signin'          promoted once an account signed in
//   value, both keys: JSON {"method": "apple"|"google"|"x"|"email", "t": <Date.now()>}
// The method only. Never an email address, a handle or any other identifier.
// Every storage access sits in try/catch: storage may be off (Safari private
// mode, a blocked third-party frame, a full quota) and the badge is a nicety,
// so a failure is silent and the stack renders exactly as without it.
// Zero dependencies.

const PENDING = 'sb-last-signin-pending';
const LAST = 'sb-last-signin';
const METHODS = /^(apple|google|x|email)$/;

/** Parse one stored entry: { method, t } or null for anything else. */
function parse(raw) {
  try {
    const o = JSON.parse(raw || 'null');
    return o && typeof o === 'object' && METHODS.test(o.method) ? { method: o.method, t: typeof o.t === 'number' ? o.t : Date.now() } : null;
  } catch (e) {
    return null;
  }
}

/** A sign-in with `method` just started (a provider tap, or an email submit
 *  that passed validation): remember it as pending until an account is
 *  confirmed. Anything but apple / google / x / email is ignored. */
export function markPending(method) {
  if (!METHODS.test(String(method))) return;
  try {
    localStorage.setItem(PENDING, JSON.stringify({ method, t: Date.now() }));
  } catch (e) { /* storage off */ }
}

/** An account is signed in on this device: the pending method becomes the
 *  last used one, keeping the time the sign-in started (the account page's
 *  promote does the same), and the pending entry goes. No pending, no change. */
export function promoteLast() {
  try {
    const p = parse(localStorage.getItem(PENDING));
    if (p) localStorage.setItem(LAST, JSON.stringify(p));
    localStorage.removeItem(PENDING);
  } catch (e) { /* storage off */ }
}

/** The method this device signed in with last: 'apple' | 'google' | 'x' |
 *  'email', or '' when there is none (or storage is off). */
export function readLast() {
  try {
    return parse(localStorage.getItem(LAST))?.method ?? '';
  } catch (e) {
    return '';
  }
}
