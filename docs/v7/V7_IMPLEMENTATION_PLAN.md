# V7 Pro Edition implementation plan

This plan is for the owner to approve. It does not change the app. Production stays the five files on `main` at `489ccf8`, which is also `v6.3-baseline` and the current `v7/phase1-foundation` tree. Pages keeps serving that tree until a later, separate approval.

V7 is still an offline phone game. No accounts, no cloud, no ball-tracking camera. Net zones stay self-reported impact locations. The simulator does not become a measurement device.

Owner decisions already made, and treated as constraints here:

- Look: a hybrid of a polished broadcast and a modern sports UI. Navy, red, and white. Playful fictional teams.
- Motivation: seasons and tournaments, and also hard contact, with drills a kid can finish.
- Offline. No online services.
- Deterministic, seeded, unit-tested.
- Each play is a `PlayEvent`.
- The eight priorities below. Priority 8 (keep the current modes and careers) is a gate on every phase, not a feature that waits until the end.

## Recommended order

| Order | Phase | Priorities | Size | Why this slot |
|---|---|---|---|---|
| 0 | Foundation | Enables all of them, plus the preservation gate | L | Nothing else is safe inside the 291-line file, and nothing else is testable while `Math.random` is hard-coded |
| 1 | Real tee vs simulated | 6 | M | Animation, the guide, the pitch challenge, and Academy will all read the wrong numbers if this split is still a hint under the career page |
| 2 | Premium UI | 1 | L | The animation and the multiplayer screens need a shell. Doing visuals first, before those features, avoids building them twice |
| 3 | Swing animation | 2 | L | Plays the result phase 1 started storing. Multiplayer and the pitch challenge both show it |
| 4 | Local multiplayer | 3 | L | After the save firewall and the shell exist. It is the easiest way to destroy a career if it lands early |
| 5 | Pitch-location challenge | 4 | M | Optional, default off. Uses `PlayEvent` and the real-tee record. Does not need Academy |
| 6 | Hitting approach guide | 5 | S | Reads the same real-tee patterns as coaching, so it should land before Academy and share one rules module |
| 7 | Hit Lab Academy | 7 | L | Drills, timers, and coaching copy. Last, because it depends on the real-tee record and the guide's rules |

Priority 8 is checked at the end of every phase: the baseline suite stays green, and a V6.3 fixture still loads.

Sizes are relative to this codebase. S is a single module and a handful of tests. M crosses a few modules and the save file. L is a new surface plus migration or a new visual system.

## Save schema v5

Logical name: schema 5. On-disk recommendation: **do not change the integer `version` yet.**

Today `valid` rejects anything other than 3 or 4. Writing `version: 5` into `warriors-hit-lab-v4` means a phone that still has the V6.3 script (cached worker, rollback, second tab) will treat the career as invalid and can overwrite it. `RISKS.md` item 1 is this case.

### On-disk shape

Keep every current key at the top level. Add keys. Do not nest `stats` or `roster` under a new parent.

```json
{
  "version": 4,
  "appSchema": 5,
  "player": {},
  "stats": {},
  "roster": [],
  "practice": {},
  "realTee": {
    "swings": 0,
    "hard": 0,
    "medium": 0,
    "soft": 0,
    "zones": {},
    "middleMiddle": 0,
    "calledPitches": 0,
    "calledHits": 0,
    "byDay": {}
  },
  "playEvents": [],
  "pitchChallenge": { "enabled": false, "frequency": 0 },
  "approachGuide": { "enabled": true },
  "rng": { "gameSeed": null, "drawIndex": 0 }
}
```

`version` stays 4 so the current Pages build can still open the file. V6.3 does not know `appSchema`, `realTee`, or `playEvents`. Its loader keeps unknown keys and writes them back on the next save. That was checked against `valid` and the normalizers: extra keys are not stripped. The baseline suite's `futureField` test is what locks that fact before V7 relies on it.

