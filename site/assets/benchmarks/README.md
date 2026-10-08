# benchmark assets

Published graphics for the benchmarks page: three charts, the answer contact
sheet under `answers/`, the one-metric kit under `kit/`, and `results.html`.
This README is the manifest that maps each asset to the run it came from and the
one claim it proves.

Every chart SVG is vector, published at **2x** (root `width`/`height` = 2x the
viewBox size, viewBox unchanged). The kit also ships a PNG of each graphic, a
render of its SVG. The gallery page `index.html` reuses `site/assets/bench.css`
and its tokens.

Four internal runs, all dated 2026-10-02, supply the numbers:

- Latency run: 543 rows, median wall time per setup.
- Quality run (corrected): 40 prompts, one answer per setup, judge threshold
  T=95. This is the first quality run with six of its 40 prompts swapped for
  their re-measured cells. See the correction note below.
- Context run: 24 tasks on Sonnet 5, tidy against full, paired by task.
- Desktop run: the desktop app against the Claude Agent SDK, behind the two
  desktop cards (`d1`, `d2`).

## correction note

Six of the 40 prompts (two live-web prompts, two live-fact prompts and two build
prompts) were re-measured after we fixed how tool use is recorded and the rival
CLIs' network and permission settings. The new cells replace the old ones for
every setup and were graded by the same frozen judge prompt. Swapping six
prompts into a 40-prompt table that has one sample per cell is a correction, not
a fresh full run: the other 34 prompts are still the first run's, and every
figure here moves by at most the weight of those six cells and one judge call's
noise. Opus 5.5 needed a larger output ceiling on the two build prompts (it still
ran out on the notes app), and Cursor CLI and Claude Code each timed out or
stopped on a build prompt in both runs; those cells stay zeros and are not
hidden.

What changed in the claims, first run to corrected run:

- Superbot's one-shot pass rate is 57.5% (23 of 40), down from 62.5%. Superbot
  Fast is 57.5% too, down from 60%. Claude Code stays at 52.5%, Codex CLI is
  45.0% (was 42.5%), Cursor CLI 37.5% (was 32.5%). Superbot is still ahead of every
  outside rival, by 5 points instead of 10.
- Head to head, Superbot won 137, tied 21 and lost 82 of 240 prompts against the
  six rivals (was 141, 21 and 78). Against Claude Code it is now 16 won, 5 tied,
  19 lost.
- SUPER (on) stays at 52.5% and SUPER (auto) is 47.5% (was 45.0%). In every
  run here SUPER ran with no extra workers, so those bars show that setup, not
  its full range.
- Withdrawn: the live web tasks card (`c1`). Superbot passed 0 of the 2 web
  prompts after the re-measure, so "passes live web tasks every rival failed" no
  longer holds; all six rivals still passed 0 of 2. Superbot Fast passed 2 of 2,
  both at the 95 line, which is not enough to carry a headline.
- Withdrawn: the live facts card (`c4`). Cursor CLI passed 2 of 2 and tied
  Superbot.
- Relabelled: the GPT row is now "GPT-5.5 (API)". Every one of its answers
  names gpt-5.5 as the model that served it, although the request asked for
  GPT-6.1.

## manifest: chart -> run -> claim

