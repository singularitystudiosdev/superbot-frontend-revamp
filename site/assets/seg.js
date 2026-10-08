/* seg.js: the thumb of every .sb-seg well on the page (the desktop's
   segmented control, superbot-desktop packages/ui/src/styles.css .sb-seg).
   placeSegmentThumb from primitives/switch.tsx, verbatim: the thumb is
   measured under the checked option after layout, the first placement is
   untransitioned, and it re-fits whenever the well resizes.
   Two kinds of option live in a well here: a native radio (its <label> is the
   option; the form posts the value) and a link carrying aria-current (the
   usage page's unit and range pickers, one page load per choice). A well with
   no current option hides its thumb. _lit rides the well only while the radio
   named by data-lit-value is checked (the desktop Switch's own rule), so a
   toggle's sweep reads as "on"; a picker without data-lit-value stays lit on
   every choice. */
(function () {
  function optionOf(root) {
    var checked = root.querySelector('input:checked');
    if (checked) return root.querySelector('label[for="' + checked.id + '"]');
    return root.querySelector('[aria-current]');
  }
  /* Where the thumb is drawn right now, mid-slide included: its computed
     transform (the running transition's current value) over its current
     width. Null before it was ever placed. */
  function thumbBox(thumb) {
    var width = parseFloat(thumb.style.width);
    if (!(width > 0)) return null;
    var computed = getComputedStyle(thumb).transform;
    if (computed && computed !== 'none' && typeof DOMMatrixReadOnly !== 'undefined') {
      try {
        var matrix = new DOMMatrixReadOnly(computed);
        return { left: matrix.e, width: matrix.a * width };
      } catch (e) {
        // an engine that cannot parse its own matrix falls to the inline value
      }
    }
    var x = /translateX\((-?[\d.]+)px\)/.exec(thumb.style.transform);
    return x ? { left: Number(x[1]), width: width } : null;
  }
  function place(root) {
    var thumb = root.querySelector('[data-slot="segment-thumb"]');
    if (!thumb) return;
    var litValue = root.getAttribute('data-lit-value');
    if (litValue !== null) {
      var checked = root.querySelector('input:checked');
      root.classList.toggle('_lit', Boolean(checked) && checked.value === litValue);
    }
    var opt = optionOf(root);
    thumb.hidden = !opt;
    if (!opt) { root.classList.add('is-placed'); return; }
    var first = thumb.dataset.placed !== 'true';
    if (first) thumb.style.transition = 'none';
    var width = opt.offsetWidth;
    var left = opt.offsetLeft;
    // Width is never ANIMATED (the desktop's gate-desktop-2 rule, 2026-09-27,
    // placeSegmentThumb's rounded branch). A change of width is a FLIP: the new
    // width lands at once under the old box, drawn as translateX(old x)
    // scaleX(old width / new width) from the left edge, and only the transform
    // travels to translateX(new x). data-flip drops transform from the sheet's
    // transition list for that one committed frame, so the fill and glow fades
    // keep running.
    var from = first ? null : thumbBox(thumb);
    if (from !== null && Math.abs(from.width - width) > 0.5) {
      thumb.dataset.flip = '';
      thumb.style.width = width + 'px';
      thumb.style.transform = 'translateX(' + from.left + 'px) scaleX(' + (from.width / width) + ')';
      void thumb.offsetWidth;
      delete thumb.dataset.flip;
    } else {
      thumb.style.width = width + 'px';
    }
    thumb.style.transform = 'translateX(' + left + 'px)';
    if (first) {
      // Commit the untransitioned frame before the sheet's transition returns.
      void thumb.offsetWidth;
      thumb.style.transition = '';
      thumb.dataset.placed = 'true';
    }
    // The thumb now sits on the current option's rect: hand the fill over
    // from the option (account.css's :not(.is-placed) first-paint rule).
    root.classList.add('is-placed');
  }
  /* A link option: the thumb slides to it FIRST, on the sheet's 240ms fold
     curve (the desktop's LaneViewSwitch commits, the thumb glides, the list
     swaps under it), and the page follows once the slide lands. A plain page
     load would paint the new page with the thumb already there and no motion
     between; this is the one place the two pickers differ from an SPA.
     Modified clicks (new tab, middle button) keep the plain navigation. */
  var SLIDE_MS = 240;
  function setCurrent(root, link) {
    var was = root.querySelectorAll('[aria-current]');
    for (var i = 0; i < was.length; i++) was[i].removeAttribute('aria-current');
    link.setAttribute('aria-current', 'page');
    place(root);
  }
  function slideDone(root) {
    return new Promise(function (resolve) {
      var thumb = root.querySelector('[data-slot="segment-thumb"]');
      var done = false;
      var go = function () { if (done) return; done = true; resolve(); };
      if (thumb) thumb.addEventListener('transitionend', go, { once: true });
      setTimeout(go, SLIDE_MS + 40);
    });
  }
  /* data-seg-swap="<selector>,<selector>": the page for the option's href is
     fetched while the thumb slides, then each named region is swapped in
     place and the URL pushed -- the chart and table change under a picker
     that never unmounts (the user, 2026-09-17: "it reloads the page every
     time"). Every well's links are re-synced from the fetched page, because
     the unit picker's hrefs carry the current range and vice versa. A fetch
     that fails falls back to the plain navigation. */
  function swapFrom(root, link) {
    var selectors = root.getAttribute('data-seg-swap').split(',');
    var fetched = fetch(link.href, { credentials: 'same-origin', headers: { accept: 'text/html' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
    return Promise.all([fetched, slideDone(root)]).then(function (both) {
      var doc = both[0];
      for (var s = 0; s < selectors.length; s++) {
        var sel = selectors[s].trim();
        var live = document.querySelectorAll(sel);
        var next = doc.querySelectorAll(sel);
        for (var i = 0; i < live.length && i < next.length; i++) live[i].innerHTML = next[i].innerHTML;
      }
      var wells = document.querySelectorAll('[data-seg]');
      var nextWells = doc.querySelectorAll('[data-seg]');
      for (var w = 0; w < wells.length && w < nextWells.length; w++) {
        var opts = wells[w].querySelectorAll('a.sb-seg-opt');
        var nextOpts = nextWells[w].querySelectorAll('a.sb-seg-opt');
        for (var o = 0; o < opts.length && o < nextOpts.length; o++) {
          opts[o].href = nextOpts[o].href;
          if (nextOpts[o].hasAttribute('aria-current')) opts[o].setAttribute('aria-current', 'page');
          else opts[o].removeAttribute('aria-current');
        }
        place(wells[w]);
      }
      history.pushState({ seg: true }, '', link.href);
      // On window, not a local: the popstate listener below is registered once
      // for the window's lifetime (shell.ts runScripts re-executes this file on
      // every rail page swap), so the flag it reads must survive a re-execution.
      window.__segSwapped = true;
      document.dispatchEvent(new CustomEvent('usage:swapped'));
    });
  }
  function onLinkClick(root, event) {
    var link = event.target.closest && event.target.closest('a.sb-seg-opt');
    if (!link || !root.contains(link)) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('aria-current')) { event.preventDefault(); return; }
    var swap = root.hasAttribute('data-seg-swap') && typeof fetch === 'function' && typeof DOMParser === 'function';
    event.preventDefault();
    setCurrent(root, link);
    if (swap) {
      swapFrom(root, link).catch(function (err) {
        console.error('seg: in-place swap failed, navigating instead', err);
        window.location.assign(link.href);
      });
      return;
    }
    slideDone(root).then(function () { window.location.assign(link.href); });
  }
  // Back/forward after an in-place swap: the URL moved without a load, so a
  // history step re-loads the page it names. Registered once per window:
  // shell.ts's runScripts re-executes this file on every in-place rail swap,
  // and a listener per execution would stack (the same leak usage-chart.js
  // guards with __usageChartBound). The flag is on window for the same reason,
  // so a swap made by the latest execution is visible to the one listener.
  if (!window.__segPopBound) {
    window.__segPopBound = true;
    window.addEventListener('popstate', function () {
      if (window.__segSwapped) window.location.reload();
    });
  }
  function mount() {
    var wells = document.querySelectorAll('[data-seg]');
    for (var i = 0; i < wells.length; i++) {
      (function (root) {
        var fit = function () { place(root); };
        root.addEventListener('change', fit);
        root.addEventListener('click', function (event) { onLinkClick(root, event); });
        fit();
        if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(root);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      })(wells[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