`realTee.byDay` is a rollup, not a second copy of every swing. The detailed swings for a new game live in `playEvents`, capped (proposal: 200 newest). `practice` stays and is still updated for one release, so a rollback to V6.3 still shows "Real Tee Progress." New code reads `realTee` for V7 screens.

Multiplayer is **not** a field on this object. It uses `warriors-hit-lab-local-mp-v1`. The career loader never reads that key.

### One-time migrate on load

Run the existing V6.3 normalizer first, unchanged, so v2 and v3 behavior stays what the baseline tests lock. Then, only if `appSchema` is missing or less than 5:

1. Read the raw `KEY` string. If it exists, write it to `warriors-hit-lab-v6-snapshot` only when that slot is empty, and always write it to a new key `warriors-hit-lab-premigration`. Do not overwrite a premigration key that is already there (the first V7 open is the one that matters).
2. Set `appSchema` to 5.
3. Build `realTee` from `practice` without deleting `practice`.
   - `swings` = `practice.history.length` (the capped history, which is all V6 stored).
   - Sum `hard` / `medium` / `soft` and zones from that history.
   - `middleMiddle` = count of `MC`.
   - `calledPitches` and `calledHits` = 0.
   - `byDay[date]` from `practice.days` when present, else from the history.
4. Set `playEvents` to `[]`. Do not invent events for old swings. The history does not contain the simulated kind, and guessing it would mix the two stat families.
5. Set `pitchChallenge` to `{ enabled: false, frequency: 0 }` and `approachGuide` to `{ enabled: true }`.
6. Leave `rng` unset until the next new game. An in-progress V6 game keeps using the seeded generator only for swings that happen after the upgrade; its past at-bats are already on `d.stats`.
7. Save.

Idempotent: a second load sees `appSchema === 5` and does not rebuild `realTee` from `practice` (that would double-count once V7 is also writing `practice`).

### What "never loses a career" means in tests

For every baseline fixture, after migrate:

- The section-4 career fields from `BASELINE_TEST_PLAN.md` are unchanged (`stats`, `xp`, record, `player`, length-9 `roster` and its counting stats, `playerSeasonStats`, `season`, `seasonStats`, `tournament`, `completed`, `log`, `practice`, `preferences`, `game`).
- `futureField`-style unknown keys remain.
- `realTee.swings === practice.history.length` on the first migrate.
- A V6.3-equivalent loader (the current `valid` plus normalizers, **without** the V7 step) can still read the migrated JSON and see the same career counters. That is the rollback test. It is allowed to ignore `appSchema` and `playEvents`.

Known V6.3 losses stay as they are: v2 extras, legacy team short names, roster replacement when the length is not 9. Schema 5 does not add a new loss. If the owner later wants v2 `rbi` preserved, that is a separate, explicit change.

### When to set `version` to 5

Only after the owner approves a one-line production patch to V6.3: `valid` accepts `version` 3, 4, or 5, and still does not strip unknown keys. That patch has to be what Pages serves **before** any phone writes `version: 5`. Until that patch is live, writers keep `version: 4` and `appSchema: 5`.

Do not ship the widened `valid` and a `version: 5` writer in the same unreleased build only. The danger is the old script, which is already on phones.

## PlayEvent

Written by the engine at the end of `swing`, after the governor, before `save`. The animator, the undo button, and the exports read it. Nothing in the animator writes it.

```js
{
  id: "string",           // unique inside the career, not a guess about the child
  at: "ISO-8601 with offset",
  source: "career",       // later also "multiplayer" on the other key, never here
  mode: "quick" | "season" | "tournament" | "practice",
  gameSeed: "string",
  drawIndex: 0,           // index before this swing's draws
  inning: 1,
  half: "top" | "bottom",
  outsBefore: 0,
  lineupIndex: 0,
  batterId: "p0",
  zone: "MC",
  power: "hard",
  calledZone: null,       // or a zone code, when the challenge is on
  real: {
    zone: "MC",
    power: "hard",
    metCall: null         // true/false when calledZone is set
  },
  sim: {
    kindBeforeGovernor: "single",
    kind: "out",
    governorApplied: true,
    runs: 0,
    rbi: 0,
    scoreAfter: 0,
    otherAfter: 0,
    basesAfter: [false, false, false],
    outsAfter: 1,
    walkoff: false
  },
  xp: 3,
  undone: false
}
```

