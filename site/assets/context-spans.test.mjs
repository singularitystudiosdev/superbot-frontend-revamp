// Verification for site/assets/context-spans.js and its byte-identical twin
// frontends/rooms/context-spans.js: the desktop splitter's own cases
// (superbot-desktop packages/core/src/vendor/context-spans.test.ts, replayed
// 1:1 so the port's semantics stay identical), the fold summary, and the
// acceptance this port exists for: a Helper map-prefixed first prompt shows
// only the human's words, with a "Workspace map · N files" fold.
//
//   node --test site/assets/context-spans.test.mjs
//
// Each copy is evaluated as the classic script the browser loads, in a fresh
// vm context, so the test proves the globalThis.SbContextSpans contract that
// chat.js (import() for side effect) and the rooms panels (<script> tag) read.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
// The ratio helper is a .ts module and `node` cannot load it directly; `test:root` runs this file with
// plain `node --test`, so tsx is registered at runtime and the helper is dynamic-imported (top-level
// await is fine in an .mjs module). One shared ratio rule, never a second copy.
import { register } from 'tsx/esm/api';
register();
const { growthOver, describeGrowth } = await import('../../edge/test/lib/growth.js');

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const SITE = join(repo, 'site', 'assets', 'context-spans.js');
const ROOMS = join(repo, 'frontends', 'rooms', 'context-spans.js');

const load = (path) => {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(path, 'utf8'), ctx, { filename: path });
  assert.ok(ctx.SbContextSpans, `${path} attaches globalThis.SbContextSpans`);
  return ctx.SbContextSpans;
};
// vm objects come from another realm: compare as plain JSON data.
const plain = (v) => JSON.parse(JSON.stringify(v));

test('the rooms copy is byte-identical to the site copy', () => {
  assert.equal(readFileSync(ROOMS, 'utf8'), readFileSync(SITE, 'utf8'));
});

