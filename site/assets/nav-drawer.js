/* The shared phone nav (2026-09-17, U-site). The server shell renders one
   .sb-nav with six links; at 320 CSS px the row measured 347px in a 320px
   viewport (23-27px of document overflow on every page) and there was no menu
   button, so a phone got either a clipped row or nothing. This decorates the
   rendered nav — it does not replace the markup, so every page keeps the same
   anchor text, order, aria-current and href the shell emitted.

   Contract (mobile-web-design.mdc, "Phone nav"): a 44px menu button opens a
   drawer over a scrim; focus moves into the drawer on open and returns to the
   button on close; aria-expanded mirrors the state; aria-controls names the
   drawer; a pick, the scrim outside the sheet and Escape all close it; Tab is
   trapped inside while it is open; the body does not scroll under it.

   The sheet (2026-09-26, the Discord mobile-web menu pattern): a full-height
   sheet from the right with a scrim strip on the left, a top row carrying the
   mark + wordmark and a close control docked on the exact pixels the menu
   button occupies (measured on open, so open and close stay under one thumb),
   the links as 56px full-width rows, and the CTA pinned at the bottom in the
   thumb zone. On open focus lands on the dialog container itself (tabindex
   -1, no ring), not on the first link: a tap-open used to paint a focus ring
   on "features" (iOS 26 Safari, 2026-09-26), and a keyboard or screen-reader
   user still starts inside the dialog.

   When it installs: a coarse pointer at a width the inline row cannot hold
   (<= 560px, or any width where the row itself overflows its island). A phone
   on its side (852px) and a tablet keep the inline row, which fits there — the
   drawer is not forced onto a surface that already shows every link. */