`real` is the tap. `sim` is the baseball result. The governor may change `sim.kind` and set `governorApplied`. It must not change `real`.

Undo marks the event `undone: true` or drops it, and restores the same fields undo restores today. It does not delete `realTee` by hand; it restores the `realTee` snapshot the way it restores `practice` today. Prefer restoring a cloned `realTee` so the two cannot drift.

Practice mode (new, Academy and free tee work) writes `source`/`mode: "practice"`, fills `real`, and leaves `sim` null. It does not call `outcome`.

## Phase 0 — Foundation

**Scope.** A build, a module split, a seeded RNG, `PlayEvent` records, schema-5 migrate as specified above, the baseline suite, and CI that cannot deploy. No new screen. A swing still ends on the text card.

**Design.**

- Vite, `base: './'`, root is the current files. The first PR can keep shipping the unbundled file from the source tree and use Vite only for tests, if that is the smaller step. The second foundation PR emits `dist/` and the tests run against `dist/` as well as against the source modules. `dist/` is gitignored. It is not committed onto `v7/phase1-foundation` as the thing Pages might later serve, until the release step.
- Extract without changing formulas. Suggested modules: `state` (fresh, valid, migrate, save), `engine` (`outcome`, `baserun`, governor), `game` (`startGame`, `simulateHalf`, `inningEnd`, `swing`, `finishGame`, undo), `season`, `tournament`, `career` (XP, achievements, practice, realTee), `render`, `audio`. The DOM stays in `render` and the listeners.
- `rng.next()` replaces every `Math.random`, including `rand` and `pick`. Delete `weighted` in this phase. It has no caller. The baseline test that soft contact is never a homer, and the two-draw `outcome` rows, prove the table did not sneak back.
- New games store `gameSeed` (a random 32-bit value taken once, from `crypto.getRandomValues` if present, else from `Math.random` **once** at game start) and `drawIndex`. Later swings use `mulberry32`. Formula outputs for a scripted queue stay identical to V6.3, which is what the golden tests assert. Live sequences will differ from the old `Math.random` stream. Completed games do not change.
- `swing` appends a `PlayEvent` and then does the same `save` it does now.
- Migrate as above. Dual-write `practice` and `realTee` for career swings so V6.3's panel still moves if the owner rolls back.

**Data model.** The additive keys in the schema section. No key removed.

**Depends on.** Nothing in V7. Depends on the owner accepting that future swings are seeded and that old swings are not replayable.

**Acceptance.**

- Baseline suite green on the extracted modules, including the known bugs (tournament tie split, governor, playoff tie, 5-run cap).
- A V6.3 fixture migrated to `appSchema: 5` still passes the "V6.3 loader can read this" check.
- One scripted 3-inning game is identical on a second run with the same seed.
- The built `dist/index.html` uses relative asset URLs.
- CI has no deploy job. A grep test fails if the workflow text contains `deploy-pages` or `github-pages`.

**Tests added.** The whole baseline plan, plus migrate idempotence, plus one replay test, plus the relative-base assertion.

**Size.** L.

## Phase 1 — Real tee stats and simulated stats (priority 6)

**Scope.** Two visible families. Real tee: swings, hard / medium / soft rates, zone rates, middle-middle rate, called-location rate (zero until phase 5), streaks, daily challenge progress. Simulated: the current AVG, SLG, HR, RBI, standings, bracket, XP, achievements.

**Design.**

