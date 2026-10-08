// hero-workspace: the lander's default hero since 2026-09-25 (`?hero=chaos`
// plays the previous default), ported from the workspace-hero deploy. It opens on the
// ad gallery's "I can do that too" first act (scenes/tabs.js 0..T.K: a browser
// whose tab strip fills with every agent app, faster and faster, the page
// cutting to each new tab), hands the strip's favicons to hero-sphere.js at the
// kill (the sphere, the mark, the HUD, the frontend reveal), and once the
// frontend is up cuts the stage to black for the ads' text card, "Your all in
// one agent workspace", with the storm gradient and white shine on "one"
// (timeline.js renderGrads). The card lifts onto the app's NEW CHAT screen and
// the story holds there (2026-09-26, the user: "end the animation on the new
// superbot new prompt screen"; newChat() below). This arm draws no phone and
// plays no phone beat (hero-workspace.css hides the phone, the beam and the
// label, so hub-handoff.js's noPhone path never docks), and the hold starts a
// beat after the card has lifted instead of after the phone beat's 5.6s.
//
// The clock is ours, not the sphere's: the stage holds on the first tab frame
// until it is scrolled far enough on screen, then plays once and holds; it
// pauses when scrolled away or the tab is hidden. hero-sphere.js is imported
// hosted (#stage[data-hero-host]) so it mounts and renders but never ticks.
// QA: ?t=<s> holds that story second, ?t=<s>&play=1 plays from it.
//
// The HUD: the deploy swapped the shared #hub roster for the ad's. The sidebar
// opens with the HUD (superbot-desktop hub/SidebarHud.tsx + sidebar-hud.css):
// the bold 'superbot' wordmark over a row of overlapping destination discs,
// the ringed Superbot disc first and a trailing '+', the same on both lanes
// (the app draws one whole HUD on the Chat and the Code tab alike). The mascot
// is the HUD's own small mark again (superbot-desktop f2fbe329c, 2026-10-01: a
// square the title line's height, left of the wordmark; the lane rail draws
// none), once, and it is where the sphere lands the tile.
// The footer is one row, the address and the Settings gear
// (hero-workspace.css), so nothing here touches it.
// The shared markup keeps OUR roster for chaos, sphere and realui, so
// swapHud() redraws the ad's discs here, at mount and only when this hero
// plays, BEFORE the sphere's prepStage reads the HUD (its drop items are the
// wordmark and each .hud-disc, so a hidden leftover would skew the glide).
// The Superbot disc and the shared '+' stay; the vendor discs between them
// are replaced once per page load, so #replay re-preps the same swapped HUD.
// The Servers menu (.hud-menu, shown only by .hud.menu-open) gains the same
// Hermes row ahead of its Add divider so the menu names every disc.

import { wireReplay } from './hub-handoff.js?v=7';

const stage = document.getElementById('stage');
stage.setAttribute('data-hero-host', 'workspace');

// the vendor discs in image-2 order (ChatGPT, Claude, Cursor, Hermes); Hermes
// is the app's own icon, so its image fills the disc as the app's .hud-face does
const HERMES_IMG = '<img src="./site/assets/brand/chaos/hermes.png" alt="" width="44" height="44"/>';
const AD_DISCS =
  '<span class="hud-disc" data-app="openai"><svg><use href="#sb-ic-openai"/></svg></span>' +
  '<span class="hud-disc" data-app="claude"><svg><use href="#sb-ic-claude"/></svg></span>' +
  '<span class="hud-disc" data-app="cursor"><svg><use href="#sb-ic-cursor"/></svg></span>' +
  `<span class="hud-disc logo" data-app="hermes">${HERMES_IMG}</span>`;
const AD_MENU_ROW =
  `<span class="hud-menu-row"><i class="hud-menu-art logo" data-app="hermes">${HERMES_IMG}</i>` +
  '<span class="hud-menu-tx"><b>Hermes Agent</b></span></span>';
function swapHud() {
  const hud = stage.querySelector('#hub .hud');
  const discs = hud?.querySelector('.hud-discs');
  const sb = discs?.querySelector('.hud-disc.sb');
  if (!sb || discs.dataset.hwHud) return;
  discs.dataset.hwHud = '1';
  const add = discs.querySelector('.hud-disc.add');
  const chev = discs.querySelector('.hud-disc.chev');
  while (sb.nextSibling && sb.nextSibling !== (chev ?? add)) sb.nextSibling.remove(); // the chevron beside the stack (the app's hud-expand) stays, ahead of the +
  sb.insertAdjacentHTML('afterend', AD_DISCS);
  if (!add) discs.insertAdjacentHTML('beforeend', '<span class="hud-disc add">+</span>');
  const menuDiv = hud.querySelector('.hud-menu .hud-menu-div');
  if (menuDiv) menuDiv.insertAdjacentHTML('beforebegin', AD_MENU_ROW);
}

