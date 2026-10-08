// The cuts of the boot-sequence hero: the variants under review, in one place
// so the hero (hub-boot.js) and the contact sheet (site/hero-variants.html)
// read the same list. A page picks one with `?v=<name>`; no parameter resolves
// to CUTS[0] — the FIRST entry, which is what makes the default a one-line
// move. That entry is `ship`, so the landing page plays the composed story;
// `hold`, the original, is still selectable as `?v=hold`.
//
// Six independent behaviours compose into the ten cuts, each named in the
// hero's own render loop:
//   grow    the hub arrives simple and gains columns: one chat lane, then the
//           chat list, then the panel — complexity revealed, not dumped
//   chatter the chat keeps living after the reveal: one row types, speaks and
//           fades, then the next line takes its turn
//   perch   the terminal column collapses and he hops up beside the headline
//   zen     the held end state breathes: every element drifts on its own slow
//           clock, randomised so nothing pulses in unison
//   tabs    act two: once the hub is alone on the stage it tours the clients —
//           ChatGPT answers a question, Claude writes the code, superbot says it
//           can do better and does, each in that vendor's own palette
//   pace    stretches wall time without moving a beat, for a softer merge
export const CUTS = [
  // first entry is the default: what / plays with no parameter (user, 2026-09-06)
  // no tabs and no chatter: the story ends once the hub has shown and the phone has gone (owner,
  // 2026-09-08: "just end once the app shows and phone goes away, don't show it
  // swapping around tabs"; and the chatter row was the reader typing again, which
  // the same owner had already ruled out); the tour is still selectable as `?v=tour`
  { name: 'ship', note: 'shipped: the hub grows, he hops up beside the headline, and the story holds there', grow: 1, perch: 1 },
  { name: 'hold', note: 'the original: no perch, he parks in the terminal margin' },
  { name: 'zen', note: 'the held end state breathes', zen: 1 },
  { name: 'calm', note: 'zen, and the whole story runs 18% slower', zen: 1, pace: 1.18 },
  { name: 'grow', note: 'the hub arrives simple, then gains its columns', grow: 1 },
  { name: 'live', note: 'grow, and the chat keeps talking afterwards', grow: 1, chatter: 1 },
  { name: 'perch', note: 'the terminal collapses, he hops up beside the headline', perch: 1 },
  { name: 'bloom', note: 'the perch, and the hub breathes behind him', perch: 1, zen: 1 },
  { name: 'tour', note: 'the client tour on its own: ChatGPT, Claude, then superbot makes it better', perch: 1, tabs: 1 },
  { name: 'full', note: 'grow, live chat, the perch, the tour, the drift, slower', grow: 1, chatter: 1, perch: 1, zen: 1, tabs: 1, pace: 1.18 },
];

export const cutByName = (name) => CUTS.find((c) => c.name === name) || CUTS[0];