- Career tab splits into two headed regions. The simulated region says "Simulated baseball" in the heading. The real region says "Your tee swings" and keeps the current sentence that these are not measured trajectories.
- Achievements that are swing counts ("Centurion", daily challenges) read `realTee`. Achievements that are hits, HR, RBI, wins, and titles keep reading `stats` and the season tables. Do not reclassify them silently. The baseline achievement test names the source.
- The governor copy is not shown as a lecture. A small line on the simulated card can say "Some hits become outs when an inning is already a big inning," because that rule is otherwise invisible. Wording is an owner question.
- Practice mode, without a game, is the other half of this phase. A "Tee work" action on Play records a `PlayEvent` with `sim: null` and updates `realTee` and `practice` only. It does not change `wins`, `stats`, the roster batting line, the season, or the bracket. Daily challenges can complete here. This is new, and it is what makes Academy possible without forfeiting a game.
- Quick play, season, and tournament keep updating both families, matching V6.3, until the owner says quick play should stop touching one of them.

**Data model.** Uses `realTee` from phase 0. Practice mode adds `mode: "practice"` events. No new career counters.

**Depends on.** Phase 0.

**Acceptance.** A practice swing moves real-tee counts and daily progress and leaves `stats.ab`, `wins`, and `season` byte-for-byte equal. A game swing still moves both. The governor fixture still shows a real hard `MC` and a simulated out. Labels "Simulated" and "Your tee swings" are both on screen at SE width without overlap.

**Tests.** The practice-swing isolation test. An updated visual shot of Career, reviewed in that PR because the layout change is intentional.

**Size.** M.

## Phase 2 — Premium mobile UI (priority 1)

**Scope.** Visual redesign of the existing six sections plus profile. No new rules. Navy, red, white. Broadcast-style scorebug for the inning, outs, and score. A calmer modern layout for Career, Team, Season, Tournament, and Settings. Fictional team names stay playful. The 3×3 net stays a 3×3 net.

**Design.**

- Tokens on `:root`: navy `#071225` / `#09172d` (already the page background), red `#d83350` (already the primary button), white `#f7f8fc`. Do not introduce a second palette.
- One type scale, one tap-target minimum of 44×44, safe-area padding on the header and the bottom of the menu. The current file sets `viewport-fit=cover` and never uses `safe-area-inset`.
- Phone layout is the default. The desktop tab strip can stay for a wide window. The phone menu stays the primary navigation under 700px.
- The result card keeps the big outcome word. Phase 3 replaces what happens after the save, not the data on the card.
- Reduced motion: no decorative loops. The UI phase should not add motion that phase 3 then has to undo.
- Keep the live-region and button names the smoke tests and VoiceOver check already use.

**Data model.** None.

**Depends on.** Phase 0, so the CSS is not being edited inside a 90 KB line. Best after phase 1 so the two stat headings are part of the new layout instead of a patch on top.

**Acceptance.** Smoke tests pass at both viewports. No horizontal scroll. Contact targets measure at least 44×44. Setup, Play, Career, Team, Season, Tournament, Settings, and the final screen have new approved screenshots. A V6.3 save still loads. Colors come from the tokens.

**Tests.** Visual suite updated in this PR only, with the old PNGs kept in git history. Axe or a small contrast check on the red-on-navy and white-on-navy text.

**Size.** L.

## Phase 3 — Full-screen swing animation (priority 2)

**Scope.** After every **game** swing that produced a simulated result, a full-screen 2D scene plays that result, then returns to the at-bat. Skip always works. Reduced motion skips to the result card. The scene never calls `outcome` and never rolls a number to decide the play.

**Design.**

