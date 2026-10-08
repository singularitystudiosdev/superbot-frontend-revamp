// /account/usage dashboard behaviour, plain ES, no framework, no build step.
// The page is whole without this file (usage.ts renders every view from the
// URL query, bars and pager are real links, filters are GET forms); this adds:
//   1. the browser's time zone: the first load without tz= re-renders the
//      dashboard in place with tz=<Intl zone>, so hourly and daily buckets
//      are the reader's own hours (the server labels UTC until then);
//   2. the chart, redrawn in real pixels from the figure's JSON island
//      (script.ud-data): stacked segments with a 1px hairline between them and
//      only the top one rounded, the requests line thin and muted on its own
//      axis, legend toggles that hide a series and rescale both axes (on the
//      All AI scope they also persist per provider, see 4), and a
//      hover card beside the hovered column (never over it) with a full-height
//      band, the other columns dimmed and a dot on the requests line.
//      Input: mouse hover (a click drills into the column), keyboard (the plot
//      is focusable; Left/Right/Home/End move, Enter drills, Escape closes,
//      an aria-live line reads the column), touch (tap pins the card, tap
//      outside unpins; the pinned card carries the drill link);
//   3. in-place swaps for the date form, the filter form (a select applies on
//      change), the pager, the breakdown links and a column's drill: fetch the
//      page, replace each .usage-body region, re-sync every .sb-seg well's
//      links and current option, push the URL. seg.js does the same for the
//      segmented pickers and fires `usage:swapped`, which re-binds here.
//   4. the All AI scope (scope=all, the island's mode 'spend'): one colour per
//      provider, each provider's segment split by provenance, measured solid,
//      plan banded and estimated hatched (SVG pattern fills, one pair per
//      colour), no requests line, and a hover card that splits every provider
//      into measured, estimated and plan. A column is a day; it does not drill.
//      The legend persists per provider: the figure's data-hidden lists the
//      providers the account hides (the settings doc, usage-hidden.ts), a
//      toggle POSTs /account/usage/spend-hidden once per provider of the
//      series (the grey Other holds several) and is undone when the server
//      does not take it. A stored set that covers every listed provider is
//      ignored (nothing paints empty, every chip reads pressed), and a press
//      in that state stores exactly the pressed series. The Superbot scope's
//      series are keys and lanes, not providers, so its toggles stay local to
//      the page.
// Binds on load, on `usage:swapped`, and via window.usageBind() for the
// account rail's in-place page switch (shell.ts runScripts re-runs this file;
// document-level listeners register once behind window flags).
(function () {
  var state = window.__usageState || (window.__usageState = { seq: 0, pinned: null });

  // ---- numbers, the same forms usage.ts prints ------------------------------
  function fmtInt(v) { return Math.round(Number(v) || 0).toLocaleString('en-US'); }
  function fmtUsd(v) {
    v = Number(v) || 0;
    if (v === 0) return '$0.00';
    return v >= 0.01 ? '$' + v.toFixed(2) : '$' + v.toFixed(4);
  }
  function ticks(stop, count) {
    if (!(stop > 0) || !(count > 0)) return [0];
    var step = stop / count;
    var power = Math.floor(Math.log10(step));
    var err = step / Math.pow(10, power);
    var factor = err >= Math.sqrt(50) ? 10 : err >= Math.sqrt(10) ? 5 : err >= Math.sqrt(2) ? 2 : 1;
    var inc = power < 0 ? Math.pow(10, -power) / factor : Math.pow(10, power) * factor;
    var toVal = function (i) { return power < 0 ? i / inc : i * inc; };
    var i2 = power < 0 ? Math.round(stop * inc) : Math.round(stop / inc);
    if (toVal(i2) > stop) i2--;
    var out = [];
    for (var i = 0; i <= i2; i++) out.push(toVal(i));
    return out;
  }
  function valueTicks(max) {
    var t = ticks(max > 0 ? max : 1, 4);
    while (t.length > 5) t = t.filter(function (_, i) { return i % 2 === 0; });
    var inc = t.length > 1 ? t[1] - t[0] : 1;
    if (t[t.length - 1] < max) t.push(t[t.length - 1] + inc);
    return t;
  }
  function requestTicks(max) {
    var t = ticks(Math.max(1, max), 3).filter(function (v) { return Number.isInteger(v); });
    if (t.length < 2) t = [0, 1];
    var step = t[1] - t[0];
    while (t[t.length - 1] < max) t.push(t[t.length - 1] + step);
    while (t.length < 3) t.push(t[t.length - 1] + step);
    return t;
  }
  function fmtTick(v, unit) {
    if (v === 0) return unit === 'usd' ? '$0' : '0';
    if (unit === 'usd') return v >= 1 ? '$' + Math.round(v * 100) / 100 : '$' + v.toFixed(v >= 0.01 ? 2 : 4);
    if (v >= 1e6 && v % 1e6 === 0) return v / 1e6 + 'M';
    if (v >= 1e3 && v % 1e3 === 0) return fmtInt(v / 1e3) + 'k';
    return fmtInt(v);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---- the chart ---------------------------------------------------------------
  function Chart(fig) {
    var dataEl = fig.querySelector('script.ud-data');
    var plot = fig.querySelector('.ud-plot');
    if (!dataEl || !plot) return null;
    var d;
    try { d = JSON.parse(dataEl.textContent); } catch (e) { return null; }
    var svg = plot.querySelector('svg');
    var card = fig.querySelector('.ud-hc');
    var dock = fig.querySelector('.ud-dock');
    var live = fig.querySelector('.ud-live');
    var yAxis = fig.querySelector('.ud-y:not(.ud-y-r)');
    var rAxis = fig.querySelector('.ud-y-r');
    var n = d.b.length;
    var spend = d.mode === 'spend';
    var uid = 'udp' + (state.figs = (state.figs || 0) + 1);
    var hidden = {};
    var persisting = false;
    var active = -1;
    var pinned = false;
    var firstDraw = true;
    var lastPointer = 'mouse';
    var geom = null;
    var self = {};

    function cssPx(name, fallback) {
      var v = parseFloat(getComputedStyle(fig).getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    }
    function visible(k) { return !hidden[k]; }
    // the bill's name as the KPI strip spells it, so the card and the strip agree
    function billedLabel() {
      var dts = document.querySelectorAll('.ud-kpi dt');
      for (var i = 0; i < dts.length; i++) if (/^Billed/.test(dts[i].textContent)) return dts[i].textContent;
      return 'Billed Tokens';
    }
    function colSum(b) {
      var s = 0;
      for (var k = 0; k < b.v.length; k++) if (visible(k)) s += b.v[k];
      return s;
    }

    // Top-rounded bar: straight sides and bottom, radius r on the two top corners.
    function topRounded(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h));
      return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
        'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
    }

    function render() {
      var W = plot.clientWidth;
      var H = plot.clientHeight;
      if (!W || !H) return;
      var max = 0;
      for (var i = 0; i < n; i++) max = Math.max(max, colSum(d.b[i]));
      var yt = valueTicks(max);
      var ys = Math.max(yt[yt.length - 1], max, 1e-9);
      var rmax = 0;
      for (i = 0; i < n; i++) rmax = Math.max(rmax, d.b[i].req || 0);
      var rt = requestTicks(rmax);
      var rs = rt[rt.length - 1];
      var bw = W / n;
      var inset = Math.max(1, Math.min(bw * 0.14, cssPx('--sp-2', 8)));
      var barW = Math.max(1, bw - inset * 2);
      var radius = cssPx('--acct-r-control', 8);
      var hair = 1;
      var yOf = function (v) { return H - (v / ys) * H; };
      var out = [];
      yt.forEach(function (t) {
        var y = Math.round(yOf(t)) + 0.5;
        out.push('<line class="grid" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>');
      });
      out.push('<rect class="ud-band" x="0" y="0" width="' + bw.toFixed(2) + '" height="' + H + '"/>');
      if (spend) {
        var defs = [];
        d.series.forEach(function (sr, k) {
          defs.push('<pattern id="' + uid + '-h-' + k + '" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect class="pt-bg ' + sr.cls + '" width="6" height="6"/><rect class="pt-fg ' + sr.cls + '" width="2" height="6"/></pattern>');
          defs.push('<pattern id="' + uid + '-b-' + k + '" patternUnits="userSpaceOnUse" width="6" height="5"><rect class="pt-bg ' + sr.cls + '" width="6" height="5"/><rect class="pt-fg ' + sr.cls + '" width="6" height="2"/></pattern>');
        });
        out.unshift('<defs>' + defs.join('') + '</defs>');
      }
      for (i = 0; i < n; i++) {
        var b = d.b[i];
        var x = i * bw + inset;
        var y = H;
        var segs = [];
        var ks = [];
        for (var k = 0; k < b.v.length; k++) if (visible(k) && b.v[k] > 0) ks.push(k);
        ks.forEach(function (k, j) {
          var h = (b.v[k] / ys) * H;
          if (h < 1) h = 1;
          var top = y - h;
          var bottomGap = j > 0 ? hair : 0;
          var hh = Math.max(0.5, h - bottomGap);
          var cls = 'seg ' + d.series[k].cls;
          if (spend && b.p) {
            // measured, then plan, then estimated, flush inside the provider's
            // segment; only the column's topmost piece is rounded
            var parts = [[b.p[k][0], ''], [b.p[k][2], 'b'], [b.p[k][1], 'h']].filter(function (q) { return q[0] > 0; });
            var sum = parts.reduce(function (a, q) { return a + q[0]; }, 0) || 1;
            var py = top + hh;
            parts.forEach(function (q, qi) {
              var ph = (q[0] / sum) * hh;
              var pt = py - ph;
              var style = q[1] ? ' style="fill:url(#' + uid + '-' + q[1] + '-' + k + ')"' : '';
              var pc = q[1] ? 'seg pv' : cls;
              if (j === ks.length - 1 && qi === parts.length - 1) segs.push('<path class="' + pc + '"' + style + ' d="' + topRounded(x, pt, barW, ph, radius) + '"/>');
              else segs.push('<rect class="' + pc + '"' + style + ' x="' + x.toFixed(2) + '" y="' + pt.toFixed(2) + '" width="' + barW.toFixed(2) + '" height="' + Math.max(0.5, ph).toFixed(2) + '"/>');
              py = pt;
            });
          } else if (j === ks.length - 1) segs.push('<path class="' + cls + '" d="' + topRounded(x, top, barW, hh, radius) + '"/>');
          else segs.push('<rect class="' + cls + '" x="' + x.toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + barW.toFixed(2) + '" height="' + hh.toFixed(2) + '"/>');
          y = top;
        });
        out.push('<g class="col" data-i="' + i + '">' + segs.join('') + '</g>');
      }
      if (!spend) {
        var pts = [];
        for (i = 0; i < n; i++) pts.push(((i + 0.5) * bw).toFixed(2) + ',' + (H - (d.b[i].req / rs) * H).toFixed(2));
        out.push('<polyline class="ud-line" points="' + pts.join(' ') + '"/>');
        out.push('<circle class="ud-dot" cx="0" cy="0" r="' + (cssPx('--sp-1', 4) * 0.75) + '"/>');
      }
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.removeAttribute('preserveAspectRatio');
      svg.innerHTML = out.join('');
      plot.classList.toggle('is-enter', firstDraw);
      firstDraw = false;

      if (yAxis) yAxis.innerHTML = yt.map(function (t) {
        return '<span style="top:' + ((1 - t / ys) * 100).toFixed(2) + '%">' + fmtTick(t, d.unit) + '</span>';
      }).join('');
      if (rAxis && !spend) rAxis.innerHTML = rt.map(function (t) {
        return '<span style="top:' + ((1 - t / rs) * 100).toFixed(2) + '%">' + fmtTick(t, 'count') + '</span>';
      }).join('');
      geom = { W: W, H: H, bw: bw, rs: rs };
      if (active >= 0) show(active, true);
    }

    // The All AI card: one row per provider with its measured, estimated and
    // plan spend, largest first, then the day's total.
    function fillSpendCard(b) {
      var rows = [];
      for (var k = 0; k < b.v.length; k++) if (visible(k) && b.v[k] > 0) rows.push(k);
      if (!rows.length) {
        card.appendChild(el('p', 'ud-hc-none', 'No AI spend on this day.'));
        return;
      }
      rows.sort(function (a, c) { return b.v[c] - b.v[a]; });
      var grid = el('div', 'ud-hc-p');
      grid.setAttribute('role', 'table');
      var head = el('div', 'ud-hc-pr is-head');
      head.setAttribute('role', 'row');
      ['Provider', 'Measured', 'Estimated', 'Plan'].forEach(function (t) {
        var c = el('span', null, t);
        c.setAttribute('role', 'columnheader');
        head.appendChild(c);
      });
      grid.appendChild(head);
      rows.forEach(function (k) {
        var r = el('div', 'ud-hc-pr');
        r.setAttribute('role', 'row');
        var name = el('span', 'ud-hc-n');
        name.setAttribute('role', 'rowheader');
        name.appendChild(el('i', 'sw ' + d.series[k].cls));
        name.appendChild(el('span', null, d.series[k].label));
        r.appendChild(name);
        [b.p[k][0], b.p[k][1], b.p[k][2]].forEach(function (v) {
          var c = el('b', v > 0 ? null : 'is-zero', fmtUsd(v));
          c.setAttribute('role', 'cell');
          r.appendChild(c);
        });
        grid.appendChild(r);
      });
      card.appendChild(grid);
      var dl = el('dl', 'ud-hc-t is-total');
      dl.appendChild(el('dt', null, 'Total'));
      dl.appendChild(el('dd', null, fmtUsd(colSum(b))));
      card.appendChild(dl);
    }

    function fillCard(i) {
      var b = d.b[i];
      card.textContent = '';
      card.appendChild(el('p', 'ud-hc-h', b.h));
      if (spend) { fillSpendCard(b); return; }
      if (!b.req) {
        card.appendChild(el('p', 'ud-hc-none', 'No requests in this ' + d.bucket + '.'));
        return;
      }
      if (d.series.length > 1) {
        var sum = colSum(b);
        var rows = [];
        for (var k = 0; k < b.v.length; k++) if (visible(k) && b.r[k] > 0) rows.push(k);
        rows.sort(function (a, c) { return b.v[c] - b.v[a] || b.r[c] - b.r[a]; });
        var list = el('ul', 'ud-hc-s');
        rows.forEach(function (k) {
          var li = el('li');
          li.appendChild(el('i', 'sw ' + d.series[k].cls));
          li.appendChild(el('span', 'ud-hc-n', d.series[k].label));
          var notBilled = d.unit === 'usd' && b.nb[k];
          li.appendChild(el('b', null, notBilled ? 'not billed' : d.unit === 'usd' ? fmtUsd(b.v[k]) : fmtInt(b.v[k])));
          li.appendChild(el('em', null, notBilled || !(sum > 0) ? '' : Math.round((b.v[k] / sum) * 100) + '%'));
          list.appendChild(li);
        });
        card.appendChild(list);
      }
      // totals in pairs, three short rows: in beside out, cached beside the
      // bill, requests beside spend
      var dl = el('dl', 'ud-hc-t');
      [
        ['Tokens in', fmtInt(b.tin)],
        ['Tokens out', fmtInt(b.tout)],
        ['Cached', fmtInt(b.cache)],
        [billedLabel(), fmtInt(b.billed)],
        ['Requests', fmtInt(b.req)],
        ['Spend', b.usd],
      ].forEach(function (row) {
        dl.appendChild(el('dt', null, row[0]));
        dl.appendChild(el('dd', null, row[1]));
      });
      card.appendChild(dl);
      var go = el('a', 'ud-hc-go', d.bucket === 'day' ? 'Open this day by hour' : 'Open these requests');
      go.href = b.href;
      go.setAttribute('data-usage-link', '');
      go.addEventListener('click', function (e) { e.preventDefault(); hide(); drill(b.href); });
      card.appendChild(go);
    }

    // Beside the column: its right side first, its left side when the right
    // runs out, docked under the chart when neither side fits (a phone).
    function placeCard(i) {
      var gap = cssPx('--sp-2', 8);
      var gl = yAxis ? yAxis.offsetWidth : 0;
      var gr = rAxis ? rAxis.offsetWidth : 0;
      if (card.parentNode !== plot) plot.appendChild(card);
      card.classList.remove('is-docked');
      card.style.left = '0px';
      var cw = card.offsetWidth;
      var right = (i + 1) * geom.bw + gap;
      var left = i * geom.bw - gap - cw;
      var fits = true;
      if (right + cw <= geom.W + gr) card.style.left = right + 'px';
      else if (left >= -gl) card.style.left = left + 'px';
      else fits = false;
      // Vertically: from the plot's top, lifted (up to the legend) when the
      // card is taller than the plot so it never runs past the x axis.
      var ch = card.offsetHeight;
      var xAxis = fig.querySelector('.ud-x');
      var floor = geom.H + (xAxis ? xAxis.offsetHeight : 0);
      var legend = fig.querySelector('.ud-legend');
      // The legend sits beside or under the plot now; only a legend above it
      // (none today) leaves room to lift the card into.
      var ceil = legend && legend.getBoundingClientRect().bottom <= plot.getBoundingClientRect().top + 1 ? -legend.offsetHeight : 0;
      var top = Math.min(0, floor - ch);
      if (top < ceil) fits = false;
      if (!fits) {
        card.style.left = '';
        card.style.top = '';
        card.classList.add('is-docked');
        dock.appendChild(card);
        return;
      }
      card.style.top = top + 'px';
    }

    function show(i, quiet) {
      if (!geom) return;
      i = Math.max(0, Math.min(n - 1, i));
      var changed = i !== active;
      active = i;
      plot.classList.add('is-hover');
      svg.querySelectorAll('.col').forEach(function (g) { g.classList.toggle('is-on', Number(g.getAttribute('data-i')) === i); });
      var band = svg.querySelector('.ud-band');
      if (band) band.setAttribute('x', (i * geom.bw).toFixed(2));
      var dot = svg.querySelector('.ud-dot');
      if (dot && !spend) {
        dot.setAttribute('cx', ((i + 0.5) * geom.bw).toFixed(2));
        dot.setAttribute('cy', (geom.H - (d.b[i].req / geom.rs) * geom.H).toFixed(2));
      }
      fillCard(i);
      card.hidden = false;
      card.classList.toggle('is-pinned', pinned);
      placeCard(i);
      if (live && changed && !quiet) {
        var b = d.b[i];
        live.textContent = spend
          ? b.h + ': ' + fmtUsd(colSum(b)) + ' across every provider.'
          : b.h + ': ' + (d.unit === 'usd' ? fmtUsd(colSum(b)) : fmtInt(colSum(b)) + ' ' + d.word) + ', ' + fmtInt(b.req) + ' Requests.';
      }
    }

    function hide() {
      active = -1;
      pinned = false;
      if (state.pinned === self) state.pinned = null;
      plot.classList.remove('is-hover');
      card.hidden = true;
      card.classList.remove('is-pinned');
      if (card.parentNode !== plot) plot.appendChild(card);
    }

    function indexAt(e) {
      var r = plot.getBoundingClientRect();
      var x = (e.clientX - r.left) / (r.width || 1);
      return Math.max(0, Math.min(n - 1, Math.floor(x * n)));
    }

    plot.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
    plot.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || pinned || card.contains(e.target)) return;
      show(indexAt(e));
    });
    plot.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch' || pinned) return;
      if (document.activeElement !== plot) hide();
    });
    plot.addEventListener('click', function (e) {
      if (card.contains(e.target)) return;
      var i = indexAt(e);
      if (lastPointer === 'touch' || lastPointer === 'pen') {
        if (pinned && active === i) { hide(); return; }
        pinned = true;
        state.pinned = self;
        show(i);
        return;
      }
      if (!spend) drill(d.b[i].href);
    });
    plot.addEventListener('focus', function () {
      // keyboard focus only: a mouse press also focuses the plot, and its own
      // pointer position already chose the column
      var kb = true;
      try { kb = plot.matches(':focus-visible'); } catch (err) { kb = true; }
      if (!kb || active >= 0) return;
      var start = n - 1;
      for (var i = n - 1; i >= 0; i--) if (spend ? colSum(d.b[i]) > 0 : d.b[i].req > 0) { start = i; break; }
      show(start);
    });
    plot.addEventListener('blur', function (e) {
      if (pinned || (e.relatedTarget && card.contains(e.relatedTarget))) return;
      hide();
    });
    plot.addEventListener('keydown', function (e) {
      var i = active < 0 ? n - 1 : active;
      if (e.key === 'ArrowRight') i++;
      else if (e.key === 'ArrowLeft') i--;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = n - 1;
      else if (e.key === 'Escape') { hide(); return; }
      else if (e.key === 'Enter' && active >= 0 && !spend) { e.preventDefault(); drill(d.b[active].href); return; }
      else return;
      e.preventDefault();
      show(i);
    });

    // The legend chip of series k mirrors hidden[k]: pressed means drawn.
    function paintChip(btn, k) {
      btn.setAttribute('aria-pressed', hidden[k] ? 'false' : 'true');
      (btn.closest('tr') || btn.parentNode).classList.toggle('is-off', Boolean(hidden[k]));
    }
    // Spend only: seed hidden from the figure's data-hidden (the providers the
    // account hides). `stored` is that set as the account holds it, kept in step
    // with every toggle the server takes. effectiveHidden is the ONE place the
    // rule lives: a series is hidden when it has providers and every one is
    // stored; when that would hide every series the stored set COVERS every
    // listed provider (a stale union: device A hid openai, device B hid
    // anthropic), it is ignored, nothing paints empty and every chip reads
    // pressed (the desktop's visibleSpend / effectiveHidden rule).
    var stored = {};
    var covered = false;
    function effectiveHidden(series, ids) {
      var set = {};
      ids.forEach(function (id) { set[id] = true; });
      var out = {};
      var count = 0;
      series.forEach(function (sr, k) {
        var own = sr.ids || [];
        if (own.length && own.every(function (id) { return set[id]; })) { out[k] = true; count++; }
      });
      return count >= series.length ? { hidden: {}, covered: series.length > 0 } : { hidden: out, covered: false };
    }
    if (spend) {
      var seed = [];
      try { seed = JSON.parse(fig.getAttribute('data-hidden') || '[]'); } catch (e) { console.error('usage chart: data-hidden is not JSON', e); }
      if (!Array.isArray(seed)) seed = [];
      seed = seed.filter(function (id) { return typeof id === 'string'; });
      seed.forEach(function (id) { stored[id] = true; });
      var effective = effectiveHidden(d.series, seed);
      hidden = effective.hidden;
      covered = effective.covered;
    }

    fig.querySelectorAll('button.ud-leg').forEach(function (btn) {
      if (spend) paintChip(btn, Number(btn.getAttribute('data-series')));
      btn.addEventListener('click', function () {
        var k = Number(btn.getAttribute('data-series'));
        if (persisting) return; // the last toggle is still on its way to the server
        if (!hidden[k]) {
          var shown = 0;
          for (var j = 0; j < d.series.length; j++) if (visible(j)) shown++;
          if (shown <= 1) return; // one series always stays drawn
        }
        hidden[k] = !hidden[k];
        paintChip(btn, k);
        render();
        if (spend) persist(btn, k, covered);
      });
    });

    // Spend only: write the toggle to the account, one POST per provider of the
    // series. A press that hides a series while the stored set covers every
    // provider (`wasCovered`) stores exactly that series: the rest of the stale
    // cover (a provider this chart does not list included) is shown again in the
    // same go, or the cover would outlive the press and swallow it on the next
    // load and on every other device. Anything short of every POST taking undoes
    // the toggle on the page, so a chip never claims a state the server does not
    // hold.
    function persist(btn, k, wasCovered) {
      var ids = (d.series[k] && d.series[k].ids) || [];
      var want = Boolean(hidden[k]);
      if (!ids.length) return;
      var writes = ids.map(function (id) { return { provider: id, hidden: want }; });
      if (wasCovered && want) {
        Object.keys(stored).sort().forEach(function (id) {
          if (ids.indexOf(id) < 0) writes.push({ provider: id, hidden: false });
        });
      }
      persisting = true;
      Promise.all(writes.map(function (w) {
        return fetch('/account/usage/spend-hidden', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(w)
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + w.provider);
        });
      })).then(function () {
        persisting = false;
        if (wasCovered && want) stored = {};
        covered = false;
        ids.forEach(function (id) { if (want) stored[id] = true; else delete stored[id]; });
      }, function (err) {
        console.error('usage chart: the legend toggle was not saved', err);
        persisting = false;
        hidden[k] = !want;
        paintChip(btn, k);
        render();
      });
    }

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { render(); }).observe(plot);
    self.render = render;
    self.hide = hide;
    self.owns = function (node) { return plot.contains(node) || (dock && dock.contains(node)); };
    render();
    return self;
  }

  // ---- in-place swaps ------------------------------------------------------------
  function syncWells(doc) {
    var wells = document.querySelectorAll('[data-seg]');
    var next = doc.querySelectorAll('[data-seg]');
    for (var w = 0; w < wells.length && w < next.length; w++) {
      var opts = wells[w].querySelectorAll('a.sb-seg-opt');
      var nextOpts = next[w].querySelectorAll('a.sb-seg-opt');
      for (var o = 0; o < opts.length && o < nextOpts.length; o++) {
        opts[o].href = nextOpts[o].href;
        if (nextOpts[o].hasAttribute('aria-current')) opts[o].setAttribute('aria-current', 'page');
        else opts[o].removeAttribute('aria-current');
      }
      // seg.js re-places its thumb on a 'change' from inside the well.
      wells[w].dispatchEvent(new Event('change'));
    }
  }

  // Fetch the page for `url`, swap every .usage-body in place, push the URL.
  // The latest request wins; any failure falls back to a plain navigation.
  function swapTo(url, opts) {
    opts = opts || {};
    if (typeof fetch !== 'function' || typeof DOMParser !== 'function') { location.assign(url); return; }
    var mine = ++state.seq;
    var dash = document.querySelector('[data-usage]');
    if (dash) dash.setAttribute('aria-busy', 'true');
    fetch(url, { credentials: 'same-origin', headers: { accept: 'text/html' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        if (mine !== state.seq) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var live = document.querySelectorAll('.usage-body');
        var next = doc.querySelectorAll('.usage-body');
        if (!next.length) throw new Error('no dashboard in the fetched page');
        for (var i = 0; i < live.length && i < next.length; i++) live[i].innerHTML = next[i].innerHTML;
        var nextDash = doc.querySelector('[data-usage]');
        if (dash && nextDash) {
          dash.setAttribute('data-tz', nextDash.getAttribute('data-tz') || 'UTC');
          dash.setAttribute('data-tz-set', nextDash.getAttribute('data-tz-set') || '0');
        }
        syncWells(doc);
        if (opts.replace) history.replaceState({ usage: true }, '', url);
        else history.pushState({ usage: true }, '', url);
        window.__segSwapped = true;
        state.pinned = null;
        bind();
        var hash = new URL(url, location.href).hash;
        var target = hash && document.getElementById(hash.slice(1));
        if (target) target.scrollIntoView({ block: 'start' });
      })
      .catch(function (err) {
        if (mine !== state.seq) return;
        console.error('usage: in-place swap failed, navigating instead', err);
        location.assign(url);
      })
      .then(function () { if (dash && mine === state.seq) dash.removeAttribute('aria-busy'); });
  }
  function drill(url) { swapTo(url); }

  // The dash's loading state: aria-busy plus one status line (spinner and a
  // word) the busy CSS shows in the card's top-right corner.
  function setBusy(on, text) {
    var dash = document.querySelector('[data-usage]');
    if (!dash) return;
    if (!on) { dash.removeAttribute('aria-busy'); return; }
    var note = dash.querySelector('.ud-busy-note');
    if (!note) {
      note = el('span', 'ud-busy-note');
      note.setAttribute('role', 'status');
      note.appendChild(el('i'));
      note.appendChild(el('span'));
      dash.appendChild(note);
    }
    note.lastChild.textContent = text || 'Loading';
    dash.setAttribute('aria-busy', 'true');
  }

  function formUrl(form) {
    var u = new URL(form.getAttribute('action') || location.pathname, location.href);
    u.search = '';
    new FormData(form).forEach(function (v, k) { if (v !== '') u.searchParams.set(k, String(v)); });
    return u.toString();
  }

  function plainClick(e) {
    return !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
  }

  function withTz(url, tz) {
    var u = new URL(url, location.href);
    u.searchParams.set('tz', tz);
    return u.toString();
  }

  function bind() {
    var dash = document.querySelector('[data-usage]');
    if (!dash) return;

    document.querySelectorAll('figure[data-chart]').forEach(function (fig) {
      if (fig.__udChart) { fig.__udChart.render(); return; }
      fig.__udChart = Chart(fig) || { render: function () {} };
    });

    document.querySelectorAll('.usage-body form[data-usage-form]').forEach(function (form) {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        swapTo(formUrl(form));
      });
      form.querySelectorAll('[data-autosubmit]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          if (form.requestSubmit) form.requestSubmit(); else swapTo(formUrl(form));
        });
      });
    });

    document.querySelectorAll('.usage-body a[data-usage-link], .usage-body a.ud-bname').forEach(function (link) {
      if (link.dataset.bound || link.classList.contains('ud-hc-go')) return;
      link.dataset.bound = '1';
      link.addEventListener('click', function (e) {
        if (!plainClick(e)) return;
        e.preventDefault();
        swapTo(link.href);
      });
    });

    // The reader's zone: once per page, only while the server is still on its
    // UTC default. A zone the server refuses comes back unset and is not
    // retried (the flag remembers the attempt).
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    if (tz && dash.getAttribute('data-tz-set') !== '1' && window.__usageTzTried !== location.href) {
      window.__usageTzTried = location.href;
      swapTo(withTz(location.href, tz), { replace: true });
    }
  }

  if (!window.__usageDocBound) {
    window.__usageDocBound = true;
    // a tap outside the pinned chart unpins its card
    document.addEventListener('click', function (e) {
      if (state.pinned && !state.pinned.owns(e.target)) state.pinned.hide();
    });
    document.addEventListener('usage:swapped', function () { state.pinned = null; setBusy(false); bind(); });
    // Any view change (the scope, a range, a picker, a date form, a drill) is
    // marked busy on the click itself, before seg.js or swapTo fetches or the
    // browser navigates: the All AI report takes seconds, and a page that just
    // sits there reads as frozen. usage.css draws the bar and shimmer.
    document.addEventListener('click', function (e) {
      if (!plainClick(e) || !e.target.closest) return;
      var a = e.target.closest('.usage-dash a.sb-seg-opt, .usage-dash a[data-usage-link], .usage-dash a.ud-bname');
      if (!a || a.getAttribute('aria-current') === 'page') return;
      setBusy(true, a.closest('.ud-scope') ? 'Loading all AI spend' : 'Loading');
    }, true);
    document.addEventListener('submit', function (e) {
      if (e.target.closest && e.target.closest('.usage-dash')) setBusy(true, 'Loading');
    }, true);
    // back from a full navigation restores the page from cache still busy
    window.addEventListener('pageshow', function () { setBusy(false); });
    window.addEventListener('popstate', function () { if (window.__segSwapped) location.reload(); });
  }
  window.usageBind = bind;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
