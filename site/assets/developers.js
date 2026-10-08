// The developer reference's behaviour (edge/src/developers/page.ts): code-card
// tabs (the request language is kept in localStorage and applied page-wide),
// copy per card and "copy as markdown" per operation or group, the operation
// filter (`/` focuses it), the scroll marker in the left nav, and bringing an
// operation page's operation into view. Without this file every pane stacks
// under its own label and every link still works.
(function () {
  'use strict';
  var LANG_KEY = 'sb-dev-lang';
  var live = document.getElementById('copylive');
  var say = function (t) {
    if (!live) return;
    live.textContent = t;
    setTimeout(function () { live.textContent = ''; }, 1500);
  };
  var flash = function (btn, label) {
    var was = btn.textContent;
    btn.textContent = 'copied'; btn.classList.add('copied'); say(label + ' copied to clipboard');
    setTimeout(function () { btn.textContent = was; btn.classList.remove('copied'); }, 1500);
  };

  // The copy ladder: async clipboard, then execCommand; feedback only on a
  // copy that happened.
  var copyText = function (value, done, blocked) {
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = value; ta.setAttribute('readonly', ''); document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) done(); else blocked();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, fallback);
    else fallback();
  };

  // ---- code cards -----------------------------------------------------------
  var cards = [].slice.call(document.querySelectorAll('.code'));
  var select = function (card, key, focus) {
    var tabs = [].slice.call(card.querySelectorAll('[role="tab"]'));
    var match = tabs.some(function (t) { return t.getAttribute('data-key') === key; });
    if (!match) return false;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-key') === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    card.querySelectorAll('.pane').forEach(function (p) { p.hidden = p.getAttribute('data-key') !== key; });
    return true;
  };
  var storedLang = function () { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } };
  var applyLang = function (key) {
    cards.forEach(function (card) { if (card.getAttribute('data-tabs') === 'lang') select(card, key, false); });
  };

  cards.forEach(function (card) {
    var tablist = card.querySelector('[role="tablist"]');
    var tabs = tablist ? [].slice.call(tablist.querySelectorAll('[role="tab"]')) : [];
    if (tabs.length) {
      tablist.hidden = false;
      card.classList.add('tabbed');
      select(card, tabs[0].getAttribute('data-key'), false);
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () {
          var key = tab.getAttribute('data-key');
          if (card.getAttribute('data-tabs') === 'lang') {
            try { localStorage.setItem(LANG_KEY, key); } catch (e) { /* private mode: this page only */ }
            applyLang(key);
          } else {
            select(card, key, false);
          }
        });
        tab.addEventListener('keydown', function (ev) {
          var next = null;
          if (ev.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
          else if (ev.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (ev.key === 'Home') next = tabs[0];
          else if (ev.key === 'End') next = tabs[tabs.length - 1];
          if (!next) return;
          ev.preventDefault();
          next.click();
          next.focus();
        });
      });
    }
    var btn = card.querySelector('.code-bar .cpy');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var pane = [].slice.call(card.querySelectorAll('.pane')).filter(function (p) { return !p.hidden; })[0];
      var pre = pane ? pane.querySelector('pre') : card.querySelector('pre');
      if (!pre) return;
      copyText(pre.textContent, function () { flash(btn, 'sample'); }, function () {
        var sel = getSelection(); sel.removeAllRanges(); var r = document.createRange(); r.selectNodeContents(pre); sel.addRange(r);
        say('clipboard blocked: the text is selected, press copy on your keyboard');
      });
    });
  });
  var lang = storedLang();
  if (lang) applyLang(lang);

  // the overview's base-URL cards: copy the card's snippet
  document.querySelectorAll('.base').forEach(function (card) {
    var btn = card.querySelector('.cpy');
    var pre = card.querySelector('pre');
    if (!btn || !pre) return;
    btn.addEventListener('click', function () {
      copyText(pre.textContent, function () { flash(btn, 'snippet'); }, function () {
        var sel = getSelection(); sel.removeAllRanges(); var r = document.createRange(); r.selectNodeContents(pre); sel.addRange(r);
        say('clipboard blocked: the text is selected, press copy on your keyboard');
      });
    });
  });

  // ---- copy as markdown -------------------------------------------------------
  // The twin is fetched on click. Safari keeps the click's permission only for
  // a clipboard write that starts inside the click, so a ClipboardItem that
  // resolves with the fetched text goes first; the fetch-then-write ladder is
  // the fallback.
  document.querySelectorAll('.cpy[data-md]').forEach(function (btn) {
    var url = btn.getAttribute('data-md');
    btn.hidden = false;
    var fetchText = function () {
      return fetch(url, { headers: { accept: 'text/markdown' } }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      });
    };
    var blocked = function () { say('clipboard blocked: open view .md and copy it from there'); };
    btn.addEventListener('click', function () {
      var done = function () { flash(btn, 'markdown'); };
      var ladder = function () { fetchText().then(function (t) { copyText(t, done, blocked); }, blocked); };
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
        var item = new ClipboardItem({ 'text/plain': fetchText().then(function (t) { return new Blob([t], { type: 'text/plain' }); }) });
        navigator.clipboard.write([item]).then(done, ladder);
      } else {
        ladder();
      }
    });
  });

  // ---- the filter ---------------------------------------------------------------
  var find = document.querySelector('.find');
  var input = document.getElementById('ref-find');
  var empty = document.querySelector('.empty');
  var items = [].slice.call(document.querySelectorAll('[data-find]'));
  if (find && input && items.length) {
    find.hidden = false;
    var run = function () {
      var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (el) {
        var text = el.getAttribute('data-find') || '';
        var hit = terms.every(function (t) { return text.indexOf(t) !== -1; });
        el.hidden = !hit;
        if (hit && !el.closest('.ref-side')) shown++;
      });
      // an overview group whose every row is filtered out goes with them
      document.querySelectorAll('.idx').forEach(function (g) {
        g.hidden = terms.length > 0 && !g.querySelector('tr[data-find]:not([hidden])');
      });
      if (empty) empty.hidden = !(terms.length && shown === 0);
    };
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && input.value) { input.value = ''; run(); }
    });
    var clear = empty && empty.querySelector('[data-clear]');
    if (clear) clear.addEventListener('click', function () { input.value = ''; run(); input.focus(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== '/' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var t = ev.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      ev.preventDefault();
      input.focus();
      input.select();
    });
  }

  // ---- an operation page: bring its operation into view --------------------------
  var focusOp = document.body.getAttribute('data-op');
  if (focusOp && !location.hash) {
    var target = document.getElementById(focusOp);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  // ---- the left nav marks the section in view --------------------------------------
  var spies = [].slice.call(document.querySelectorAll('.ref-nav [data-spy]'));
  if (spies.length && 'IntersectionObserver' in window) {
    var byId = {};
    spies.forEach(function (a) { byId[a.getAttribute('data-spy')] = a; });
    var mark = function (id) {
      spies.forEach(function (a) {
        var on = a.getAttribute('data-spy') === id;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    };
    var io = new IntersectionObserver(function (entries) {
      var top = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; })[0];
      if (top) mark(top.target.id);
    }, { rootMargin: '0px 0px -70% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
})();