- Trigger only from a stored `PlayEvent.sim`. Inputs to the scene: `kind`, `runs`, `governorApplied`, batter name, half, inning, score after, bases after. Not the zone, except as a small label ("Net: middle-middle") so the picture is not pretending the zone was a spray chart.
- Art direction: simple original SVG or CSS. A batter, a ball, a generic field, then a cut to the base state. Out, single, double, triple, homer, and walk-off are the six scenes. Walk-off is a homer or a hit scene plus the win state, chosen from `sim.walkoff`, not from a new roll.
- Cosmetic variation (a slightly different camera) may use `gameSeed + event id`. It must not change `kind`.
- Skip and a  timeout (proposal: skippable immediately, auto-advance around 4 seconds) both call the same "show the card" function.
- `prefers-reduced-motion: reduce` and a Settings switch "Show swing animations" (default on) take the skip path.
- Save and stat updates remain inside `swing`, before the scene starts. Killing the app during the scene keeps the at-bat.
- Practice swings with `sim: null` do not play a baseball scene. A short confirmation ("Hard, middle-middle") is enough. Otherwise tee work becomes a cartoon the engine did not score.

**Data model.** A preference `animations: true` on `preferences`. Additive. V6.3 ignores it.

**Depends on.** Phase 0 for the event. Phase 2 for the shell. Phase 1 so practice swings are not given a fake baseball result.

**Acceptance.** For a scripted single, the scene's text contains "SINGLE" and the saved `stats.h` is already incremented before the scene's first frame (test by spying on `save` order). Skip and reduced motion leave the same `stats` as watching it through. No `Math.random` and no `rng.next` in the animation module (import check). 100 skip-taps do not leak listeners. On the SE viewport the scene fits, the skip control is at least 44px, and it is not under the notch.

**Tests.** Order test (save before paint). Reduced-motion Playwright context. A test that the animation module's source does not reference `outcome` or `Math.random`. Manual GPU check stays manual.

**Size.** L.

## Phase 4 — One-phone multiplayer (priority 3)

**Scope.** Two local profiles, pass-and-play, on one phone. Editable defaults: **Dad / Tampa Titans** and **Maddon / Tampa Warriors**. Isolated from the single-player career. Same tee loop, same engine, same animation.

**Design.**

- Entry point is a third Play choice, "Pass and play," not a replacement of Quick, Season, or Tournament.
- Storage key `warriors-hit-lab-local-mp-v1`. Shape:

```json
{
  "appSchema": 1,
  "profiles": [
    { "id": "p-dad", "name": "Dad", "team": "Tampa Titans", "hand": "R", "roster": [] },
    { "id": "p-maddon", "name": "Maddon", "team": "Tampa Warriors", "hand": "R", "roster": [] }
  ],
  "series": { "wins": [0, 0], "games": [] },
  "game": null
}
```

- Default rosters are copies of the nine fictional batters, not references to the career roster. Editing one does not edit the other.
- A game alternates halves. The profile that is batting uses their hand and their lineup. The other profile's half is **not** `simulateHalf`. Both sides are real swings. That is the point of pass-and-play. CPU simulation stays in the single-player modes.
- `finish` of a multiplayer game updates `series` on the multiplayer key only. It does not call career `finishGame`, `processSeason`, `processTournament`, `practiceSwing`, or career XP.
- Real-tee from these swings is stored on the multiplayer key if the owner wants the dads' contact tracked, still not on the career `realTee`, unless a later question says otherwise. Default: multiplayer tee totals stay on the multiplayer key, labeled with the profile name.
- Career export does not include this key. Multiplayer has its own export. The career importer rejects a multiplayer file (different `appSchema` home, or a `kind: "local-mp"` marker).

**Data model.** New key only. Career `d` gains nothing except, if the UI needs a last-used flag, a preference `lastSurface: "career" | "mp"` that V6.3 will ignore. Prefer remembering the surface in `sessionStorage` so the career JSON does not change at all.

**Depends on.** Phase 0 (engine, RNG, events), phase 1 (so nobody "just uses `d.stats`"), phase 2 (two scorebugs), phase 3 (both players see the scene). The engine work can be developed beside phase 2, but it should not merge before the isolation test exists.

**Acceptance.** Load fixture D. Play a full 3-inning pass-and-play game. Career `KEY` deep-equals the pre-game stringify. Snapshot key for the career is unchanged. Multiplayer wins persist across reload. Renaming "Dad" to something else persists. Reset career does not reset multiplayer, and the reverse is also true. Undo works inside a half and does not touch the other profile's previous half.