| asset | chart | run | claim it proves | role |
|---|---|---|---|---|
| `quality-bar.svg` | Judged pass rate by setup (per-prompt checklist) | Quality run, 2026-10-02 (corrected) | Superbot passed 57.5% (23/40) against the best outside rival, Claude Code, at 52.5% (21/40), +5.0pt ahead; Superbot Fast 57.5% too. | **HERO** |
| `latency-chevron.svg` | Median wall time by setup | Latency run, 2026-10-02 | Superbot Fast 1782 ms and Superbot 2447 ms median wall time; the fastest setup is Sonnet 5.5 high (API) at 1457 ms; the SUPER setups, auto at 3854 ms and on at 4218 ms, are not single-model numbers. | supporting |
| `super-vs-plain.svg` | SUPER vs plain Superbot | Latency run and quality run | pass rate Superbot 57.5% / SUPER (on) 52.5% / SUPER (auto) 47.5%; median wall time Superbot 2.45 s / SUPER (on) 4.22 s / SUPER (auto) 3.85 s. SUPER is not a single-model number and ran here with no extra workers. | supporting |
| `kit/wins/x1-context-tokens.png` (gallery figure) | Tidy rule tokens vs full, on the first call | Context run, 2026-10-02 | tidy 9,582 rule tokens on the first call vs full 42,352 (-77%); Superbot's context, tidy rendered for the task, 24 tasks, Sonnet 5, paired by task. Tidy's figure is the mean size of the rules block actually sent on each task's first call. Tools and the system prompt are not counted. | supporting |
| `answers/answers.html`, `answers/answers.png` | Answer comparison contact sheet | Quality run, 2026-10-02 (corrected) | six judged request cells, Superbot against one rival each, with the per-prompt checklist and the judge verdict. | supporting |
| `results.html` | The results page: every winning metric on one page | Latency, quality, context and desktop runs, 2026-10-02 | hero 57.5% one-shot pass rate over all ten setups; eight quality measures, two outright categories (missing attachments, casual chat), three speed categories, two desktop wins over the Claude Agent SDK, tidy context against full (four wins with paired 95% CIs: tokens -77%, 2.9x cheaper, first token 1.1x, full answer 1.2x; then level with full, CI spans 0: requirements 78.2% vs 73.7%, directives 88% vs 85.3%, and the blind judge 55.6% vs 44.4%, a tie; nothing left under "Where full leads"); a "where Superbot does not lead" block that also names the two category leads that did not survive the re-measure. Generated by `gen-results.mjs` from the kit's exports. | **page** |
| `kit/index.html` | The kit: 7 graphics and 21 one-metric cards | same runs | hero, ranked bars, head-to-head, quality vs speed, category wins, context tiles (tidy vs full), social card; then one 1200x630 card per metric Superbot wins (`kit/wins/q*`, `c2`, `c3`, `s*`, `d*`, `x*`; `c1` and `c4` are withdrawn). Generated by `kit/gen-kit.mjs`. | supporting |

Hero choice: `quality-bar.svg` is the chart that puts Superbot ahead of every
outside rival at once, on the aggregate judged pass rate (+5.0pt over the best
rival). Superbot Fast ties it at 57.5%.

`index.html` in this directory is the gallery that lays the three SVGs and the
context card out as site figures (hero first) with these captions. It is the
page a benchmarks link points at; the SVGs and the README are the publishable
assets.

## category claims

Two categories are still outright wins, two prompts each: missing attachments
(Superbot 2 of 2 against 1 of 2 for the best outside rival) and casual chat
(Superbot Fast 2 of 2 against 1 of 2). Both are charted as `kit/wins/c2-...` and
`kit/wins/c3-...` and in the category grid on `results.html`. The first run's
other two claims, live web tasks and live facts, are withdrawn; see the
correction note. Two prompts per category is a direction, not proof.

## constraints these assets hold to

- Every chart names its run by date in the SVG itself (`<title>` / `<desc>` /
  footer text) and in the table above.
- No claim exceeds what the run data shows.
- A SUPER bar carries its caveat on the chart: SUPER is the multi-model mode,
  and in these runs it ran with no extra workers, so its bars are not a single
  model's and show that setup, not its full range.
- Every figure in `kit/` and on `results.html` is recomputed from the run data
  by the kit's parity test, part of `npm run test:root`; a figure that drifts
  from its run fails there. The generators are `gen-kit.mjs`, `gen-results.mjs`
  and `gen-answers.mjs`. They are kept with the repository's build scripts, not
  in this folder, so the folder holds only what is published. To regenerate,
  run them with node in that order; each rewrites its files here in place.

## provenance

The figures come from internal runs dated 2026-10-02.
