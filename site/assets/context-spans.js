// context-spans.js: the block-level context splitter for the web chat
// (site/assets/chat.js) and the rooms hub (frontends/rooms/panels/room.js,
// panels/superbot.js). Plain JS, no deps, no DOM, no build step.
//
// Provenance: a port of superbot-desktop
// packages/core/src/vendor/context-spans.ts. The splitter's semantics are
// IDENTICAL to that file (same deny list, same bracket-marker allowlist, same
// fence, close and AGENTS.md header rules, same trimming); its test cases are
// replayed in site/assets/context-spans.test.mjs. Change the desktop file
// first, then this one.
//
// Why it exists: the superbot Helper prefixes a Claude or hosted-agent first
// prompt with `[workspace map]` ... `[/workspace map]` (and `[code index]`
// ... `[/code index]`), and vendor turns carry whole-line
// `<system-reminder>` ... `</system-reminder>` style spans. A person must
// never see injected context as if they had typed it: titles, bubbles, copy
// and share read humanProse(text).
//
// Loading: this ONE file is a classic script that attaches
// globalThis.SbContextSpans. It is byte-identical in two places, because the
// two runtimes are served from different roots:
//   site/assets/context-spans.js     edge /site/assets/, loaded by chat.js via
//                                    import() for its side effect
//   frontends/rooms/context-spans.js rooms sidecar and file://, a plain
//                                    <script> tag in frontends/rooms/index.html
// context-spans.test.mjs pins the two copies byte for byte.
//
// Beyond the port, two small helpers mirror the desktop fold's summary
// (apps/desktop/src/renderer/src/hub/vendor/workspace-map.ts parseWorkspaceMap
// fileCount, and VendorMessageBody.tsx ContextRow): workspaceMapFileCount and
// contextSummary.
(function (root) {
  'use strict';

  // Human HTML a person writes in their own message never opens a context
  // span; only the machine-injected vendor tags survive. Anything outside this
  // list is treated as context (the vendor set is open-ended).
  var DENY = {};
  ['br', 'b', 'i', 'em', 'strong', 'code', 'pre', 'span', 'div', 'p', 'a', 'ul', 'ol', 'li',
    'table', 'tr', 'td', 'th', 'blockquote', 'details', 'summary', 'img', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(function (n) { DENY[n] = true; });

  // A fence line: up to three leading spaces, then three or more backticks or
  // tildes. Toggles fence state; a line inside a fence is never a tag line.
  var FENCE_RE = /^[ \t]{0,3}(?:`{3,}|~{3,})/;

  // An opening tag as the first non-whitespace token of a line. Group 1 is the
  // name, group 2 is everything between it and the first `>`.
  var OPEN_RE = /^[ \t]*<([A-Za-z][\w-]*)([^<>]*)>/;

  // The Codex turn opens with a plain-text header line rather than a tag; when
  // an <INSTRUCTIONS> span follows it (blank lines allowed) the header belongs
  // to it.
  var AGENTS_HEADER_RE = /^# AGENTS\.md instructions/;

  // The Helper's bracket markers: an allowlist, never a pattern.
  var BRACKET_MARKERS = { 'workspace map': true, 'code index': true };

  // A bracket opening marker as the first token of a line. Group 1 is the name.
  var BRACKET_OPEN_RE = /^[ \t]*\[([a-z][a-z ]*[a-z])\]/;

  var has = function (set, key) { return Object.prototype.hasOwnProperty.call(set, key); };

  // The offset just past `[/name]` at or after `from`, or null when unclosed.
  function findBracketClose(text, from, name) {
    var marker = '[/' + name + ']';
    var at = text.indexOf(marker, from);
    return at < 0 ? null : at + marker.length;
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // The tag as written: the name plus any bare header words. A tag carrying
  // `=` attributes contributes its name only.
  function headerOf(name, rest) {
    var cleaned = rest.replace(/\/\s*$/, '').trim();
    if (cleaned === '' || cleaned.indexOf('=') !== -1) return name;
    var words = cleaned.split(/\s+/).filter(function (w) { return w.length > 0; });
    return [name].concat(words).join(' ');
  }

  // Depth-count to the matching close of the SAME header (case-insensitive).
  function findClose(text, from, header) {
    var words = header.split(/\s+/).filter(function (w) { return w.length > 0; });
    var head = words.map(escapeRe).join('\\s+');
    var openRe = new RegExp('<' + head + '(?=[\\s/>])', 'gi');
    var closeRe = new RegExp('</' + head + '\\s*>', 'gi');
    var depth = 1;
    var pos = from;
    while (pos <= text.length) {
      openRe.lastIndex = pos;
      closeRe.lastIndex = pos;
      var open = openRe.exec(text);
      var close = closeRe.exec(text);
      if (close === null) return null;
      if (open !== null && open.index < close.index) {
        depth += 1;
        pos = open.index + open[0].length;
      } else {
        depth -= 1;
        if (depth === 0) return close.index + close[0].length;
        pos = close.index + close[0].length;
      }
    }
    return null;
  }

  function pushProse(out, raw) {
    var trimmed = raw.trim();
    if (trimmed !== '') out.push({ kind: 'prose', text: trimmed });
  }

  // Ordered segments: { kind: 'prose', text } | { kind: 'context', tag, text }.
  // A context segment's text is the raw span, tags included.
  function splitContextSpans(text) {
    text = String(text == null ? '' : text);
    if (text.indexOf('</') === -1 && text.indexOf('[/') === -1) return [{ kind: 'prose', text: text }];

    var norm = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var lines = norm.split('\n');

    var starts = new Array(lines.length);
    var offset = 0;
    for (var k = 0; k < lines.length; k++) {
      starts[k] = offset;
      offset += lines[k].length + 1;
    }

    var out = [];
    var proseStart = 0;
    var inFence = false;
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      var lineStart = starts[i];

      if (FENCE_RE.test(line)) {
        inFence = !inFence;
        i += 1;
        continue;
      }
      if (inFence) {
        i += 1;
        continue;
      }

      var spanStart = -1;
      var openEnd = -1;
      var header = '';
      var bracket = false;

      var open = OPEN_RE.exec(line);
      var bracketOpen = open === null ? BRACKET_OPEN_RE.exec(line) : null;
      if (bracketOpen !== null && has(BRACKET_MARKERS, bracketOpen[1])) {
        spanStart = lineStart;
        openEnd = lineStart + bracketOpen[0].length;
        header = bracketOpen[1];
        bracket = true;
      } else if (open !== null) {
        var name = open[1];
        if (!has(DENY, name.toLowerCase())) {
          spanStart = lineStart;
          openEnd = lineStart + open[0].length;
          header = headerOf(name, open[2]);
        }
      } else if (AGENTS_HEADER_RE.test(line)) {
        var n = i + 1;
        while (n < lines.length && lines[n].trim() === '') n += 1;
        if (n < lines.length) {
          var inner = OPEN_RE.exec(lines[n]);
          if (inner !== null) {
            var innerName = inner[1];
            if (innerName.toLowerCase() === 'instructions' && !has(DENY, 'instructions')) {
              spanStart = lineStart;
              openEnd = starts[n] + inner[0].length;
              header = headerOf(innerName, inner[2]);
            }
          }
        }
      }

      if (spanStart < 0) {
        i += 1;
        continue;
      }

      var close = bracket ? findBracketClose(norm, openEnd, header) : findClose(norm, openEnd, header);
      if (close === null) {
        // Unclosed candidate: not a span, never swallow to the end.
        i += 1;
        continue;
      }

      pushProse(out, norm.slice(proseStart, spanStart));
      out.push({ kind: 'context', tag: header, text: norm.slice(spanStart, close) });
      proseStart = close;

      // Resume on the line after the one the close lands on.
      var last = i;
      while (last + 1 < lines.length && starts[last + 1] <= close) last += 1;
      i = last + 1;
    }

    pushProse(out, norm.slice(proseStart));
    return out;
  }

  // Just the context segments, in order: the list a fold renders.
  function contextBlocks(segments) {
    var out = [];
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (s.kind === 'context') out.push({ tag: s.tag, text: s.text });
    }
    return out;
  }

  // The human's own words with every context span cut out, paragraphs kept
  // apart. What a title, preview, bubble, copy or share reads.
  function humanProse(text) {
    var prose = [];
    var segs = splitContextSpans(text);
    for (var i = 0; i < segs.length; i++) if (segs[i].kind === 'prose') prose.push(segs[i].text);
    return prose.join('\n\n');
  }

  // ---- fold summary helpers (desktop workspace-map.ts / ContextRow) ----

  var MAP_FILE_RE = /^(.+) \((\d+)b\)$/;
  var MAP_TRIMMED_RE = /^\[trimmed (\d+) files?\]$/;
  var MAP_ROOT_RE = /^# (.+)$/;

  // Files in a raw `[workspace map]` span (markers and fence included). The
  // Helper writes a file as `name (1234b)`, a directory as `name/`, a symbol
  // as a bare name one level under its file, a root as `# /abs`, and ends with
  // `[trimmed N files]`. When the tree carries sizes, only sized lines count
  // (desktop parseWorkspaceMap's fileCount). A tree with no size on any line
  // (hand-written or older) counts every line that is not a directory, root,
  // marker or trailer.
  function workspaceMapFileCount(raw) {
    var lines = String(raw == null ? '' : raw).replace(/\r\n?/g, '\n').split('\n');
    var sized = 0;
    var bare = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var body = line.trim();
      if (body === '' || body === '[workspace map]' || body === '[/workspace map]') continue;
      if (/^[ \t]*(?:`{3,}|~{3,})/.test(line)) continue;
      if (MAP_TRIMMED_RE.test(body)) continue;
      if (line === line.trimStart() && MAP_ROOT_RE.test(body)) continue;
      if (body.length > 1 && body.charAt(body.length - 1) === '/') continue;
      if (MAP_FILE_RE.test(body)) sized += 1;
      bare += 1;
    }
    return sized > 0 ? sized : bare;
  }

  // The fold's one-line summary: "Workspace map · N files" when every block is
  // the Helper's map, else "Context · N lines" over the blocks' raw text.
  function contextSummary(blocks) {
    if (!blocks || !blocks.length) return '';
    var allMap = blocks.every(function (b) { return b.tag === 'workspace map'; });
    if (allMap) {
      var files = 0;
      blocks.forEach(function (b) { files += workspaceMapFileCount(b.text); });
      return 'Workspace map · ' + files + (files === 1 ? ' file' : ' files');
    }
    var joined = blocks.map(function (b) { return b.text; }).join('\n');
    var count = joined === '' ? 0 : joined.split('\n').length;
    return 'Context · ' + count + (count === 1 ? ' line' : ' lines');
  }

  var api = {
    splitContextSpans: splitContextSpans,
    contextBlocks: contextBlocks,
    humanProse: humanProse,
    workspaceMapFileCount: workspaceMapFileCount,
    contextSummary: contextSummary
  };
  root.SbContextSpans = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