for (const [label, path] of [['site', SITE], ['rooms', ROOMS]]) {
  const { splitContextSpans: raw, contextBlocks: rawBlocks, humanProse, contextSummary, workspaceMapFileCount } = load(path);
  const split = (t) => plain(raw(t));
  const blocks = (t) => plain(rawBlocks(raw(t)));

  const SPAN_3 = '<system-reminder>\nBe brief.\n</system-reminder>';
  const PROSE_3 = 'How do I center a div?';

  describe(`${label}: splitContextSpans (desktop cases)`, () => {
    test('(1) leaves plain prose as one segment identical to the input', () => {
      const text = 'How do I center a div?';
      assert.deepEqual(split(text), [{ kind: 'prose', text }]);
    });
    test('(2) reads a wrapper-only span as one context segment', () => {
      const text = '<skills_instructions>\nFollow the skill.\n</skills_instructions>';
      assert.deepEqual(split(text), [{ kind: 'context', tag: 'skills_instructions', text }]);
    });
    test('(3) splits a leading span off the prose that follows it', () => {
      assert.deepEqual(split(`${SPAN_3}\n${PROSE_3}`), [
        { kind: 'context', tag: 'system-reminder', text: SPAN_3 },
        { kind: 'prose', text: PROSE_3 },
      ]);
    });
    test('(4) splits prose ahead of a span', () => {
      assert.deepEqual(split(`Here you go.\n${SPAN_3}`), [
        { kind: 'prose', text: 'Here you go.' },
        { kind: 'context', tag: 'system-reminder', text: SPAN_3 },
      ]);
    });
    test('(5) leaves an inline tag mid-sentence as prose', () => {
      const text = 'Wrap the word <b>bold</b> in a tag.';
      assert.deepEqual(split(text), [{ kind: 'prose', text }]);
    });
    test('(6) leaves a lone <br> line as prose', () => {
      assert.deepEqual(split('<br>'), [{ kind: 'prose', text: '<br>' }]);
    });
    test('(7) leaves an unclosed candidate as prose, folding nothing', () => {
      const text = '<skills_instructions>\nDo the thing.';
      assert.deepEqual(split(text), [{ kind: 'prose', text }]);
    });
    test('(8) leaves markup inside a fenced code block as prose', () => {
      const text = '```html\n<div>\nhi\n</div>\n```';
      assert.deepEqual(split(text), [{ kind: 'prose', text }]);
    });
    test('(9) counts nested same-name depth to ONE context segment', () => {
      const text = ['<system-reminder>', '<system-reminder>', 'inner', '</system-reminder>', '</system-reminder>'].join('\n');
      assert.deepEqual(split(text), [{ kind: 'context', tag: 'system-reminder', text }]);
    });
    test('(10) keeps prose that follows the close on the SAME line', () => {
      assert.deepEqual(split(`${SPAN_3} and also this`), [
        { kind: 'context', tag: 'system-reminder', text: SPAN_3 },
        { kind: 'prose', text: 'and also this' },
      ]);
    });
    test('(11) treats CRLF input identically to LF', () => {
      const crlf = `${SPAN_3}\n${PROSE_3}`.replace(/\n/g, '\r\n');
      assert.deepEqual(split(crlf), split(`${SPAN_3}\n${PROSE_3}`));
    });
    test('(12) keeps space-separated header words in the tag', () => {
      const text = '<permissions instructions>\nallow network\n</permissions instructions>';
      assert.deepEqual(split(text), [{ kind: 'context', tag: 'permissions instructions', text }]);
    });
    test('(13) reads the Codex turn as three context segments and no prose', () => {
      const text = [
        '<recommended_plugins>', 'plugin-a', '</recommended_plugins>', '',
        '# AGENTS.md instructions for /x', '',
        '<INSTRUCTIONS>', 'Be nice.', '</INSTRUCTIONS>', '',
        '<environment_context>', 'cwd: /x', '</environment_context>',
      ].join('\n');
      const segments = split(text);
      assert.deepEqual(segments.map((s) => (s.kind === 'context' ? s.tag : s.kind)),
        ['recommended_plugins', 'INSTRUCTIONS', 'environment_context']);
      assert.ok(segments.every((s) => s.kind === 'context'));
      assert.equal(segments[1].text.startsWith('# AGENTS.md instructions for /x'), true);
    });
    test('(14) never opens a span on a denied human HTML name', () => {
      const div = '<div>\nhi\n</div>';
      assert.deepEqual(split(div), [{ kind: 'prose', text: div }]);
      const anchors = '<a>\n<a>\n</a>\n</a>';
      assert.deepEqual(split(anchors), [{ kind: 'prose', text: anchors }]);
    });
    test('(15) splits a span body in linear time', () => {
      // LOAD ARTIFACT: the body grows with `n`, so it is measured as an Nx growth ratio between two
      // sizes, never against a fixed ms budget — a wall-clock cap measures the box's load, not the
      // splitter. The regression that survives: a quadratic scan of a long body cost ~100x for 10x the
      // text and trips the ratio bound (or the 1000 ms backstop, which fails a runaway whatever its
      // ratio). The shape assertions below are kept: the large run is still one whole context span.
      const make = (n) => `<system-reminder>\n${'x'.repeat(n)}\n</system-reminder>`;
      const g = growthOver((t) => split(t), make, [4_000_000, 40_000_000]);
      assert.equal(g.last.length, 1);
      assert.equal(g.last[0].kind, 'context');
      assert.equal(g.last[0].text, make(40_000_000));
      assert.ok(g.linear, `splits a span body in linear time: ${describeGrowth(g, 'small', 'large')}`);
    });
  });

  describe(`${label}: Helper bracket markers (desktop cases)`, () => {
    const MAP = ['[workspace map]', '```', 'src/', '  main.ts (2048b)', '[trimmed 0 files]', '```', '[/workspace map]'].join('\n');
    test('(16) reads a [workspace map] span, fence inside, as one context segment', () => {
      assert.deepEqual(split(`${MAP}\nwhat're some hot stocks`), [
        { kind: 'context', tag: 'workspace map', text: MAP },
        { kind: 'prose', text: "what're some hot stocks" },
      ]);
    });
    test('(17) splits prose ahead of the map and a <tag> span after it', () => {
      assert.deepEqual(split(`Before.\n${MAP}\n${SPAN_3}\nAfter.`).map((s) => (s.kind === 'context' ? s.tag : s.text)),
        ['Before.', 'workspace map', 'system-reminder', 'After.']);
    });
    test('(18) reads the inline [code index] marker as a span', () => {
      const line = '[code index] 12 files, 40 symbols, top dirs: src [/code index]';
      assert.deepEqual(split(`${line}\nhi`), [
        { kind: 'context', tag: 'code index', text: line },
        { kind: 'prose', text: 'hi' },
      ]);
    });
    test('(19) never opens a span on a bracket name outside the allowlist', () => {
      const text = '[note]\nremember the milk\n[/note]';
      assert.deepEqual(split(text), [{ kind: 'prose', text }]);
      const box = '[x] done\n[ ] todo';
      assert.deepEqual(split(box), [{ kind: 'prose', text: box }]);
    });
    test('(20) leaves an unclosed [workspace map] as prose', () => {
      const text = '[workspace map]\n```\nsrc/\n```\nwhat now';
      assert.deepEqual(split(text), [{ kind: 'prose', text }]);
    });
    test('(21) leaves a marker mid-sentence or inside a fence as prose', () => {
      const mid = 'the [workspace map] block [/workspace map] is odd';
      assert.deepEqual(split(mid), [{ kind: 'prose', text: mid }]);
      const fenced = '```\n[workspace map]\nx/\n[/workspace map]\n```';
      assert.deepEqual(split(fenced), [{ kind: 'prose', text: fenced }]);
    });
  });

  describe(`${label}: contextBlocks and humanProse`, () => {
    test('contextBlocks returns only the context segments, in order', () => {
      assert.deepEqual(blocks(`Before.\n${SPAN_3}\nAfter.\n<environment_context>\ncwd: /x\n</environment_context>`), [
        { tag: 'system-reminder', text: SPAN_3 },
        { tag: 'environment_context', text: '<environment_context>\ncwd: /x\n</environment_context>' },
      ]);
    });
    test('contextBlocks returns nothing when the whole turn is prose', () => {
      assert.deepEqual(blocks('just a question'), []);
    });
    test('humanProse joins prose paragraphs and drops every span', () => {
      assert.equal(humanProse(`Before.\n${SPAN_3}\nAfter.`), 'Before.\n\nAfter.');
      assert.equal(humanProse(SPAN_3), '');
      assert.equal(humanProse('plain  text \n'), 'plain  text \n'); // the fast path returns the input untouched
    });
  });

  describe(`${label}: acceptance (the web chat and rooms rows)`, () => {
    const HUMAN = 'Why does the build fail on CI?';
    const SEEDED = '[workspace map]\n```\nsrc/\n  app.ts\n  util.ts\nREADME.md\n```\n[/workspace map]\n\n' + HUMAN;
    const HELPER = [
      '[workspace map]', '```',
      '.github/', '  workflows/', '    ci.yml (812b)',
      'AGENTS.md (13028b)',
      'src/', '  main.ts (2048b)', '    bootHub', '    createWindow',
      '[trimmed 12 files]', '```', '[/workspace map]',
    ].join('\n');

    test('a map-prefixed row shows exactly the human text', () => {
      assert.equal(humanProse(SEEDED), HUMAN);
      assert.equal(humanProse(`${HELPER}\n${HUMAN}`), HUMAN);
    });
    test('the fold summary reads "Workspace map · N files"', () => {
      assert.equal(contextSummary(rawBlocks(raw(SEEDED))), 'Workspace map · 3 files');
      // real Helper output: only sized lines are files (symbols, dirs and the trailer are not)
      assert.equal(contextSummary(rawBlocks(raw(`${HELPER}\n${HUMAN}`))), 'Workspace map · 3 files');
      assert.equal(workspaceMapFileCount('[workspace map]\n```\nx/\n  a.ts (1b)\n[trimmed 0 files]\n```\n[/workspace map]'), 1);
      assert.equal(contextSummary(rawBlocks(raw('[workspace map]\n```\na.ts (1b)\n```\n[/workspace map]\nhi'))), 'Workspace map · 1 file');
    });
    test('any other block set reads "Context · N lines"', () => {
      assert.equal(contextSummary(rawBlocks(raw(`${SPAN_3}\n${PROSE_3}`))), 'Context · 3 lines');
      assert.equal(contextSummary(rawBlocks(raw(`${HELPER}\n${SPAN_3}\nhi`))), 'Context · 16 lines');
      assert.equal(contextSummary([]), '');
    });
  });
}

// The render sites read the splitter, not the raw row text.
// The web chat's site/assets/chat.js guard is gone: cb3776eb moved chat.js to
// archive/site/assets/chat.js and nothing under site/ loads the splitter any
// more, so the rooms hub is the one live render site.
describe('wiring guards', () => {
  const html = readFileSync(join(repo, 'frontends', 'rooms', 'index.html'), 'utf8');
  const room = readFileSync(join(repo, 'frontends', 'rooms', 'panels', 'room.js'), 'utf8');
  test('site/assets/chat.js stays archived: a returning web chat must re-add its wiring guard here', () => {
    assert.throws(() => readFileSync(join(repo, 'site', 'assets', 'chat.js'), 'utf8'), { code: 'ENOENT' });
  });
  test('rooms loads context-spans.js before the panels, and room.js shows prose', () => {
    const at = html.indexOf('<script src="context-spans.js"></script>');
    assert.ok(at > 0 && at < html.indexOf('<script src="panels/room.js"></script>'));
    assert.match(room, /esc\(isBotRow\(row\) \? \(row\.text \|\| ''\) : proseOf\(row\.text\)\)/);
  });
});