**Tests.** The deep-equal isolation test is the merge gate. Plus a test that `save()` of the career is not called during a multiplayer swing (spy).

**Size.** L.

## Phase 5 — Pitch Location Challenge (priority 4)

**Scope.** Optional. Before the swing, the game names one of the nine net zones. The kid tries to hit that spot, then reports the zone they actually hit, then contact, as today. Default off.

**Design.**

- Settings: off / sometimes / often, stored as `pitchChallenge.frequency` of `0`, `0.34`, or `1`. "Sometimes" means a seeded draw at the start of the at-bat, so it replays with the game seed. It is not a second hidden `Math.random`.
- The call is a zone code chosen by the seeded RNG from the nine. The UI says the name ("middle-middle"), not a field location ("oppo gap"). The existing hint stays: the net is not a spray chart.
- The kid can still tap any zone. The tap is the truth. `real.metCall` is `zone === calledZone`.
- `realTee.calledPitches` and `calledHits` update from `metCall`.
- Simulated `outcome` does **not** take a bonus for meeting the call. The challenge is a tee skill, not a second way to inflate AVG. If the owner wants a bonus, it is a formula change with new golden rows, and it stays out of this phase.
- Works in career games, practice mode, and multiplayer. Multiplayer stores the call on that key's events.
- Frequency 0 means `calledZone` is null and the UI is absent. The baseline "no call" path stays the default.

**Data model.** `pitchChallenge` already added in phase 0. Events gain `calledZone` and `real.metCall`, which phase 0's shape already allows.

**Depends on.** Phase 0 and phase 1. Animation should show the call as a label, so phase 3 should already be able to display an optional string. Multiplayer can follow if its event writer shares the module.

**Acceptance.** With frequency 0, screenshots match phase 2 (no call banner). With frequency 1, every at-bat shows a target before the zone pad enables. A matching tap increments `calledHits` and does not change the scripted `sim.kind` versus the same draws with the challenge off. A mismatch increments `calledPitches` only. Undo restores both counters.

**Tests.** Those two counter tests, and a golden test that `outcome`'s draws are identical with the challenge on or off (the call consumes its own named draw, not one of `outcome`'s two).

**Size.** M.

## Phase 6 — Hitting Approach Guide (priority 5)

**Scope.** An eye-icon control on the at-bat screen. It shows a recommended direction and which net zones match that recommendation. It does not block the swing. It does not change `outcome`.

**Design.**

- One module, `approach.js`, pure function of `{ hand, recentZones, calledZone }`. Recent zones are the last 20 `real` taps for this profile, not simulated hits.
- Output is a short label plus up to three zone codes to highlight on the net. Examples of the kind of rule that stays inside the line: "Last ten taps were lower. The middle row is the target." "You are batting left-handed. Pull side on this net is the right column." The highlight is a CSS class on the existing buttons, not a new coordinate system.
- The eye toggles the highlight. `approachGuide.enabled` remembers it.
- Copy rules: no body parts, no swing faults, no "you are late," no medical or mechanical diagnosis. The function returns ids, and the strings live in one file a reviewer can read. A test fails if that file contains a banned list (`elbow`, `hips`, `stride`, `load`, `cast`, `bat speed`).
- If a pitch call is active, the guide can say "The called target is top-left" and highlight that zone. It still does not scold a miss.
- The same function is what Academy uses for "what should this drill ask for," so the phrases do not fork.

**Data model.** `approachGuide.enabled` only.

**Depends on.** Phase 1 for `realTee` history. Phase 5 if the call highlight is in the first version. It can ship without phase 5 by ignoring `calledZone` until then. Phase 2 for the icon style.

**Acceptance.** With no history, the guide says to pick a middle target and does not invent a tendency. With 20 scripted lower-row taps, the highlight is the middle row. Toggling the eye off removes the class and does not change the next `sim.kind`. Banned-word test passes. The control is 44px and has an accessible name.

