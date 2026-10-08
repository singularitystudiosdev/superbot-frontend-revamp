// hero-workspace-frontend: the workspace hero's app frame, drawn as
// superbot-desktop main's NEW CHAT screen, brought to desktop f2fbe329c
// (2026-10-01): the 72px lane rail (the Chat and Code lane tiles heading it
// under the traffic-light band, then Fleet, Settings and the account: no
// mascot, no rule), the sidebar with no lane switch whose HUD title line
// carries the small mascot left of the bold wordmark, a title-only header (a
// Superbot chat draws no vendor mark) whose actions are Resync, Share, Move to
// a project and Browser, the Half SUPER pill joined by the idle mode segment,
// and no composer footer row on a thread (its context is a ring). The frame
// was first captured live from main 77f02910 (2026-09-27:
// .tmp/hero-ref.7580bba1/main/new-chat.png + dom/new-chat.json), and the `ui`
// handle the hero's chat beat drives.
//
// Geometry. The frame is main's window at the width the desktop spec was measured at,
// 1200 x 750 CSS px (an app zoom of 1.2 on a 1440 x 900 window, scripts/gui-sync, the
// grid 72 rail | 240 sidebar | 8 splitter | 880 main), 13px body text. This module lays
// the hub out in main's own px at that width and scales the whole box ONCE to the hub
// (k = hub width / 1200, one factor for every length), so every value in
// hero-wschat.css is the spec's number, pasted, and a rect read back divided by k lands
// on the spec's. hero-sphere.js measures the
// HUD through getBoundingClientRect and divides by the box's own scale (its
// L.hk), so the reveal glides onto the scaled mark unchanged. Below a 924px
// hub (where the one scale would set body text under 11px) the frame is
// main's hidden-sidebar state at a 0.92 scale: the pane alone, as main draws
// a narrow window (the rail goes with the sidebar, as in the lander's #hub).
//
// What the sphere needs from the hub stays where prepStage looks for it:
// .hud-mark (the landing seat, the page's one mascot), .hud with .hud-word
// and .hud-discs .hud-disc (the drop items), and .inner on everything that
// fades up after the mark lands. The mascot is the HUD's again, small, left of
// the wordmark in the title line (SidebarHud.tsx, f2fbe329c, 2026-10-01: a
// square the title line's height, an 8px gap, the bold word); the rail has
// none. The HUD and its mark are the page's own nodes, MOVED here (the mark
// stays inside the HUD), so the mounted face (lander-agent.html
// mountMascotMark) keeps running.
//
// CONTRACT (hero-wschat-chat.js codes against it):
//   buildFrontend(hub) -> ui, idempotent per hub (a second call returns the same ui)
//   ui.pane            the main (right) column: header, feed, composer, tail
//   ui.feed            the thread feed, a column whose rows sit bottom-anchored
//                      above the composer; append chat rows here. It is its
//                      own scroll box (overflow hidden, scroll it with
//                      scrollTop). Its first child is the greeting
//                      (.hwf-hero), which this module owns: append after it.
//                      The row column is the composer's width (736 design px,
//                      the feed's inline padding does it).
//   ui.composer        the composer box; ui.send the send button
//   ui.setDraft(text)  '' shows the placeholder 'How can superbot help you today?'
//   ui.setCaret(on)    the text caret after the draft (main's native caret: 1px, fg, 1s blink)
//   ui.setSendArmed(on) idle (fg 8% well, #6b6f76 arrow) vs armed (storm gradient, white arrow, glow)
//   ui.setSending(on)  the send becomes main's stop square (composer-cancel), SUPER
//                      dims and the placeholder reads 'Queues until this turn ends'
//   ui.setModel(m)     the model chip. m: null / '' / 'superbot' = the glitch mascot
//                      and 'Superbot'; 'Gemini' or { name: 'Gemini', tile } = main's
//                      switch reading, 'Gemini 3 Pro Image' on the Gemini mark; any
//                      other { name, tile } shows that name on that tile image
//   ui.setModelFx(opacity, scale) the chip's swap dip and pop, written as given
//   ui.setNewChat(p)   p is the collapse's EASED remaining progress, 1 = pristine
//                      new chat (greeting, tail open, composer mid-pane), 0 =
//                      thread mode (greeting gone, tail collapsed, composer in its
//                      bottom seat, the header's actions shown). p IS
//                      the tail's flex-grow, main's collapse (new-chat.css
//                      .new-chat-tail: flex-grow over 400ms on emphasized-decelerate):
//                      the caller applies that curve (hero-wschat-chat.js
//                      renderComposer passes 1 - emphDecel(time progress)), this
//                      module applies none, so the glide is main's curve exactly
//                      once. Below 1 the thread exists: the header's actions fade
//                      in (opacity 1 - p), the greeting fades out at opacity p in
//                      its seat, and the new chat's row leads Recent, active.
//   ui.setTitle(text)  the pane header title ('New chat'), and the Recent row's title
//   ui.reset()         pristine new chat: draft '', caret off, send idle, not
//                      sending, model superbot, title 'New chat', feed rows removed,
//                      the thread's Recent row gone
//   ui.lanes           { select(lane), live(on) } the rail's Chat | Code lane tiles
//   ui.fit()           re-read the hub's size and rescale now (the ResizeObserver
//                      does it on its own; the host calls it once prepStage has
//                      widened the hub, before the sphere measures the HUD)
//   ui.onFit           the host's callback after a rescale has been laid out (the
//                      sphere re-measures): a ResizeObserver on the box calls it,
//                      so its reads land on a fresh layout. ui.fit() itself never
//                      calls it; a host that calls ui.fit() measures after it.
// Every setter writes only on change, so it is safe every frame and out of order.

