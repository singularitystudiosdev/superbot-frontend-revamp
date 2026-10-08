// Site experiments: the one file the optimization loop edits (2026-09-25).
// scripts/ga/site-optimize.mjs reads GA for each experiment, reallocates the
// arm weights by Thompson sampling and rewrites this file with --write, one
// commit per decision, so `git log` on it is the decision record and
// `git revert` undoes one. The home page (lander-agent.html) draws an
// anonymous visitor's arm from these weights once (sticky in localStorage
// 'sb-exp') and tags every later GA event with content_group '<id>-<arm>'.
// The optimizer reads an experiment by its `userProp` user property
// (customUser:exp_hero, customUser:exp_caption), not by content_group.
// `incumbent` is what everyone else sees. An arm at weight 0 is off.
// hero.arms.none (2026-09-26) is no animation at all: the stage is not drawn
// and no hero module loads. caption swaps the hero h1 for copy[arm] (the h1's
// inner HTML, <br/> line breaks included); it exposes exp_caption and
// experience_impression 'SBGG-caption-<arm>' only while two or more arms
// carry weight, so a held experiment sends nothing. hero.arms.wstop (2026-10-01,
// rev 12) is the live stage on top: a compact live wschat stage inside the first
// 390x664 (site/assets/hero-wstop.js and .css), 80/20 against wschat.
// hero.arms.live (2026-10-07, rev 13) is the owner's hero remake at 100% on
// every device: the desktop thinking bubble, the composer's model chip with the
// provider-switch pill, and every app superbot manages as a toggle that flips
// ON as its band scrolls into view (site/assets/hero-live.js and .css). wschat
// and wstop go to 0 so one arm draws; their definitions stay, so restoring the
// old 80/20 is a one weight edit. holdback.snapshot.hero follows the incumbent.
// `device` (optional, per experiment) scopes an experiment to one GA
// deviceCategory: only that device draws an arm; every other one sees
// `otherDevices`, is labelled exp_<slot> 'desktop' and stays out of the
// optimizer's read, which filters on deviceCategory too. No slot sets it
// today: hero ran on phones only from rev 5 (2026-09-26) and runs on every
// device since rev 10 (2026-09-28); the code paths stay for a future scope.
// hero's `started` (2026-09-27 at rev 7, 2026-10-02 since rev 12) is also its draw epoch: the page keeps
// a visitor's sticky hero arm only when it was drawn under the same `started`,
// so moving `started` restarts the test with a fresh draw for every returning
// visitor instead of leaving the old incumbent's visitors on it (a split the
// SRM guard would flag). A stored hero arm that is not live (the old
// 'desktop' label, a cut arm) is redrawn too. subline stays sticky across
// revs. caption's `started` is also its draw epoch since rev 12 (2026-10-02, 2026-10-04 since rev 13):
// the page keeps a stored caption arm only when it was drawn under the same
// `started`, so a returning visitor redraws once and the read, which opens at
// `started` and holds the slot until that day is GA-processed, sees one draw.
// `pinned` (caption, 2026-09-27) holds arms at a fixed share the owner set:
// the page draws from `arms` as ever, and the optimizer leaves a pinned arm's
// weight alone and reallocates only the rest of the mass. No slot pins an arm
// since caption rev 11 (2026-09-28, c3/c4 unpinned); the code path stays.
// `rotate` (caption, 2026-09-27) names the arms a rotator arm cycles in its h1, in order, instead of copy[arm].
// `fx` (caption, 2026-09-30) names the transition a rotator arm plays between
// its members: roll, rise or zoom, played by site/assets/caption-seq.js (and
// its stylesheet), which the page fetches only for a drawn arm that has an
// entry here. An arm with no `fx` entry cycles its members with the blur-rise
// rotator as ever, and a failed load of the sequencer falls back to it too.
// s1, s2 and s3 (caption rev 12) are the sequence arms, combinations of the
// best hooks, each with its own transition: s1 c18 then control (roll), s2
// c18, c8, c20 (rise), s3 control, c8, c12 (zoom). They exist only as `rotate`
// and `fx` entries, like r1-r4: no `copy` of their own. Since caption rev 13
// (2026-10-03) c18 and c12 are sequence-only: the owner dropped both as
// standalone arms (weight 0), so they are served only as members of s1-s3.
// match (caption rev 14, 2026-10-05, ga-audit H1) is the message-match arm: its h1
// follows the ad the visitor clicked. It has no copy[match] of its own: caption.follow.match
// names its lines. The visitor's campaign is utm_campaign of the page URL, else the
// stored first touch's (localStorage 'sb-attr', where attribution.js keeps it, never
// read inside a consent region), lowercased; the FIRST key of follow.match.families
// that the campaign contains picks copy[<its value>], and a campaign no family names
// (or none at all) shows copy[follow.match.otherwise]. A new campaign family is one
// line in families (plus one copy line unless it reuses one). The lines a family
// points at are not arms: no weight, never drawn, only previewable (?caption=<key>).
// The h1 only ever gets a line of the copy table, never the campaign text itself.
// adCampaign and captionCopy (inside the pre-paint block below) are the one
// resolution, called by the edge-inlined head and by the page module alike.
// subline (2026-09-27) is one muted line under the hero h1 on every device: arm `what` shows copy.what, `control` shows nothing; it exposes exp_subline and experience_impression 'SBGG-subline-<arm>' only while two or more arms carry weight, like caption.
// The evolution loop (2026-09-28, /tmp/bandit-design-final contract):
// - `held` (per experiment) names the arms still awaiting the owner's
//   approval: they are never served and never weighted, and the optimizer
//   never refills a freed slot from them. Each one is cited in a log line.
// - `maxLive` (per experiment) is the arm budget: at most that many arms carry
//   weight at once (6; caption 8 since rev 12, 2026-09-30, for the re-tested
//   winners plus the 3 sequence arms; c12 and c18 left that set at rev 13,
//   staying only inside the sequence arms); the rest of the approved arms wait in
//   `arms` order. An arm the owner takes to 0 here after it served is retired:
//   the optimizer never refills it (site-optimize.mjs retiredArm).
// - `cutPct` / `cutMinN` (per experiment, owner 2026-09-28: "more aggro ab
//   cutting even on low sample size, esp for hero text at top, drop bottom
//   50th percentile at the minimum"): every run the optimizer ranks the
//   unpinned live and approved queued arms with cutMinN users by hook and
//   sends the lowest floor(cutPct x n) to the back of the queue (3 or more
//   ranked; never the incumbent). caption, the h1 at the top, cuts hardest
//   (0.6 at 450 users since caption rev 12, about two days of a fresh test; hero
//   and subline cut half at 30).
// - `holdback` (top level) is the owner-set control group: a `share` of the
//   anonymous visitors (0.1), drawn once before any arm and sticky, sees the
//   frozen `snapshot` arms and is tagged arm `hb` in every slot
//   (content_group, exp_<slot>, experience_impression). The optimizer never
//   edits it; the bandit's pooled 90% is read against it for sign-ups.
// - The weights in this file are the BAKED FALLBACK. The edge serves this
//   file with an overlay applier appended (edge route for
//   /site/assets/experiments.js, overlay.json from the daily s6 run): it
//   overwrites each slot's weights with the overlay's (held and unknown arms
//   stay 0), may move `incumbent`, and sets EXPERIMENTS.rev to the overlay's
//   rev. Without an overlay (or a malformed or frozen one) these bytes are
//   served as they are and EXPERIMENTS.rev is absent, read as rev 0. A changed
//   baked vector therefore reaches visitors only through a new overlay rev
//   that carries it (the overlay slot overrides these weights).
// - The page stores each draw as sb-exp { <slot>: { arm, rev }, hb } (rev is
//   EXPERIMENTS.rev at draw time) and sends the user property exp_rev, the
//   rev of the visitor's first stored draw (the assignment epoch the read is
//   stratified by). The draw itself is the pure functions after the literal
//   (migrateSaved, assignSlot, assignmentEpoch), pinned by
//   edge/test/site-experiments-draw.test.ts.
export const EXPERIMENTS = {
  "hero": {
    "arms": {
      "workspace": 0,
      "sphere": 0,
      "realui": 0,
      "chaos": 0,
      "boot": 0,
      "none": 0,
      "wschat": 0,
      "wstop": 0,
      "live": 1
    },
    "incumbent": "live",
    "floor": 0.05,
    "started": "2026-10-07",
    "proxyPlacement": "hero",
    "metric": "hook",
    "userProp": "exp_hero",
    "held": ["sphere", "chaos", "boot"],
    "maxLive": 6,
    "cutPct": 0.5,
    "cutMinN": 30,
    "rev": 13,
    "log": [
      {
        "rev": 2,
        "date": "2026-09-26",
        "action": "start",
        "why": "ga-audit 2026-09-26: 93% of phone readers leave at the hero; realui (real product UI) challenges workspace",
        "weights": {
          "workspace": 0.5,
          "realui": 0.5
        }
      },
      {
        "rev": 3,
        "date": "2026-09-26",
        "action": "add-arm",
        "arm": "none",
        "why": "user: A/B hiding the hero animation completely",
        "weights": {
          "workspace": 0.3333,
          "realui": 0.3333,
          "none": 0.3334
        }
      },
      {
        "rev": 4,
        "date": "2026-09-26",
        "action": "reweight",
        "why": "user: a 50/50 show-vs-hide animation test; realui paused to keep it binary",
        "weights": {
          "workspace": 0.5,
          "none": 0.5
        }
      },
      {
        "rev": 5,
        "date": "2026-09-26",
        "action": "scope",
        "device": "mobile",
        "why": "user: run the animation test on phones only and always show the animation on desktop (rev 4 desktop leaned workspace 3/40 vs 1/51, phones tied)",
        "weights": {
          "workspace": 0.5,
          "none": 0.5
        }
      },
      {
        "rev": 6,
        "date": "2026-09-27",
        "action": "ship",
        "arm": "workspace",
        "why": "user: every phone gets the workspace animation, 100% (09-26..27 phones, GA unprocessed: workspace 9/127 past hero 7.1%, none 4/74 5.4%)",
        "weights": {
          "workspace": 1
        }
      },
      {
        "rev": 7,
        "date": "2026-09-27",
        "action": "reopen",
        "arm": "realui",
        "started": "2026-09-28",
        "why": "user: test realui more, its cohort's stats were so good. Phones, clean, 09-26 (last GA-processed day), hook = engaged/sessions: workspace 85/378 22.5% (374 users, 1 waitlist_verified, 1 sign_up), none 40/259 15.4% (256 users, 1 sign_up), realui 10/17 58.8% (16 users, 0 sign-ups), P(realui beats workspace) 0.999. realui's 17 sessions all fell 09-26 11:00-14:59 PT, inside rev 2-3 (11:30-14:18 PT, the ramp #92 found behind the hero SRM), and 16 were (direct), 1 reddit.com, none from the X/reddit ads: like for like, workspace's (direct) sessions that day were 43/132 32.6% (P 0.97) and its 11:00-14:59 sessions 11/31 35.5% (P 0.94). 17 sessions from one cohort is too noisy to exploit, so an even 50/50 on phones, not Thompson's ~100%; none stays off. started moves to 2026-09-28, the first full day under these weights, and the page redraws every phone's hero arm drawn before that start, so the read and its SRM test see one 50/50 draw",
        "weights": {
          "workspace": 0.5,
          "realui": 0.5
        }
      },
      {
        "rev": 8,
        "date": "2026-09-28",
        "action": "hold",
        "arms": ["sphere", "chaos", "boot"],
        "why": "evolution loop schema: sphere, chaos and boot are hero variants reachable only by ?hero= preview (lander-agent.html HEROES); none of them carries weight in any approved rev (rev 2 workspace+realui, rev 3 adds none by user request, revs 4-7 workspace/none/realui), so they are held until the owner approves one into the test; workspace, realui and none were each approved in a rev and stay eligible. Weights unchanged"
      },
      {
        "rev": 9,
        "date": "2026-09-28",
        "action": "add-arm",
        "arm": "wschat",
        "started": "2026-09-29",
        "why": "user: add singularitystudiosdev.github.io/superbot-hero-animation as a new hero arm and put it live. wschat is that repo's rebuilt workspace hero (6448073: the 'All the agents in one' card lifts onto the app's new chat, one chat plays, an end card with replay), copied in as hero-wschat*.js/.css. Even thirds on phones, as rev 3 added none; realui's 50/50 from rev 7 had run under a day with no GA-processed day, so no read is lost. started moves to 2026-09-29, the first full day under these weights, and the page redraws every phone's hero arm drawn before it, so the read and its SRM test see one three-way draw",
        "weights": {
          "workspace": 0.3333,
          "realui": 0.3333,
          "wschat": 0.3334
        }
      },
      {
        "rev": 10,
        "date": "2026-09-28",
        "action": "scope",
        "device": "all",
        "why": "user: expand the hero test to ALL devices (desktop and tablets draw workspace/realui/wschat too; rev 5's phone-only scope ends); started stays 2026-09-29, the first GA day of the three-way read, so no phone is redrawn",
        "weights": {
          "workspace": 0.3333,
          "realui": 0.3333,
          "wschat": 0.3334
        }
      },
      {
        "rev": 11,
        "date": "2026-09-28",
        "action": "ship",
        "arm": "wschat",
        "why": "user: set wschat to 100% for the hero animation. First-party hook (superbot.site_exp_events, rev 10 draw, every device, read off the owner's dashboard 2026-09-28): wschat 67/592 sessions 11.3% (582 visitors), workspace 64/648 9.9% (635, incumbent), realui 60/618 9.7% (608); live SRM p 0.3127; GA has no processed day of the read yet. Every device outside the holdback now draws wschat: workspace and realui go to 0, so a returning visitor's stored workspace/realui draw is not live and is redrawn to wschat, and a stored wschat draw is kept (started stays 2026-09-29). workspace and realui served, so at 0 they are retired and the daily optimizer never refills them: with one live arm and nothing to refill the slot is held, and `done` stays null so the dashboard keeps its hero live rows. The holdback (10%, owner-set) keeps its frozen snapshot, which follows the incumbent to wschat",
        "weights": {
          "wschat": 1
        }
      },
      {
        "rev": 12,
        "date": "2026-10-01",
        "action": "add-arm",
        "arm": "wstop",
        "started": "2026-10-02",
        "why": "ga-audit 2026-09-30 hypothesis H1: a 'live stage on top' hero arm. Hypothesis: 98% of mobile exits are on the first screen (GA audit 2026-09-30: the effort band 0-664 px holds 94.5% of weighted exits) while the wschat stage starts below the fold (phone y966 of 844, desktop y994 of 900), so most visitors leave before the stage plays. wstop (site/assets/hero-wstop.js and hero-wstop.css) puts a compact live wschat stage inside the first 390x664; hook = engaged sessions / sessions should rise over wschat. A fixed 80/20 split from the first stratum (wschat 0.8, wstop 0.2): wstop is a new, unproven layout, so it takes the smaller share. started moves to 2026-10-02, the first full GA day under these weights, and it is also the hero draw epoch, so the page redraws every visitor's hero arm once (a stored wschat draw from 2026-09-29 is not kept) and the read and its SRM test see one 80/20 draw; the optimizer holds the slot until 2026-10-02 is GA-processed and then reads only 2026-10-02 on, so nothing is cut, moved or refilled before wstop has data. 80/20 is the split of that first stratum, not a pin: from that first read the daily optimizer manages the slot like any other (burn-in at 1/K each while an arm is under 100 users, then top-two Thompson with the 0.05 floor, a move of 0.05 or more published as an overlay rev). Unchanged: wschat stays the incumbent and the holdback's hero snapshot; cutPct 0.5 from cutMinN 30 (the percentile cut ranks 3 or more arms, so two arms are never cut by it), P(beats incumbent) < 5% cut from 100 users, floor 0.05, maxLive 6; workspace, realui and none stay retired, sphere, chaos and boot stay held. The overlay on s6 (rev 7 when this was written) carries no hero slot, so these baked weights serve as they are from the deploy; were a hero slot ever published to the overlay it would override them, and the baked weights would then reach visitors only through a new overlay rev (superbot-ab-rebalance publish-baked.sh hero)",
        "weights": {
          "wschat": 0.8,
          "wstop": 0.2
        }
      },
      {
        "rev": 13,
        "date": "2026-10-07",
        "action": "add-arm",
        "arm": "live",
        "started": "2026-10-07",
        "why": "user: remake the hero. The brief: the thinking bubble at the top of the page (the desktop live thought row, the v11 bubble line), the thoughts cycling fast and streaming word by word, the composer's model chip changing with the desktop provider-switch pill (Switching to X, then Switched to X), and every app superbot manages as an OFF toggle that flips ON one by one as the band scrolls into view, over the line Powering superbot. It ships as site/assets/hero-live.js and hero-live.css, drawn by the new live arm. live takes all the weight and wschat and wstop go to 0, so one arm draws on every device; both arms stay defined, so restoring the 80/20 is a one weight edit. started moves to 2026-10-07, the day the arm ships, and it is the hero draw epoch, so every stored draw from an earlier start (wschat, wstop, anything) is redrawn once to live and the slot's reads restart on one draw. holdback.snapshot.hero follows the incumbent to live: a holdback visitor sees the snapshot arm, and wschat at weight 0 is still defined and un-held, so the snapshot had to move or 10% of visitors would keep the old hero. Unchanged: incumbent label rules, floor 0.05, maxLive 6, cutPct 0.5 from cutMinN 30, metric hook, userProp exp_hero; sphere, chaos and boot stay held, workspace, realui and none stay retired at 0. No read is lost: live is a new surface with no GA-served predecessor of its own, so the slot reopens at this rev with one live arm and the optimizer holds it until 2026-10-07 is GA-processed."
      }
    ],
    "done": null
  },
  "caption": {
    "arms": {
      "control": 0.133,
      "c1": 0,
      "c2": 0,
      "c3": 0,
      "c4": 0,
      "c5": 0,
      "c6": 0,
      "c7": 0,
      "c8": 0.1334,
      "c9": 0,
      "c10": 0,
      "c11": 0,
      "c12": 0,
      "c13": 0,
      "c14": 0,
      "c15": 0,
      "c16": 0,
      "c17": 0,
      "c18": 0,
      "c19": 0,
      "c20": 0.1334,
      "r1": 0,
      "r2": 0,
      "r3": 0,
      "r4": 0,
      "s1": 0.1334,
      "s2": 0.1334,
      "s3": 0.1334,
      "match": 0.2
    },
    "rotate": {
      "r1": ["c3", "c4", "c10"],
      "r2": ["c3", "c4"],
      "r3": ["c3", "c11"],
      "r4": ["c4", "c17"],
      "s1": ["c18", "control"],
      "s2": ["c18", "c8", "c20"],
      "s3": ["control", "c8", "c12"]
    },
    "fx": {
      "s1": "roll",
      "s2": "rise",
      "s3": "zoom"
    },
    "follow": {
      "match": {
        "families": {
          "every_model": "every_model",
          "model_switch": "c20"
        },
        "otherwise": "control"
      }
    },
    "copy": {
      "control": "the agent<br/>to manage<br/>your agents.",
      "c1": "one agent<br/>to manage<br/>your agents.",
      "c2": "claude, codex,<br/>cursor.<br/>one app.",
      "c3": "the AI plans<br/>you pay for,<br/>in one app.",
      "c4": "stop switching<br/>between AIs.",
      "c5": "ask it to call<br/>your dentist.",
      "c6": "it can order<br/>your lunch, too.",
      "c7": "your agents,<br/>in your pocket.",
      "c8": "one ask,<br/>a whole team<br/>of agents.",
      "c9": "your rules,<br/>in every agent.",
      "c10": "keep your AIs.<br/>add a manager.",
      "c11": "hit your limit?<br/>keep going.",
      "c12": "out of claude<br/>by tuesday?<br/>keep going.",
      "c13": "all your<br/>AI spend,<br/>one number.",
      "c14": "get more from<br/>the AI you<br/>already pay for.",
      "c15": "eight claude<br/>windows?<br/>try one.",
      "c16": "stop herding<br/>your agents.",
      "c17": "switch agents.<br/>keep the<br/>context.",
      "c18": "claude starts.<br/>codex<br/>finishes.",
      "c19": "no more<br/>copy-paste<br/>between AIs.",
      "c20": "model got<br/>worse?<br/>switch in a tap.",
      "every_model": "every model.<br/>one app."
    },
    "incumbent": "control",
    "floor": 0.02,
    "started": "2026-10-06",
    "metric": "hook",
    "userProp": "exp_caption",
    "held": [],
    "maxLive": 8,
    "cutPct": 0.6,
    "cutMinN": 450,
    "rev": 14,
    "log": [
      {
        "rev": 1,
        "date": "2026-09-26",
        "action": "draft",
        "why": "held for user preview approval"
      },
      {
        "rev": 2,
        "date": "2026-09-26",
        "action": "replace-copy",
        "arms": ["c5", "c6", "c8"],
        "why": "user: base on superbot feature set"
      },
      {
        "rev": 3,
        "date": "2026-09-26",
        "action": "start",
        "why": "user reviewed the preview and kept control, c1-c4, c7, c9, c10; the replaced c5, c6, c8 stay held until seen",
        "weights": { "control": 0.125, "c1": 0.125, "c2": 0.125, "c3": 0.125, "c4": 0.125, "c7": 0.125, "c9": 0.125, "c10": 0.125 }
      },
      {
        "rev": 4,
        "date": "2026-09-26",
        "action": "add-arms",
        "arms": ["c5", "c6", "c8"],
        "why": "user approved the feature-based captions: all 11 arms live, equal split",
        "weights": { "control": 0.091, "c1": 0.0909, "c2": 0.0909, "c3": 0.0909, "c4": 0.0909, "c5": 0.0909, "c6": 0.0909, "c7": 0.0909, "c8": 0.0909, "c9": 0.0909, "c10": 0.0909 }
      },
      {
        "rev": 5,
        "date": "2026-09-26",
        "action": "add-arms",
        "arms": ["c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20"],
        "why": "held for owner preview: taglines mined from Reddit pain points (sell-to-reddit MCP, llm_ai, 2026-09-27)",
        "weights": { "control": 0.091, "c1": 0.0909, "c2": 0.0909, "c3": 0.0909, "c4": 0.0909, "c5": 0.0909, "c6": 0.0909, "c7": 0.0909, "c8": 0.0909, "c9": 0.0909, "c10": 0.0909 }
      },
      {
        "rev": 6,
        "date": "2026-09-26",
        "action": "reweight",
        "arms": ["c2", "c5", "c6", "c8", "c9", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20"],
        "why": "user: drop every arm under 6% on the rev 4 proxy hook (users with 10s of engaged_time, GA day unprocessed; c2 0%, c5 3.4%, c6 3.6%, c8 4.5%, c9 5.9%, ~25 users each) and put c11-c20 live; 16 arms, equal split",
        "weights": { "control": 0.0625, "c1": 0.0625, "c3": 0.0625, "c4": 0.0625, "c7": 0.0625, "c10": 0.0625, "c11": 0.0625, "c12": 0.0625, "c13": 0.0625, "c14": 0.0625, "c15": 0.0625, "c16": 0.0625, "c17": 0.0625, "c18": 0.0625, "c19": 0.0625, "c20": 0.0625 }
      },
      {
        "rev": 7,
        "date": "2026-09-27",
        "action": "pin",
        "pinned": { "c3": 0.25, "c4": 0.25 },
        "why": "user: promote the current top 2 to 50% of traffic and let the test run on the other 50% (c3 13%, c4 12% on the 09-26 proxy hook); the other 14 live arms share 50%, floor 0.05 -> 0.02 so 14 arms fit in it",
        "weights": { "control": 0.0357, "c1": 0.0357, "c3": 0.25, "c4": 0.25, "c7": 0.0357, "c10": 0.0357, "c11": 0.0357, "c12": 0.0357, "c13": 0.0357, "c14": 0.0357, "c15": 0.0357, "c16": 0.0357, "c17": 0.0357, "c18": 0.0357, "c19": 0.0357, "c20": 0.0357 }
      },
      {
        "rev": 8,
        "date": "2026-09-27",
        "action": "add-arms",
        "arms": ["r1", "r2", "r3", "r4"],
        "why": "held for owner preview: rotating captions (user: show pairs / the top 3 as their own arm with a transition)",
        "weights": { "control": 0.0357, "c1": 0.0357, "c3": 0.25, "c4": 0.25, "c7": 0.0357, "c10": 0.0357, "c11": 0.0357, "c12": 0.0357, "c13": 0.0357, "c14": 0.0357, "c15": 0.0357, "c16": 0.0357, "c17": 0.0357, "c18": 0.0357, "c19": 0.0357, "c20": 0.0357 }
      },
      {
        "rev": 9,
        "date": "2026-09-27",
        "action": "add-arms",
        "arms": ["r1", "r2", "r3", "r4"],
        "why": "user asked to test the rotators (r1 top 3, r2 top 2, r3 c3+c11, r4 c4+c17); they join the unpinned half, 18 arms at an equal ~2.8%; c3 and c4 stay pinned at 25%",
        "weights": { "control": 0.0278, "c1": 0.0278, "c3": 0.25, "c4": 0.25, "c7": 0.0278, "c10": 0.0278, "c11": 0.0278, "c12": 0.0278, "c13": 0.0278, "c14": 0.0278, "c15": 0.0278, "c16": 0.0278, "c17": 0.0278, "c18": 0.0278, "c19": 0.0278, "c20": 0.0278, "r1": 0.0278, "r2": 0.0278, "r3": 0.0278, "r4": 0.0278 }
      },
      {
        "rev": 10,
        "date": "2026-09-27",
        "action": "reweight",
        "arms": ["c1", "c3", "c4", "c7", "c8", "c10", "c15", "c18", "c20", "r3"],
        "pinned": { "c3": 0.02, "c4": 0.02 },
        "why": "user: audit the results, promote winners to more sample, cut losers. Clean, 09-26 (last GA-processed day), hook = engaged/sessions, P = P(hook beats control); control 13/53 24.5% (47 users, 1 sign_up). CUT (>= 50 sessions and P < 20%): c1 4/52 7.7% P 0.01, c7 7/65 10.8% P 0.03, c10 9/53 17.0% P 0.18 -> 0; c4 13/100 13.0% P 0.04 and c3 14/78 17.9% P 0.18 lose too, but the owner pinned them (rev 7), so they stay pinned at the smallest share the file allows, its floor 0.02 each (0.25 -> 0.02), and still ride the rotators r1, r2, r3, r4. PROMOTE (< 20 sessions, hook >= control): r3 2/3, c15 2/5, c18 2/5, c20 2/6 -> 0.10 each. REVIVE: c8 12/45 26.7% P 0.60, 1 sign_up (45 users), off since rev 6 on ~25 users of the old proxy (4.5%), not on this metric -> 0.08. Floor 0.04: c11 0/2, c12 1/5 (1 sign_up), c13 1/5, c14 1/5, c16 1/9, c17 1/7, c19 1/10, r1 0/2, r2 0/1, r4 0/1. Control keeps 0.08 as the baseline. Sign-ups (sign_up, generate_lead, waitlist_verified users, 09-26..27): control 1, c8 1, c12 1, c9 1 verified (off, hook 3/36 8.3%, stays off), every other arm 0; no promoted arm is clearly below control (it has 1). Every free arm is within 0.05 of the loop's explore split (0.96 / 16 = 0.06), so the loop holds these weights until every unpinned arm has 30 sessions and top-two Thompson takes over. started stays 2026-09-26: the pinned c3/c4 ratio has held 1:1 since rev 3, so the SRM line keeps testing it, and the read keeps the evidence behind this change",
        "weights": { "control": 0.08, "c3": 0.02, "c4": 0.02, "c8": 0.08, "c11": 0.04, "c12": 0.04, "c13": 0.04, "c14": 0.04, "c15": 0.1, "c16": 0.04, "c17": 0.04, "c18": 0.1, "c19": 0.04, "c20": 0.1, "r1": 0.04, "r2": 0.04, "r3": 0.1, "r4": 0.04 }
      },
      {
        "rev": 11,
        "date": "2026-09-28",
        "action": "unpin",
        "arms": ["c3", "c4"],
        "why": "user: unpin every artificially pinned arm. c3 and c4 (pinned since rev 7, at the 0.02 floor since rev 10) become ordinary live arms the bandit may reweight, cut or trim; weights unchanged, so this entry keeps the rev 10 vector in force. On the 09-26..27 read c3 has P(beats control) 0.049 at 506 users and c4 0.004 at 519, so the next run cuts both to the back of the queue. The rev-0 SRM test loses its pinned-pair basis and goes untested; the overlay revs are still tested and summed",
        "weights": { "control": 0.08, "c3": 0.02, "c4": 0.02, "c8": 0.08, "c11": 0.04, "c12": 0.04, "c13": 0.04, "c14": 0.04, "c15": 0.1, "c16": 0.04, "c17": 0.04, "c18": 0.1, "c19": 0.04, "c20": 0.1, "r1": 0.04, "r2": 0.04, "r3": 0.1, "r4": 0.04 }
      },
      {
        "rev": 12,
        "date": "2026-09-30",
        "action": "reopen",
        "arms": ["c18", "control", "c8", "c20", "c12", "s1", "s2", "s3"],
        "started": "2026-10-02",
        "why": "user: cut some captions that seem to have higher hook rate than current leaders, put combos of the winners in the mix with different transitions, and re-test the top 5 by hook. The dashboard's hook (stratified, window 2026-09-26..28, last GA-processed read at rev 7): c18 22.8% (886 users), control 21.2% (659), c8 19.8% (743), c20 19.4% (334), c12 19.3% (141) are the top five; c3 19.1% (533) and c19 16.7% (146), the two the rev 7 publish put live, rank below all five. The rev 7 percentile cut ranked only the 5 arms live then (bottom 0.6 of 5: it cut c17, c12 and c8) and refilled c3 and c19 from the back of the queue (cut at rev 5, oldest cut first) ahead of c8 and c12, so two of the five sat out while two lower arms ran. Pooled raw engaged/sessions is 17.5-19.4% for all seven (c18 17.6%, control 18.9%, c8 17.5%, c20 19.4%, c12 17.8%, c3 17.8%, c19 17.5%), so the gaps are inside the noise at 141-886 users: a fresh, equal read is the right test. The five go live together at an equal 0.125 each beside three new sequence arms that cycle the winners' own lines, each with its own transition: s1 c18 then control (roll), s2 c18, c8, c20 (rise), s3 control, c8, c12 (zoom). maxLive goes 6 -> 8 (5 winners + 3 sequences = 8 > 6), so neither a trim nor a refill touches them. c3 and c19 go to 0 with everything else: no place is free at maxLive 8, and an arm the owner takes to 0 after it served is retired, never refilled, which is what a cut means here. started moves to 2026-10-02, the first full GA day under these weights: this rev cannot be live before 2026-10-01 00:00 PT, the GA day boundary, so 2026-10-01 would be a half day under the old weights; the optimizer holds the slot until 2026-10-02 is GA-processed and then reads only 2026-10-02 on, so every arm starts from zero users and nothing is cut, trimmed or refilled on the old read; the cuts keep their thresholds (percentile cutPct 0.6 from cutMinN 450 users, raised from 20: about 270 users per arm land on the first processed day, so 20 would cut four of the eight on one day's noise (SE about 2.7 points against gaps under 2); P(beats incumbent) < 5% from 100). caption's started is now its draw epoch (the page passes it, as hero does), so a returning visitor redraws once and every stratum sees the same eight-arm split. The baked weights reach visitors only through an overlay rev, published with `node scripts/ga/site-optimize.mjs --publish-baked caption` (dry run first, then --apply) inside the worker container under the optimizer's run lock; it publishes the baked weights and incumbent as the next overlay rev with no cut entries",
        "weights": { "control": 0.125, "c8": 0.125, "c12": 0.125, "c18": 0.125, "c20": 0.125, "s1": 0.125, "s2": 0.125, "s3": 0.125 }
      },
      {
        "rev": 13,
        "date": "2026-10-03",
        "action": "remove-arms",
        "arms": ["c12", "c18"],
        "started": "2026-10-04",
        "why": "user: remove two captions they did not like as standalone arms, keeping them only inside the sequence tests. c12 ('out of claude by tuesday? keep going.') and c18 ('claude starts. codex finishes.') go to 0, and both stay where they already read best: s1 still cycles c18 then control, s2 c18, c8, c20, s3 control, c8, c12, so their lines still appear in the sequence arms. Both served while live, so at 0 the optimizer reads them as retired (retiredArm: weight 0 after a served log entry) and never refills them as standalone arms; they are not held (the owner approved them long ago) and not cut (no cut entry is written). The freed mass goes to the six survivors equally: control 0.1665 and c8, c20, s1, s2, s3 0.1667 each (0.1665 + 5 x 0.1667 = 1), so the caption read stays a fresh, equal one. maxLive stays 8: the slot keeps its budget, so a later run may refill an approved queued arm, but never c12 or c18. started moves to 2026-10-04, the first full GA day under these weights: this rev cannot be live before 2026-10-03 00:00 PT, the GA day boundary, so 2026-10-03 would be a half day under the eight-arm split; the slot is held until 2026-10-04 is GA-processed and then reads only 2026-10-04 on, so every arm starts from zero and nothing is cut, trimmed or refilled on a mixed read. caption's started is its draw epoch, so every returning visitor redraws once and the read sees one six-arm split. The baked weights reach visitors only through an overlay rev (node scripts/ga/site-optimize.mjs --publish-baked caption, dry run then --apply, in the worker container under the optimizer's run lock).",
        "weights": { "control": 0.1665, "c8": 0.1667, "c20": 0.1667, "s1": 0.1667, "s2": 0.1667, "s3": 0.1667 }
      },
      {
        "rev": 14,
        "date": "2026-10-05",
        "action": "add-arm",
        "arm": "match",
        "started": "2026-10-06",
        "why": "ga-audit 2026-10-05 hypothesis H1 (PIE 7.0, message match): the hero h1 says 'the agent to manage your agents.' to everyone, while 28742 of ~40k sessions (2026-09-08..10-05) land from utm-tagged X ads that promise something else. Campaigns naming every model: every_model_one_app 3648 sessions (14.6% engaged), its_a_lie_every_model 3439 (10.1%), japan_bikeride_every_model 2793 (14.4%), lenslab_every_model_v3 589, every_model_one_chat_sb_16x9 574 (11043 sessions); campaigns naming a model switch: bikeride_model_switch 1934 (13.1%), bikeride_model_switch_16x9 1089 (3023 sessions). Together 14066 sessions, 49% of the X-ad sessions and 35% of all. The new arm `match` follows the ad: the h1 shows 'every model. one app.' (copy.every_model) when the visitor's utm_campaign contains every_model, c20's 'model got worse? switch in a tap.' when it contains model_switch, and the control line for any other campaign and for no campaign (caption.follow.match; a new family is one line there). The campaign is the page URL's utm_campaign, else the first touch attribution.js stored in sb-attr (never read in a consent region), so a reader who comes back direct still gets the line of the ad that brought them. Expect a diluted read: for about 65% of the match arm's visitors the line is control's, so the arm's hook moves by about a third of the matched sessions' lift; read it inside the matched campaigns (GA session campaign x exp_caption) as well as arm against arm. Weight 0.2, taken evenly from the six live arms (0.2 / 6 = 0.0333 each: control 0.1665 -> 0.133, the incumbent absorbing the 4-decimal rounding, as at rev 13, and c8, c20, s1, s2, s3 0.1667 -> 0.1334); seven live arms stay inside maxLive 8, so nothing is trimmed or refilled. started moves to 2026-10-06, the first full GA day under these weights, as every add-arm that changed the split has done (hero revs 9 and 12, caption revs 12 and 13): it is the draw epoch, so every returning visitor redraws once and the read and its SRM test see one seven-arm draw instead of match holding only first-time visitors beside six arms that also hold returning ones; the optimizer holds the slot until 2026-10-06 is GA-processed and then reads only 2026-10-06 on, so nothing is cut, trimmed or refilled on a read that has no match users, and the six-arm read of 2026-10-04..05 is set aside (cutMinN 450 users would otherwise fire its 60% cut on two days the new arm is absent from). If the publish lands after 2026-10-05 23:59 PT, move started to the first full GA day after it before the deploy. Unchanged: control stays the incumbent and the holdback's caption snapshot; cutPct 0.6 from cutMinN 450, floor 0.02, maxLive 8. The baked weights reach visitors only through an overlay rev (node scripts/ga/site-optimize.mjs --publish-baked caption, dry run then --apply, in the worker container under the optimizer's run lock; bash .cosmos/skills/superbot-ab-rebalance/publish-baked.sh caption, then the same with --apply): until then the live overlay (rev 10: control 0.1665, c8, c20, s1, s2, s3 0.1667) gives match no weight, as an arm the overlay does not list stays 0.",
        "weights": { "control": 0.133, "c8": 0.1334, "c20": 0.1334, "s1": 0.1334, "s2": 0.1334, "s3": 0.1334, "match": 0.2 }
      }
    ],
    "done": null
  },
  "subline": {
    "arms": {
      "control": 0,
      "what": 1
    },
    "copy": {
      "what": "a free app to manage your AI apps."
    },
    "incumbent": "what",
    "floor": 0.05,
    "started": "2026-09-27",
    "proxyPlacement": "hero",
    "metric": "hook",
    "userProp": "exp_subline",
    "held": [],
    "maxLive": 6,
    "cutPct": 0.5,
    "cutMinN": 30,
    "rev": 2,
    "log": [
      {
        "rev": 1,
        "date": "2026-09-27",
        "action": "start",
        "why": "ga-audit 2026-09-27: 85% of phone hero readers leave (716/843), first 664px never says what superbot is or that it is free",
        "weights": {
          "control": 0.5,
          "what": 0.5
        }
      },
      {
        "rev": 2,
        "date": "2026-09-27",
        "action": "ship",
        "arm": "what",
        "why": "user: every device gets the 'free app' subline; incumbent -> what so held, signed-in and returning visitors all see it (09-27, GA unprocessed: control 2/13 past hero, what 1/5)",
        "weights": {
          "what": 1
        }
      }
    ],
    "done": null
  },
  "holdback": {
    "share": 0.1,
    "since": "2026-09-28",
    "snapshot": {
      "hero": "live",
      "subline": "what",
      "caption": "control"
    }
  }
};

// ---- the page's draw (lander-agent.html), pure so node --test pins it ----
// The block between @prepaint-begin and @prepaint-end (overlayRev .. assignSlot)
// is also the PRE-PAINT draw (2026-10-05, ga-audit H2): for an anonymous visitor
// the edge inlines this very text, comments and `export` stripped, with the
// effective table (these baked weights with the served overlay applied, so the
// weights in force) into the lander's head (edge/src/site-experiments-prepaint.ts),
// where the head script draws hero and caption before the first frame and the
// page module then uses that draw instead of making a second one.
// One text, so the two draws can never disagree; keep the block plain functions
// that reference nothing outside it (no import, no EXPERIMENTS, no DOM).
// @prepaint-begin

/** The overlay revision these weights come from: EXPERIMENTS.rev set by the edge's applier, 0 for the baked bytes. */
export const overlayRev = (experiments) => (Number.isInteger(experiments?.rev) && experiments.rev >= 0 ? experiments.rev : 0);

/**
 * sb-exp in the current shape, { <slot>: { arm, rev, from? }, hb? }. Until
 * 2026-09-28 it kept one string per slot ({ hero: 'workspace', heroFrom:
 * '2026-09-28', caption: 'c3', subline: 'what' }): each string becomes
 * { arm, rev: 0 } (drawn under the baked weights) and `<slot>From` that
 * entry's `from`, so no returning visitor is redrawn by the migration alone.
 * Anything unreadable is dropped, which draws that slot afresh.
 */
export function migrateSaved(stored) {
  const out = {};
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return out;
  for (const [key, v] of Object.entries(stored)) {
    if (key === 'hb') {
      if (typeof v === 'boolean') out.hb = v;
      continue;
    }
    if (key.endsWith('From')) continue; // the old epoch key (heroFrom), folded into its slot's entry below
    if (typeof v === 'string' && v) {
      const from = stored[`${key}From`];
      out[key] = typeof from === 'string' ? { arm: v, rev: 0, from } : { arm: v, rev: 0 };
    } else if (v && typeof v === 'object' && typeof v.arm === 'string' && v.arm) {
      const entry = { arm: v.arm, rev: Number.isInteger(v.rev) && v.rev >= 0 ? v.rev : 0 };
      if (typeof v.from === 'string') entry.from = v.from;
      out[key] = entry;
    }
  }
  return out;
}

/** The holdback is running: a positive share and a snapshot to show. */
export const holdbackOn = (experiments) => {
  const h = experiments?.holdback;
  return !!h && typeof h.share === 'number' && h.share > 0 && !!h.snapshot && typeof h.snapshot === 'object';
};

/** An experiment's servable arms with weight: [arm, weight][], held arms left out. */
export const liveArms = (exp) => {
  const held = new Set(Array.isArray(exp?.held) ? exp.held : []);
  return Object.entries(exp?.arms ?? {}).filter(([a, w]) => w > 0 && !held.has(a));
};

/**
 * One slot's assignment for an anonymous visitor on a device the slot runs
 * on (the caller has already sent signed-in, forced and out-of-scope devices
 * their own labels). Returns { arm, shown, saved }: `arm` is the label every
 * GA tag carries, `shown` the arm whose content the page renders, `saved` the
 * next sb-exp (the same object when nothing changed).
 * 1. The holdback is drawn FIRST, once (sticky `hb`), while it runs. A
 *    holdback visitor is labelled `hb` and shown holdback.snapshot[slot]
 *    (the incumbent when the snapshot names no servable arm); the weights
 *    never redraw them.
 * 2. Everyone else keeps a stored arm while it is live (weight > 0, not held)
 *    and, when `epoch` is given (hero's `started`), drawn under that epoch; a
 *    cut or retired arm, or an older epoch, is redrawn from the live weights,
 *    stored with rev = EXPERIMENTS.rev at draw time.
 * `rand` is Math.random's shape: [0, 1).
 */
export function assignSlot(saved, slot, experiments, { rand = Math.random, epoch } = {}) {
  const exp = experiments?.[slot];
  const rev = overlayRev(experiments);
  let next = saved;
  if (holdbackOn(experiments)) {
    if (typeof next.hb !== 'boolean') next = { ...next, hb: rand() < experiments.holdback.share };
    if (next.hb) {
      const snap = experiments.holdback.snapshot[slot];
      const servable = typeof snap === 'string' && Object.prototype.hasOwnProperty.call(exp?.arms ?? {}, snap) && !(exp?.held ?? []).includes(snap);
      const shown = servable ? snap : exp?.incumbent;
      if (next[slot]?.arm !== 'hb') next = { ...next, [slot]: { arm: 'hb', rev } };
      return { arm: 'hb', shown, saved: next };
    }
  }
  const live = liveArms(exp);
  const kept = next[slot];
  if (kept && live.some(([a]) => a === kept.arm) && (epoch === undefined || kept.from === epoch)) {
    return { arm: kept.arm, shown: kept.arm, saved: next };
  }
  let r = rand() * live.reduce((sum, [, w]) => sum + w, 0);
  let arm = exp?.incumbent;
  for (const [a, w] of live) { r -= w; if (r < 0) { arm = a; break; } }
  const entry = epoch === undefined ? { arm, rev } : { arm, rev, from: epoch };
  return { arm, shown: arm, saved: { ...next, [slot]: entry } };
}

/**
 * The campaign the message-match arm follows (caption rev 14, ga-audit H1):
 * `utm` is the page URL's utm_campaign (URLSearchParams.get, null when absent);
 * `attr` is the raw localStorage 'sb-attr' of attribution.js ({ v, first, last },
 * null when unread, and always null for a visitor in a consent region, where
 * attribution.js stores nothing). The URL's campaign wins; without one the stored
 * FIRST touch's does while that touch is under 90 days old (attribution.js
 * TTL_MS), so a reader who comes back direct still follows the ad that brought
 * them. Lowercased, trimmed and capped at 200 characters (attribution.js
 * MAX_VALUE); '' when there is none.
 */
export function adCampaign(utm, attr, now = Date.now()) {
  const tidy = (v) => (typeof v === 'string' ? v.trim().toLowerCase().slice(0, 200) : '');
  if (tidy(utm)) return tidy(utm);
  try {
    const first = JSON.parse(attr || 'null')?.first;
    return now - Date.parse(first?.ts) < 90 * 86400000 ? tidy(first?.utm?.campaign) : '';
  } catch (e) {
    return '';
  }
}

/**
 * The h1's inner HTML for the caption arm `arm`: copy[arm], and for an arm with a
 * `follow` entry (the message-match arm) the line its campaign calls for: the
 * copy line named by the FIRST key of follow[arm].families that `campaign`
 * (adCampaign's answer) contains, else copy[follow[arm].otherwise], else the
 * incumbent's. Only an own string of the copy table comes back, so an arm name
 * that is a ?caption= preview ('constructor') or a family pointing at a missing
 * line yields undefined, never a function or the campaign text itself.
 * The head's first frame and the page module both call this.
 */
export function captionCopy(exp, arm, campaign) {
  const has = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  const line = (k) => (has(exp?.copy, k) && typeof exp.copy[k] === 'string' ? exp.copy[k] : undefined);
  if (!has(exp?.follow, arm)) return line(arm);
  const rule = exp.follow[arm];
  const c = typeof campaign === 'string' ? campaign : '';
  for (const [key, to] of Object.entries(rule?.families ?? {})) {
    if (key && c.includes(key) && line(to) !== undefined) return line(to);
  }
  return line(rule?.otherwise ?? exp.incumbent);
}

// @prepaint-end

/**
 * The user property exp_rev: String(the rev of the visitor's first stored
 * draw), their assignment epoch; the smallest rev across the stored slots,
 * since revs only grow. null while nothing is stored (nothing to send).
 */
export function assignmentEpoch(saved) {
  const revs = Object.values(saved ?? {}).filter((v) => v && typeof v === 'object' && typeof v.arm === 'string').map((v) => v.rev);
  return revs.length ? String(Math.min(...revs)) : null;
}