**Tests.** The pure-function table. The banned-word scan. One Playwright toggle.

**Size.** S.

## Phase 7 — Hit Lab Academy (priority 7)

**Scope.** A drill library, guided workouts of 5, 10, and 15 minutes, and Smart Coaching. Coaching uses self-reported patterns only.

**Design.**

- New section or a clear entry on Play, "Academy," that does not remove the six existing tabs. Adding a seventh destination is a navigation change; the phone menu can take one more row. The season and tournament tabs stay.
- Drills are static data: id, title, minutes, what to do, which net zones count as "on task," and a one-line why. They are fictional and physical ("ten swings, try to hit the middle row") rather than mechanical. The owner should replace the starter list. The plan's starter list is a placeholder of about twelve drills, marked as draft copy in the PR.
- A workout is a timer plus a queue of drills that fills 5, 10, or 15 minutes. The timer uses the device clock (`Date.now()` deltas), works offline, and survives a refresh by storing `{ workoutId, startedAt, drillIndex, swings }` on the career under `academy.session`. Leaving the app does not call a server.
- Swings during a workout are practice-mode `PlayEvent`s with `drillId` set. They update `realTee` and the workout tally. They do not update simulated stats.
- "On task" means the tapped zone is one of the drill's zones. That is a real-tee fact.
- Smart Coaching is `approach.js` plus the last few workouts: which drill to suggest next, and a sentence from the approved list. It never sees `outcome`. It never says the child has a swing flaw. If the history is thin, it says to do the middle-middle drill, not a personalized diagnosis.
- A parent can turn coaching off. The drills and timers still work.
- Daily challenges can count workout swings, since those swings are real tee swings. They still pay career XP. That is a small coupling to the career, and it matches "XP for the work you put in, even if the simulated play is an out." It must not pay win XP. The test locks +75 and not +110.

**Data model.**

```json
"academy": {
  "coaching": true,
  "session": null,
  "completed": [{ "id": "middle-5", "at": "ISO", "swings": 10, "onTask": 6 }]
}
```

`completed` capped at 50. Additive. Absent on old saves until the first workout.

**Depends on.** Phase 1 (practice swings), phase 6 (shared rules and copy bans), phase 2 (layout). Animation is optional here. A workout swing should use the short confirmation, not a full simulated at-bat.

**Acceptance.** A 5-minute workout can be completed with scripted taps. `stats` and `wins` do not change. `realTee.swings` increases. Coaching off hides the suggestion and does not hide the drills. Banned-word test covers the coaching strings and the drill file. Airplane mode (manual) still ticks the timer. A V6.3 fixture with no `academy` key loads, and the section shows an empty state rather than throwing.

**Tests.** Isolation test, timer math (a 15-minute plan sums to 15), cap at 50, coaching-off render, banned words.

**Size.** L.

## Preservation gate (priority 8)

Applied at every phase, not scheduled last.

- Quick play, season (10/20/40, 3/6/9, standings, the current playoff rules), and tournament (4/8/16) still run.
- The known V6.3 quirks stay until the owner picks a different rule in the open questions. The tests fail if a phase "cleans up" the tournament tie or the governor without a decision.
- Every career fixture migrates without losing the counters in the schema section.
- Undo, export, and import still work for a version-4 file.
- XP, levels, the 24 achievements, roster ids, and per-player season stats still compute as specified.

## Release and rollback

**Tags.**

- `v6.3-baseline` already points at `489ccf8`. Do not move it.
- Each phase merges to `v7/phase1-foundation` (or a successor branch the owner names) by PR.
- A release the owner is willing to put on a phone gets an annotated tag `v7.0.0-phaseN` on that commit. Tags are not deploys.

**What Pages does tomorrow.** Nothing. Source stays `main` at `/`. The live URL keeps the five raw files. CI on the V7 branch does not have permission to change that.

**Preview.** GitHub Pages is one site per repo, and it is already used by production. Do not point it at the V7 branch.