const DESIGN_W = 1200;      // main's CSS layout width in the desktop spec (scripts/gui-sync/desktop-geometry.json, cssViewport)
// The sidebar shows only while the whole 1200 box, scaled to the hub, still
// sets main's 13px body text at 10px or more (w / 1200 * 13 >= 10, a hub of
// 924 rendered px and up, the same hub the 1091 box's 11px floor gave). Narrower, the
// frame is main's hidden-sidebar state, the pane alone at NARROW_SCALE, as main draws a
// narrow window; so no width between a phone and the desktop renders the lists at 5-8px.
const BODY_PX = 13;         // main's body text (type.tokens.json:100)
const MIN_BODY_PX = 10;     // the floor body text may render at
const WIDE_HUB = Math.ceil(DESIGN_W * MIN_BODY_PX / BODY_PX); // 924
const NARROW_SCALE = 0.92;  // the pane-only frame: 13px body text lands at 12px

const LU = (d, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const CL = (d, cls = '') => `<svg class="hwf-cl${cls}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IC = {
  panelLeftClose: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  code: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  // lucide Code (the rail's Code lane, two chevrons and no slash, the spec's [data-testid=rail-lane-code])
  codeLane: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  // lucide SquarePen (New chat's glyph, new-chat-row.tsx) and FolderPlus
  // (New project's, Sidebar.tsx NewProjectButton), the paths the app renders
  squarePen: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
  folderPlus: '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  sparkle: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  penLine: '<path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  folderGit: '<path d="M18 19a5 5 0 0 1-5-5v8"/><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><circle cx="20" cy="19" r="2"/>',
  stop: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
  // lucide LayoutGrid (the rail's Fleet), MousePointerClick (the mode segment's idle Agent
  // glyph, composer-mode.tsx MODE_ICON) and Ellipsis (a chat row's one hover tool)
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  pointerClick: '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>',
  ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
};
// the composer's own 12px glyphs (packages/ui composer.tsx .cl-ic, from the live DOM)
const CLI = {
  plus: '<path d="M6 1.5v9M1.5 6h9"/>',
  computer: '<rect x="1.5" y="2" width="9" height="6" rx="1"/><path d="M4 10.5h4M6 8v2.5"/>',
  mic: '<rect x="4.4" y="1.3" width="3.2" height="6" rx="1.6"/><path d="M2.8 5.8a3.2 3.2 0 0 0 6.4 0M6 9v1.7"/>',
  send: '<path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/>',
  chevron: '<path d="M3 4.5 6 7.5 9 4.5"/>',
};

// MarkSuperbotGlitch as main renders it at rest (dom/new-chat.json
// greeting-hero): a cyan and a magenta copy of the face a hair off the white
// one, ears drawn separately. One mask per instance.
let markSeq = 0;
function glitchMark() {
  const id = `hwf-face-${++markSeq}`;
  const ears = (fill) => `<path fill="${fill}" d="M14 46V28Q14 20 21 21Q28 24 36 32Z"/><path fill="${fill}" d="M86 46V28Q86 20 79 21Q72 24 64 32Z"/>`;
  const layer = (cls, fill) => `<g class="${cls}"><rect width="100" height="100" fill="${fill}" mask="url(#${id})"/>${ears(fill)}</g>`;
  return `<svg class="hwf-glitch" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">` +
    '<path fill="#fff" d="M29 32H71A15 15 0 0 1 86 47V71A15 15 0 0 1 71 86H29A15 15 0 0 1 14 71V47A15 15 0 0 1 29 32Z"/>' +
    '<g fill="#000"><ellipse cx="35" cy="58" rx="8" ry="11"/><ellipse cx="65" cy="58" rx="8" ry="11"/></g></mask></defs>' +
    layer('hwf-glitch-a', '#00e5c3') + layer('hwf-glitch-b', '#c026d3') + layer('hwf-glitch-face', '#ffffff') + '</svg>';
}
const GEMINI = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="hwf-gemini" x1="-4" y1="22" x2="26" y2="4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#439ddf"/><stop offset=".25" stop-color="#4f87ed"/><stop offset=".5" stop-color="#9476c5"/><stop offset=".75" stop-color="#bc688e"/><stop offset="1" stop-color="#d6645d"/></linearGradient></defs><path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" fill="url(#hwf-gemini)"/></svg>';

// ---------- copy ----------
// the greeting: a "{lead} {ask}" line @superbot/core/greeting can pick
// (superbot-desktop packages/core/src/greeting/index.ts) with no stored name.
// The lead is the band's first-open line off the visitor's clock, with that
// module's bandOfHour cut-offs (night [22,5), morning [5,12), afternoon
// [12,17), evening [17,22)): LEAD_POOL m1 'Good morning.', a1 'Good
// afternoon.', e1 'Good evening.', night n1 'Quiet hours.'. The ask is fixed,
// ASK_POOL n3 'Where do we go?', so every visitor sees one line.
const bandLead = (now) => {
  const hour = now.getHours();
  if (hour < 5 || hour >= 22) return 'Quiet hours';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
const QUESTION = 'Where do we go';
const PLACEHOLDER = 'How can superbot help you today?';
const PLACEHOLDER_LIVE = 'Queues until this turn ends'; // main's placeholder while a turn runs (main/thread-streaming.png)
// a Superbot chat's context reading is the ContextRing (hub/ContextRing.tsx:
// a 16px ring, the share on a pathLength of 100, so the dash is the percent
// itself), seated at the right end of the chips row; scripts/gui-sync/fixture.json
// composer.context '31k of 1m' (a thread's measured size, not the rules-only
// figure) is 3.1% of the window, so the arc is that share of the circle
const CTX = { label: 'Context: 31k of 1m', share: 3.1 };
const RING = `<svg class="hwf-ring-svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle class="hwf-ring-track" cx="8" cy="8" r="6" pathLength="100"/><circle class="hwf-ring-arc" cx="8" cy="8" r="6" pathLength="100" stroke-dasharray="${CTX.share} 100"/></svg>`;
const CHIPS = [['Write', IC.penLine], ['Code', IC.code], ['Research', IC.search], ['Browse', IC.globe], ['Automate', IC.workflow]];
const MODELS = {
  superbot: { label: 'Superbot', mark: () => `<span class="hwf-platglitch">${glitchMark()}</span>` },
  gemini: { label: 'Gemini 3 Pro Image', mark: () => `<span class="hwf-platicon">${GEMINI}</span>` },
};

// ---------- the sidebar's rows ----------
// a row's mark: the Superbot cat in the muted ink with no tile (the spec: "Superbot rows draw the
// cat mark svg 16px in muted ink", the cat is hero-wschat.css's mask of mono-mark-white.svg), or
// a vendor's brand tile (the page's #sb-ic-* symbols on the hub's --brand-* grounds). Every
// title and stamp is scripts/gui-sync/fixture.json sidebar.recent
const MARK = (app) => app === 'superbot'
  ? '<i class="hwf-mk sb" aria-hidden="true"></i>'
  : app === 'git'
    ? `<i class="hwf-mk git" aria-hidden="true">${LU(IC.folderGit)}</i>`
    : `<i class="hwf-mk app-${app}" aria-hidden="true"><svg><use href="#sb-ic-${app}"/></svg></i>`;
// a row's one hover tool is the "..." (chat-row-menu.tsx ChatRowMore), which takes the
// stamp's seat while the pointer is on the row
const MORE = `<i class="hwf-rmore" aria-hidden="true">${LU(IC.ellipsis)}</i>`;
// a Recent row is ONE line: the mark, the title, the stamp, no preview
const chatRow = ([app, title, when]) => `<span class="hwf-row">${MARK(app)}<span class="hwf-tx"><span class="t">${title}</span></span><em>${when}</em>${MORE}</span>`;
// the Chat lane, the list's own voice (fixture sidebar.recent): ONE flat Recent list. The
// example account has no pinned chats, and with none the app draws no Pinned group at all
// (Sidebar.tsx), so neither does the hero. The chat the story opens leads Recent (the
// module's .hwf-live row), then the fixture's rows in time order.
const RECENT = [
  ['superbot', 'Release notes draft', '3:27 PM'],
  ['superbot', 'Codex lost its MCP servers', '1:11 PM'],
  ['superbot', 'Rules in Cursor and Claude Code', '1:08 PM'],
  ['claude', 'Review the auth middleware', 'Sep 23'],
  ['claude', 'Which agent used the most context?', 'Sep 23'],
];
const bucket = (label, tools = '') => `<div class="hwf-bucket"><span>${label}</span>${tools}</div>`;
// the Recent head's cluster (Sidebar.tsx chatListActions, f2fbe329c): Search leads, then
// the list settings filter; hover-only, as the app paints them. The list-zoom minus and
// plus left the header (725ac116d: a Chat list size slider in Settings, Appearance)
const RECENT_TOOLS = '<span class="hwf-bucket-tools">' +
  `<i class="hwf-ib">${LU(IC.search)}</i><i class="hwf-ib">${LU(IC.filter)}</i></span>`;
const CHAT_LANE =
  `<span class="hwf-newchat"><i aria-hidden="true">${LU(IC.squarePen)}</i>New chat</span>` +
  `<section class="hwf-sect recent">${bucket('Recent', RECENT_TOOLS)}${RECENT.map(chatRow).join('')}</section>`;
// the Code lane (the user: "let user click "Code" tab to see imported
// cursor, devin mix with 1 expanded maybe and the default project chat"),
// as the desktop draws the flat project list (superbot-desktop, spec §15.530:
// Sidebar.tsx .hub-side-new-project, ProjectRows.tsx + project-rows.css, which
// supersedes §15.414's date buckets): one ghost 'New project' row (no border or
// fill, a FolderPlus on the leading glyph column, 72d19defd; no Import beside
// it), then ONE row per project in recency order, no Today / Yesterday / Earlier
// headers: [origin mark][name]......[chat-count pill], its origin spoken in its
// title, never a second line. Nothing nests while a project is shut. ONE project
// is open: its chats (five at most) sit under it, one muted line each, the
// title on the name's column and the date on the right, joined by a faint guide
// line down the mark's axis, and its pill is a small up chevron. The selected
// project (its Project chat is the head row, ProjectRows.tsx) wears the soft
// active fill and a 2px accent bar on its leading edge; a running project reads
// a still accent dot and plain muted 'Running 4:20' in the status seat before
// the pill. This frame is a picture (its lane tiles stay inert, so the Code
// lane is never pressed here; hero-workspace.js carries the pressable list), so
// the rows draw no press state and the shut ones list no chats.
const CHEV_UP = `<i class="hwf-up" aria-hidden="true">${LU(IC.chevron)}</i>`;
const PROJECT = (p) => {
  const n = p.chats ? p.chats.length : p.count;
  return `<div class="hwf-proj${p.open ? ' open' : ''}">` +
    `<span class="hwf-row proj${p.sel ? ' sel' : ''}" title="${p.title}, ${p.label}">` +
    `${MARK(p.origin)}<span class="t">${p.title}</span>` +
    (p.running ? `<span class="hwf-run"><i aria-hidden="true"></i>${p.running}</span>` : '') +
    (p.open ? CHEV_UP : `<span class="hwf-pill-n">${n}</span>`) + '</span>' +
    (p.open ? `<div class="hwf-proj-chats">${p.chats.slice(0, 5).map(projChat).join('')}</div>` : '') + '</div>';
};
const projChat = ([title, when]) => `<span class="hwf-row pchat"><span class="t">${title}</span><em>${when}</em></span>`;
const CODE_LANE =
  `<span class="hwf-newproj"><i aria-hidden="true">${LU(IC.folderPlus)}</i>New project</span>` +
  '<section class="hwf-sect code">' +
  PROJECT({ title: 'store', origin: 'cursor', label: 'Cursor', sel: true, running: 'Running 4:20', open: true, chats: [
    ['Retry webhooks', '2:41 PM'],
    ['Dedupe retries', '11:02 AM'],
    ['Bump Node to 22', '9:15 AM'],
    ['Flaky cart test', 'Yesterday'],
  ] }) +
  PROJECT({ title: 'mobile-app', origin: 'cursor', label: 'Cursor', count: 2 }) +
  PROJECT({ title: 'infra', origin: 'git', label: 'Git repository', count: 2 }) +
  PROJECT({ title: 'billing-api', origin: 'git', label: 'Git repository', count: 3 }) +
  PROJECT({ title: 'trip-planner', origin: 'superbot', label: 'Superbot', count: 1 }) +
  PROJECT({ title: 'design-system', origin: 'cursor', label: 'Cursor', count: 2 }) +
  PROJECT({ title: 'docs-site', origin: 'git', label: 'Git repository', count: 1 }) +
  PROJECT({ title: 'landing-page', origin: 'cursor', label: 'Cursor', count: 3 }) +
  '</section>';

// the account footer, v00-crisper as the quiet sidebar draws it
// (superbot-desktop fa679ec97, account-widgets/variants/v00-crisper): ONE
// row on the sidebar's ground under a hairline, the avatar (its status dot)
// and the address as one button, then the Settings gear. Plan, usage,
// Upgrade, Report a bug and Invite live in the account popover, not drawn.
const ACCOUNT =
  '<div class="hwf-acct-card"><div class="hwf-acct-bar">' +
  '<span class="hwf-acct-btn"><span class="hwf-avatar">H<i></i></span><b class="hwf-email">hi@ezo.dev</b></span>' +
  `<i class="hwf-tool">${LU(IC.settings)}</i></div></div>`;

// ---------- the lane rail ----------
// CollapsedRail.tsx (collapsed-rail.css, 72px; f2fbe329c, 2026-10-01): the window's drag band,
// then the Chat and Code lane tiles directly under it (the mascot and the hairline that sat
// between them left the rail: the mark is the HUD's now), then the foot's Fleet, Settings and
// the account avatar. Project tools show only with a project open, and Setup only while a step
// is owed (fixture rail_setup_remaining 0), so neither is drawn; the Chats card went with
// efd3c5b28 and Publish is a dock pane (6f6bd76ee), so no card is drawn either. The lane
// showing (data-current) is the Notched Pill, 3f7389dc5: an accent-wash tile wearing the accent
// glyph, with a short accent notch on the rail's outer edge beside it (hero-wschat.css .hwf-rail-tile.on).
// Glyphs draw at the app's rail stroke, 2.25 (.hub-rail-icon). The Chat and Code tiles ARE the
// lane switch (the sidebar has none): a tablist the arrows move through (sidebarLanes), each
// named for the app's tooltip. The ground and the tiles are .inner, so they fade up with the
// lane.
const RAIL_STROKE = 2.25; // collapsed-rail.css .hub-rail-icon: a quarter step over lucide's 2
const RAIL_TILE = (label, d, extra = '') => `<span class="hwf-rail-tile" title="${label}" aria-hidden="true"${extra}>${LU(d, RAIL_STROKE)}</span>`;
const RAIL_LANE = (lane, label, d) =>
  `<button type="button" class="hwf-rail-tile" id="hw-tab-${lane}" role="tab" aria-controls="hw-lane-${lane}" aria-label="${label}" title="${label}" data-track="hero-tab-${lane}">${LU(d, RAIL_STROKE)}</button>`;
const RAIL = () =>
  '<nav class="hwf-rail" aria-label="Superbot">' +
  '<span class="hwf-rail-ground inner" aria-hidden="true"></span>' +
  '<span class="hwf-rail-band" aria-hidden="true"></span>' +
  `<div class="hwf-rail-lanes inner" role="tablist" aria-label="Lane view">${RAIL_LANE('chat', 'Chat', IC.chat)}${RAIL_LANE('code', 'Code', IC.codeLane)}</div>` +
  `<div class="hwf-rail-foot inner">${RAIL_TILE('Fleet', IC.grid)}${RAIL_TILE('Settings', IC.settings)}` +
  '<span class="hwf-rail-av" title="Account" aria-hidden="true">H</span></div>' +
  '</nav>';

// ---------- the pane ----------
// the header, MainPane.tsx:1037-1235: the title alone (a Superbot chat draws no vendor mark:
// PaneHeadVendorMark renders on vendor chats only, MainPane.tsx:806-816,1082-1084), the
// centred Search field with its keycap, then the chat's actions (Thread.tsx headChips:
// Resync, Share, Move to a project, which a Superbot chat with no project shows, and the
// Browser globe) as bare glyphs. There is no panel toggle and no second toolbar row. The
// actions belong to a chat that has a thread: the module fades them in with the collapse.
const HEAD_ACTIONS = [['Resync', IC.refresh], ['Share', IC.share], ['Move to a project', IC.folderGit], ['Browser', IC.globe]];
const PANE_HEAD =
  '<header class="hwf-head">' +
  `<span class="hwf-head-lead"><span class="hwf-title"><span class="hwf-title-t">New chat</span>${LU(IC.chevron)}</span></span>` +
  `<span class="hwf-search">${LU(IC.search)}<span class="hwf-search-l">Search</span><kbd>⌘K</kbd></span>` +
  `<span class="hwf-head-act">${HEAD_ACTIONS.map(([label, d]) => `<i class="hwf-ib" title="${label}" aria-hidden="true">${LU(d)}</i>`).join('')}</span>` +
  '</header>';
const COMPOSER =
  '<div class="hwf-crow"><div class="hwf-composer">' +
  `<div class="hwf-input"><span class="hwf-ph">${PLACEHOLDER}</span><span class="hwf-draft"><span class="hwf-draft-t"></span><i class="hwf-caret"></i></span></div>` +
  '<div class="hwf-foot">' +
  `<span class="hwf-plus">${CL(CLI.plus)}</span>` +
  // SUPER as the Half pill (superbot-desktop 9634ac086, composer.tsx:5692-5771): the sparkle
  // cap, then the state in title case and a chevron, named "Super: Off" (no SUPER word is
  // drawn); drawn OFF (no data-on). The mode segment (composer-mode.tsx:143-232) joins it
  // after a hairline: idle Agent is icon only, a dim cursor glyph and a caret.
  `<span class="hwf-pill"><span class="hwf-super" role="img" aria-label="Super: Off"><span class="hwf-super-cap"><svg class="hwf-super-spark" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${IC.sparkle}</svg></span><span class="hwf-super-tag">Off${LU(IC.chevron).replace('<svg ', '<svg class="hwf-super-chev" ')}</span></span>` +
  `<span class="hwf-mode" role="img" aria-label="Mode: Agent">${LU(IC.pointerClick).replace('<svg ', '<svg class="hwf-mode-glyph" ')}${LU(IC.chevron).replace('<svg ', '<svg class="hwf-mode-chev" ')}</span></span>` +
  '<span class="hwf-right">' +
  `<span class="hwf-plat"><span class="hwf-plat-mark"></span><span class="hwf-plat-l"></span>${CL(CLI.chevron)}</span>` +
  `<span class="hwf-computer">${CL(CLI.computer)}</span>` +
  `<span class="hwf-mic">${CL(CLI.mic)}</span>` +
  // the stop's Trace layers (main's .bc-stop-shimmer / .bc-stop-trace): band under the
  // square, segment over it, both shown only while sending (hero-wschat.css)
  `<span class="hwf-send"><span class="hwf-stop-shimmer" aria-hidden="true"><span class="hwf-stop-band"></span></span>${CL(CLI.send, ' arrow')}${LU(IC.stop)}<span class="hwf-stop-trace" aria-hidden="true"><span class="hwf-stop-arc"></span></span></span>` +
  '</span></div></div>' +
  // no footer row on a Superbot chat: the AI disclaimer is the new-chat screen's alone
  // (Thread.tsx:25354-25362), and a thread's context reading is the ring at the right end
  // of the chips row (Thread.tsx:23401-23425); the pane's data-new says which one shows
  `<div class="hwf-cline"><span class="hwf-ring" role="img" aria-label="${CTX.label}">${RING}</span>` +
  '<p class="hwf-ai">superbot is AI and can make mistakes.</p></div></div>';
const TAIL = `<div class="hwf-tail"><div class="hwf-chips">${CHIPS.map(([l, d]) => `<span class="hwf-chip">${LU(d)}<span>${l}</span></span>`).join('')}</div></div>`;

// the thread's own Recent row, at the head of the list while the chat has a
// thread: a superbot chat, its time main's same-day stamp (sidebar-format.ts
// toLocaleTimeString en-US, hour numeric, minute 2-digit) off the visitor's
// clock, as the greeting reads it
const LIVE_ROW = (now) => `<span class="hwf-row hwf-live" hidden>${MARK('superbot')}<span class="hwf-tx"><span class="t">New chat</span></span>` +
  `<em>${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</em>${MORE}</span>`;

// Inter (hero-wschat.css @font-face, main's bundled face) is fetched only
// once text asks for it; ask at build, seconds before the reveal, so the
// frame never swaps faces on screen
const warmFonts = () => {
  const f = document.fonts;
  if (!f || typeof f.load !== 'function') return;
  for (const w of [400, 500, 600, 700]) f.load(`${w} 13px Inter`).catch(() => {});
};

// ---------- the ad's HUD roster (was hero-wschat.js swapHud) ----------
// The shared markup keeps OUR roster for chaos, sphere and realui; this arm
// draws the ad's vendor discs in image-2 order (ChatGPT, Claude, Cursor,
// Hermes) after the ringed Superbot disc. Hermes is the app's own icon, so
// its image fills the disc. The Servers menu (.hud-menu, shown only by
// .hud.menu-open) gains the same Hermes row ahead of its Add divider.
const HERMES_IMG = '<img src="./site/assets/brand/chaos/hermes.png" alt="" width="44" height="44"/>';
const AD_DISCS =
  '<span class="hud-disc" data-app="openai"><svg><use href="#sb-ic-openai"/></svg></span>' +
  '<span class="hud-disc" data-app="claude"><svg><use href="#sb-ic-claude"/></svg></span>' +
  '<span class="hud-disc" data-app="cursor"><svg><use href="#sb-ic-cursor"/></svg></span>' +
  `<span class="hud-disc logo" data-app="hermes">${HERMES_IMG}</span>`;
const AD_MENU_ROW =
  `<span class="hud-menu-row"><i class="hud-menu-art logo" data-app="hermes">${HERMES_IMG}</i>` +
  '<span class="hud-menu-tx"><b>Hermes Agent</b></span></span>';
function swapHud(hud) {
  const discs = hud.querySelector('.hud-discs');
  const sb = discs?.querySelector('.hud-disc.sb');
  if (!sb || discs.dataset.hwHud) return;
  discs.dataset.hwHud = '1';
  while (sb.nextSibling) sb.nextSibling.remove();
  sb.insertAdjacentHTML('afterend', AD_DISCS);
  const menuDiv = hud.querySelector('.hud-menu .hud-menu-div');
  if (menuDiv) menuDiv.insertAdjacentHTML('beforebegin', AD_MENU_ROW);
}

const built = new WeakMap();

export function buildFrontend(hub) {
  if (built.has(hub)) return built.get(hub);
  const oldSide = hub.querySelector(':scope > .side');
  const oldMain = hub.querySelector(':scope > .main');
  const hud = hub.querySelector('.hud');
  const mark = hud?.querySelector('.hud-mark'); // the page's one mascot, in the HUD's title line
  if (!hud || !mark) return null;
  warmFonts();

  // ---- the HUD: main's hud-row (the title line, the mark then the wordmark, over the stack) ----
  swapHud(hud);
  const menu = hud.querySelector('.hud-menu');
  const discs = hud.querySelector('.hud-discs');
  const word = hud.querySelector('.hud-word');
  // the stack after the discs: main's chevron (hud-expand), then the '+'
  discs.insertAdjacentHTML('beforeend', `<span class="hud-disc hwf-exp">${LU(IC.chevron)}</span><span class="hud-disc add">${LU(IC.plus)}</span>`);
  const row = document.createElement('div');
  row.className = 'hwf-hud-row';
  const text = document.createElement('div');
  text.className = 'hud-text';
  const line = document.createElement('div');
  line.className = 'hwf-title-line';
  // the mascot leads the line, then the bold word (SidebarHud.tsx, f2fbe329c: markNode, titleNode);
  // its box is the line's own height and the gap is the line's (hero-wschat.css .hwf-title-line)
  mark.title = 'Quick Ask';
  mark.setAttribute('aria-hidden', 'true');
  line.append(mark, word);
  text.append(line, discs);
  row.append(text);
  hud.replaceChildren(row);
  if (menu) hud.append(menu);

  // ---- the frame ----
  const box = document.createElement('div');
  box.className = 'hwf';
  box.innerHTML =
    RAIL() +
    '<aside class="hwf-side">' +
    // the title-bar band: Hide sidebar alone on both tabs (SidebarHud.tsx:614-618, PanelLeftClose 14;
    // the Code tab's Search projects button was removed 2026-09-30, SidebarHud.tsx:605-607)
    `<div class="hwf-band inner"><i class="hwf-ib boxed" aria-hidden="true">${LU(IC.panelLeftClose)}</i></div>` +
    '<div class="hwf-lanes inner">' +
    `<div class="hwf-lane" id="hw-lane-chat" role="tabpanel" aria-labelledby="hw-tab-chat">${CHAT_LANE}</div>` +
    `<div class="hwf-lane" id="hw-lane-code" role="tabpanel" aria-labelledby="hw-tab-code" hidden>${CODE_LANE}</div></div>` +
    `<div class="hwf-acct inner">${ACCOUNT}</div>` +
    '</aside><div class="hwf-split inner" aria-hidden="true"></div>' +
    `<section class="hwf-pane inner" data-new="1">${PANE_HEAD}<div class="hwf-feed"></div>${COMPOSER}${TAIL}</section>`;
  const side = box.querySelector('.hwf-side');
  side.insertBefore(hud, side.querySelector('.hwf-lanes'));
  oldSide?.remove();
  oldMain?.remove();
  hub.append(box);
  hub.dataset.hwf = '1';

  // ---- the greeting (ThreadIdle variant="hero"): the feed's first child ----
  const pane = box.querySelector('.hwf-pane');
  const feed = pane.querySelector('.hwf-feed');
  const hero = document.createElement('div');
  hero.className = 'hwf-hero';
  hero.innerHTML = `<span class="hwf-hero-mark">${glitchMark()}</span><h2 class="hwf-greet"><span>${bandLead(new Date())}.</span> <span>${QUESTION}?</span></h2>`;
  feed.append(hero);

  const composer = pane.querySelector('.hwf-composer');
  const send = pane.querySelector('.hwf-send');
  const draftT = pane.querySelector('.hwf-draft-t');
  const tail = pane.querySelector('.hwf-tail');
  const titleT = pane.querySelector('.hwf-title-t');
  const platMark = pane.querySelector('.hwf-plat-mark');
  const platL = pane.querySelector('.hwf-plat-l');
  const headAct = pane.querySelector('.hwf-head-act');
  // the thread's Recent row: after the Recent head, ahead of every fixture row
  box.querySelector('.hwf-sect.recent > .hwf-bucket').insertAdjacentHTML('afterend', LIVE_ROW(new Date()));
  const liveRow = box.querySelector('.hwf-row.hwf-live');
  const liveT = liveRow.querySelector('.t');

  // ---- the one scale ----
  // Every read comes first, then one batched write, and nothing reads after
  // it: in the hub's ResizeObserver the reads land on the layout the browser
  // just made, and the box's new size is laid out once, by the browser, before
  // paint. The host's re-measure (ui.onFit) then runs from the box's own
  // ResizeObserver, delivered after that layout, so it forces none either.
  let fitKey = '', boxKey = '', onFitRaf = 0;
  const fit = () => {
    const w = hub.clientWidth, h = hub.clientHeight;
    if (!w || !h) return;
    // the page's own zoom tier (site.css html { zoom: 1.25 } from 1200px)
    // enlarges what renders, so the floor is read in rendered px
    const z = typeof hub.currentCSSZoom === 'number' && hub.currentCSSZoom > 0 ? hub.currentCSSZoom : 1;
    const wide = w * z >= WIDE_HUB;
    const s = wide ? w / DESIGN_W : NARROW_SCALE;
    const key = `${w}x${h}x${z}`;
    if (key === fitKey) return;
    fitKey = key;
    const bw = (w / s).toFixed(3), bh = (h / s).toFixed(3);
    box.style.width = `${bw}px`;
    box.style.height = `${bh}px`;
    box.style.transform = `scale(${s.toFixed(6)})`;
    box.dataset.side = wide ? '1' : '0';
    // the box kept its size (only its scale moved): its observer will not
    // fire, so the host re-measures at the next frame instead
    const bk = `${bw}x${bh}`;
    if (bk === boxKey && !onFitRaf) onFitRaf = requestAnimationFrame(() => { onFitRaf = 0; ui?.onFit?.(); });
    boxKey = bk;
  };
  let ui = null;
  fit();
  new ResizeObserver(fit).observe(hub);
  new ResizeObserver(() => ui?.onFit?.()).observe(box);

  // ---- the setters: each writes only on change ----
  const st = {};
  const put = (k, v, write) => { if (st[k] !== v) { st[k] = v; write(v); } };
  const setDraft = (text) => put('draft', String(text ?? ''), (v) => {
    draftT.textContent = v;
    composer.toggleAttribute('data-draft', v !== '');
  });
  const setCaret = (on) => put('caret', !!on, (v) => composer.toggleAttribute('data-caret', v));
  const setSendArmed = (on) => put('armed', !!on, (v) => send.toggleAttribute('data-armed', v));
  const ph = pane.querySelector('.hwf-ph');
  const plat = pane.querySelector('.hwf-plat');
  // a live turn: send reads as main's stop square, SUPER dims, and the
  // placeholder is the queue note main shows while a turn runs
  const setSending = (on) => put('sending', !!on, (v) => {
    composer.toggleAttribute('data-sending', v);
    ph.textContent = v ? PLACEHOLDER_LIVE : PLACEHOLDER;
  });
  // the model chip: null / '' / 'superbot' is the glitch mascot and
  // 'superbot'; a Gemini name (string or { name, tile }) is main's switch
  // reading, 'Gemini 3 Pro Image' on the Gemini mark; any other vendor shows
  // its name on the given tile image
  const setModel = (m) => {
    const name = (m && typeof m === 'object' ? m.name : m) || 'superbot';
    const tile = m && typeof m === 'object' ? m.tile || '' : '';
    const k = /^superbot$/i.test(name) ? 'superbot' : /gemini/i.test(name) ? 'gemini' : `other|${name}|${tile}`;
    put('model', k, () => {
      if (MODELS[k]) {
        platMark.innerHTML = MODELS[k].mark();
        platL.textContent = MODELS[k].label;
      } else {
        platMark.innerHTML = tile ? `<span class="hwf-platicon"><img src="${tile}" alt="" width="14" height="14"/></span>` : '';
        platL.textContent = name;
      }
      composer.dataset.model = MODELS[k] ? k : 'other';
    });
  };
  // the chip's swap motion (composer.tsx: it dips to .15 over 140ms, swaps,
  // pops 1.08 -> 1 over 400ms out-cubic); the caller passes the values
  const setModelFx = (opacity = 1, scale = 1) => {
    put('fxo', String(opacity), (v) => { plat.style.opacity = v === '1' ? '' : v; });
    put('fxs', String(scale), (v) => { plat.style.transform = v === '1' ? '' : `scale(${v})`; });
  };
  const setTitle = (text) => put('title', String(text ?? ''), (v) => { titleT.textContent = v; liveT.textContent = v; });
  // p is already main's eased collapse (see the contract): the tail's
  // flex-grow is p itself, and everything the send brings in or takes out
  // rides that same curve, so no frame of the glide is a step
  const setNewChat = (p) => {
    p = Math.min(1, Math.max(0, Number(p) || 0));
    if (hero.parentNode !== feed) feed.prepend(hero);
    // the chat is new only at p = 1; below it the thread exists (the band,
    // the thread's rows, its Recent row)
    put('isNew', p >= 1, (v) => { pane.dataset.new = v ? '1' : '0'; liveRow.hidden = v; });
    put('thread', p <= 0, (v) => pane.toggleAttribute('data-thread', v));
    const k = p.toFixed(4);
    put('grow', k, (v) => { tail.style.flexGrow = v; });
    // the greeting fades out in its seat and leaves once the tail has closed
    put('heroOn', p > 0, (v) => { hero.hidden = !v; });
    put('heroOp', k, (v) => { hero.style.opacity = v === '1.0000' ? '' : v; });
    // the header's actions arrive as the tail closes: opacity 1 - p (a pristine new chat has
    // none, a thread has all four), on the collapse's own curve
    put('band', (1 - p).toFixed(4), (v) => { headAct.style.setProperty('--hwf-band', v); });
  };
  const reset = () => {
    let moved = false;
    for (const n of [...feed.children]) if (n !== hero) { n.remove(); moved = true; }
    if (hero.parentNode !== feed) { feed.prepend(hero); moved = true; }
    // a scroll write lays the page out at once: only a thread that was
    // there can have scrolled (the build's own reset has none)
    if (moved) feed.scrollTop = 0;
    setDraft('');
    setCaret(false);
    setSendArmed(false);
    setSending(false);
    setModel(null);
    setModelFx(1, 1);
    setTitle('New chat');
    setNewChat(1);
  };

  ui = {
    pane, feed, composer, send, fit, onFit: null,
    setDraft, setCaret, setSendArmed, setSending, setModel, setModelFx, setNewChat, setTitle, reset,
    lanes: sidebarLanes(box),
  };
  reset();
  built.set(hub, ui);
  return ui;
}

// ---------- the rail's Chat | Code lane tiles ----------
// A real control once the story holds (inert before, so a keyboard never
// lands on a picture still in flight): the arrows move and select as main's
// switch does (packages/ui lane-view-switch.tsx: Right/Down next, Left/Up
// previous, wrapping), Home/End jump; data-track feeds ga4's cta_click. The
// open lane is the accent-wash tile with the accent glyph and the edge notch
// (data-current in the app, .on here). The HUD above the lanes is the same
// whole HUD on both (SidebarHud.tsx carries no lane state), so a flip changes
// the list and nothing else.
const LANES = ['chat', 'code'];
function sidebarLanes(box) {
  const row = box.querySelector('.hwf-rail-lanes');
  const tabs = LANES.map((l) => box.querySelector(`#hw-tab-${l}`));
  const panes = LANES.map((l) => box.querySelector(`#hw-lane-${l}`));
  let cur = null;
  const select = (lane, focus = false) => {
    if (lane !== cur) {
      cur = lane;
      tabs.forEach((b, i) => {
        const on = LANES[i] === lane;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        panes[i].hidden = !on;
      });
    }
    if (focus) tabs[LANES.indexOf(lane)].focus();
  };
  tabs.forEach((b, i) => b.addEventListener('click', () => select(LANES[i])));
  row.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = tabs.length;
    const j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n
        : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    select(LANES[j], true);
  });
  let isLive = null;
  const live = (on) => { if (on !== isLive) { isLive = on; row.inert = !on; } };
  select('chat');
  live(false);
  return { select, live };
}