(() => {
  // `.sb-nav` is looked up anywhere on the page, not only inside the first
  // `.sb-header`: a page with its own flat header (the since-archived chat page
  // was the first, archive/site/chat.html) must give a nav inside it the same
  // drawer, or its links collide with the pill at 852px (seen in the landscape
  // PNG, review round 2026-09-17). The flag
  // class lives on the NAV itself (`sb-nav.sb-nav-has-btn`), so the rules work
  // whatever element holds the row, and the button docks beside the nav in the
  // nav's own parent. The dock takes `sb-drawer-dock` too: with the links gone
  // the island has room for the wordmark text the narrow tiers drop.
  const nav = document.querySelector('.sb-nav');
  if (!nav) return;
  const dock = nav.closest('.sb-header-in') || nav.parentElement;
  const COARSE = matchMedia('(pointer: coarse)');

  let btn = null;
  let scrim = null;
  let panel = null;
  let lastFocus = null;

  const links = () => Array.from(nav.querySelectorAll('a[href]'));
  const flag = (on) => {
    nav.classList.toggle('sb-nav-has-btn', on);
    dock.classList.toggle('sb-drawer-dock', on);
  };

  // The row must be measured with the links SHOWN. `.sb-nav-has-btn` hides
  // them, so a naive read reports "no overflow" the moment the drawer is up
  // and the next resize would tear it down and re-install it (review, 2026-09-17).
  // Both flag classes are toggled off, the width read (which forces a
  // synchronous reflow), and toggled back inside the same frame: nothing is
  // ever painted in the half-state, and the answer does not depend on the
  // current one.
  const rowOverflows = () => {
    const had = nav.classList.contains('sb-nav-has-btn');
    if (had) flag(false);
    // a page whose nav sits in a flat header (chat.html) can overflow its DOCK
    // without its own scrollWidth changing: on chat.html the pill paints OVER
    // "log in" at 744 while both boxes still report scrollWidth == clientWidth
    // (iPad Mini PNG, review round 2026-09-17), so the nav's right edge past
    // its dock is read as well.
    const over =
      dock.scrollWidth > dock.clientWidth + 1 ||
      nav.scrollWidth > nav.clientWidth + 1 ||
      nav.getBoundingClientRect().right > dock.getBoundingClientRect().right + 1;
    if (had) flag(true);
    return over;
  };

  // narrow OR overflowing, whatever the pointer: WCAG 1.4.10's 320px reflow
  // applies to a mouse too, and the inline row measured 347px in a 320px
  // viewport on a fine pointer as well (2026-09-17). A wide surface that fits
  // the row keeps it — the drawer is not forced on a screen showing every link.
  const shouldInstall = () => innerWidth <= 560 || rowOverflows();

  // the drawer's controls in DOM (= visual) order: the wordmark, the close
  // control, the links, the CTA
  const focusables = () => Array.from(panel.querySelectorAll('a[href], button:not([disabled])'));

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key !== 'Tab' || !panel) return;
    // the drawer traps focus while it is open: Tab cycles its own controls.
    // Focus starts on the dialog container, so Shift+Tab from there wraps to
    // the last control instead of leaving the dialog.
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (at === last || !panel.contains(at))) {
      e.preventDefault();
      first.focus();
    }
  };

  // dock the close control on the menu button's own rect, and the wordmark on
  // the same 44px band, so the sheet's top row reads as the island it covers.
  // A nav that has scrolled out of view (a non-sticky flat header) leaves the
  // CSS defaults in place.
  const place = () => {
    if (!panel || panel.hidden || !btn) return;
    // offsets from the viewport's right edge, where the sheet is anchored:
    // the sheet's own rect is mid-entrance (translateX) when this runs, so it
    // is never read; offsetWidth ignores the transform
    const b = btn.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const s = panel.style;
    if (b.width && b.top >= 0 && b.bottom <= innerHeight && b.left >= vw - panel.offsetWidth) {
      s.setProperty('--sb-x-top', `${Math.round(b.top)}px`);
      s.setProperty('--sb-x-right', `${Math.round(vw - b.right)}px`);
      s.setProperty('--sb-x-size', `${Math.round(b.height)}px`);
    } else {
      s.removeProperty('--sb-x-top');
      s.removeProperty('--sb-x-right');
      s.removeProperty('--sb-x-size');
    }
  };

  const close = (toButton) => {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    scrim.hidden = true;
    document.body.classList.remove('sb-nav-open');
    document.removeEventListener('keydown', onKey, true);
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (toButton && btn) btn.focus();
    else if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    lastFocus = null;
  };

  const open = () => {
    if (!panel || !panel.hidden) return;
    lastFocus = document.activeElement;
    scrim.hidden = false;
    panel.hidden = false;
    place();
    document.body.classList.add('sb-nav-open');
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey, true);
    // the container, not the first link: no ring painted on a tap-open
    panel.focus({ preventScroll: true });
  };

  const fill = (list) => {
    // the drawer IS the nav, cloned: same labels, hrefs, aria-current and
    // rel/target — a link added to the shell shows up here with no second list
    list.textContent = '';
    for (const a of links()) {
      const c = a.cloneNode(true);
      c.removeAttribute('id');
      if (a.classList.contains('sb-btn')) c.classList.add('sb-drawer-cta');
      list.appendChild(c);
    }
  };

  const build = () => {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sb-navbtn';
    btn.setAttribute('data-nav-toggle', '');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = '<span class="sb-navbtn-bars" aria-hidden="true"></span>';
    btn.setAttribute('aria-label', 'Menu');

    // the scrim and the sheet are siblings: the scrim is aria-hidden, and the
    // dialog used to be its child, which hid the whole menu from VoiceOver
    scrim = document.createElement('div');
    scrim.className = 'sb-scrim';
    scrim.hidden = true;
    scrim.setAttribute('aria-hidden', 'true');

    panel = document.createElement('div');
    panel.className = 'sb-drawer';
    panel.id = 'sb-drawer';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Site menu');
    btn.setAttribute('aria-controls', 'sb-drawer');

    // the top row: the page's own wordmark (cloned, so it keeps its href and
    // its "superbot.gg" name) and the 44px close control
    const head = document.createElement('div');
    head.className = 'sb-drawer-head';
    const word = document.querySelector('.sb-word');
    if (word) {
      const w = word.cloneNode(true);
      w.removeAttribute('id');
      w.classList.add('sb-drawer-word');
      head.appendChild(w);
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'sb-drawer-close';
    x.setAttribute('aria-label', 'Close menu');
    x.innerHTML = '<span class="sb-drawer-close-x" aria-hidden="true"></span>';
    x.addEventListener('click', () => close(true));
    head.appendChild(x);
    panel.appendChild(head);

    const list = document.createElement('nav');
    list.className = 'sb-drawer-nav';
    list.setAttribute('aria-label', 'Site');
    fill(list);
    panel.appendChild(list);
    document.body.appendChild(scrim);
    document.body.appendChild(panel);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel.hidden) open();
      else close(true);
    });
    // only the scrim's own surface outside the sheet closes it; a tap on the
    // sheet's padding or background never reaches the scrim (siblings)
    scrim.addEventListener('click', () => close(true));
    panel.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a) close(false);
    });
    dock.appendChild(btn);
    flag(true);
  };

  const teardown = () => {
    if (!btn) return;
    close(false);
    document.body.classList.remove('sb-nav-open');
    flag(false);
    btn.remove();
    scrim.remove();
    panel.remove();
    btn = null;
    scrim = null;
    panel = null;
  };

  // label + href per link: a shell re-render or nav-store.js retargeting the
  // pill after load changes an href without changing the count
  const sig = (as) => as.map((a) => `${a.getAttribute('href')}\u0000${a.textContent}`).join('\u0001');

  const sync = () => {
    const want = shouldInstall();
    if (want && !btn) build();
    else if (!want && btn) teardown();
    else if (want && btn) {
      // the drawer follows the live nav rather than a stale snapshot
      const list = panel.querySelector('.sb-drawer-nav');
      if (sig(Array.from(list.children)) !== sig(links())) fill(list);
      place();
    }
  };

  sync();
  addEventListener('resize', sync, { passive: true });
  addEventListener('orientationchange', sync, { passive: true });
  COARSE.addEventListener?.('change', sync);
  // the shell's nav-store.js may swap the pill after load; re-sync once the
  // page has settled so the drawer never lists a stale href
  addEventListener('load', sync, { once: true });
})();