// the new chat screen, copied from the desktop app (superbot-desktop
// apps/desktop/src/renderer/src/hub): the pane head's title is 'New chat'
// (MainPane.tsx:920); the feed holds ThreadIdle variant="hero" alone, the
// Superbot mark inline with the serif greeting greetings.ts composes (see
// greeting() below); the composer's context ring names the rules an empty
// chat carries up front (see NEW_CHAT_CTX); NewChatTail holds the AI
// disclaimer line, then NewChatChips' five starts (label + lucide icon:
// PenLine, Code2, Search, Globe, Workflow). In the sidebar the open row is
// New chat, not a thread.
// The shared markup keeps the scripted thread for the other arms, so this
// rewrites it here, at mount and only when this hero plays, BEFORE prepStage
// reads the hub (its feed rows are then absent and the phone beat's feed
// pops find nothing to pop).
//
// The greeting: a "{lead} {ask}" line @superbot/core/greeting can pick
// (superbot-desktop packages/core/src/greeting/index.ts) with no stored name.
// The lead is the first open of the band, read off the visitor's own clock at
// mount with that module's bandOfHour cut-offs (night [22,5), morning [5,12),
// afternoon [12,17), evening [17,22)): LEAD_POOL m1 'Good morning.', a1 'Good
// afternoon.', e1 'Good evening.', and at night n1 'Quiet hours.' (the module
// may also draw n2 'The small hours.' before 05:00; the mock keeps n1 for the
// whole band). The app picks the ask by salience and keeps it per thread and
// band; the mock is one fixed thread, so its ask is fixed too: 'Where do we
// go', ASK_POOL n3, the line the phone mock's new chat already carries. A
// stable line also keeps the hero experiment comparing arms, not greetings.
const bandLead = (now) => {
  const hour = now.getHours();
  if (hour < 5 || hour >= 22) return 'Quiet hours';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
const NEW_CHAT_QUESTION = 'Where do we go';
const greeting = (now = new Date()) => [`${bandLead(now)}.`, `${NEW_CHAT_QUESTION}?`];
// the reading an empty chat carries (ContextStatusLine.tsx `baseline`,
// context-baseline.ts contextBaseline): the rules the first send carries up
// front, '12k', the app's own fixture figure for this state. It is a count of
// the rules alone, never a share of the model's window: tools and the system
// prompt are not counted (the app's meter-name.ts RULES_UP_FRONT_LABEL and
// RULES_NOT_COUNTED_NOTE, which the ring's label below repeats word for word).
// The Superbot chat has no footer line to print it on, so it is the
// ContextRing's aria-label alone.
const NEW_CHAT_CTX = { base: '12k' };
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const NEW_CHAT_CHIPS = [
  ['Write', '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.85z"/>'],
  ['Code', '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>'],
  ['Research', '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'],
  ['Browse', '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'],
  ['Automate', '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>'],
];
function newChat() {
  const hub = stage.querySelector('#hub');
  const feed = hub?.querySelector('#feed');
  const composer = hub?.querySelector('.main .composer');
  if (!feed || !composer || hub.dataset.hwNew) return;
  hub.dataset.hwNew = '1';
  // the stage's figure label named the phone beat; this arm has none
  stage.setAttribute('aria-label', 'the apps you already use lift into a spinning sphere, collapse into the superbot tile, and it becomes the app');
  const title = hub.querySelector('.main .chat-head b');
  if (title) title.textContent = 'New chat';
  // the scripted thread's own row leaves the Recent list with its transcript
  hub.querySelectorAll('.chats .row.chat.on').forEach((r) => r.remove());
  feed.className = 'feed hw-nc';
  // one sentence per span: the line is sized to fit whole (hero-workspace.css),
  // and a seat narrower than that breaks between them, never inside one
  const [hello, ask] = greeting();
  feed.innerHTML = '<div class="hw-nc-hero"><img class="hw-nc-mark" src="./site/assets/brand/mono-mark-white.svg" alt="" width="48" height="48"/>' +
    `<p class="hw-nc-greet"><span>${hello}</span> <span>${ask}</span></p></div>`;
  // the empty chat's context reading: the ContextRing is the composer's only
  // seat for it now that the Superbot thread state draws no footer row, so the
  // ring's aria-label takes the rules figure, not a thread's history
  const ctx = composer.querySelector('.ctx');
  if (ctx) ctx.setAttribute('aria-label', `Rules up front: ${NEW_CHAT_CTX.base}. Tools and the system prompt are not counted.`);
  // the AI disclosure prints on the new chat screen only, as its own centred
  // line under the bar and above the start chips (Thread.tsx:25354-25362
  // heroOpen, hub-chat.css:891 .hub-ai-caption[data-seat='new-chat']); a
  // Superbot thread draws no footer line, so the static hub carries none
  composer.insertAdjacentHTML('afterend', '<div class="hw-nc-tail"><p class="disclaim">superbot is AI and can make mistakes.</p><div class="hw-nc-chips">' +
    NEW_CHAT_CHIPS.map(([label, d]) => `<span class="hw-nc-chip">${SVG(d)}<span>${label}</span></span>`).join('') +
    '</div></div>');
  lanes = sidebarLanes(hub);
}

// ---------- the sidebar's two lanes, live at the hold (2026-09-26) ----------
// The user: "add some mock chatgpt chats too, let user click "Code" tab to see
// imported cursor, devin mix with 1 expanded maybe and the default project
// chat." The Chat lane gains ChatGPT chats (the page's #sb-ic-openai mark on
// its brand tile). The Chat | Code switch becomes a real control once the
// story holds (inert before, so a keyboard never lands on a picture still in
// flight): two tabs in the app's order, the arrows move and select as the
// app's switch does (packages/ui lane-view-switch.tsx: Right/Down next,
// Left/Up previous, wrapping), Home/End jump, and each carries data-track so
// ga4's delegated cta_click logs it. #replay puts the Chat lane back.
//
// The Code lane is the desktop's flat project list (superbot-desktop, spec
// §15.530: hub/Sidebar.tsx .hub-side-new-project + ProjectRows.tsx +
// project-rows.css, which supersedes §15.414's date buckets), at the
// miniature's row scale: one ghost 'New project' row (no border or fill, the
// FolderPlus glyph on the leading glyph column, 72d19defd; no Import beside
// it), then ONE row per project in recency order, no Today / Yesterday /
// Earlier headers: [origin mark][name]......[chat-count pill] (the vendor's
// tinted tile, or the git folder glyph for a plain repository; its origin
// spoken in its title, never a second line). Nothing nests while a project is
// shut. An open project's chats (five at most) sit under it, several open at once,
// one muted line each, the title on the name's column and the date on the
// right, joined by a faint guide line down the mark's axis, and its pill is a
// small up chevron. The selected project (its Project chat is the head row: the
// app draws no separate "Project chat" row, ProjectRows.tsx) wears the soft
// active fill and a 2px accent bar on its leading edge; a running one reads a
// still accent dot and plain muted 'Running 4:20' in the status seat before
// the pill.
//
// The rows answer a press (the Chat | Code switch above is already live at
// the hold, so the list under it is too): a press on a SHUT row opens it in
// place and leaves the others open; only its up chevron shuts it again; a
// press on the OPEN row holds, because
// the app's second press drills into the project's full chat list and this
// picture draws no drill view. The selected project stays the selected one.
// The HUD above the lanes is the same whole HUD on both (SidebarHud.tsx
// carries no lane state: the quiet header of fa679ec97 is retired).
const MARK = (app) => app === 'superbot'
  ? '<i class="sp" aria-hidden="true"><img src="./site/assets/brand/mark-clean.svg" alt="" width="11" height="11"/></i>'
  : app === 'git'
    ? `<i class="sp hw-git" aria-hidden="true">${SVG('<path d="M18 19a5 5 0 0 1-5-5v8"/><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><circle cx="20" cy="19" r="2"/>')}</i>`
    : `<i class="sp app-${app}" aria-hidden="true"><svg><use href="#sb-ic-${app}"/></svg></i>`;
const chatRow = ([app, title, when]) => `<span class="row chat">${MARK(app)}<span class="t">${title}</span><em>${when}</em></span>`;
// the Chat lane's ChatGPT chats, in the list's own voice: two flat Recent rows
// in the list's time order (the example account has no pinned chats, so the
// list is Recent alone: no Pinned label, no raised card)
const GPT_RECENT_TODAY = ['openai', 'Name ideas for the CLI', '2:14 PM'];
const GPT_RECENT_OLDER = ['openai', 'Plan the Lisbon offsite', 'Sep 24'];
const CHEV_UP = SVG('<path d="m18 15-6-6-6 6"/>');
// one project: a row that is a button (its press opens it), the count pill and
// the up chevron both drawn, the open class choosing which shows (hero-workspace.css),
// then its chats (at most five; the pill reads the whole count) hidden until open
const PROJECT = (p) => {
  const n = p.count ?? p.chats.length;
  return `<div class="hw-proj${p.open ? ' open' : ''}">` +
    `<button type="button" class="row hw-proj-head${p.sel ? ' sel' : ''}" aria-expanded="${p.open ? 'true' : 'false'}" aria-label="${p.title}, ${n} ${n === 1 ? 'chat' : 'chats'}" title="${p.title}, ${p.label}">` +
    `${MARK(p.origin)}<span class="t">${p.title}</span>` +
    (p.running ? `<em class="hw-run"><i aria-hidden="true"></i>${p.running}</em>` : '') +
    `<span class="hw-trail" aria-hidden="true"><span class="hw-pill">${n}</span><i class="hw-up">${CHEV_UP}</i></span></button>` +
    `<div class="hw-proj-chats">${p.chats.slice(0, 5).map(([title, when]) => `<span class="row chat"><span class="t">${title}</span><em>${when}</em></span>`).join('')}</div></div>`;
};
// the list, newest first; the one open project is the selected, running one
const CODE_LANE =
  `<span class="row hw-newproj"><i class="nc-mark" aria-hidden="true">${SVG('<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>')}</i>New project</span>` +
  PROJECT({ title: 'store', origin: 'cursor', label: 'Cursor', sel: true, running: 'Running 4:20', open: true, chats: [
    ['Retry webhooks', '2:41 PM'],
    ['Dedupe retries', '11:02 AM'],
    ['Bump Node to 22', '9:15 AM'],
    ['Flaky cart test', 'Yesterday'],
  ] }) +
  PROJECT({ title: 'mobile-app', origin: 'cursor', label: 'Cursor', chats: [
    ['Push opt-in', '1:20 PM'],
    ['Back gesture fix', 'Yesterday'],
  ] }) +
  PROJECT({ title: 'infra', origin: 'git', label: 'Git repository', chats: [
    ['Rotate TLS certs', '10:48 AM'],
    ['Terraform drift', 'Sep 29'],
  ] }) +
  PROJECT({ title: 'billing-api', origin: 'git', label: 'Git repository', chats: [
    ['Proration bug', 'Yesterday'],
    ['Signature check', 'Sep 28'],
    ['Invoice PDF layout', 'Sep 26'],
  ] }) +
  PROJECT({ title: 'trip-planner', origin: 'superbot', label: 'Superbot', chats: [
    ['Lisbon itinerary', 'Sep 30'],
  ] }) +
  PROJECT({ title: 'design-system', origin: 'cursor', label: 'Cursor', chats: [
    ['Dark theme tokens', 'Sep 29'],
    ['Button state audit', 'Sep 26'],
  ] }) +
  PROJECT({ title: 'docs-site', origin: 'git', label: 'Git repository', chats: [
    ['Quickstart rewrite', 'Sep 28'],
  ] }) +
  PROJECT({ title: 'landing-page', origin: 'cursor', label: 'Cursor', chats: [
    ['Hero copy pass', 'Sep 24'],
    ['Image budget', 'Sep 22'],
    ['Sticky nav on iOS', 'Sep 20'],
  ] });
const LANES = ['chat', 'code'];
let lanes = null;
function sidebarLanes(hub) {
  // the lane switch lives on the RAIL (CollapsedRail.tsx), not in the sidebar:
  // the two lane tiles are the tabs, the whole sidebar list is the chat pane
  const chats = hub.querySelector('.side .chats');
  const rail = hub.querySelector('.side .rail');
  const spans = rail ? [...rail.querySelectorAll('.rail-tile[data-lane]')] : [];
  const acct = chats?.querySelector('.acct');
  if (!chats || !rail || spans.length !== 2 || !acct) return null;
  // the Chat lane: every row between the tabs and the account bar, in its own
  // panel (the list clips under a fixed account bar, as the app's list scrolls)
  const chatPane = document.createElement('div');
  for (const n of [...chats.children]) if (n !== acct) chatPane.append(n);
  const codePane = document.createElement('div');
  codePane.innerHTML = CODE_LANE;
  codePane.hidden = true;
  // a press on a shut project opens it and leaves every other open one open
  // (several at once, as the app); the open row's up chevron shuts it; any
  // other press on the open row holds, as this picture draws no drill view
  codePane.addEventListener('click', (e) => {
    const head = e.target.closest?.('.hw-proj-head');
    const proj = head?.parentElement;
    if (!head) return;
    const open = proj.classList.contains('open');
    if (open && !e.target.closest('.hw-up')) return;
    proj.classList.toggle('open', !open);
    head.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  const panes = [chatPane, codePane];
  panes.forEach((p, i) => {
    p.className = 'hw-lane';
    p.id = `hw-lane-${LANES[i]}`;
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', `hw-tab-${LANES[i]}`);
    chats.insertBefore(p, acct);
  });
  // ChatGPT in the Chat lane: a Recent row today, one older
  const recent = [...chatPane.querySelectorAll('.row.chat')];
  recent[0]?.insertAdjacentHTML('beforebegin', chatRow(GPT_RECENT_TODAY));
  const older = recent.find((r) => !/[AP]M$/.test(r.querySelector('em')?.textContent ?? ''));
  older?.insertAdjacentHTML('beforebegin', chatRow(GPT_RECENT_OLDER));
  // the switch: the two label spans become tabs, the list's filter and
  // search glyphs beside them stay pictures
  rail.setAttribute('role', 'tablist');
  rail.setAttribute('aria-label', 'Lane view');
  // the rail's band, ground and foot are not tabs: pull them out of the
  // tablist's accessible children, as the old sidebar's tools were pulled out
  [...rail.children].filter((n) => !spans.includes(n)).forEach((n) => n.setAttribute('aria-hidden', 'true'));
  const tabs = spans.map((sp, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = sp.classList.contains('inner') ? 'rail-tile inner' : 'rail-tile'; // .inner: the tile fades up with the rail's other pieces (hub-handoff.js revealInners)
    if (sp.dataset.lane) b.dataset.lane = sp.dataset.lane;
    const name = sp.getAttribute('aria-label');
    if (name) b.setAttribute('aria-label', name);
    b.id = `hw-tab-${LANES[i]}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', `hw-lane-${LANES[i]}`);
    b.dataset.track = `hero-tab-${LANES[i]}`;
    b.append(...sp.childNodes);
    sp.replaceWith(b);
    return b;
  });
  const select = (lane, focus = false) => {
    tabs.forEach((b, i) => {
      const on = LANES[i] === lane;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      panes[i].hidden = !on;
    });
    if (focus) tabs[LANES.indexOf(lane)].focus();
  };
  tabs.forEach((b, i) => b.addEventListener('click', () => select(LANES[i])));
  rail.addEventListener('keydown', (e) => {
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
  const live = (on) => { if (on !== isLive) { isLive = on; rail.inert = !on; } };
  select('chat');
  live(false);
  return { select, live };
}
const { sphere } = await import('./hero-sphere.js?v=7');
const { HS, T0: PRE, L, BEATS, END: SPHERE_END, liftAt } = sphere;

// ---------- constants (s, our clock: 0 = the first tab frame, PRE = the kill) ----------
const HW = {
  OPEN: [0.45, 2.30], OPEN_EXP: 0.6, // tabs 3..N-1 open over this window, each gap shorter than the last
  GROW: 0.16,                        // a new tab widens into the strip
  FIRST: 3,                          // tabs already open on the first frame
  TAB_MAX: 240,                      // Chrome's widest tab, design px
  PUSH_AT: 0.3,                      // the camera starts leaning in
  COUNT_IN: [0.9, 1.1],              // the "N tabs open" pill
  TAB_DIE: 0.18,                     // a tab fades as its favicon lifts
  CHROME_OUT: [0.1, 0.62],           // after the kill, the window fades as it falls
  // the card, the ads' text beat in frame: once the frontend has shown, the
  // stage fades to black, the headline's words rise and unblur in turn, the
  // shine sweeps "one", then the card lifts and the frontend carries on. The
  // sphere's clock stands still from CARD_AT until the card starts to lift.
  CARD_AT: BEATS.REST1 + 0.5,        // sphere time: the frontend has been up a beat
  CARD_IN: 0.4, CARD_HOLD: 3.0, CARD_OUT: 0.5,
  WORD_AT: 0.3,                      // after CARD_AT, the first word starts
  WORD_GAP: 0.08, WORD_DUR: 0.55, WORD_DY: 0.36, WORD_BLUR: 8,
  SHINE_DELAY: 0.08, SHINE_DUR: 0.9,
  STORM_LOOP: 8,                     // s for the gradient tile to drift one period
  REST_END: 0.6,                     // after the card has lifted, the new chat screen rests this long, then the hold (#replay)
  // the gate: play once this much of the stage is on screen
  GATE_RATIO: 0.6, GATE_VIEW: 0.6,
};
const N = HS.N;
const T_CARD = PRE + HW.CARD_AT;
const T_BLACK = T_CARD + HW.CARD_IN;
const T_OUT = T_BLACK + HW.CARD_HOLD;
const CARD_LEN = T_OUT - T_CARD;       // how long the sphere stands still
const T_TITLE = T_CARD + HW.WORD_AT;
// the hold: the card has lifted onto the new chat screen and it has rested a
// beat. It used to be PRE + SPHERE_END + CARD_LEN, the end of the sphere's
// phone beat (5.6s past its handoff, 5s after the card lifted); with no phone
// drawn nothing moves in that window, so the story ends here instead.
const END = T_OUT + HW.CARD_OUT + HW.REST_END;
// our clock -> the sphere's: straight through, frozen under the card, then shifted by it.
// At our END it is pinned to the sphere's END, which is where its perch() and
// #replay live; the jump from END - PRE - CARD_LEN is invisible (past the
// handoff the sphere only runs the phone beat, and this arm has no phone).
const sphereT = (tau) => (tau >= END ? SPHERE_END :
  Math.max(0, tau < T_CARD ? tau - PRE : tau < T_OUT ? HW.CARD_AT : tau - PRE - CARD_LEN));

// the apps, one per sphere tile (hero-sphere.js HS.BRANDS, same order), so tab k's favicon IS tile k
const APPS = {
  'chaos/claude.png': ['Claude', 'claude.ai'],
  'chaos/gemini-app-icon.png': ['Gemini', 'gemini.google.com'],
  'chaos/cursor.png': ['Cursor', 'cursor.com'],
  'chaos/copilot.svg': ['GitHub Copilot', 'github.com/copilot'],
  'chaos/devin.png': ['Devin', 'app.devin.ai'],
  'chaos/hermes.png': ['Hermes Agent', 'github.com/NousResearch/hermes-agent'],
  'chaos/kiro.png': ['Kiro', 'kiro.dev'],
  'chaos/vscode.png': ['VS Code', 'vscode.dev'],
  'chaos/chatgpt.png': ['ChatGPT', 'chatgpt.com'],
  'tiles/windsurf.svg': ['Windsurf', 'windsurf.com'],
  'tiles/zed.svg': ['Zed', 'zed.dev'],
  'tiles/cline.svg': ['Cline', 'cline.bot'],
  'tiles/roo.svg': ['Roo Code', 'roocode.com'],
  'tiles/kilo.svg': ['Kilo Code', 'kilocode.ai'],
  'tiles/continue.svg': ['Continue', 'continue.dev'],
  'tiles/opencode.svg': ['opencode', 'opencode.ai'],
  'tiles/openclaw.svg': ['OpenClaw', 'openclaw.ai'],
  'tiles/qwen-code.svg': ['Qwen Code', 'github.com/QwenLM/qwen-code'],
  'tiles/amazon-q-cli.svg': ['Amazon Q', 'aws.amazon.com/q/developer'],
};
const appOf = (k) => {
  const file = HS.BRANDS[k % HS.BRANDS.length];
  const [name, host] = APPS[file] ?? [file.replace(/^.*\/|\..*$/g, ''), ''];
  return { src: HS.BRAND + file, name, host };
};

// ---------- math ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// tab k opens at OPEN_AT[k]: the first three are open on frame one, the rest
// arrive on a p^0.6 curve, so every gap is shorter than the one before
const OPEN_AT = Array.from({ length: N }, (_, k) => {
  if (k < HW.FIRST) return -1;
  const p = (k - HW.FIRST) / (N - 1 - HW.FIRST);
  return lerp(HW.OPEN[0], HW.OPEN[1], Math.pow(p, HW.OPEN_EXP));
});

// ---------- DOM: the browser, drawn in the sphere's own canvas (design px) ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const browser = document.createElement('div');
browser.className = 'hw-browser';
browser.setAttribute('aria-hidden', 'true');
browser.innerHTML =
  `<div class="hw-strip"><i class="hw-dot"></i><i class="hw-dot"></i><i class="hw-dot"></i>` +
  `<div class="hw-tabs"></div><span class="hw-new">+</span></div>` +
  `<div class="hw-bar"><span class="hw-nav">&#8592;</span><span class="hw-nav">&#8594;</span><span class="hw-nav">&#8635;</span>` +
  `<div class="hw-omni"><span class="hw-lock"></span><span class="hw-url"></span></div></div>` +
  `<div class="hw-page"><div class="hw-app"><img class="hw-app-icon" alt="" draggable="false">` +
  `<div class="hw-app-name"></div><div class="hw-compose"><span class="hw-ph"></span><i class="hw-send"></i></div></div>` +
  `<div class="hw-count"></div></div>`;
const tabsEl = browser.querySelector('.hw-tabs');
const newEl = browser.querySelector('.hw-new');
const urlEl = browser.querySelector('.hw-url');
const appIcon = browser.querySelector('.hw-app-icon');
const appName = browser.querySelector('.hw-app-name');
const phEl = browser.querySelector('.hw-ph');
const countEl = browser.querySelector('.hw-count');

const tabs = Array.from({ length: N }, (_, k) => {
  const app = appOf(k);
  const el = document.createElement('div');
  el.className = 'hw-tab';
  el.innerHTML = `<img class="hw-fav" src="${esc(app.src)}" alt="" draggable="false">` +
    `<span class="hw-tt">${esc(app.name)}</span><span class="hw-x">&#215;</span>`;
  tabsEl.appendChild(el);
  return { k, el, fav: el.firstElementChild, app, lift: liftAt(k), st: {} };
});

// the card: black over the whole stage, the headline centred on it
const card = document.createElement('div');
card.className = 'hw-card';
card.innerHTML = '<p class="hw-title">' +
  ['Your', 'all', 'in', 'one', 'agent', 'workspace']
    .map((w) => `<span class="hw-w${w === 'one' ? ' hw-one' : ''}">${w}</span>`).join(' ') + '</p>';
const title = card.firstElementChild;
const words = [...title.querySelectorAll('.hw-w')];
const one = title.querySelector('.hw-one');

// ---------- the browser's frame ----------
let bShown = true, activeK = -1, countN = -1, lastW = 0;
function setPage(k) {
  if (k === activeK) return;
  if (activeK >= 0) tabs[activeK].el.classList.remove('on');
  activeK = k;
  const { app, el } = tabs[k];
  el.classList.add('on');
  urlEl.textContent = app.host;
  appIcon.src = app.src;
  appName.textContent = app.name;
  phEl.textContent = `Message ${app.name}`;
}
// write a style only when its value moved (40 tabs a frame)
const put = (tb, key, v, fn) => { if (tb.st[key] !== v) { tb.st[key] = v; fn(v); } };

function renderBrowser(tau) {
  const t = tau - PRE;
  if (t >= HW.CHROME_OUT[1]) {
    if (bShown) { bShown = false; browser.style.visibility = 'hidden'; }
    return;
  }
  if (!bShown) { bShown = true; browser.style.visibility = ''; }
  const { cx, cy, W } = L;
  const BW = W / HS.Z;
  if (BW !== lastW) { lastW = BW; browser.style.width = `${BW.toFixed(2)}px`; }

  // the camera: leans in over the act, then falls away about the centre at
  // the kill; the same numbers hero-sphere.js places the lifting tiles with
  const push = Math.min(HS.PUSH, 8 / cx);
  const s1 = 1 + push * (t < 0 ? inOutCubic(seg(tau, HW.PUSH_AT, PRE)) : 1);
  const s2 = t < 0 ? 1 : lerp(1, HS.FALL, outCubic(seg(t, 0, HS.KILL)));
  const cam = s1 * s2, offX = cx + (cx * (1 - s1) - cx) * s2, offY = cy - cy * s2;
  browser.style.transform = `translate(${offX.toFixed(2)}px, ${offY.toFixed(2)}px) scale(${(HS.Z * cam).toFixed(5)})`;
  browser.style.opacity = t < 0 ? '1' : (1 - outCubic(seg(t, HW.CHROME_OUT[0], HW.CHROME_OUT[1]))).toFixed(3);

  // the strip: every open tab shares the width, capped at Chrome's widest;
  // with all N open this is exactly the geometry of L.fav (hero-sphere layout())
  const avail = BW - HS.STRIP_L - HS.STRIP_R;
  const grow = tabs.map((tb) => (OPEN_AT[tb.k] < 0 ? 1 : outCubic(seg(tau, OPEN_AT[tb.k], OPEN_AT[tb.k] + HW.GROW))));
  const share = Math.min(HW.TAB_MAX, avail / Math.max(1e-6, grow.reduce((a, b) => a + b, 0)));
  let x = HS.STRIP_L, open = 0, newest = 0;
  for (const tb of tabs) {
    const g = grow[tb.k], w = share * g;
    if (OPEN_AT[tb.k] <= tau) { open++; newest = tb.k; }
    const die = t < 0 ? 1 : 1 - seg(t, tb.lift, tb.lift + HW.TAB_DIE);
    const vis = g > 0 && die > 0;
    put(tb, 'vis', vis, (v) => { tb.el.style.visibility = v ? '' : 'hidden'; });
    if (vis) {
      put(tb, 'x', x.toFixed(2), (v) => { tb.el.style.transform = `translateX(${v}px)`; });
      put(tb, 'w', w.toFixed(2), (v) => { tb.el.style.width = `${v}px`; });
      put(tb, 'op', die.toFixed(3), (v) => { tb.el.style.opacity = v; });
      put(tb, 'size', w < 64 ? 'xs' : w < 110 ? 's' : '', (v) => { tb.el.dataset.size = v; });
      // the favicon sits where the sphere's tile k lifts from, then hands over
      put(tb, 'fl', Math.min(12, (w - 16) / 2).toFixed(2), (v) => { tb.fav.style.left = `${v}px`; });
      put(tb, 'fo', (t < 0 ? 1 : 1 - seg(t, tb.lift, tb.lift + HS.LIFT_IN)).toFixed(3), (v) => { tb.fav.style.opacity = v; });
    }
    x += w;
  }
  newEl.style.transform = `translateX(${(x + 6).toFixed(2)}px)`;
  newEl.style.opacity = x + 34 < BW - 8 ? '1' : '0';
  // each new tab takes the page: the cuts come faster as the tabs do
  setPage(newest);
  if (open !== countN) { countN = open; countEl.textContent = `${open} tabs open`; }
  countEl.style.opacity = seg(tau, HW.COUNT_IN[0], HW.COUNT_IN[1]).toFixed(3);
}

// ---------- the headline ----------
let wordState = [], grad = null;
function measureOne() {
  if (!one || !one.offsetWidth) return null;
  const W = one.offsetWidth;
  const P = Math.max(260, W * 3);
  return { W, band: W * 0.55, P, V: P / HW.STORM_LOOP };
}
function renderTitle(tau) {
  const fs = parseFloat(getComputedStyle(title).fontSize) || 48;
  words.forEach((el, i) => {
    const a = T_TITLE + i * HW.WORD_GAP;
    const e = Math.round(outCubic(seg(tau, a, a + HW.WORD_DUR)) * 1000) / 1000;
    if (wordState[i] === e) return;
    wordState[i] = e;
    el.style.opacity = String(e);
    el.style.transform = e >= 1 ? '' : `translateY(${(HW.WORD_DY * fs * (1 - e)).toFixed(2)}px)`;
    el.style.filter = e >= 1 || e <= 0 ? '' : `blur(${(HW.WORD_BLUR * (1 - e)).toFixed(2)}px)`;
  });
  if (!cardOn) return;
  // the storm tile drifts left the whole time the card is up; the white band
  // sweeps "one" once, just after it lands
  if (!grad) grad = measureOne();
  if (!grad) return;
  const land = T_TITLE + words.indexOf(one) * HW.WORD_GAP + HW.WORD_DUR;
  const drift = ((tau * grad.V) % grad.P + grad.P) % grad.P;
  const f = inOutCubic(seg(tau, land + HW.SHINE_DELAY, land + HW.SHINE_DELAY + HW.SHINE_DUR));
  const sx = lerp(-grad.band, grad.W, f);
  one.style.backgroundSize = `${grad.band.toFixed(1)}px 100%, ${grad.P.toFixed(1)}px 100%`;
  one.style.backgroundPosition = `${sx.toFixed(1)}px 0, ${(-drift).toFixed(1)}px 0`;
}
new ResizeObserver(() => { grad = null; }).observe(stage);

// the card's black: in over CARD_IN, held, out over CARD_OUT
let cardOn = false, cardOp = -1;
function renderCard(tau) {
  const op = tau < T_OUT ? outCubic(seg(tau, T_CARD, T_BLACK)) : 1 - inOutCubic(seg(tau, T_OUT, T_OUT + HW.CARD_OUT));
  const r = Math.round(op * 1000) / 1000;
  if (r === cardOp) return;
  cardOp = r;
  cardOn = r > 0;
  card.style.opacity = String(r);
  card.style.visibility = cardOn ? 'visible' : 'hidden';
}

// ---------- one story time -> every write ----------
function render(tau) {
  sphere.render(sphereT(tau));
  renderBrowser(tau);
  renderCard(tau);
  renderTitle(tau);
  lanes?.live(tau >= END);
}
function resetTitle() {
  wordState = [];
  cardOp = -1;
  one.style.backgroundPosition = '';
}

// ---------- the clock: held on frame one until the gate, then one rAF, hold at end ----------
let t0 = 0, started = false, paused = true, pausedAt = 0, visible = false, frozen = false, heldAt = 0;
function setPaused(v) {
  v = v || frozen || !started;
  if (v === paused) return;
  paused = v;
  if (v) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
}
const storyT = (now) => (started ? Math.min(((paused ? pausedAt : now) - t0) / 1000, END) : 0);
function tick(now) {
  requestAnimationFrame(tick);
  if (paused) return;
  const tau = storyT(now);
  if (tau >= END) {
    // held: the sphere stays perched, nothing left to write
    if (!heldAt) { heldAt = now; render(END); }
    return;
  }
  heldAt = 0;
  render(tau);
}
function start(from = 0) {
  if (started) return;
  started = true;
  paused = true;
  pausedAt = performance.now();
  t0 = pausedAt - from * 1000;
  setPaused(!visible || document.hidden);
}
// #replay: the tabs come back, the sphere re-zeroes the hub, the clock restarts at once
function restart() {
  lanes?.select('chat');
  sphere.reset();
  resetTitle();
  activeK = -1; countN = -1; heldAt = 0;
  for (const tb of tabs) tb.st = {};
  started = false;
  render(0);
  start(0);
}

// ---------- mount ----------
function mount() {
  const q = new URLSearchParams(location.search);
  swapHud();
  newChat();
  sphere.mount();
  sphere.root.querySelector('.hs-canvas').prepend(browser);
  stage.appendChild(card);
  render(0);
  const B = { ...BEATS, PRE, CARD: T_CARD, TITLE: T_TITLE, OUT: T_OUT, END };
  if (q.get('t') !== null && q.get('play') !== '1') {
    const tau = Math.max(0, Math.min(Number(q.get('t')) || 0, END));
    render(tau);
    window.__heroWorkspace = { t: () => tau, render, B };
    return;
  }
  const from = Math.max(0, Math.min(Number(q.get('t') ?? 0) || 0, END));
  wireReplay(restart);
  // the gate: frame one holds until enough of the stage is on screen (or the
  // stage fills most of the viewport); after that, off screen only pauses it
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    const enough = en.intersectionRatio >= HW.GATE_RATIO || en.intersectionRect.height >= innerHeight * HW.GATE_VIEW;
    if (!started && enough) start(from);
    setPaused(!visible || document.hidden);
  }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(!visible || document.hidden));
  requestAnimationFrame(tick);
  const freeze = (v) => { frozen = !!v; setPaused(!visible || document.hidden); };
  window.__heroWorkspace = { t: () => storyT(performance.now()), started: () => started, render, restart, freeze, B };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