- The foundation CI uploads `dist/` as an artifact named `v7-preview` on each PR. The owner can download it and open it from a local static server, or the workflow can comment with the artifact link.
- Optional later, still not production: a **second** repository or a `gh-pages` branch that is not the current source. Only useful if the owner wants a URL. A branch that is not selected in the Pages settings is not a URL.
- Do not host the preview on `diamondiq2026.github.io/warriors-hit-lab/`. That origin is the real `localStorage`.

**Switching Pages to built output, later, with owner approval.**

1. The manual iPhone list in the test plan has been run on the preview, including a copy of a real export imported into the preview origin (not into production).
2. The owner says yes in the release PR.
3. Change Pages in one explicit step. Preferred: Pages source becomes "GitHub Actions," and the only workflow that publishes is `workflow_dispatch` from a tag, with the environment protection the owner turns on. Alternate: a `release` branch that contains only `dist/`, and Pages is switched from `main` `/` to `release` `/`. Do not commit `dist/` onto `main` next to a leftover `sw.js` from V6.3. Two workers in one folder is how stale caches happen.
4. The new worker uses a new cache name (`warriors-hit-lab-v7-…`) and precaches the hashed file list. `base` is `./`.
5. Watch one online phone: reload, confirm the build, record a swing, export.
6. Rollback: set Pages back to `main` `/` at `v6.3-baseline` (or the last good raw commit). Online phones get the old files on the next fetch because the worker is network-first. Offline phones keep V7 until they are online. The premigration key and the export file are the career backup if a V7 save has to be read by V6.3. That read works only if `version` is still 4 and unknown keys were preserved, which is why the schema section is strict.

**The upload-to-main habit.** The release PR should say, in the checklist, not to drag files onto `main` for this version. The tag is the record. A manual upload would skip CI and could mix a raw `index.html` with a built worker.

## Open questions

1. **Disk version.** Approve `version: 4` plus `appSchema: 5` until you explicitly ship a widened `valid` to Pages? That is the recommendation. Or do you want the one-line V6.3 patch first so the integer can become 5?
2. **Tournament ties.** Keep the current split (career tie, bracket loss, final screen says TIE over an unequal score), or make it one result? The baseline tests lock the split until you answer.
3. **Scoring governor.** Keep the 34/70/92 flip, soften it, or turn it off in V7? It is the main way a real hard swing becomes a simulated out.
4. **Playoff ties.** Today they crown the opponent. Keep that?
5. **Pass and play.** Confirm both players swing for their own half, and that CPU `simulateHalf` is not used in that mode. Confirm the defaults Dad / Tampa Titans and Maddon / Tampa Warriors, and that both names and team names stay editable.
6. **Multiplayer tee swings.** Should they stay off the single-player "Your tee swings" totals? The recommendation is yes.
7. **Pitch challenge and AVG.** Confirm a hit on the called zone does not change the simulated hit chance. Frequency choices proposed: off, about one in three, or every swing.
8. **Animation art.** Is original simple SVG acceptable, or do you have drawings to use? Confirm the scene must not draw a realistic trajectory from the net zone.
9. **Reduced motion.** Confirm the fallback is today's result card, not a still illustration.
10. **Academy copy.** May the first PR include a clearly marked starter set of about twelve drills, or will you supply the list before that phase?
11. **Coaching voice.** Any phrases you want banned beyond mechanics language? Should coaching default on?
12. **Daily-challenge XP for Academy swings.** Proposed: yes, +75, and never game-win XP. Confirm.
13. **Quick play and career AVG.** V6.3 counts quick play and tournament at-bats in career batting but not in the season. Keep that?
14. **Real export.** Can you make one Settings export from the phone you care about, store it outside git, and let the migrate test run against it locally? The synthetic fixtures are not that file.
15. **Preview URL.** Is a downloadable CI artifact enough, or do you want a second site that is not the production origin?
16. **Who is allowed to push `main`** once V7 exists? The plan recommends a required CI check and no force-push. That setting is yours to turn on.
